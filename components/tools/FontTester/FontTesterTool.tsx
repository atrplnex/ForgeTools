"use client";
import { useEffect, useMemo, useState } from "react";
import styles from "./FontTesterTool.module.css";

type Glyph = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export default function FontTesterTool() {
  const [fntFile, setFntFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [testText, setTestText] = useState("ABC123");
  const [glyphMap, setGlyphMap] = useState<Record<string, Glyph>>({});

  const atlasUrl = useMemo(() => {
    if (!imageFile) return null;
    return URL.createObjectURL(imageFile);
  }, [imageFile]);

  useEffect(() => {
    return () => {
      if (atlasUrl) {
        URL.revokeObjectURL(atlasUrl);
      }
    };
  }, [atlasUrl]);
  const parseFnt = (text: string) => {
    const map: Record<string, Glyph> = {};

    const regex =
      /char id=(\d+)\s+x=(\d+)\s+y=(\d+)\s+width=(\d+)\s+height=(\d+)/g;

    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const char = String.fromCharCode(Number(match[1]));

      map[char] = {
        x: Number(match[2]),
        y: Number(match[3]),
        w: Number(match[4]),
        h: Number(match[5]),
      };
    }

    return map;
  };
  const loadFont = () => {
    const input = document.createElement("input");

    input.type = "file";
    input.accept = ".fnt";

    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];

      if (!file) return;

      setFntFile(file);

      const text = await file.text();

      setGlyphMap(parseFnt(text));
    };

    input.click();
  };
  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        {/* Assets */}
        <div className={styles.card}>
          <h2>Assets</h2>

          <div className={styles.fileGrid}>
            {/* Font */}
            <div className={styles.fileCard}>
              <div className={styles.fileIcon}>🅰️ Font</div>

              <div className={styles.fileInfo}>
                <span className={styles.fileLabel}>Font File</span>
                <span className={styles.fileName}>
                  {fntFile?.name ?? "No .FNT selected"}
                </span>
              </div>

              <button className={styles.button} onClick={loadFont}>
                Browse
              </button>
            </div>

            {/* Atlas */}
            <div className={styles.fileCard}>
              <div className={styles.fileIcon}>🖼️ Image</div>

              <div className={styles.fileInfo}>
                <span className={styles.fileLabel}>Atlas Image</span>
                <span className={styles.fileName}>
                  {imageFile?.name ?? "No image selected"}
                </span>
              </div>

              <button
                className={styles.button}
                onClick={() => {
                  const input = document.createElement("input");

                  input.type = "file";
                  input.accept = "image/*";

                  input.onchange = (e: any) => {
                    const file = e.target.files?.[0];

                    if (file) {
                      setImageFile(file);
                    }
                  };

                  input.click();
                }}
              >
                Browse
              </button>
            </div>
          </div>
        </div>

        {/* Test Text */}
        <div className={styles.card}>
          <h2>Test Text</h2>

          <textarea
            className={styles.textarea}
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            placeholder="Type text to preview..."
          />

          <div className={styles.textInfo}>
            <span>{testText.length} Characters</span>
            <span>{Object.keys(glyphMap).length} Glyphs Loaded</span>
          </div>
        </div>
      </aside>

      <main className={styles.viewer}>
        {/* Preview */}
        <div className={styles.card}>
          <div className={styles.preview}>
            {!atlasUrl && (
              <div className={styles.empty}>
                Load a font atlas to start previewing.
              </div>
            )}

            {atlasUrl &&
              Array.from(testText).map((char, i) => {
                if (char === "\n") {
                  return <div key={i} className={styles.lineBreak} />;
                }

                const code = char.codePointAt(0)!;

                const glyph =
                  glyphMap[char] ??
                  glyphMap[String(code)] ??
                  glyphMap[code.toString()];

                if (!glyph) {
                  return (
                    <div key={i} className={styles.missingGlyph}>
                      ?
                    </div>
                  );
                }

                return (
                  <div
                    key={i}
                    style={{
                      width: glyph.w,
                      height: glyph.h,
                      backgroundImage: `url(${atlasUrl})`,
                      backgroundPosition: `-${glyph.x}px -${glyph.y}px`,
                      backgroundRepeat: "no-repeat",
                      imageRendering: "pixelated",
                    }}
                  />
                );
              })}
          </div>
        </div>
      </main>
    </div>
  );
}
