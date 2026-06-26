import { NextResponse } from "next/server";
import AdmZip from "adm-zip";
import * as plist from "plist";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const files = formData
      .getAll("files")
      .filter((f): f is File => f instanceof File);

    if (!files.length) {
      return new Response("No files uploaded", { status: 400 });
    }

    const zip = new AdmZip();

    let converted = 0;
    let skipped = 0;

    for (const file of files) {
      try {
        const text = await file.text();
        const data = JSON.parse(text);

        const result = convertJsonToPlist(data, file.name);

        if (!result) {
          skipped++;
          continue;
        }

        const plistXml = plist.build(result.plist);

        zip.addFile(result.name, Buffer.from(plistXml, "utf8"));

        converted++;
      } catch (err) {
        console.error(`Failed to convert ${file.name}:`, err);
        skipped++;
      }
    }

    const buffer = zip.toBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition":
          'attachment; filename="plist-output.zip"',
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

type PlistResult =
  | {
      name: string;
      plist: any;
    }
  | false;

function convertJsonToPlist(
  data: any,
  fileName: string
): PlistResult {
  try {
    if (!data?.frames || !data?.meta) return false;

    const frames: Record<string, any> = {};

    for (const [key, f] of Object.entries<any>(data.frames)) {
      const w = f.spriteSourceSize.w;
      const h = f.spriteSourceSize.h;

      frames[`${key}.png`] = {
        frame: `{{${f.frame.x},${f.frame.y}},{{${f.frame.w},${f.frame.h}}}}`,
        offset: "{0,0}",
        rotated: f.rotated,
        sourceColorRect: `{{0,0},{${w},${h}}}`,
        sourceSize: `{${w},${h}}`,
      };
    }

    return {
      name: fileName.replace(/\.json$/, ".plist"),
      plist: {
        frames,
        metadata: {
          format: 2,
          pixelFormat: data.meta.format ?? "RGBA8888",
          premultiplyAlpha: false,
          realTextureFileName: data.meta.image,
          size: `{${data.meta.size.w},${data.meta.size.h}}`,
          textureFileName: fileName.replace(/\.json$/, ".png"),
        },
      },
    };
  } catch {
    return false;
  }
}