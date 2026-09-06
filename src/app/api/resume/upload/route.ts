import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/server/prisma";
import { fileMetaSchema, resolveFileKind } from "@/lib/validators/upload";

// WHY text extraction is here, not in a separate parser module: the spec puts it
// in the upload route. Keeping it inline means one code path to follow and the
// parsedData field starts as null (Phase 2 populates it via askBrain).
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Please log in to continue.", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "No file provided.", code: "NO_FILE" },
      { status: 400 }
    );
  }

  // WHY validate against the shared schema: identical rules run client-side and
  // server-side — no drift between "what the form thinks is valid" and "what
  // the API accepts".
  const meta = fileMetaSchema.safeParse({
    name: file.name,
    type: file.type,
    size: file.size,
  });
  if (!meta.success) {
    return NextResponse.json(
      { error: meta.error.issues[0].message, code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  // WHY extension-or-MIME check: browsers are inconsistent with MIME reporting for
  // .txt (sometimes empty string), so we canonicalise via the helper that checks
  // both. Rejecting here — before touching the DB or filesystem — is cheaper than
  // extracting text from a unsupported format.
  const kind = resolveFileKind({ name: file.name, type: file.type });
  if (!kind) {
    return NextResponse.json(
      { error: "Only PDF and TXT files are supported.", code: "UNSUPPORTED_TYPE" },
      { status: 400 }
    );
  }

  // WHY sanitise here, not when storing: the DB column holds the cleaned name so
  // it's never re-sanitised and never leaks the original (potentially hostile) path.
  const sanitizedName = sanitizeFilename(file.name);

  const buffer = await file.arrayBuffer();
  let rawText: string;

  if (kind === "txt") {
    rawText = new TextDecoder("utf-8").decode(buffer);
  } else {
    // kind === "pdf"
    try {
            // WHY type assertion: pdf-parse v2's ESM type definitions don't annotate a
      // `default` export, but at runtime (via webpack external → require()) the
      // CJS build returns the parse function directly as module.exports.
      const pdfParseModule = (await import("pdf-parse")) as unknown as {
        default: (data: Buffer | Uint8Array) => Promise<{ text: string }>;
      };
      const pdfParse = pdfParseModule.default;
      const data = await pdfParse(Buffer.from(buffer));
      rawText = data.text;
    } catch (err) {
      console.error("[upload] pdf-parse failed:", err);
      return NextResponse.json(
        {
          error: "We couldn't read this PDF. Make sure it's not password-protected or a scanned image.",
          code: "PDF_PARSE_FAILED",
        },
        { status: 400 }
      );
    }
  }

  // WHY trim+check: scanned/image-only PDFs sometimes extract zero visible text,
  // and storing an empty rawText provides zero value for downstream LLM parsing.
  if (!rawText.trim()) {
    return NextResponse.json(
      {
        error: "We couldn't extract any readable text from this file. Is it a scanned image?",
        code: "EMPTY_TEXT",
      },
      { status: 400 }
    );
  }

  const resume = await prisma.resume.create({
    data: {
      userId: session.user.id,
      fileName: sanitizedName,
      rawText,
      // parsedData stays null — Phase 2 will populate it via askBrain.
    },
  });

  return NextResponse.json(
    { ok: true, id: resume.id, fileName: resume.fileName },
    { status: 201 }
  );
}

// WHY a named helper (not inline): sanitising filenames is a security concern
// that deserves a one-liner you can grep for in code review. It strips directory
// traversal, hidden-file prefixes, and OS-special characters.
function sanitizeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "resume"; // drop any path prefix
  return base
    .replace(/[^a-zA-Z0-9._-]/g, "_")  // only safe chars
    .replace(/^\.+/, "")                 // no leading dots (hidden file)
    .slice(0, 255) || "resume";          // DB column safety + fallback
}