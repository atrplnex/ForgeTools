import { NextResponse } from "next/server";
import sharp from "sharp";
import JSZip from "jszip";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    console.log("Entries:");
    for (const [key, value] of formData.entries()) {
      console.log(key, value);
    }

    console.log("Files:", formData.getAll("files"));

    const files = formData
      .getAll("files")
      .filter((f): f is File => f instanceof File);

    const quality = Number(formData.get("quality")) || 80;

    if (!files.length) {
      return new Response("No files uploaded", { status: 400 });
    }

    const zip = new JSZip();

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const webpBuffer = await sharp(buffer).webp({ quality }).toBuffer();
      const fileName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
      zip.file(fileName, webpBuffer);
    }

    const content = await zip.generateAsync({ type: "nodebuffer" });

    return new Response(new Uint8Array(content), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": "attachment; filename=converted.zip",
      },
    });
  } catch (err: any) {
    console.error("CONVERSION ERROR:", err);

    return new Response(err?.message || "Server error", { status: 500 });
  }
}
