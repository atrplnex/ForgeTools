import { useRef, useState } from "react";
import styles from "./MockupLayout.module.css";
import type { SceneNode } from "./types";

// ───────────────── DEVICES ─────────────────
const DEVICES = {
  mobile: { w: 393, h: 852 },
  iphone: { w: 390, h: 844 },
  ipad: { w: 820, h: 1180 },
  desktop: { w: 1440, h: 900 },
  mac: { w: 1512, h: 982 },
};

// ───────────────── NODE ─────────────────
const createId = () => Math.random().toString(36).slice(2, 9);

function createNode(name: string, src?: string): SceneNode {
  return {
    id: createId(),
    name,
    type: src ? "image" : "container",
    src,

    x: 100,
    y: 100,
    z: 0,

    rotation: 0,
    scale: 1,
    opacity: 1,

    parentId: null,
    children: [],
  };
}

// ───────────────── TREE OPS ─────────────────
function findNode(nodes: SceneNode[], id: string): SceneNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const f = findNode(n.children, id);
    if (f) return f;
  }
  return null;
}

function removeNode(nodes: SceneNode[], id: string): SceneNode[] {
  return nodes
    .filter((n) => n.id !== id)
    .map((n) => ({
      ...n,
      children: removeNode(n.children, id),
    }));
}

function insertNode(
  nodes: SceneNode[],
  parentId: string,
  node: SceneNode,
): SceneNode[] {
  return nodes.map((n) => {
    if (n.id === parentId) {
      return { ...n, children: [...n.children, node] };
    }

    return { ...n, children: insertNode(n.children, parentId, node) };
  });
}

// ───────────────── REPARENT (FIXED) ─────────────────
function reparent(
  tree: SceneNode[],
  nodeId: string,
  newParentId: string | null
): SceneNode[] {
  let moved: SceneNode | null = null;

  const remove = (nodes: SceneNode[]): SceneNode[] => {
    const result: SceneNode[] = [];

    for (const n of nodes) {
      if (n.id === nodeId) {
        moved = n;
        continue;
      }

      result.push({
        ...n,
        children: remove(n.children),
      });
    }

    return result;
  };

  const cleaned = remove(tree);

  if (!moved) return tree;



  const insert = (nodes: SceneNode[]): SceneNode[] => {
    const result: SceneNode[] = [];

    for (const n of nodes) {
      if (n.id === newParentId) {
        result.push({
          ...n,
          children: [...n.children, moved!],
        });
        continue;
      }

      result.push({
        ...n,
        children: insert(n.children),
      });
    }

    return result;
  };

  return insert(cleaned);
}

