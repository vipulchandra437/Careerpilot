import { NextResponse } from "next/server";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { toErrorResponse } from "@/lib/api";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "profile");
const MAX_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
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

    const ext = ALLOWED_TYPES[file.type];
    if (!ext) {
      return NextResponse.json(
        { error: "Only JPG, PNG, and WebP images are allowed" },
        { status: 400 },
      );
    }

    const profile = await prisma.studentProfile.findUnique({
      where: { userId: user.id },
      select: { photoUrl: true },
    });

    if (profile?.photoUrl) {
      const oldFile = path.join(process.cwd(), "public", profile.photoUrl);
      await unlink(oldFile).catch(() => {});
    }

    await mkdir(UPLOAD_DIR, { recursive: true });
    const filename = `${user.id}.${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    const resolvedUpload = path.resolve(UPLOAD_DIR);
    const resolvedFile = path.resolve(filepath);
    if (!resolvedFile.startsWith(resolvedUpload)) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    const url = `/uploads/profile/${filename}`;
    await prisma.studentProfile.upsert({
      where: { userId: user.id },
      update: { photoUrl: url },
      create: { userId: user.id, photoUrl: url },
    });

    return NextResponse.json({ url });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE() {
  const user = await requireUser();
  try {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: user.id },
      select: { photoUrl: true },
    });

    if (profile?.photoUrl) {
      const filepath = path.join(process.cwd(), "public", profile.photoUrl);
      await unlink(filepath).catch(() => {});
      await prisma.studentProfile.update({
        where: { userId: user.id },
        data: { photoUrl: null },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
