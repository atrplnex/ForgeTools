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

export default function FontTesterTool() {
    const [fntFile, setFntFile] = useState<File | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [testText, setTestText] = useState("ABC123");
    const [glyphMap, setGlyphMap] = useState<Record<string, Glyph>>({});
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

    const parseFnt = (text: string) => {
        const map: Record<string, Glyph> = {};
        const lines = text.split("\n");

        for (const line of lines) {
            if (line.startsWith("char ")) {
                const matchId = /id=(-?\d+)/.exec(line);
                if (!matchId) continue;

                const id = Number(matchId[1]);
                const char = String.fromCharCode(id);

                map[char] = {
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
            setOriginalFntText(text);
            setGlyphMap(parseFnt(text));
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
                                            backgroundSize: `${atlasSize.w}px ${atlasSize.h}px`,
                                            backgroundRepeat: "no-repeat",
                                            imageRendering: "pixelated",
                                            display: "inline-block",
                                            border: "1px solid white", // White border added to represent layer width
                                            boxSizing: "content-box",
                                            // Margin additions to reflect how the offsets look roughly in layout
                                            marginLeft: `${glyph.xoffset}px`,
                                            marginRight: `${Math.max(0, glyph.xadvance - glyph.w - glyph.xoffset)}px`,
                                        }}
                                    />
                                );
                            })}
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