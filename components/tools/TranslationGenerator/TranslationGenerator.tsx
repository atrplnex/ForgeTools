import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import styles from './TranslationGenerator.module.css';

interface SheetInfo {
    name: string;
    selected: boolean;
    headers: Record<string, number>; // { "English": 1, "French": 2 }
    mergedRows: Set<number>;
    data: any[][];
}

interface LanguageInfo {
    name: string;
    selected: boolean;
}

export default function ExcelTranslationConverter() {
    const [fileName, setFileName] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [sheets, setSheets] = useState<SheetInfo[]>([]);
    const [languages, setLanguages] = useState<LanguageInfo[]>([]);

    // Options
    const [prettyPrint, setPrettyPrint] = useState(true);
    const [lowerCaseNames, setLowerCaseNames] = useState(true);

    // Status & Logs
    const [logs, setLogs] = useState<string[]>(['Ready — open an Excel file to begin']);
    const logRef = useRef<HTMLDivElement>(null);

    const addLog = (msg: string) => {
        setLogs(prev => [...prev, msg]);
        setTimeout(() => {
            if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
        }, 10);
    };

    // ─── FILE HANDLING ──────────────────────────────────────────────────

    const processExcelBuffer = (buffer: ArrayBuffer, name: string) => {
        try {
            const wb = XLSX.read(buffer, { type: 'array' });
            const parsedSheets: SheetInfo[] = [];
            const allLangs = new Set<string>();

            wb.SheetNames.forEach(sheetName => {
                const ws = wb.Sheets[sheetName];
                const data = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: null });
                if (data.length === 0) return;

                // Parse merges to skip header/section rows
                const mergedRows = new Set<number>();
                if (ws['!merges']) {
                    ws['!merges'].forEach(range => {
                        for (let r = range.s.r; r <= range.e.r; r++) {
                            mergedRows.add(r);
                        }
                    });
                }

                // Parse headers (row 0 in 0-indexed data)
                const headers: Record<string, number> = {};
                const headerRow = data[0];
                if (headerRow) {
                    for (let c = 1; c < headerRow.length; c++) { // Skip col 0 (Key)
                        const val = headerRow[c];
                        if (val) {
                            const label = String(val).trim();
                            headers[label] = c;
                            allLangs.add(label);
                        }
                    }
                }

                parsedSheets.push({ name: sheetName, selected: true, headers, mergedRows, data });
            });

            setSheets(parsedSheets);
            setLanguages(Array.from(allLangs).sort().map(name => ({ name, selected: true })));
            setFileName(name);

            addLog(`──────────────`);
            addLog(`Opened: ${name} (${parsedSheets.length} sheets mapped)`);
        } catch (err: any) {
            addLog(`Error loading file: ${err.message}`);
        }
    };

    const handleFileUpload = (file: File) => {
        if (!file.name.match(/\.(xlsx|xlsm|xls)$/i)) {
            addLog(`Invalid file type: ${file.name}`);
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            if (e.target?.result) processExcelBuffer(e.target.result as ArrayBuffer, file.name);
        };
        reader.readAsArrayBuffer(file);
    };

    const onDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    };

    const onFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    };

    // ─── GENERATOR ──────────────────────────────────────────────────────

    const generateJSON = async () => {
        const selectedSheets = sheets.filter(s => s.selected);
        const selectedLangs = languages.filter(l => l.selected);

        if (selectedSheets.length === 0) return addLog("Warning: No sheets selected.");
        if (selectedLangs.length === 0) return addLog("Warning: No languages selected.");

        addLog(`──────────────`);
        addLog(`Generation started...`);

        const zip = new JSZip();
        let written = 0;

        for (const lang of selectedLangs) {
            const outData: Record<string, string> = {};
            let skipped = 0;

            for (const sheet of selectedSheets) {
                const colIdx = sheet.headers[lang.name];
                if (colIdx === undefined) continue;

                // Iterate rows starting from 1 (skipping header)
                for (let r = 1; r < sheet.data.length; r++) {
                    const row = sheet.data[r];
                    const key = row[0];
                    if (key === null || key === undefined) continue;

                    if (sheet.mergedRows.has(r)) {
                        skipped++;
                        continue;
                    }

                    const valRaw = row[colIdx];
                    const strVal = valRaw !== null && valRaw !== undefined ? String(valRaw).trim() : "";
                    const keyStr = String(key).trim();

                    // Don't overwrite an existing valid key from a previous sheet with an empty one
                    if (strVal || !(keyStr in outData)) {
                        outData[keyStr] = strVal;
                    }
                }
            }

            // Format Filename
            let safeLabel = lang.name.replace(/\(.*?\)/g, '').trim();
            safeLabel = safeLabel.replace(/[\/\\ ]/g, '_');
            if (lowerCaseNames) safeLabel = safeLabel.toLowerCase();
            const filename = `${safeLabel}.json`;

            const jsonContent = JSON.stringify(outData, null, prettyPrint ? 2 : undefined);
            zip.file(filename, jsonContent);
            written++;

            addLog(`✓ ${filename} — ${Object.keys(outData).length} key(s), ${skipped} row(s) skipped`);
        }

        try {
            const blob = await zip.generateAsync({ type: 'blob' });
            saveAs(blob, fileName ? fileName.replace(/\.[^/.]+$/, "") + "_translations.zip" : "translations.zip");
            addLog(`Success: Downloaded ${written} JSON file(s) in ZIP archive.`);
        } catch (err: any) {
            addLog(`Error generating ZIP: ${err.message}`);
        }
    };

    // ─── RENDER HELPERS ─────────────────────────────────────────────────

    const toggleSheet = (name: string) => {
        setSheets(prev => prev.map(s => s.name === name ? { ...s, selected: !s.selected } : s));
    };

    const toggleLang = (name: string) => {
        setLanguages(prev => prev.map(l => l.name === name ? { ...l, selected: !l.selected } : l));
    };

    return (
        <div className={styles.wrapper}>
            <div className={`${styles.panel} ${isDragging ? styles.panelDragging : ''}`}>
                <h2 className={styles.title}>Translation Generator</h2>
                <div className={styles.sub}>Excel → JSON Exports</div>
                <hr className={styles.hr} />

                {/* Dropzone */}
                <div
                    className={`${styles.dropzone} ${isDragging ? styles.dropzoneDragover : ''}`}
                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={onDrop}
                    onClick={() => document.getElementById('file-upload')?.click()}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                    </svg>
                    {fileName ? fileName : "Drag & Drop Excel File\nor Click to Browse"}
                    <input id="file-upload" type="file" accept=".xlsx,.xlsm,.xls" className={styles.fileInput} style={{ display: 'none' }} onChange={onFileSelect} />
                </div>

                {/* Options */}
                <div className={styles.group}>
                    <div className={styles.lbl}>Output Options</div>
                    <label className={styles.row}>
                        <input type="checkbox" checked={prettyPrint} onChange={e => setPrettyPrint(e.target.checked)} />
                        <span className={styles.hint} style={{ margin: 0, paddingLeft: 4 }}>Pretty-print JSON</span>
                    </label>
                    <label className={styles.row}>
                        <input type="checkbox" checked={lowerCaseNames} onChange={e => setLowerCaseNames(e.target.checked)} />
                        <span className={styles.hint} style={{ margin: 0, paddingLeft: 4 }}>Force lowercase filenames</span>
                    </label>
                </div>
                <hr className={styles.hr} />

                {/* Sheets */}
                <div className={styles.group} style={{ flex: '0 1 auto', minHeight: 0, overflowY: 'auto' }}>
                    <div className={styles.lbl}>Sheets to Merge</div>
                    {sheets.length === 0 ? <div className={styles.hint}>No file loaded</div> : null}
                    <div className={styles.checkboxGrid}>
                    {sheets.map(s => (
                        <label key={s.name} className={styles.row}>
                            <input type="checkbox" checked={s.selected} onChange={() => toggleSheet(s.name)} />
                            <span className={styles.hint} style={{ margin: 0, paddingLeft: 4, color: '#ccc' }}>{s.name}</span>
                        </label>
                    ))}
                    </div>

                    <div className={styles.lbl} style={{ marginTop: '14px' }}>Languages to Export</div>
                    {languages.length === 0 ? <div className={styles.hint}>No file loaded</div> : null}
                    <div className={styles.checkboxGrid}>
                    {languages.map(l => (
                        <label key={l.name} className={styles.row}>
                            <input type="checkbox" checked={l.selected} onChange={() => toggleLang(l.name)} />
                            <span className={styles.hint} style={{ margin: 0, paddingLeft: 4, color: '#ccc' }}>{l.name}</span>
                        </label>
                    ))}
                    </div>
                </div>

                {/* Generate Button */}
                <button
                    className={`${styles.btn} ${styles.btnPlay}`}
                    disabled={!fileName}
                    onClick={generateJSON}
                >
                    Generate ZIP Archive
                </button>

                {/* Logs */}
                <div className={styles.log} ref={logRef}>
                    {logs.map((log, i) => (
                        <div key={i}>{log}</div>
                    ))}
                </div>
            </div>

            {/* Viewport for Preview Data */}
            <div className={styles.viewport}>
                <div className={styles.canvasWrap}>
                    <div className={styles.canvasFrame} style={{ padding: '20px', width: '100%', maxWidth: '800px', height: '600px', overflowY: 'auto' }}>
                        {sheets.length > 0 ? (
                            <div style={{ color: '#aaa', fontSize: '13px' }}>
                                <h3 style={{ color: '#fff', margin: '0 0 10px 0' }}>Data Preview (First Selected Sheet)</h3>
                                {(() => {
                                    const firstActive = sheets.find(s => s.selected);
                                    if (!firstActive) return <div>No sheets selected for preview.</div>;
                                    return (
                                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                            <thead>
                                            <tr style={{ background: '#1c1c21', color: '#fff' }}>
                                                {firstActive.data[0]?.map((h: any, i: number) => (
                                                    <th key={i} style={{ padding: '8px', borderBottom: '1px solid #2e2e38' }}>{h || `Col ${i}`}</th>
                                                ))}
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {firstActive.data.slice(1, 50).map((row, ri) => {
                                                const isMerged = firstActive.mergedRows.has(ri + 1); // ri+1 because we sliced index 0
                                                return (
                                                    <tr key={ri} style={{ opacity: isMerged ? 0.3 : 1, background: isMerged ? '#3a1c1c' : 'transparent' }}>
                                                        {firstActive.data[0]?.map((_, ci) => (
                                                            <td key={ci} style={{ padding: '6px 8px', borderBottom: '1px solid #1c1c21' }}>
                                                                {row[ci] !== undefined && row[ci] !== null ? String(row[ci]) : ''}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                );
                                            })}
                                            </tbody>
                                        </table>
                                    );
                                })()}
                                {sheets.find(s => s.selected)?.data.length && sheets.find(s => s.selected)!.data.length > 50 && (
                                    <div style={{ padding: '10px 0', textAlign: 'center', opacity: 0.5 }}>... preview limited to 50 rows ...</div>
                                )}
                            </div>
                        ) : (
                            <div className={styles.overlay} style={{ color: '#555', fontSize: '16px' }}>
                                Preview area — Load an Excel file to see table contents.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}