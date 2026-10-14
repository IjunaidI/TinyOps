import type { SceneState } from "./sceneTypes";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export const windowGlass = new THREE.MeshStandardMaterial({
  color: "#647f7b",
  emissive: "#ffc775",
  emissiveIntensity: 0,
  roughness: 0.55,
});
export const depotGlass = windowGlass.clone();
export const lampGlass = new THREE.MeshStandardMaterial({
  color: "#fff1c2",
  emissive: "#ffc775",
  emissiveIntensity: 0.1,
});
export function nightAmount(game: SceneState) {
  return THREE.MathUtils.smoothstep(
    game.daylight ?? Math.min(1, game.time / 360),
    0.28,
    0.94,
  );
}
export function updateNightMaterials(game: SceneState) {
  const night = nightAmount(game);
  windowGlass.color.set("#647f7b").lerp(new THREE.Color("#ffddab"), night);
  windowGlass.emissiveIntensity = night * 1.65;
  lampGlass.emissiveIntensity = 0.08 + night * 2;
  depotGlass.copy(windowGlass);
  if (game.incidents.some((i) => i.kind === "power")) {
    depotGlass.color.set("#334344");
    depotGlass.emissiveIntensity = 0;
  }
}
const glowVertex = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.); }`;
const glowFragment = `uniform float night; varying vec2 vUv; void main(){float d=length((vUv-.5)*2.); float a=pow(max(0.,1.-d),1.7)*night*.38; gl_FragColor=vec4(1.,.72,.33,a);}`;
export function NightDetails({ game }: { game: SceneState }) {
  const pools = useRef<THREE.InstancedMesh>(null),
    reflection = useRef<THREE.InstancedMesh>(null);
  const glow = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: glowVertex,
        fragmentShader: glowFragment,
        uniforms: { night: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  const reflectionMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#ffd28d",
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }) => {
    const night = nightAmount(game);
    glow.uniforms.night.value = night;
    reflectionMaterial.opacity = night * 0.32;
    let k = 0;
    for (const z of [-34, -16, 2, 20, 36])
      for (const x of [-8.35, 8.35]) {
        dummy.position.set(x + 0.53, 0.425, z);
        dummy.rotation.set(-Math.PI / 2, 0, 0);
        dummy.scale.set(9, 8, 1);
        dummy.updateMatrix();
        pools.current?.setMatrixAt(k++, dummy.matrix);
      }
    if (pools.current) pools.current.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < 30; i++) {
      const z = [-34, -16, 2, 20, 36][Math.floor(i / 6)];
      dummy.position.set(
        (i % 2 ? 1 : -1) * (4 - (i % 3) * 0.8),
        -0.075,
        z + ((i % 6) - 2.5) * 0.4,
      );
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(
        0.9 + Math.sin(clock.elapsedTime * 1.6 + i) * 0.35,
        0.015,
        0.075,
      );
      dummy.updateMatrix();
      reflection.current?.setMatrixAt(i, dummy.matrix);
    }
    if (reflection.current) {
      reflection.current.visible = !game.reduced;
      reflection.current.instanceMatrix.needsUpdate = true;
    }
  });
  return (
    <>
      <instancedMesh
        ref={pools}
        args={[undefined, glow, 10]}
        frustumCulled={false}
        raycast={() => {}}
      >
        <planeGeometry args={[1, 1]} />
      </instancedMesh>
      <instancedMesh
        ref={reflection}
        args={[undefined, reflectionMaterial, 30]}
        frustumCulled={false}
        raycast={() => {}}
      >
        <boxGeometry args={[1, 1, 1]} />
      </instancedMesh>
    </>
  );
}
export function Headlights({ game }: { game: SceneState }) {
  const material = useRef<THREE.MeshBasicMaterial>(null);
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        [
          -0.55, 0.04, 1.9, -2.8, 0.04, 10, 2.8, 0.04, 10, -0.55, 0.04, 1.9,
          2.8, 0.04, 10, 0.55, 0.04, 1.9,
        ],
        3,
      ),
    );
    g.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(
        [
          1, 0.8, 0.4, 0.28, 0.23, 0.12, 0.28, 0.23, 0.12, 1, 0.8, 0.4, 0.28,
          0.23, 0.12, 1, 0.8, 0.4,
        ],
        3,
      ),
    );
    return g;
  }, []);
  useFrame(() => {
    if (material.current) material.current.opacity = nightAmount(game) * 0.2;
  });
  return (
    <mesh geometry={geometry} raycast={() => {}}>
      <meshBasicMaterial
        ref={material}
        vertexColors
        transparent
        opacity={0}
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}
