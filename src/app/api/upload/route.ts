import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// On Vercel (serverless), use /tmp for temporary storage
// For production, replace with cloud storage (S3, Cloudinary, etc.)
const getUploadDir = () => {
  if (process.env.VERCEL) {
    return "/tmp/uploads";
  }
  return path.join(process.cwd(), "uploads");
};

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const caseId = formData.get("caseId") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!caseId) {
      return NextResponse.json({ error: "Case ID required" }, { status: 400 });
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 400 });
    }

    // Create upload directory
    const baseDir = getUploadDir();
    const uploadDir = path.join(baseDir, caseId);
    await mkdir(uploadDir, { recursive: true });

    // Generate unique filename
    const ext = path.extname(file.name);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const timestamp = Date.now();
    const fileName = `${timestamp}_${safeName}`;
    const filePath = path.join(uploadDir, fileName);

    // Write file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Save to database
    const caseFile = await prisma.caseFile.create({
      data: {
        caseId,
        fileName: file.name,
        fileType: file.type || ext,
        filePath: `/uploads/${caseId}/${fileName}`,
        fileSize: file.size,
      },
    });

    return NextResponse.json(caseFile, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
