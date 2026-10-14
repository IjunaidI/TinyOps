import { useLayoutEffect, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const matteVertexMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.91,
  metalness: 0,
});

/** Collapse authored matte colors into a single vertex-colored draw call. */
export function Baked({ children }: { children: ReactNode }) {
  const group = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    const root = group.current;
    if (!root) return;
    root.updateWorldMatrix(true, true);
    const inverse = root.matrixWorld.clone().invert();
    const buckets = new Map<
      string,
      {
        material: THREE.Material;
        shadow: boolean;
        parts: THREE.BufferGeometry[];
      }
    >();
    const originals: THREE.Mesh[] = [],
      batches: THREE.Mesh[] = [];
    root.traverse((object) => {
      if (
        !(object instanceof THREE.Mesh) ||
        object.userData.dynamic ||
        !object.visible ||
        Array.isArray(object.material)
      )
        return;
      let parent = object.parent;
      while (parent && parent !== root) {
        if (parent.userData.dynamic) return;
        parent = parent.parent;
      }
      const geometry = object.geometry.index
        ? object.geometry.toNonIndexed()
        : object.geometry.clone();
      geometry.applyMatrix4(
        new THREE.Matrix4().multiplyMatrices(inverse, object.matrixWorld),
      );
      if (!geometry.attributes.uv)
        geometry.setAttribute(
          "uv",
          new THREE.BufferAttribute(
            new Float32Array(geometry.attributes.position.count * 2),
            2,
          ),
        );
      const authoredMaterial = object.material;
      const isMatte =
        authoredMaterial instanceof THREE.MeshStandardMaterial &&
        !authoredMaterial.map &&
        !authoredMaterial.transparent &&
        authoredMaterial.emissive.getHex() === 0;
      let material = authoredMaterial;
      if (isMatte) {
        const color = authoredMaterial.color,
          colors = new Float32Array(geometry.attributes.position.count * 3);
        for (let i = 0; i < colors.length; i += 3) {
          colors[i] = color.r;
          colors[i + 1] = color.g;
          colors[i + 2] = color.b;
        }
        geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        material = matteVertexMaterial;
      }
      const key = material.uuid + String(object.castShadow);
      if (!buckets.has(key))
        buckets.set(key, { material, shadow: object.castShadow, parts: [] });
      buckets.get(key)!.parts.push(geometry);
      originals.push(object);
    });
    for (const bucket of buckets.values()) {
      const geometry = mergeGeometries(bucket.parts, false);
      bucket.parts.forEach((part) => part.dispose());
      if (!geometry) continue;
      const mesh = new THREE.Mesh(geometry, bucket.material);
      mesh.castShadow = bucket.shadow;
      mesh.receiveShadow = true;
      root.add(mesh);
      batches.push(mesh);
    }
    originals.forEach((object) => (object.visible = false));
    return () => {
      originals.forEach((object) => (object.visible = true));
      batches.forEach((mesh) => {
        root.remove(mesh);
        mesh.geometry.dispose();
      });
    };
  }, []);
  return <group ref={group}>{children}</group>;
}
