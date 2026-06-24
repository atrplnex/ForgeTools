export type SceneNode = {
  id: string;
  name: string;

  type: "container" | "image";
  src?: string;

  // TRANSFORM (UNITY STYLE)
  x: number;
  y: number;
  z: number;

  rotation: number;
  scale: number;

  opacity: number;

  parentId: string | null;

  children: SceneNode[];
};

export const CANVAS_PRESETS = {
  mobile: { width: 393, height: 852 },
  iphone: { width: 390, height: 844 },
  ipad: { width: 820, height: 1180 },
  desktop: { width: 1440, height: 900 },
  mac: { width: 1512, height: 982 },
};