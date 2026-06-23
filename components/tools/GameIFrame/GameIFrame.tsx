"use client";

import { useState } from "react";
import styles from "./GameIFrame.module.css";

const DEVICE_PRESETS: Record<string, { width: number; height: number }> = {
  "mac-13": { width: 1280, height: 800 },
  "mac-16": { width: 1728, height: 1117 },

  iphone14: { width: 393, height: 852 },
  iphoneSE: { width: 375, height: 667 },

  ipad: { width: 820, height: 1180 },

  samsungS23: { width: 360, height: 780 },
  samsungTab: { width: 800, height: 1280 },

  xiaomi: { width: 393, height: 873 },
  huawei: { width: 360, height: 800 },
};

export default function GameIFrame() {
  const [file, setFile] = useState<File | null>(null);
  const [query, setQuery] = useState("");
  const [iframeUrl, setIframeUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const [width, setWidth] = useState(1280);
  const [height, setHeight] = useState(720);

  const [customWidth, setCustomWidth] = useState("");
  const [customHeight, setCustomHeight] = useState("");

  async function upload() {
    if (!file) return;

    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload-game", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Upload failed");
      setLoading(false);
      return;
    }

    let url = data.url;

    if (query.trim()) {
      url += query.startsWith("?") ? query : `?${query}`;
    }

    setIframeUrl(url);
    setLoading(false);
  }

  function setPreset(preset: string) {
    const device = DEVICE_PRESETS[preset];
    if (!device) return;

    setWidth(device.width);
    setHeight(device.height);
  }

  function applyCustomResolution() {
    const w = parseInt(customWidth);
    const h = parseInt(customHeight);

    if (!w || !h) return;

    setWidth(w);
    setHeight(h);
  }

  const isPortrait = height > width;

  const frameWidth = isPortrait ? height : width;
  const frameHeight = isPortrait ? width : height;

  // FIT TO SCREEN
  const MAX_W = 900;
  const MAX_H = 700;

  const scale = Math.min(MAX_W / frameWidth, MAX_H / frameHeight, 1);

  return (
    <div className={styles.wrapper}>
      {/* SIDEBAR */}
      <aside className={styles.sidebar}>
        <div className={styles.header}>
          <h2>Game Tester</h2>
          <p>Device emulator preview</p>
        </div>

        {/* FILE UPLOAD */}
        <div className={styles.card}>
          <label className={styles.label}>Game ZIP</label>
          <input
            type="file"
            accept=".zip"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className={styles.input}
          />
        </div>

        {/* QUERY */}
        <div className={styles.card}>
          <label className={styles.label}>Query Params</label>
          <textarea
            placeholder="demo=true&playerId=229"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={styles.textarea}
          />
        </div>

        {/* DEVICE PRESETS */}
        <div className={styles.card}>
          <label className={styles.label}>Device Presets</label>

          <select
            onChange={(e) => setPreset(e.target.value)}
            className={styles.select}
          >
            <option value="">Select device</option>

            <option value="mac-13">MacBook 13"</option>
            <option value="mac-16">MacBook 16"</option>

            <option value="iphone14">iPhone 14</option>
            <option value="iphoneSE">iPhone SE</option>

            <option value="ipad">iPad</option>

            <option value="samsungS23">Samsung S23</option>
            <option value="samsungTab">Samsung Tab</option>

            <option value="xiaomi">Xiaomi Device</option>
            <option value="huawei">Huawei Device</option>
          </select>
        </div>

        {/* CUSTOM RESOLUTION */}
        <div className={styles.card}>
          <label className={styles.label}>Custom Resolution</label>

          <div className={styles.customRow}>
            <input
              className={styles.inputSize}
              placeholder="Width"
              value={customWidth}
              onChange={(e) => setCustomWidth(e.target.value)}
            />

            <input
              className={styles.inputSize}
              placeholder="Height"
              value={customHeight}
              onChange={(e) => setCustomHeight(e.target.value)}
            />
          </div>

          <button
            onClick={applyCustomResolution}
            className={styles.secondaryButton}
          >
            Apply Custom
          </button>
        </div>

        {/* ACTIONS */}
        <div className={styles.actions}>
          <button
            onClick={upload}
            disabled={loading}
            className={styles.primaryButton}
          >
            {loading ? "Loading..." : "Load Game"}
          </button>
        </div>
      </aside>

      {/* MAIN VIEW */}
      <main className={styles.main}>
        {iframeUrl ? (
          <div className={styles.viewportWrapper}>
            <div
              className={styles.viewport}
              style={{
                width: frameWidth,
                height: frameHeight,
                transform: `scale(${scale})`,
              }}
            >
              <iframe src={iframeUrl} className={styles.iframe} />
            </div>
          </div>
        ) : (
          <div className={styles.placeholder}>
            Upload a game to start preview
          </div>
        )}
      </main>
    </div>
  );
}
