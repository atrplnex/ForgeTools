import { NextResponse } from "next/server";
import AdmZip from "adm-zip";
import sharp from "sharp";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const files = formData
      .getAll("images")
      .filter((f): f is File => f instanceof File);

    if (!files.length) {
      return new Response("No files uploaded", { status: 400 });
    }

    const zip = new AdmZip();

    let converted = 0;
    let skipped = 0;

    for (const file of files) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const inputBuffer = Buffer.from(arrayBuffer);

        const result = await convertToPng(inputBuffer, file.name);

        if (!result) {
          skipped++;
          continue;
        }

        zip.addFile(result.name, result.buffer);

        converted++;
      } catch (err) {
        console.error(`Failed to convert ${file.name}:`, err);
        skipped++;
      }
    }

    if (converted === 0) {
      return new Response("No files could be converted", { status: 422 });
    }

    const buffer = zip.toBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="png-output.zip"',
        "X-Converted": converted.toString(),
        "X-Skipped": skipped.toString(),
      },
    });
  } catch (err: any) {
    console.error(err);

    return new NextResponse(err?.message || "Server error", {
      status: 500,
    });
  }
}

type ConvertResult =
  | {
      name: string;
      buffer: Buffer;
    }
  | false;

async function convertToPng(
  input: Buffer,
  fileName: string
): Promise<ConvertResult> {
  try {
    const pngBuffer = await sharp(input).png().toBuffer();

    return {
      name: fileName.replace(/\.[^/.]+$/, ".png"),
      buffer: pngBuffer,
    };
  } catch {
    return false;
  }
}