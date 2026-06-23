'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import styles from './DragonBoneTester.module.css';

declare const PIXI: any;
declare const dragonBones: any;

type Orientation = 'landscape' | 'portrait';
type DotState    = 'idle' | 'ok' | 'bad';
type LogColor    = 'green' | 'red' | 'orange';

const RESOLUTIONS = {
  landscape: { w: 1280, h: 720  },
  portrait:  { w: 720,  h: 1280 },
} as const;

// ── helpers ───────────────────────────────────────────────────────────────────
function readAs(file: File, mode: 'buffer' | 'url' | 'text'): Promise<any> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload  = e => res(e.target!.result);
    r.onerror = () => rej(new Error('Read failed'));
    if      (mode === 'buffer') r.readAsArrayBuffer(file);
    else if (mode === 'url')    r.readAsDataURL(file);
    else                        r.readAsText(file);
  });
}

// ── component ─────────────────────────────────────────────────────────────────
export default function DragonBonesPreviewer() {

  // DOM refs
  const viewportRef   = useRef<HTMLDivElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const frameRef      = useRef<HTMLDivElement>(null);
  const panelRef      = useRef<HTMLDivElement>(null);

  // PIXI / DragonBones refs (never cause re-renders)
  const appRef          = useRef<any>(null);
  const factoryRef      = useRef<any>(null);
  const displayRef      = useRef<any>(null);
  const loadedDbName    = useRef<string | null>(null);
  const loadedTexName   = useRef<string | null>(null);

  // cache
  const cacheRef = useRef<{
    ske: any; skeBinary: boolean; tex: any; png: string | null;
  }>({ ske: null, skeBinary: false, tex: null, png: null });

  // pan / zoom
  const zoom      = useRef(1);
  const pan       = useRef({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart  = useRef({ x: 0, y: 0 });
  const handMode  = useRef(false);
  const spaceHeld = useRef(false);
  const playingRef= useRef(false);
  const resizeTmr = useRef<ReturnType<typeof setTimeout> | null>(null);

  // UI state
  const [orientation, setOrientation] = useState<Orientation>('landscape');
  const [armatures,   setArmatures]   = useState<string[]>([]);
  const [animations,  setAnimations]  = useState<string[]>([]);
  const [selArm,      setSelArm]      = useState('');
  const [selAnim,     setSelAnim]     = useState('');
  const [selLoop,     setSelLoop]     = useState('0');
  const [speed,       setSpeed]       = useState(1);
  const [playing,     setPlaying]     = useState(false);
  const [zoomLabel,   setZoomLabel]   = useState('100%');
  const [handOn,      setHandOn]      = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [dots, setDots] = useState<Record<'ske'|'tex'|'png', DotState>>({ ske:'idle', tex:'idle', png:'idle' });
  const [isDragging,  setIsDragging]  = useState(false);
  const [isDropover,  setIsDropover]  = useState(false);
  const [log, setLog] = useState<{ msg: string; color: LogColor }>({ msg: 'Waiting for files…', color: 'orange' });

  const pushLog = useCallback((msg: string, color: LogColor = 'orange') => setLog({ msg, color }), []);

  // ── fit ─────────────────────────────────────────────────────────────────────
  const fitCanvas = useCallback((orient: Orientation = orientation) => {
    const wrap = canvasWrapRef.current;
    const vp   = viewportRef.current;
    if (!wrap || !vp) return;
    const res   = RESOLUTIONS[orient];
    const scale = Math.min((vp.clientWidth - 40) / res.w, (vp.clientHeight - 40) / res.h, 1);
    wrap.style.transform = `scale(${scale})`;
    wrap.style.width     = res.w + 'px';
    wrap.style.height    = res.h + 'px';
    if (appRef.current) appRef.current.renderer.resize(res.w, res.h);
  }, [orientation]);

  // ── transform ───────────────────────────────────────────────────────────────
  const applyTransform = useCallback(() => {
    const d = displayRef.current;
    if (!d) return;
    d.x = pan.current.x;
    d.y = pan.current.y;
    d.scale.set(zoom.current);
    setZoomLabel(Math.round(zoom.current * 100) + '%');
  }, []);

  const centre = useCallback(() => {
    const app = appRef.current;
    if (!app || !displayRef.current) return;
    zoom.current = 1;
    pan.current  = { x: app.screen.width / 2, y: app.screen.height / 2 };
    applyTransform();
  }, [applyTransform]);

  const zoomBy = useCallback((factor: number) => {
    zoom.current = Math.max(0.05, Math.min(8, zoom.current * factor));
    applyTransform();
  }, [applyTransform]);

  // ── hand mode ────────────────────────────────────────────────────────────────
  const setHandMode = useCallback((on: boolean) => {
    handMode.current = on;
    setHandOn(on);
  }, []);

  // ── clear DragonBones ────────────────────────────────────────────────────────
  const clearDragonBones = useCallback(() => {
    const app     = appRef.current;
    const factory = factoryRef.current;
    if (!app || !factory) return;

    if (displayRef.current) {
      try { displayRef.current.animation.stop(); } catch (_) {}
      app.stage.removeChild(displayRef.current);
      try { displayRef.current.dispose(); }       catch (_) {}
      displayRef.current = null;
    }
    app.ticker.stop();

    if (loadedDbName.current) {
      try { factory.removeDragonBonesData(loadedDbName.current, true); } catch (_) {}
      loadedDbName.current = null;
    }
    if (loadedTexName.current) {
      try { factory.removeTextureAtlasData(loadedTexName.current, true); } catch (_) {}
      loadedTexName.current = null;
    }
    try { (window as any).dragonBones.WorldClock.clock.clear(); } catch (_) {}
  }, []);

  // ── doPlay ───────────────────────────────────────────────────────────────────
  const doPlay = useCallback((animName: string, loopVal?: string, speedVal?: number) => {
    const d = displayRef.current;
    if (!d) return;
    d.animation.play(animName, parseInt(loopVal ?? selLoop, 10));
    d.animation.timeScale = speedVal ?? speed;
    playingRef.current = true;
    setPlaying(true);
    setSelAnim(animName);
  }, [selLoop, speed]);

  // ── buildArmature ─────────────────────────────────────────────────────────────
  const buildArmature = useCallback((name: string) => {
    const app     = appRef.current;
    const factory = factoryRef.current;
    if (!app || !factory) return;

    if (displayRef.current) {
      app.stage.removeChild(displayRef.current);
      try { displayRef.current.dispose(); } catch (_) {}
      displayRef.current = null;
    }

    const disp = factory.buildArmatureDisplay(name);
    if (!disp) { pushLog('✖ buildArmatureDisplay returned null', 'red'); return; }
    displayRef.current = disp;

    app.stage.addChild(disp);
    centre();

    const anims: string[] = disp.animation.animationNames;
    setAnimations(anims);

    app.ticker.start();
    doPlay(anims[0]);
    setShowOverlay(false);
    pushLog(`✔ "${name}"  ·  ${anims.length} animation(s)`, 'green');
  }, [centre, doPlay, pushLog]);

  // ── tryBuild ─────────────────────────────────────────────────────────────────
  const tryBuild = useCallback(() => {
    const c = cacheRef.current;
    if (!c.ske || !c.tex || !c.png) return;
    pushLog('Building…');
    try {
      clearDragonBones();

      const factory = factoryRef.current!;
      const dbData  = factory.parseDragonBonesData(c.ske);
      if (!dbData) throw new Error('parseDragonBonesData returned null');
      loadedDbName.current = dbData.name;

      const img     = new Image();
      img.src       = c.png!;
      const _PIXI   = (window as any).PIXI;
      const baseTex = new _PIXI.BaseTexture(img);
      const pixiTex = new _PIXI.Texture(baseTex);
      const texData = factory.parseTextureAtlasData(c.tex, pixiTex);
      loadedTexName.current = texData?.name ?? null;

      setArmatures(dbData.armatureNames);
      setSelArm(dbData.armatureNames[0]);
      buildArmature(dbData.armatureNames[0]);

    } catch (err: any) {
      pushLog('✖ ' + err.message, 'red');
      console.error(err);
    }
  }, [clearDragonBones, buildArmature, pushLog]);

  // ── resetCache ───────────────────────────────────────────────────────────────
  const resetCache = useCallback(() => {
    cacheRef.current = { ske: null, skeBinary: false, tex: null, png: null };
    setDots({ ske: 'idle', tex: 'idle', png: 'idle' });
    setArmatures([]); setSelArm('');
    setAnimations([]); setSelAnim('');
    setPlaying(false); playingRef.current = false;
  }, []);

  // ── loadFiles ────────────────────────────────────────────────────────────────
  const loadFiles = useCallback(async (files: File[]) => {
    resetCache();
    pushLog('Reading files…');
    await Promise.all(files.map(async file => {
      const name = file.name;
      try {
        if (name.endsWith('.dbbin') || (name.endsWith('.json') && name.includes('ske'))) {
          const bin = name.endsWith('.dbbin');
          cacheRef.current.ske      = bin ? await readAs(file, 'buffer') : JSON.parse(await readAs(file, 'text'));
          cacheRef.current.skeBinary = bin;
          setDots(d => ({ ...d, ske: 'ok' }));
        } else if (name.endsWith('.json')) {
          cacheRef.current.tex = JSON.parse(await readAs(file, 'text'));
          setDots(d => ({ ...d, tex: 'ok' }));
        } else if (name.endsWith('.png')) {
          cacheRef.current.png = await readAs(file, 'url');
          setDots(d => ({ ...d, png: 'ok' }));
        }
      } catch (err: any) {
        pushLog('✖ ' + name + ': ' + err.message, 'red');
      }
    }));
    tryBuild();
  }, [resetCache, pushLog, tryBuild]);

  // ── load script helper ───────────────────────────────────────────────────────
  function loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // skip if already loaded
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const s = document.createElement('script');
      s.src = src;
      s.onload  = () => resolve();
      s.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(s);
    });
  }

  // ── mount: load scripts then boot PIXI + DragonBones ─────────────────────────
  useEffect(() => {
    let destroyed = false;
    let app: any = null;

    async function init() {
      try {
        // load in order — pixi first, then dragonbones (depends on pixi)
        await loadScript('/libs/pixi.min.js');
        await loadScript('/libs/dragonbones.js');

        if (destroyed) return;

        const frame = frameRef.current!;
        const res   = RESOLUTIONS.landscape;
        app = new (window as any).PIXI.Application({
          width: res.w, height: res.h,
          backgroundColor: 0x111113,
          antialias: true,
        });
        frame.appendChild(app.view);
        appRef.current     = app;
        factoryRef.current = (window as any).dragonBones.PixiFactory.factory;
        fitCanvas('landscape');

        const onResize = () => {
          if (resizeTmr.current) clearTimeout(resizeTmr.current);
          resizeTmr.current = setTimeout(() => { fitCanvas(); centre(); }, 100);
        };
        window.addEventListener('resize', onResize);
        // store cleanup
        (appRef as any)._onResize = onResize;

      } catch (err: any) {
        pushLog('✖ Script load failed: ' + err.message, 'red');
        console.error(err);
      }
    }

    init();

    return () => {
      destroyed = true;
      const onResize = (appRef as any)._onResize;
      if (onResize) window.removeEventListener('resize', onResize);
      if (app) {
        try { app.destroy(true, { children: true, texture: true, baseTexture: true }); } catch (_) {}
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── orientation change ───────────────────────────────────────────────────────
  const onOrientChange = (o: Orientation) => {
    setOrientation(o);
    frameRef.current!.className = `${styles.canvasFrame} ${styles[o]}`;
    fitCanvas(o);
    centre();
  };

  // ── mouse: pan + wheel zoom ──────────────────────────────────────────────────
  useEffect(() => {
    const frame = frameRef.current!;

    const onMouseDown = (e: MouseEvent) => {
      if (!(handMode.current || spaceHeld.current || e.button === 1 || e.button === 2)) return;
      isPanning.current = true;
      panStart.current  = { x: e.clientX - pan.current.x, y: e.clientY - pan.current.y };
      frame.classList.add(styles.grabbing);
      e.preventDefault();
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isPanning.current) return;
      pan.current = { x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y };
      applyTransform();
    };
    const onMouseUp = () => {
      isPanning.current = false;
      frame.classList.remove(styles.grabbing);
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!displayRef.current) return;
      const rect   = appRef.current.view.getBoundingClientRect();
      const mx     = e.clientX - rect.left;
      const my     = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const nz     = Math.max(0.05, Math.min(8, zoom.current * factor));
      pan.current  = { x: mx + (pan.current.x - mx) * (nz / zoom.current), y: my + (pan.current.y - my) * (nz / zoom.current) };
      zoom.current = nz;
      applyTransform();
    };
    const onContext = (e: MouseEvent) => e.preventDefault();

    frame.addEventListener('mousedown',   onMouseDown);
    frame.addEventListener('wheel',       onWheel, { passive: false });
    frame.addEventListener('contextmenu', onContext);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup',   onMouseUp);
    return () => {
      frame.removeEventListener('mousedown',   onMouseDown);
      frame.removeEventListener('wheel',       onWheel);
      frame.removeEventListener('contextmenu', onContext);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup',   onMouseUp);
    };
  }, [applyTransform]);

  // ── keyboard shortcuts ───────────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'SELECT') return;
      if (e.key === 'h' || e.key === 'H') setHandMode(!handMode.current);
      if (e.key === 'Escape') setHandMode(false);
      if (e.code === 'Space' && !spaceHeld.current && !handMode.current) {
        spaceHeld.current = true;
        frameRef.current?.classList.add(styles.handMode);
        e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && spaceHeld.current) {
        spaceHeld.current = false;
        if (!handMode.current) frameRef.current?.classList.remove(styles.handMode);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup',   onKeyUp);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup',   onKeyUp);
    };
  }, [setHandMode]);

  // ── drag & drop on panel ─────────────────────────────────────────────────────
  const onDragEnter = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); setIsDropover(true); };
  const onDragOver  = (e: React.DragEvent) => { e.preventDefault(); };
  const onDragLeave = (e: React.DragEvent) => {
    if (!panelRef.current?.contains(e.relatedTarget as Node)) { setIsDragging(false); setIsDropover(false); }
  };
  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false); setIsDropover(false);
    await loadFiles([...e.dataTransfer.files]);
  };

  // ── derived ──────────────────────────────────────────────────────────────────
  const hasDisplay = animations.length > 0;
  const dotCls = (s: DotState) => `${styles.dot} ${s === 'ok' ? styles.dotOk : s === 'bad' ? styles.dotBad : ''}`;
  const logBorder = log.color === 'green' ? '#2ecc71' : log.color === 'red' ? '#ef4444' : '#ff9800';
  const logColor  = log.color === 'green' ? '#85e0a3' : log.color === 'red' ? '#fca5a5' : '#ffb74d';

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <div className={styles.wrapper}>

      {/* VIEWPORT */}
      <div className={styles.viewport} ref={viewportRef}>
        <div className={styles.canvasWrap} ref={canvasWrapRef}>
          <div ref={frameRef} className={`${styles.canvasFrame} ${styles.landscape}`}>

            {showOverlay && (
              <div className={styles.overlay}>Load skeleton, atlas &amp; sprite sheet</div>
            )}

            <div className={styles.zoomControls}>
              <div
                className={`${styles.zoomBtn} ${handOn ? styles.zoomBtnActive : ''}`}
                title="Hand tool (H)"
                onClick={() => setHandMode(!handMode.current)}
              >✋</div>
              <div className={styles.zoomBtn} title="Zoom in"   onClick={() => zoomBy(1.2)}>+</div>
              <div className={styles.zoomBtn} title="Zoom out"  onClick={() => zoomBy(1 / 1.2)}>−</div>
              <div className={styles.zoomBtn} title="Reset view" onClick={centre}>⌖</div>
              <div className={styles.zoomLabel}>{zoomLabel}</div>
            </div>
          </div>
        </div>
      </div>

      {/* PANEL */}
      <div
        ref={panelRef}
        className={`${styles.panel} ${isDragging ? styles.panelDragging : ''}`}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div>
          <h2 className={styles.title}>DragonBones Previewer</h2>
          <div className={styles.sub}>Real runtime · actual keyframes</div>
        </div>

        <hr className={styles.hr} />

        {/* Orientation */}
        <div className={styles.group}>
          <label className={styles.lbl}>Canvas Orientation</label>
          <select className={styles.select} value={orientation} onChange={e => onOrientChange(e.target.value as Orientation)}>
            <option value="landscape">Landscape  1280 × 720</option>
            <option value="portrait">Portrait  720 × 1280</option>
          </select>
        </div>

        <hr className={styles.hr} />

        {/* Dropzone */}
        <div className={`${styles.dropzone} ${isDropover ? styles.dropzoneDragover : ''}`}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          Drop all 3 files here<br />
          <span style={{ fontSize: 10, color: '#2a2a3a' }}>or use pickers below</span>
        </div>

        {/* File pickers */}
        <div className={styles.group}>
          <label className={styles.lbl}>Files — load all three</label>

          <div className={styles.fileRow}>
            <div className={dotCls(dots.ske)} />
            <input className={styles.fileInput} type="file" accept=".dbbin,.json"
              onChange={e => e.target.files?.[0] && loadFiles([e.target.files[0]])} />
          </div>
          <div className={styles.hint}>_ske.dbbin  or  _ske.json</div>

          <div className={styles.fileRow} style={{ marginTop: 5 }}>
            <div className={dotCls(dots.tex)} />
            <input className={styles.fileInput} type="file" accept=".json"
              onChange={e => e.target.files?.[0] && loadFiles([e.target.files[0]])} />
          </div>
          <div className={styles.hint}>_tex.json</div>

          <div className={styles.fileRow} style={{ marginTop: 5 }}>
            <div className={dotCls(dots.png)} />
            <input className={styles.fileInput} type="file" accept=".png"
              onChange={e => e.target.files?.[0] && loadFiles([e.target.files[0]])} />
          </div>
          <div className={styles.hint}>_tex.png</div>
        </div>

        <hr className={styles.hr} />

        {/* Armature */}
        <div className={styles.group}>
          <label className={styles.lbl}>Armature</label>
          <select className={styles.select} value={selArm} disabled={!hasDisplay}
            onChange={e => { setSelArm(e.target.value); buildArmature(e.target.value); }}>
            {armatures.length === 0
              ? <option>—</option>
              : armatures.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {/* Animation */}
        <div className={styles.group}>
          <label className={styles.lbl}>Animation</label>
          <select className={styles.select} value={selAnim} disabled={!hasDisplay}
            onChange={e => { doPlay(e.target.value); pushLog(`Playing: "${e.target.value}"`); }}>
            {animations.length === 0
              ? <option>—</option>
              : animations.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {/* Loop */}
        <div className={styles.group}>
          <label className={styles.lbl}>Loop  (0 = infinite)</label>
          <select className={styles.select} value={selLoop} disabled={!hasDisplay}
            onChange={e => { setSelLoop(e.target.value); if (playing && displayRef.current) doPlay(selAnim, e.target.value); }}>
            <option value="0">Infinite</option>
            <option value="1">1×</option>
            <option value="2">2×</option>
            <option value="3">3×</option>
          </select>
        </div>

        {/* Speed */}
        <div className={styles.group}>
          <label className={styles.lbl}>Speed</label>
          <div className={styles.sliderRow}>
            <input className={styles.slider} type="range" min={0.1} max={3} step={0.05} value={speed}
              disabled={!hasDisplay}
              onChange={e => {
                const v = parseFloat(e.target.value);
                setSpeed(v);
                if (displayRef.current) displayRef.current.animation.timeScale = v;
              }} />
            <span className={styles.speedVal}>{speed.toFixed(2)}×</span>
          </div>
        </div>

        {/* Play / Stop */}
        <div className={styles.row}>
          <button className={`${styles.btn} ${styles.btnPlay}`} disabled={!hasDisplay} onClick={() => {
            const d = displayRef.current;
            if (!d) return;
            if (playingRef.current) {
              d.animation.stop();
              playingRef.current = false;
              setPlaying(false);
            } else {
              d.animation.play(selAnim);
              playingRef.current = true;
              setPlaying(true);
            }
          }}>
            {playing ? '⏸ Pause' : '▶ Play'}
          </button>
          <button className={styles.btn} disabled={!hasDisplay} style={{ width: 36 }} onClick={() => {
            displayRef.current?.animation.stop();
            playingRef.current = false;
            setPlaying(false);
          }}>■</button>
        </div>

        {/* Log */}
        <div className={styles.log} style={{ borderColor: logBorder, color: logColor }}>
          {log.msg}
        </div>
      </div>
    </div>
  );
}