// ───────────────── MAIN ─────────────────
export default function MockupLayout() {
  const [tree, setTree] = useState<SceneNode[]>([
    {
      id: "root",
      name: "Main",
      type: "container",
      x: 0,
      y: 0,
      z: 0,
      rotation: 0,
      scale: 1,
      opacity: 1,
      parentId: null,
      children: [],
    },
  ]);

  const [selected, setSelected] = useState<string | null>(null);
  const [device, setDevice] = useState<keyof typeof DEVICES>("desktop");

  // ───────────────── DRAG STATE ─────────────────
  const drag = useRef<{ id: string | null; dx: number; dy: number }>({
    id: null,
    dx: 0,
    dy: 0,
  });

  const dropTarget = useRef<string | null>(null);

  // ───────────────── CANVAS VIEW ─────────────────
  const [zoom, setZoom] = useState(1);
  const pan = useRef({ x: 0, y: 0 });
  const panning = useRef(false);

  const selectedNode = selected ? findNode(tree, selected) : null;

  const size = DEVICES[device];

  // ───────────────── UPLOAD ─────────────────
  const upload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      const node = createNode(file.name, reader.result as string);

      setTree((prev) =>
        selected ? insertNode(prev, selected, node) : [...prev, node],
      );
    };

    reader.readAsDataURL(file);
  };

  // ───────────────── DRAG NODE ─────────────────
  const onMouseDown = (e: React.MouseEvent, id: string) => {
    const n = findNode(tree, id);
    if (!n) return;

    setSelected(id);

    drag.current = {
      id,
      dx: e.clientX - n.x,
      dy: e.clientY - n.y,
    };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const { id, dx, dy } = drag.current;
    if (!id) return;

    setTree((prev) =>
      prev.map((n) => {
        const move = (node: SceneNode): SceneNode => {
          if (node.id === id) {
            return {
              ...node,
              x: e.clientX - dx,
              y: e.clientY - dy,
            };
          }
          return {
            ...node,
            children: node.children.map(move),
          };
        };

        return move(n);
      }),
    );
  };

  const stopDrag = () => {
    const id = drag.current.id;

    if (id && dropTarget.current && id !== dropTarget.current) {
      setTree((prev) => reparent(prev, id, dropTarget.current));
    }

    drag.current.id = null;
    dropTarget.current = null;
  };

  // ───────────────── UPDATE NODE ─────────────────
  const update = (patch: Partial<SceneNode>) => {
    if (!selected) return;

    const apply = (nodes: SceneNode[]): SceneNode[] =>
      nodes.map((n) => {
        if (n.id === selected) return { ...n, ...patch };
        return { ...n, children: apply(n.children) };
      });

    setTree(apply);
  };

  // ───────────────── TREE UI ─────────────────
  const renderTree = (nodes: SceneNode[], depth = 0) =>
    nodes.map((n) => (
      <div
        key={n.id}
        style={{
          marginLeft: depth * 12,
          padding: 4,
          background: dropTarget.current === n.id ? "#22c55e" : "transparent",
        }}
        onMouseEnter={() => (dropTarget.current = n.id)}
        onMouseLeave={() => (dropTarget.current = null)}
        onClick={() => setSelected(n.id)}
      >
        {n.type === "container" ? "📁" : "🖼"} {n.name}
        {renderTree(n.children, depth + 1)}
      </div>
    ));

  // ───────────────── CANVAS RENDER ─────────────────
  const render = (nodes: SceneNode[]): any[] =>
    nodes.flatMap((n) => [
      n.type === "image" && n.src ? (
        <img
          key={n.id}
          src={n.src}
          onMouseDown={(e) => onMouseDown(e, n.id)}
          style={{
            position: "absolute",
            left: n.x,
            top: n.y,
            zIndex: n.z,
            opacity: n.opacity,
            transform: `rotate(${n.rotation}deg) scale(${n.scale})`,
          }}
          draggable={false}
        />
      ) : null,
      ...render(n.children),
    ]);

  // ───────────────── PAN + ZOOM ─────────────────
  const wheel = (e: React.WheelEvent) => {
    setZoom((z) => Math.min(3, Math.max(0.3, z - e.deltaY * 0.001)));
  };

  // ───────────────── UI ─────────────────
  return (
    <div className={styles.wrapper}>
      {/* TOP BAR */}
      <div className={styles.toolbar}>
        <input type="file" onChange={upload} />

        <select
          value={device}
          onChange={(e) => setDevice(e.target.value as any)}
        >
          {Object.keys(DEVICES).map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>

        <button onClick={() => setZoom(1)}>Reset Zoom</button>
      </div>

      <div className={styles.body}>
        {/* TREE */}
        <div className={styles.sidebar}>{renderTree(tree)}</div>

        {/* CANVAS */}
        <div
          className={styles.canvas}
          onMouseMove={onMouseMove}
          onMouseUp={stopDrag}
          onWheel={wheel}
        >
          <div
            style={{
              width: size.w,
              height: size.h,
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
              margin: "auto",
              position: "relative",
            }}
          >
            {render(tree)}
          </div>
        </div>

        {/* INSPECTOR */}
        <div className={styles.inspector}>
          {selectedNode && (
            <>
              <h3>{selectedNode.name}</h3>

              <input
                value={selectedNode.name}
                onChange={(e) => update({ name: e.target.value })}
              />

              <label>Opacity</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={selectedNode.opacity}
                onChange={(e) => update({ opacity: +e.target.value })}
              />

              <label>Rotation</label>
              <input
                type="range"
                min="-180"
                max="180"
                value={selectedNode.rotation}
                onChange={(e) => update({ rotation: +e.target.value })}
              />

              <label>Scale</label>
              <input
                type="range"
                min="0.1"
                max="3"
                step="0.1"
                value={selectedNode.scale}
                onChange={(e) => update({ scale: +e.target.value })}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
