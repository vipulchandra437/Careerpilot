import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { isS3Configured, generatePresignedUploadUrl } from "@/lib/s3";
import { toErrorResponse, validateBody } from "@/lib/api";

const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/markdown",
  "text/plain",
];

const presignSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().refine((t) => ALLOWED_CONTENT_TYPES.includes(t), {
    message: `Content type must be one of: ${ALLOWED_CONTENT_TYPES.join(", ")}`,
  }),
  folder: z.string().max(100).optional(),
});

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .slice(0, 200);
}

export async function POST(request: Request) {
  if (!isS3Configured()) {
    return NextResponse.json(
      { error: "File uploads not configured. Set S3 environment variables." },
      { status: 503 },
    );
  }

  const user = await requireUser();
  try {
    const body = await validateBody(request, presignSchema);

    const uuid = crypto.randomUUID();
    const safeName = sanitizeFilename(body.filename);
    const folder = body.folder ?? "uploads";
    const key = `${folder}/${user.id}/${uuid}-${safeName}`;

    const { uploadUrl, publicUrl } = await generatePresignedUploadUrl(key, body.contentType);

    return NextResponse.json({ uploadUrl, publicUrl, key });
  } catch (error) {
    return toErrorResponse(error);
  }
}
