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
  const [fontSize, setFontSize] = useState(32);
  const [atlasSize, setAtlasSize] = useState({ w: 0, h: 0 });

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

  useEffect(() => {
    if (!imageFile) return;

    const img = new Image();
    img.src = URL.createObjectURL(imageFile);

    img.onload = () => {
      setAtlasSize({ w: img.width, h: img.height });
    };
  }, [imageFile]);

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

  // Shared handlers so both "Browse" click and drag-and-drop use the same logic
  const handleFontFile = async (file: File) => {
    if (!file) return;

    setFntFile(file);

    const text = await file.text();

    setGlyphMap(parseFnt(text));
  };

  const handleImageFile = (file: File) => {
    if (!file) return;

    setImageFile(file);
  };

  const loadFont = () => {
    const input = document.createElement("input");

    input.type = "file";
    input.accept = ".fnt";

    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];

      if (!file) return;

      handleFontFile(file);
    };

    input.click();
  };

  const getGlyph = (char: string) => {
    const code = char.codePointAt(0)!;

    return (
      glyphMap[char] ??
      glyphMap[String(code)] ??
      glyphMap[code.toString()] ??
      null
    );
  };

  const missingGlyphs = useMemo(() => {
    const set = new Set<string>();

    for (const char of Array.from(testText)) {
      if (char === "\n") continue;

      if (!getGlyph(char)) {
        set.add(char);
      }
    }

    return Array.from(set);
  }, [testText, glyphMap]);

  // Drag-and-drop helpers
  const preventDefault = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleFontDrop = (e: React.DragEvent) => {
    preventDefault(e);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFontFile(file);
  };

  const handleImageDrop = (e: React.DragEvent) => {
    preventDefault(e);
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageFile(file);
  };

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        {/* Assets */}
        <div className={styles.card}>
          <h2>Assets</h2>

          <div className={styles.fileGrid}>
            {/* Font */}
            <div
              className={styles.fileCard}
              onDragOver={preventDefault}
              onDragEnter={preventDefault}
              onDrop={handleFontDrop}
            >
              <div className={styles.fileIcon}>🅰️ Font</div>

              <div className={styles.fileInfo}>
                <span className={styles.fileName}>
                  {fntFile?.name ?? "No .FNT selected"}
                </span>
              </div>

              <button className={styles.button} onClick={loadFont}>
                Browse
              </button>
            </div>

            {/* Atlas */}
            <div
              className={styles.fileCard}
              onDragOver={preventDefault}
              onDragEnter={preventDefault}
              onDrop={handleImageDrop}
            >
              <div className={styles.fileIcon}>🖼️ Image</div>

              <div className={styles.fileInfo}>
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
                      handleImageFile(file);
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
        {/* Font Size*/}
        <div className={styles.fontControl}>
          <div className={styles.fontHeader}>
            <span className={styles.fontLabel}>Font Size</span>
            <span className={styles.fontValue}>{fontSize}px</span>
          </div>

          <input
            type="number"
            min={1}
            max={200}
            value={fontSize}
            onChange={(e) => {
              const v = Math.min(200, Math.max(1, Number(e.target.value) || 1));
              setFontSize(v);
            }}
            className={styles.fontInput}
          />
        </div>

        {/* Missing Glyphs */}
        <div className={styles.card}>
          <h2>Missing Glyphs</h2>

          {missingGlyphs.length === 0 ? (
            <div className={styles.ok}>All glyphs found ✅</div>
          ) : (
            <div className={styles.missingList}>
              {missingGlyphs.map((c, i) => (
                <span key={i} className={styles.missingItem}>
                  {c === " " ? "␠" : c}
                </span>
              ))}
            </div>
          )}
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
                const scale = fontSize / 32; // pick 32 as your base font size

                return (
                  <div
                    key={i}
                    style={{
                      width: glyph.w * scale,
                      height: glyph.h * scale,

                      backgroundImage: `url(${atlasUrl})`,

                      // 🔥 IMPORTANT FIX
                      backgroundPosition: `-${glyph.x * scale}px -${glyph.y * scale}px`,
                      backgroundSize: `${atlasSize.w * scale}px ${atlasSize.h * scale}px`,

                      backgroundRepeat: "no-repeat",

                      imageRendering: "pixelated",
                      display: "inline-block",
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