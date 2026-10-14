import type { SceneState } from "./sceneTypes";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Place } from "../types";
import { Baked } from "./Baked";
import { roofGardenHeight } from "./buildingStyles";
import { Box, Cylinder, Ball, Sign } from "./Primitives";
import { nightAmount } from "./Atmosphere";

function Person({
  x,
  z,
  rotation = 0,
  color = "#a97955",
}: {
  x: number;
  z: number;
  rotation?: number;
  color?: string;
}) {
  return (
    <group position={[x, 0, z]} rotation={[0, rotation, 0]}>
      <Cylinder
        position={[0, 0.92, 0]}
        scale={[0.26, 0.66, 0.22]}
        color={color}
      />
      <Ball
        position={[0, 1.48, 0]}
        scale={[0.23, 0.26, 0.23]}
        color="#d4ae88"
      />
      <Box
        position={[0, 0.48, 0.24]}
        scale={[0.46, 0.16, 0.64]}
        color="#536c68"
      />
      <Box
        position={[-0.17, 0.24, 0.5]}
        scale={[0.14, 0.5, 0.14]}
        color="#536c68"
      />
      <Box
        position={[0.17, 0.24, 0.5]}
        scale={[0.14, 0.5, 0.14]}
        color="#536c68"
      />
      <Box
        position={[-0.31, 0.9, 0.3]}
        scale={[0.13, 0.13, 0.6]}
        color="#d4ae88"
      />
      <Box
        position={[0.31, 0.9, 0.3]}
        scale={[0.13, 0.13, 0.6]}
        color="#d4ae88"
      />
      <Box position={[0, 0.54, 0]} scale={[0.7, 0.12, 0.65]} color="#b89970" />
      <Box
        position={[0, 0.98, -0.3]}
        scale={[0.7, 0.7, 0.09]}
        color="#b89970"
      />
    </group>
  );
}
function RoofGarden({ y }: { y: number }) {
  return (
    <group position={[0, y, 0]}>
      <Box scale={[6.9, 0.25, 6.6]} color="#d1c5a4" />
      {[-2.6, 2.6].map((x) => (
        <group key={x}>
          <Box
            position={[x, 0.3, 0]}
            scale={[0.85, 0.6, 5.3]}
            color="#b68e69"
          />
          {[-1.7, 0, 1.7].map((z) => (
            <group key={z}>
              <Ball
                position={[x, 0.85, z]}
                scale={[0.55, 0.65, 0.65]}
                color="#73976f"
              />
              <Ball
                position={[x, 0.98, z]}
                scale={[0.27, 0.27, 0.25]}
                color={z === 0 ? "#e6b577" : "#a8ba83"}
              />
            </group>
          ))}
        </group>
      ))}
      {[-2.8, 2.8].map((z) => (
        <Box
          key={z}
          position={[0, 0.45, z]}
          scale={[5.7, 0.75, 0.12]}
          color="#a2ad92"
        />
      ))}
      <Cylinder
        position={[0, 0.75, 0.3]}
        scale={[0.85, 0.12, 0.85]}
        color="#c09c72"
      />
      <Cylinder
        position={[0, 0.35, 0.3]}
        scale={[0.12, 0.7, 0.12]}
        color="#a28661"
      />
      {[-1.15, 1.15].map((x) => (
        <Box
          key={x}
          position={[x, 0.5, 0.3]}
          scale={[0.65, 0.8, 0.8]}
          color="#88a19a"
        />
      ))}
    </group>
  );
}
export function BuildingLife({
  place,
  index,
  game,
}: {
  place: Place;
  index: number;
  game: SceneState;
}) {
  const clothes = useRef<THREE.Group>(null);
  const t = useRef(0);
  useFrame((_, dt) => {
    if (game.phase === "welcome" || !game.paused)
      t.current += Math.min(dt, 0.06);
    clothes.current?.children.forEach((cloth, i) => {
      cloth.rotation.x = Math.sin(t.current * 1.6 + i) * 0.11;
    });
  });
  const gardenHeight = roofGardenHeight(place);
  return (
    <>
      <Baked>
        {gardenHeight !== undefined && <RoofGarden y={gardenHeight} />}
        {place.kind === "depot" && place.id === "east-depot" && (
          <group position={[1.5, 6.65, 0.5]} scale={0.55}>
            <RoofGarden y={0} />
          </group>
        )}
        {place.kind === "cafe" && (
          <>
            <Person x={3.1} z={1.5} rotation={Math.PI / 2} />
            <Person x={5.05} z={1.5} rotation={-Math.PI / 2} color="#6b9893" />
            <Cylinder
              position={[4.1, 1.2, 1.75]}
              scale={[0.13, 0.18, 0.13]}
              color="#eee6d2"
            />
            <Cylinder
              position={[4.45, 1.2, 1.35]}
              scale={[0.13, 0.18, 0.13]}
              color="#eee6d2"
            />
          </>
        )}
        {place.kind === "home" && index % 2 === 0 && (
          <>
            {[-2.5, 2.5].map((x) => (
              <Cylinder
                key={x}
                position={[x, 1.65, -4.35]}
                scale={[0.055, 3.3, 0.055]}
                color="#a38b67"
              />
            ))}
            <Box
              position={[0, 3.2, -4.35]}
              scale={[5, 0.025, 0.025]}
              color="#716f59"
            />
          </>
        )}
      </Baked>
      {place.kind === "home" && index % 2 === 0 && (
        <group ref={clothes} position={[0, 3.2, -4.35]}>
          {[-1.7, -0.55, 0.55, 1.7].map((x, i) => (
            <group key={x} position={[x, 0, 0]}>
              <Box
                position={[0, -0.5, 0]}
                scale={[0.75, 0.95, 0.045]}
                color={["#f1dfbd", "#d8977e", "#8eafb0", "#c7cc9f"][i]}
                shadow={false}
              />
            </group>
          ))}
        </group>
      )}
    </>
  );
}
export function Neighborhood({
  game,
  fountainPosition = [35, 46],
}: {
  game: SceneState;
  fountainPosition?: [number, number];
}) {
  const birds = useRef<THREE.Group>(null),
    water = useRef<THREE.InstancedMesh>(null),
    hand = useRef<THREE.Group>(null),
    fireflies = useRef<THREE.InstancedMesh>(null);
  const time = useRef(0),
    dummy = useMemo(() => new THREE.Object3D(), []);
  const birdGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        [
          0, 0, 0, 1.35, 0.28, -0.3, 1.05, 0, 0.2, 0, 0, 0, -1.35, 0.28, -0.3,
          -1.05, 0, 0.2,
        ],
        3,
      ),
    );
    g.computeVertexNormals();
    return g;
  }, []);
  useFrame((_, dt) => {
    if (game.phase === "welcome" || (!game.paused && game.phase === "playing"))
      time.current +=
        Math.min(dt, 0.06) * (game.phase === "welcome" ? 1 : game.speed);
    const t = time.current;
    birds.current?.children.forEach((bird, i) => {
      bird.visible = !game.reduced;
      const angle = t * 0.09 + i * 0.32;
      bird.position.set(
        Math.cos(angle) * (21 + i * 1.6),
        16 + i * 0.8 + Math.sin(t * 1.2 + i),
        Math.sin(angle) * (28 + i),
      );
      bird.rotation.y = -angle;
      bird.scale.y = 0.5 + Math.sin(t * 5 + i) * 0.45;
    });
    for (let i = 0; i < 28; i++) {
      const phase = (t * 0.7 + i / 28) % 1,
        angle = i * 2.4;
      dummy.position.set(
        fountainPosition[0] + Math.cos(angle) * phase * 1.2,
        1.75 + Math.sin(phase * Math.PI) * 1.5,
        fountainPosition[1] + Math.sin(angle) * phase * 1.2,
      );
      dummy.scale.set(0.09, 0.12, 0.09);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      water.current?.setMatrixAt(i, dummy.matrix);
    }
    if (water.current) {
      water.current.visible = !game.reduced;
      water.current.instanceMatrix.needsUpdate = true;
    }
    if (hand.current) hand.current.rotation.z = -t * 0.015;
    for (let i = 0; i < 18; i++) {
      dummy.position.set(
        (i % 2 ? 1 : -1) * (7.7 + Math.sin(t * 0.4 + i) * 0.6),
        1 + Math.sin(t + i) * 0.4,
        -37 + i * 4.5,
      );
      dummy.scale.setScalar(0.05 + Math.max(0, Math.sin(t * 1.5 + i)) * 0.05);
      dummy.updateMatrix();
      fireflies.current?.setMatrixAt(i, dummy.matrix);
    }
    if (fireflies.current) {
      fireflies.current.visible = nightAmount(game) > 0.6 && !game.reduced;
      fireflies.current.instanceMatrix.needsUpdate = true;
    }
  });
  return (
    <>
      <Baked>
        <group position={[-55, 0.2, 31]}>
          <Box position={[0, 0.3, 0]} scale={[6, 0.6, 6]} color="#d6cfb4" />
          <Box position={[0, 5.3, 0]} scale={[3.8, 10, 3.8]} color="#decba7" />
          <Box position={[0, 3, 0]} scale={[4, 0.24, 4]} color="#b39674" />
          <Box
            position={[0, 9.6, 0]}
            scale={[4.5, 0.38, 4.5]}
            color="#c39169"
          />
          <Box
            position={[0, 11.2, 0]}
            scale={[4.3, 2.8, 4.3]}
            color="#e5d9bb"
          />
          <Cylinder
            position={[0, 11.2, 2.2]}
            rotation={[Math.PI / 2, 0, 0]}
            scale={[1.12, 0.13, 1.12]}
            color="#f7eed2"
          />
          <mesh position={[0, 13.2, 0]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[3.5, 2.3, 4]} />
            <meshStandardMaterial color="#638d89" />
          </mesh>
          <Cylinder
            position={[0, 14.8, 0]}
            scale={[0.08, 1.2, 0.08]}
            color="#bd8b58"
          />
          <Sign
            text="RIVERSIDE"
            position={[0, 5, 1.93]}
            width={3.3}
            height={0.5}
            background="#decba7"
            color="#617b71"
          />
          {Array.from({ length: 12 }, (_, i) => (
            <Box
              key={i}
              position={[
                Math.sin((i * Math.PI) / 6) * 0.88,
                11.2 + Math.cos((i * Math.PI) / 6) * 0.88,
                2.29,
              ]}
              scale={[0.07, 0.13, 0.03]}
              color="#5e7166"
              rotation={[0, 0, (-i * Math.PI) / 6]}
            />
          ))}
        </group>
      </Baked>
      <group ref={hand} position={[-55, 11.4, 33.31]}>
        <Box
          position={[0, 0.32, 0]}
          scale={[0.09, 0.7, 0.04]}
          color="#5c736b"
        />
        <Box
          position={[0.2, 0.03, 0]}
          scale={[0.46, 0.09, 0.04]}
          color="#5c736b"
        />
      </group>
      <group ref={birds}>
        {Array.from({ length: 6 }, (_, i) => (
          <mesh key={i} geometry={birdGeometry}>
            <meshStandardMaterial color="#677a78" side={THREE.DoubleSide} />
          </mesh>
        ))}
      </group>
      <instancedMesh
        ref={water}
        args={[undefined, undefined, 28]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 5, 4]} />
        <meshBasicMaterial color="#c1ece4" transparent opacity={0.75} />
      </instancedMesh>
      <instancedMesh
        ref={fireflies}
        args={[undefined, undefined, 18]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 5, 4]} />
        <meshBasicMaterial color="#ffe59c" toneMapped={false} />
      </instancedMesh>
    </>
  );
}
