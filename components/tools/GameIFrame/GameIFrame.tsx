"use client";

import { useEffect, useState } from "react";
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

  const [rotated, setRotated] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);

  const [maxSize, setMaxSize] = useState({
    width: 900,
    height: 700,
  });

  useEffect(() => {
    const updateSize = () => {
      setMaxSize({
        width: Math.max(window.innerWidth - 420, 300),
        height: Math.max(window.innerHeight - 80, 300),
      });

      if (autoRotate) {
        setRotated(window.innerWidth > window.innerHeight);
      }
    };

    updateSize();

    window.addEventListener("resize", updateSize);

    return () => {
      window.removeEventListener("resize", updateSize);
    };
  }, [autoRotate]);

  async function upload() {
    if (!file) return;

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload-game", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Upload failed");
        return;
      }

      let url = data.url;

      if (query.trim()) {
        url += query.startsWith("?")
          ? query
          : `?${query}`;
      }

      setIframeUrl(url);
    } finally {
      setLoading(false);
    }
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

  function rotateDevice() {
    setRotated((prev) => !prev);
  }

  const frameWidth = rotated ? height : width;
  const frameHeight = rotated ? width : height;

  const scale = Math.min(
    maxSize.width / frameWidth,
    maxSize.height / frameHeight,
    1
  );

  return (
    <div className={styles.wrapper}>
      <aside className={styles.sidebar}>
        <div className={styles.header}>
          <h2>Game Tester</h2>
          <p>Device emulator preview</p>
        </div>

        <div className={styles.card}>
          <label className={styles.label}>Game ZIP</label>

          <input
            type="file"
            accept=".zip"
            className={styles.input}
            onChange={(e) =>
              setFile(e.target.files?.[0] || null)
            }
          />
        </div>

        <div className={styles.card}>
          <label className={styles.label}>
            Query Params
          </label>

          <textarea
            placeholder="demo=true&playerId=229"
            value={query}
            onChange={(e) =>
              setQuery(e.target.value)
            }
            className={styles.textarea}
          />
        </div>

        <div className={styles.card}>
          <label className={styles.label}>
            Device Presets
          </label>

          <select
            onChange={(e) =>
              setPreset(e.target.value)
            }
            className={styles.select}
          >
            <option value="">
              Select device
            </option>

            <option value="mac-13">
              MacBook 13"
            </option>

            <option value="mac-16">
              MacBook 16"
            </option>

            <option value="iphone14">
              iPhone 14
            </option>

            <option value="iphoneSE">
              iPhone SE
            </option>

            <option value="ipad">
              iPad
            </option>

            <option value="samsungS23">
              Samsung S23
            </option>

            <option value="samsungTab">
              Samsung Tab
            </option>

            <option value="xiaomi">
              Xiaomi Device
            </option>

            <option value="huawei">
              Huawei Device
            </option>
          </select>
        </div>

        <div className={styles.card}>
          <label className={styles.label}>
            Custom Resolution
          </label>

          <div className={styles.customRow}>
            <input
              className={styles.inputSize}
              placeholder="Width"
              value={customWidth}
              onChange={(e) =>
                setCustomWidth(e.target.value)
              }
            />

            <input
              className={styles.inputSize}
              placeholder="Height"
              value={customHeight}
              onChange={(e) =>
                setCustomHeight(e.target.value)
              }
            />
          </div>

          <button
            onClick={applyCustomResolution}
            className={styles.secondaryButton}
          >
            Apply Custom
          </button>
        </div>

        <div className={styles.card}>
          <label className={styles.label}>
            Orientation
          </label>

          <button
            onClick={rotateDevice}
            className={styles.secondaryButton}
          >
            Rotate Device
          </button>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "12px",
            }}
          >
            <input
              type="checkbox"
              checked={autoRotate}
              onChange={(e) =>
                setAutoRotate(
                  e.target.checked
                )
              }
            />
            Auto Rotate
          </label>

          <div
            style={{
              marginTop: "10px",
              opacity: 0.8,
            }}
          >
            {frameWidth} × {frameHeight}
          </div>
        </div>

        <div className={styles.actions}>
          <button
            onClick={upload}
            disabled={loading}
            className={styles.primaryButton}
          >
            {loading
              ? "Loading..."
              : "Load Game"}
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        {iframeUrl ? (
          <div className={styles.viewportWrapper}>
            <div
              className={styles.viewport}
              style={{
                width: frameWidth,
                height: frameHeight,
                transform: `scale(${scale})`,
                transformOrigin:
                  "center center",
              }}
            >
              <iframe
                key={`${frameWidth}-${frameHeight}`}
                src={iframeUrl}
                className={styles.iframe}
              />
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