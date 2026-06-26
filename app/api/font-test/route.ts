import { NextResponse } from "next/server";
import * as fontkit from "fontkit";

function parseFnt(content: string): Set<number> {
  const supported = new Set<number>();
  const matches = content.matchAll(/char id=(\d+)/g);

  for (const match of matches) {
    supported.add(Number(match[1]));
  }

  return supported;
}

function getTTFSupported(buffer: ArrayBuffer): Set<number> {
  // ⚠️ fontkit typing workaround (TS fix)
  const font = (fontkit as any).create(new Uint8Array(buffer));

  const cmap = font.characterSet as number[] | undefined;

  return new Set(cmap || []);
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const fontFile = formData.get("font") as File;
    const testText = (formData.get("text") as string) || "";

    if (!fontFile) {
      return NextResponse.json(
        { error: "No font file provided" },
        { status: 400 }
      );
    }

    const ext = fontFile.name.split(".").pop()?.toLowerCase();
    const buffer = await fontFile.arrayBuffer();

    let supported = new Set<number>();
    let type = "unknown";

    // 🧠 VECTOR FONT (TTF / OTF)
    if (ext === "ttf" || ext === "otf") {
      supported = getTTFSupported(buffer);
      type = "vector";
    }

    // 🧠 BITMAP FONT (.FNT)
    else if (ext === "fnt") {
      const text = new TextDecoder().decode(buffer);
      supported = parseFnt(text);
      type = "bitmap";
    }

    // ❌ unsupported
    else {
      return NextResponse.json(
        { error: "Unsupported font type" },
        { status: 400 }
      );
    }

    // 🧪 TEST CHARACTERS
    const supportedChars: string[] = [];
    const missingChars: string[] = [];

    for (const char of testText) {
      if (char === "\n") continue;

      const code = char.codePointAt(0)!;

      if (supported.has(code)) {
        supportedChars.push(char);
      } else {
        missingChars.push(char);
      }
    }

    return NextResponse.json({
      type,
      supportedCount: supportedChars.length,
      missingCount: missingChars.length,
      supportedChars,
      missingChars,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}