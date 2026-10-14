import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Box, Cylinder, Ball, Cone } from "../world/Primitives";
import { Baked } from "../world/Baked";
import { city } from "./engine";

/** Small work crews and materials make each live project legible on the map. */
export default function ConstructionActivity({
  reduced,
  issue,
  working = true,
}: {
  reduced: boolean;
  issue: boolean;
  working?: boolean;
}) {
  const crew = useRef<THREE.Group>(null);
  const beacon = useRef<THREE.Mesh>(null);
  const time = useRef(0);
  useFrame((_, delta) => {
    const active =
      working && !reduced && !city.paused && city.phase === "playing";
    if (active) time.current += Math.min(delta, 0.1);
    crew.current?.children.forEach((person, index) => {
      const wave = Math.sin(time.current * 0.6 + index * 2.1);
      person.position.x =
        [-3.8, 3.9, 1.6][index] + (index === 2 ? wave * 1.2 : 0);
      person.position.z =
        [2.8, -1.5, 4][index] + (index === 0 ? wave * 1.2 : 0);
      person.position.y =
        0.22 +
        (active ? Math.abs(Math.sin(time.current * 5 + index)) * 0.025 : 0);
      person.rotation.y =
        index === 2
          ? Math.cos(time.current * 0.6 + index * 2.1) > 0
            ? Math.PI / 2
            : -Math.PI / 2
          : 0;
    });
    if (beacon.current)
      beacon.current.scale.setScalar(
        reduced ? 1 : 1 + Math.sin(time.current * 3) * 0.12,
      );
  });
  return (
    <>
      <Baked>
        <Box
          position={[3.7, 0.18, 3.3]}
          scale={[2.2, 0.25, 1.7]}
          color="#927d5c"
        />
        {[0, 1, 2].flatMap((row) =>
          [-0.6, 0.1, 0.8].map((x) => (
            <Box
              key={`${row}:${x}`}
              position={[3.6 + x, 0.43 + row * 0.3, 3.3]}
              scale={[0.58, 0.28, 1.25]}
              color={row % 2 ? "#bd9470" : "#cca984"}
            />
          )),
        )}
        {[0, 1, 2].map((i) => (
          <Cylinder
            key={i}
            position={[-3.6 + i * 0.65, 0.45, -4.5]}
            scale={[0.25, 2.3, 0.25]}
            rotation={[Math.PI / 2, 0, 0]}
            color="#909d94"
          />
        ))}
        <Box
          position={[4.6, 0.75, -4.5]}
          scale={[1.6, 1.5, 1.2]}
          color="#738f83"
        />
        <Box
          position={[4.6, 1.55, -4.5]}
          scale={[1.8, 0.15, 1.4]}
          color="#acbbaa"
        />
        <Box
          position={[-1.4, 0.55, 4.2]}
          scale={[1.4, 0.7, 0.75]}
          color="#b7ac7b"
        />
        <Cylinder
          position={[-1.4, 0.25, 4.65]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[0.28, 0.2, 0.28]}
          color="#66716b"
        />
        <Box
          position={[-2, 0.85, 4.1]}
          rotation={[0, 0, -0.2]}
          scale={[1.3, 0.08, 0.1]}
          color="#7c8271"
        />
        {[-4.6, 4.6].map((x) => (
          <group key={x} position={[x, 0, 5.6]}>
            <Box
              position={[0, 0.12, 0]}
              scale={[0.7, 0.1, 0.7]}
              color="#7e8170"
            />
            <Cone
              position={[0, 0.6, 0]}
              scale={[0.3, 0.95, 0.3]}
              color="#d6935b"
            />
            <Cylinder
              position={[0, 0.65, 0]}
              scale={[0.16, 0.14, 0.16]}
              color="#eee4ca"
            />
          </group>
        ))}
      </Baked>
      <group ref={crew} visible={working}>
        {[0, 1, 2].map((i) => (
          <group key={i}>
            <Box
              position={[0, 0.52, 0]}
              scale={[0.42, 0.55, 0.27]}
              color={i === 1 ? "#dfb662" : "#d79662"}
            />
            <Box
              position={[0, 0.55, 0.15]}
              scale={[0.4, 0.08, 0.025]}
              color="#f7e5ae"
            />
            <Ball
              position={[0, 0.98, 0]}
              scale={[0.19, 0.2, 0.18]}
              color="#caa581"
            />
            <Cylinder
              position={[0, 1.12, 0]}
              scale={[0.23, 0.12, 0.23]}
              color="#ead08a"
            />
            {[-0.12, 0.12].map((x) => (
              <Box
                key={x}
                position={[x, 0.18, 0]}
                scale={[0.12, 0.36, 0.16]}
                color="#60746d"
              />
            ))}
          </group>
        ))}
      </group>
      {issue && (
        <group position={[4.7, 0, 5.35]}>
          <Cylinder
            position={[0, 1.25, 0]}
            scale={[0.06, 2.5, 0.06]}
            color="#957f56"
          />
          <mesh ref={beacon} position={[0, 2.6, 0]}>
            <sphereGeometry args={[0.22, 8, 6]} />
            <meshStandardMaterial
              color="#e6ab58"
              emissive="#bc7b30"
              emissiveIntensity={0.65}
            />
          </mesh>
        </group>
      )}
    </>
  );
}
