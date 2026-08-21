import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { toErrorResponse } from "@/lib/api";

const MAX_SIZE = 2 * 1024 * 1024;
const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": "image/jpeg",
  "image/png": "image/png",
  "image/webp": "image/webp",
};

export async function POST(request: Request) {
  const user = await requireUser();
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File must be under 2MB" }, { status: 400 });
    }

    const mime = ALLOWED_MIME[file.type];
    if (!mime) {
      return NextResponse.json(
        { error: "Only JPG, PNG, and WebP images are allowed" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const ext = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
    const dataUrl = `data:${mime};base64,${base64}`;
    const url = `/api/profile/photo/file/${user.id}.${ext}`;

    await prisma.studentProfile.upsert({
      where: { userId: user.id },
      update: { photoUrl: dataUrl },
      create: { userId: user.id, photoUrl: dataUrl },
    });

    return NextResponse.json({ url: dataUrl });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE() {
  const user = await requireUser();
  try {
    await prisma.studentProfile.update({
      where: { userId: user.id },
      data: { photoUrl: null },
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
