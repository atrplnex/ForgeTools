import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const gameId = Date.now().toString();

  const extractPath = path.join(
    process.cwd(),
    "public",
    "games",
    gameId
  );

  fs.mkdirSync(extractPath, { recursive: true });

  const zip = new AdmZip(buffer);
  zip.extractAllTo(extractPath, true);

  // 🔥 KEY FIX: detect web-mobile folder
  const webMobilePath = path.join(extractPath, "web-mobile");

  if (!fs.existsSync(webMobilePath)) {
    return NextResponse.json(
      { error: "web-mobile folder not found in build" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    url: `/games/${gameId}/web-mobile/index.html`,
  });
}