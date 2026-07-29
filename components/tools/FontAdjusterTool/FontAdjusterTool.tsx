"use client";
import { useEffect, useMemo, useState } from "react";
import styles from "./FontAdjusterTool.module.css";

type Glyph = {
    id: number;
    x: number;
    y: number;
    w: number;
    h: number;
    xoffset: number;
    yoffset: number;
    xadvance: number;
};

type FontCommon = {
    lineHeight: number;
    base: number;
};

// A character positioned with real pixel coordinates, computed from a manual
// "pen position" walk across testText (mirrors how a bitmap-font renderer
// actually lays out glyphs) instead of relying on the browser's own inline
// layout/alignment rules.
type PositionedChar =
    | { kind: "glyph"; key: string; glyph: Glyph; x: number; y: number }
    | { kind: "missing"; key: string; x: number; y: number; size: number };

const DEFAULT_COMMON: FontCommon = { lineHeight: 32, base: 26 };

export default function FontTesterTool() {
    const [fntFile, setFntFile] = useState<File | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [testText, setTestText] = useState("ABC123");
    const [glyphMap, setGlyphMap] = useState<Record<string, Glyph>>({});
    const [fontCommon, setFontCommon] = useState<FontCommon>(DEFAULT_COMMON);
    const [originalFntText, setOriginalFntText] = useState<string>("");
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

    // Typical xadvance for this font, used only as a stand-in width for
    // characters that have no glyph entry so the preview doesn't collapse
    // them to zero width.
    const fallbackAdvance = useMemo(() => {
        const advances = Object.values(glyphMap)
            .map((g) => g.xadvance)
            .filter((v) => v > 0);

        if (!advances.length) return 16;
        return Math.round(advances.reduce((a, b) => a + b, 0) / advances.length);
    }, [glyphMap]);

    // Walks testText character-by-character the way a bitmap-font renderer
    // actually does: a "pen" starts at (0,0), each glyph is drawn at
    // pen + (xoffset, yoffset), and the pen then advances by xadvance.
    // An explicit "\n" resets the pen to the next line using the FNT's own
    // lineHeight. Producing real pixel coordinates here (instead of leaning
    // on inline-block flow + margins) is what removes the auto-align issue.
    const layout = useMemo(() => {
        const chars: PositionedChar[] = [];
        let penX = 0;
        let penY = 0;
        let maxWidth = 0;
        let lineCount = 1;

        Array.from(testText).forEach((char, i) => {
            if (char === "\n") {
                maxWidth = Math.max(maxWidth, penX);
                penX = 0;
                penY += fontCommon.lineHeight;
                lineCount += 1;
                return;
            }

            const code = char.codePointAt(0)!;
            const glyph =
                glyphMap[char] ?? glyphMap[String(code)] ?? glyphMap[code.toString()];

            if (!glyph) {
                chars.push({ kind: "missing", key: `${i}`, x: penX, y: penY, size: fallbackAdvance });
                penX += fallbackAdvance;
                return;
            }

            chars.push({
                kind: "glyph",
                key: `${i}`,
                glyph,
                x: penX + glyph.xoffset,
                y: penY + glyph.yoffset,
            });
            penX += glyph.xadvance;
        });

        maxWidth = Math.max(maxWidth, penX);

        return {
            chars,
            width: Math.max(maxWidth, 1),
            height: penY + fontCommon.lineHeight,
            lineCount,
        };
    }, [testText, glyphMap, fontCommon, fallbackAdvance]);

    const parseFnt = (text: string): { glyphs: Record<string, Glyph>; common: FontCommon } => {
        const glyphs: Record<string, Glyph> = {};
        let common: FontCommon = { ...DEFAULT_COMMON };
        const lines = text.split("\n");

        for (const line of lines) {
            // "common" carries the line metrics (lineHeight/base) needed to lay
            // out multiple lines and position glyphs vertically the way a real
            // bitmap-font renderer would, rather than approximating them.
            if (line.startsWith("common ")) {
                common = {
                    lineHeight: Number(/lineHeight=(-?\d+)/.exec(line)?.[1] ?? common.lineHeight),
                    base: Number(/base=(-?\d+)/.exec(line)?.[1] ?? common.base),
                };
                continue;
            }

            if (line.startsWith("char ")) {
                const matchId = /id=(-?\d+)/.exec(line);
                if (!matchId) continue;

                const id = Number(matchId[1]);
                const char = String.fromCharCode(id);

                glyphs[char] = {
                    id,
                    x: Number(/x=(-?\d+)/.exec(line)?.[1] ?? 0),
                    y: Number(/y=(-?\d+)/.exec(line)?.[1] ?? 0),
                    w: Number(/width=(-?\d+)/.exec(line)?.[1] ?? 0),
                    h: Number(/height=(-?\d+)/.exec(line)?.[1] ?? 0),
                    xoffset: Number(/xoffset=(-?\d+)/.exec(line)?.[1] ?? 0),
                    yoffset: Number(/yoffset=(-?\d+)/.exec(line)?.[1] ?? 0),
                    xadvance: Number(/xadvance=(-?\d+)/.exec(line)?.[1] ?? 0),
                };
            }
        }

        return { glyphs, common };
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
            setOriginalFntText(text);
            const parsed = parseFnt(text);
            setGlyphMap(parsed.glyphs);
            setFontCommon(parsed.common);
        };

        input.click();
    };

    const updateGlyph = (char: string, field: keyof Glyph, value: number) => {
        setGlyphMap((prev) => ({
            ...prev,
            [char]: {
                ...prev[char],
                [field]: value,
            },
        }));
    };

    const exportEditedFnt = () => {
        if (!originalFntText) return;

        const lines = originalFntText.split("\n");
        const updatedLines = lines.map((line) => {
            // Only process lines that declare a character
            if (line.startsWith("char ")) {
                const match = /id=(-?\d+)/.exec(line);
                if (match) {
                    const id = Number(match[1]);
                    const char = String.fromCharCode(id);
                    const glyph = glyphMap[char];

                    if (glyph) {
                        let newLine = line;
                        // Replace exact parameters using boundary logic to prevent cross-contamination
                        newLine = newLine.replace(/\bx=(-?\d+)/, `x=${glyph.x}`);
                        newLine = newLine.replace(/\by=(-?\d+)/, `y=${glyph.y}`);
                        newLine = newLine.replace(/\bwidth=(-?\d+)/, `width=${glyph.w}`);
                        newLine = newLine.replace(/\bheight=(-?\d+)/, `height=${glyph.h}`);
                        newLine = newLine.replace(/\bxoffset=(-?\d+)/, `xoffset=${glyph.xoffset}`);
                        newLine = newLine.replace(/\byoffset=(-?\d+)/, `yoffset=${glyph.yoffset}`);
                        newLine = newLine.replace(/\bxadvance=(-?\d+)/, `xadvance=${glyph.xadvance}`);
                        return newLine;
                    }
                }
            }
            return line;
        });

        const blob = new Blob([updatedLines.join("\n")], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fntFile ? fntFile.name.replace(".fnt", "_adjusted.fnt") : "adjusted.fnt";
        a.click();
        URL.revokeObjectURL(url);
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
                <div className={styles.card} style={{ marginBottom: "1rem" }}>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "baseline",
                            marginBottom: "0.5rem",
                        }}
                    >
                        <h2 style={{ margin: 0 }}>Preview</h2>
                        {atlasUrl && (
                            <span style={{ fontSize: "0.8rem", color: "#888" }}>
                                Line Height: {fontCommon.lineHeight}px · Base: {fontCommon.base}px
                            </span>
                        )}
                    </div>

                    <div className={styles.preview} style={{ overflow: "auto" }}>
                        {!atlasUrl && (
                            <div className={styles.empty}>
                                Load a font atlas to start previewing.
                            </div>
                        )}

                        {atlasUrl && (
                            // Fixed-size position:relative canvas: every glyph below is placed with
                            // position:absolute at the exact pixel coordinates computed in `layout`,
                            // so nothing here is subject to the browser's own inline-block/baseline
                            // auto-alignment — coordinates come only from the FNT's x/y/offset/advance
                            // values (and any edits made to them).
                            <div
                                style={{
                                    position: "relative",
                                    width: layout.width,
                                    height: Math.max(layout.height, fontCommon.lineHeight),
                                }}
                            >
                                {Array.from({ length: layout.lineCount }).map((_, line) => (
                                    <div
                                        key={`baseline-${line}`}
                                        style={{
                                            position: "absolute",
                                            left: 0,
                                            top: line * fontCommon.lineHeight + fontCommon.base,
                                            width: "100%",
                                            borderTop: "1px dashed rgba(255,255,255,0.25)",
                                            pointerEvents: "none",
                                        }}
                                    />
                                ))}

                                {layout.chars.map((c) =>
                                    c.kind === "missing" ? (
                                        <div
                                            key={c.key}
                                            className={styles.missingGlyph}
                                            style={{
                                                position: "absolute",
                                                left: c.x,
                                                top: c.y,
                                                width: c.size,
                                                height: c.size,
                                                boxSizing: "border-box",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                            }}
                                        >
                                            ?
                                        </div>
                                    ) : (
                                        <div
                                            key={c.key}
                                            style={{
                                                position: "absolute",
                                                left: c.x,
                                                top: c.y,
                                                width: c.glyph.w,
                                                height: c.glyph.h,
                                                backgroundImage: `url(${atlasUrl})`,
                                                backgroundPosition: `-${c.glyph.x}px -${c.glyph.y}px`,
                                                backgroundSize: `${atlasSize.w}px ${atlasSize.h}px`,
                                                backgroundRepeat: "no-repeat",
                                                imageRendering: "pixelated",
                                                border: "1px solid white", // White border added to represent layer width
                                                boxSizing: "content-box",
                                            }}
                                        />
                                    )
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Glyph Editor */}
                {Object.keys(glyphMap).length > 0 && (
                    <div className={styles.card}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                            <h2 style={{ margin: 0 }}>Glyph Editor</h2>
                            <button className={styles.button} onClick={exportEditedFnt}>
                                Export Adjusted .FNT
                            </button>
                        </div>

                        <div style={{ maxHeight: "400px", overflowY: "auto", border: "1px solid #ccc", borderRadius: "4px", padding: "0.5rem" }}>
                            <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                                <thead>
                                <tr style={{ borderBottom: "1px solid #eee" }}>
                                    <th style={{ padding: "4px" }}>Char</th>
                                    <th style={{ padding: "4px" }}>X</th>
                                    <th style={{ padding: "4px" }}>Y</th>
                                    <th style={{ padding: "4px" }}>W</th>
                                    <th style={{ padding: "4px" }}>H</th>
                                    <th style={{ padding: "4px" }}>X-Off</th>
                                    <th style={{ padding: "4px" }}>Y-Off</th>
                                    <th style={{ padding: "4px" }}>X-Adv</th>
                                    <th style={{ padding: "4px", color: "#666" }}>Total Width</th>
                                </tr>
                                </thead>
                                <tbody>
                                {Object.entries(glyphMap).map(([char, glyph]) => (
                                    <tr key={char} style={{ borderBottom: "1px solid #f9f9f9" }}>
                                        <td style={{ padding: "4px", fontWeight: "bold" }}>
                                            {char === " " ? "Space" : char}
                                        </td>
                                        <td style={{ padding: "4px" }}>
                                            <input
                                                type="number"
                                                value={glyph.x}
                                                onChange={(e) => updateGlyph(char, "x", Number(e.target.value))}
                                                style={{ width: "55px" }}
                                            />
                                        </td>
                                        <td style={{ padding: "4px" }}>
                                            <input
                                                type="number"
                                                value={glyph.y}
                                                onChange={(e) => updateGlyph(char, "y", Number(e.target.value))}
                                                style={{ width: "55px" }}
                                            />
                                        </td>
                                        <td style={{ padding: "4px" }}>
                                            <input
                                                type="number"
                                                value={glyph.w}
                                                onChange={(e) => updateGlyph(char, "w", Number(e.target.value))}
                                                style={{ width: "55px" }}
                                            />
                                        </td>
                                        <td style={{ padding: "4px" }}>
                                            <input
                                                type="number"
                                                value={glyph.h}
                                                onChange={(e) => updateGlyph(char, "h", Number(e.target.value))}
                                                style={{ width: "55px" }}
                                            />
                                        </td>
                                        <td style={{ padding: "4px" }}>
                                            <input
                                                type="number"
                                                value={glyph.xoffset}
                                                onChange={(e) => updateGlyph(char, "xoffset", Number(e.target.value))}
                                                style={{ width: "55px" }}
                                            />
                                        </td>
                                        <td style={{ padding: "4px" }}>
                                            <input
                                                type="number"
                                                value={glyph.yoffset}
                                                onChange={(e) => updateGlyph(char, "yoffset", Number(e.target.value))}
                                                style={{ width: "55px" }}
                                            />
                                        </td>
                                        <td style={{ padding: "4px" }}>
                                            <input
                                                type="number"
                                                value={glyph.xadvance}
                                                onChange={(e) => updateGlyph(char, "xadvance", Number(e.target.value))}
                                                style={{ width: "55px" }}
                                            />
                                        </td>
                                        <td style={{ padding: "4px", color: "#666" }}>
                                            <input
                                                type="number"
                                                value={glyph.xoffset + glyph.w}
                                                readOnly
                                                style={{ width: "55px", backgroundColor: "#f0f0f0", border: "1px solid #ddd" }}
                                                title="xoffset + width"
                                            />
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}