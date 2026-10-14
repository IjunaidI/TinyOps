import { useMemo } from "react";
import * as THREE from "three";
import { lampGlass } from "./Atmosphere";

export const palette = {
  grass: "#afc7a8",
  verge: "#cbdac1",
  water: "#6aabaa",
  asphalt: "#73808a",
  edge: "#a3b3be",
  cream: "#e7ecee",
  orange: "#d69372",
  roof: "#b98480",
  dark: "#3b4e5a",
  leaf: "#7da28b",
  leaf2: "#a1bd92",
};
const box = new THREE.BoxGeometry(1, 1, 1);
const cylinder = new THREE.CylinderGeometry(1, 1, 1, 10);
const sphere = new THREE.IcosahedronGeometry(1, 0);
const cone = new THREE.ConeGeometry(1, 1, 7);
const materials = new Map<string, THREE.MeshStandardMaterial>();
export function mat(color: string, emissive = false) {
  const key = color + (emissive ? "!" : "");
  if (!materials.has(key))
    materials.set(
      key,
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.91,
        metalness: 0,
        ...(emissive ? { emissive: color, emissiveIntensity: 0.65 } : {}),
      }),
    );
  return materials.get(key)!;
}
export function Box({
  position = [0, 0, 0],
  scale = [1, 1, 1],
  color = palette.cream,
  rotation = [0, 0, 0],
  shadow = true,
  emissive = false,
}: {
  position?: [number, number, number];
  scale?: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
  shadow?: boolean;
  emissive?: boolean;
}) {
  return (
    <mesh
      geometry={box}
      material={mat(color, emissive)}
      position={position}
      scale={scale}
      rotation={rotation}
      castShadow={shadow}
      receiveShadow
    />
  );
}
export function Cylinder({
  position = [0, 0, 0],
  scale = [1, 1, 1],
  color = palette.dark,
  rotation = [0, 0, 0],
  shadow = true,
}: {
  position?: [number, number, number];
  scale?: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
  shadow?: boolean;
}) {
  return (
    <mesh
      geometry={cylinder}
      material={mat(color)}
      position={position}
      scale={scale}
      rotation={rotation}
      castShadow={shadow}
      receiveShadow
    />
  );
}
export function Ball({
  position = [0, 0, 0],
  scale = [1, 1, 1],
  color = palette.leaf,
}: {
  position?: [number, number, number];
  scale?: [number, number, number];
  color?: string;
}) {
  return (
    <mesh
      geometry={sphere}
      material={mat(color)}
      position={position}
      scale={scale}
      castShadow
      receiveShadow
    />
  );
}
export function Cone({
  position = [0, 0, 0],
  scale = [1, 1, 1],
  color = palette.leaf,
}: {
  position?: [number, number, number];
  scale?: [number, number, number];
  color?: string;
}) {
  return (
    <mesh
      geometry={cone}
      material={mat(color)}
      position={position}
      scale={scale}
      castShadow
      receiveShadow
    />
  );
}
const roofGeometry = (() => {
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [
        -0.5, 0, -0.5, 0.5, 0, -0.5, 0, 1, -0.5, -0.5, 0, 0.5, 0, 1, 0.5, 0.5,
        0, 0.5, -0.5, 0, -0.5, 0, 1, -0.5, 0, 1, 0.5, -0.5, 0, -0.5, 0, 1, 0.5,
        -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0, 0.5, 0, 1, 0.5, 0.5, 0, -0.5, 0, 1,
        0.5, 0, 1, -0.5, -0.5, 0, -0.5, -0.5, 0, 0.5, 0.5, 0, 0.5, -0.5, 0,
        -0.5, 0.5, 0, 0.5, 0.5, 0, -0.5,
      ],
      3,
    ),
  );
  // The authored prism vertices wind inward; reverse each face before computing normals.
  const positions = g.getAttribute("position");
  for (let i = 0; i < positions.count; i += 3) {
    const x = positions.getX(i + 1),
      y = positions.getY(i + 1),
      z = positions.getZ(i + 1);
    positions.setXYZ(
      i + 1,
      positions.getX(i + 2),
      positions.getY(i + 2),
      positions.getZ(i + 2),
    );
    positions.setXYZ(i + 2, x, y, z);
  }
  g.computeVertexNormals();
  return g;
})();
export function Roof({
  position,
  scale,
  color = palette.roof,
}: {
  position: [number, number, number];
  scale: [number, number, number];
  color?: string;
}) {
  return (
    <mesh
      geometry={roofGeometry}
      material={mat(color)}
      position={position}
      scale={scale}
      castShadow
      receiveShadow
    />
  );
}
const labels = new Map<string, THREE.CanvasTexture>();
export function Sign({
  text,
  position,
  width = 5,
  height = 1,
  color = "#405663",
  background = "#edf1f4",
  rotation = [0, 0, 0],
  font = 600,
}: {
  text: string;
  position: [number, number, number];
  width?: number;
  height?: number;
  color?: string;
  background?: string;
  rotation?: [number, number, number];
  font?: number;
}) {
  const texture = useMemo(() => {
    const key = [text, color, background, font].join(":");
    if (labels.has(key)) return labels.get(key)!;
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, 496, 112);
    ctx.font = `${font} 48px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = color;
    ctx.fillText(text, 256, 66, 450);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    labels.set(key, t);
    return t;
  }, [text, color, background, font]);
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} />
    </mesh>
  );
}
export function Tree({
  x,
  z,
  size = 1,
  pine = false,
}: {
  x: number;
  z: number;
  size?: number;
  pine?: boolean;
}) {
  return (
    <group position={[x, 0, z]} scale={size}>
      <Cylinder
        position={[0, 1.4, 0]}
        scale={[0.21, 2.8, 0.21]}
        color="#947659"
      />
      {pine ? (
        <>
          <Cone
            position={[0, 3.1, 0]}
            scale={[1.3, 3.2, 1.3]}
            color="#769985"
          />
          <Cone
            position={[0, 4.3, 0]}
            scale={[0.94, 2.7, 0.94]}
            color="#90af93"
          />
        </>
      ) : (
        <>
          <Ball
            position={[0, 3.25, 0]}
            scale={[1.55, 1.8, 1.45]}
            color={palette.leaf}
          />
          <Ball
            position={[0.78, 3.15, 0.26]}
            scale={[1.12, 1.37, 1.13]}
            color={palette.leaf2}
          />
          <Ball
            position={[-0.35, 4.03, -0.12]}
            scale={[1.15, 1.27, 1.11]}
            color="#b6ca9c"
          />
        </>
      )}
      <Cylinder
        position={[0, 0.08, 0]}
        scale={[1.4, 0.13, 1.4]}
        color="#bacfa8"
        shadow={false}
      />
    </group>
  );
}
export function Lamp({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <Cylinder
        position={[0, 1.85, 0]}
        scale={[0.09, 3.7, 0.09]}
        color="#647580"
      />
      <Box
        position={[0.28, 3.6, 0]}
        scale={[0.7, 0.13, 0.16]}
        color="#647580"
      />
      <mesh
        position={[0.53, 3.52, 0]}
        scale={[0.52, 0.15, 0.35]}
        material={lampGlass}
      >
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
      <Cylinder position={[0, 0.13, 0]} scale={[0.23, 0.26, 0.23]} />
    </group>
  );
}
export function Bench({
  x,
  z,
  rotation = 0,
}: {
  x: number;
  z: number;
  rotation?: number;
}) {
  return (
    <group position={[x, 0, z]} rotation={[0, rotation, 0]}>
      <Box position={[0, 0.62, 0]} scale={[2, 0.18, 0.7]} color="#b89668" />
      <Box position={[0, 1.06, -0.3]} scale={[2, 0.7, 0.12]} color="#bd9b70" />
      {[-0.65, 0.65].map((v) => (
        <Box
          key={v}
          position={[v, 0.27, 0]}
          scale={[0.15, 0.55, 0.65]}
          color="#5b7079"
        />
      ))}
    </group>
  );
}
export function Crate({
  x,
  z,
  y = 0.45,
}: {
  x: number;
  z: number;
  y?: number;
}) {
  return (
    <group position={[x, y, z]}>
      <Box scale={[0.9, 0.9, 0.9]} color="#c5a476" />
      <Box position={[0, 0.46, 0]} scale={[0.15, 0.02, 0.92]} color="#eee0ba" />
      <Box position={[0, 0, 0.46]} scale={[0.15, 0.9, 0.015]} color="#eee0ba" />
    </group>
  );
}
