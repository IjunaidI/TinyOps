import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { nodes, edges, nodeById } from "../data/map";
import { Box, palette } from "./Primitives";
import { nightAmount, updateNightMaterials } from "./Atmosphere";
import type { SceneState } from "./sceneTypes";

export function Streets() {
  return (
    <group>
      {edges.map((edge) => {
        const a = nodeById[edge.a],
          b = nodeById[edge.b],
          dx = b.x - a.x,
          dz = b.z - a.z,
          length = Math.hypot(dx, dz),
          bridge = edge.kind === "bridge" || edge.kind === "south";
        return (
          <group
            key={edge.id}
            position={[(a.x + b.x) / 2, 0, (a.z + b.z) / 2]}
            rotation={[0, Math.atan2(dx, dz), 0]}
          >
            <Box
              position={[0, 0.15, 0]}
              scale={[7.2, 0.32, length]}
              color={bridge ? "#c5cfd3" : "#dbe1e1"}
              shadow={false}
            />
            <Box
              position={[0, 0.335, 0]}
              scale={[5.55, 0.1, length + 0.07]}
              color={palette.asphalt}
              shadow={false}
            />
            {Array.from(
              { length: Math.max(1, Math.floor((length - 4) / 4)) },
              (_, i) => (
                <Box
                  key={i}
                  position={[0, 0.391, -length / 2 + 3.5 + i * 4]}
                  scale={[0.12, 0.012, 1.35]}
                  color="#e4e9dd"
                  shadow={false}
                />
              ),
            )}
            {bridge &&
              [-1, 1].map((side) => (
                <group key={side}>
                  <Box
                    position={[side * 3.3, 0.95, 0]}
                    scale={[0.16, 0.2, length]}
                    color="#91a7ab"
                  />
                  <Box
                    position={[side * 3.3, 1.7, 0]}
                    scale={[0.2, 0.22, length]}
                    color="#e0e6e5"
                  />
                  {Array.from({ length: 9 }, (_, i) => (
                    <Box
                      key={i}
                      position={[
                        side * 3.3,
                        0.98,
                        -length / 2 + (i * length) / 8,
                      ]}
                      scale={[0.25, 1.55, 0.25]}
                      color="#b5c4c8"
                    />
                  ))}
                </group>
              ))}
            {bridge &&
              [-4, 4].map((z) => (
                <Box
                  key={z}
                  position={[0, -0.8, z]}
                  scale={[6.7, 1.75, 1.1]}
                  color="#91a6aa"
                />
              ))}
          </group>
        );
      })}
      {nodes.map((node, i) => (
        <group key={node.id} position={[node.x, 0.397, node.z]}>
          <Box
            scale={[5.55, 0.011, 5.55]}
            color={palette.asphalt}
            shadow={false}
          />
          {i % 3 === 0 &&
            [-1.9, -0.95, 0, 0.95, 1.9].map((x) => (
              <Box
                key={x}
                position={[x, 0.012, 2.45]}
                scale={[0.5, 0.015, 0.72]}
                color="#e9eee4"
                shadow={false}
              />
            ))}
        </group>
      ))}
    </group>
  );
}
export function River({
  game,
  length = 103,
}: {
  game: SceneState;
  length?: number;
}) {
  const ripples = useRef<THREE.Group>(null),
    boat = useRef<THREE.Group>(null);
  const t = useRef(0);
  useFrame((_, dt) => {
    if (game.phase === "welcome" || !game.paused) t.current += dt;
    ripples.current?.children.forEach((r, i) => {
      r.position.x = Math.sin(t.current * 0.35 + i * 1.7) * 0.45;
      r.scale.x = 0.75 + Math.sin(t.current * 0.45 + i) * 0.18;
    });
    if (boat.current)
      boat.current.position.z = 36 + Math.sin(t.current * 0.08) * 3;
  });
  return (
    <>
      <Box
        position={[0, -0.24, 0]}
        scale={[12, 0.24, length]}
        color={palette.water}
        shadow={false}
      />
      <Box
        position={[-6.1, -0.19, 0]}
        scale={[0.8, 0.75, length]}
        color="#a9bfaf"
      />
      <Box
        position={[6.1, -0.19, 0]}
        scale={[0.8, 0.75, length]}
        color="#a9bfaf"
      />
      <group ref={ripples}>
        {Array.from({ length: 29 }, (_, i) => (
          <group key={i}>
            <Box
              position={[Math.sin(i * 13) * 3.5, -0.108, -48 + i * 3.5]}
              scale={[1.3 + (i % 3), 0.015, 0.12]}
              color={i % 2 ? "#c0ded7" : "#96c7c2"}
              shadow={false}
            />
            {i % 3 === 0 && (
              <Box
                position={[Math.cos(i * 4) * 2, -0.107, -46 + i * 3.5]}
                scale={[1.1, 0.016, 0.12]}
                color="#c0ded7"
                shadow={false}
              />
            )}
          </group>
        ))}
      </group>
      <group ref={boat} position={[2.2, -0.07, 36]} rotation={[0, 0.12, 0]}>
        <Box position={[0, 0.3, 0]} scale={[1.45, 0.6, 3]} color="#c5a183" />
        <Box
          position={[0, 0.6, 0]}
          scale={[1.15, 0.15, 2.65]}
          color="#e8f2ee"
        />
        <Box
          position={[0, 0.93, -0.45]}
          scale={[0.9, 0.7, 1.3]}
          color="#82a1a7"
        />
        <Box
          position={[0, 1.31, -0.45]}
          scale={[1.2, 0.11, 1.6]}
          color="#e9f4ee"
        />
      </group>
    </>
  );
}
export function Lighting({
  game,
  expanded = false,
}: {
  game: SceneState;
  expanded?: boolean;
}) {
  const light = useRef<THREE.DirectionalLight>(null),
    ambient = useRef<THREE.AmbientLight>(null);
  const { scene } = useThree();
  const dayColor = new THREE.Color("#e9edf2"),
    nightColor = new THREE.Color("#253645");
  useFrame((_, dt) => {
    const night = nightAmount(game);
    updateNightMaterials(game);
    if (light.current) {
      light.current.intensity = THREE.MathUtils.lerp(
        light.current.intensity,
        3.2 - night * 2.65,
        1 - Math.exp(-dt * 2),
      );
      light.current.color
        .set("#f7fafb")
        .lerp(new THREE.Color("#bdccdf"), night);
    }
    if (ambient.current) ambient.current.intensity = 1.52 - night * 0.82;
    const ground = scene.getObjectByName("backdrop") as
      THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial> | undefined;
    if (ground)
      ground.material.color
        .set("#e9edf2")
        .lerp(new THREE.Color("#354b59"), night);
    const background = dayColor.clone().lerp(nightColor, night);
    if (scene.background instanceof THREE.Color)
      scene.background.lerp(background, 1 - Math.exp(-dt * 2));
    if (
      scene.fog instanceof THREE.Fog &&
      scene.background instanceof THREE.Color
    )
      scene.fog.color.copy(scene.background);
  });
  return (
    <>
      <ambientLight ref={ambient} intensity={1.52} color="#e5edf0" />
      <directionalLight
        ref={light}
        position={[-48, 85, 35]}
        intensity={3}
        color="#f7fafb"
        castShadow={!game.reduced}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={expanded ? -135 : -85}
        shadow-camera-right={expanded ? 135 : 85}
        shadow-camera-top={expanded ? 130 : 75}
        shadow-camera-bottom={expanded ? -130 : -75}
        shadow-camera-near={1}
        shadow-camera-far={expanded ? 300 : 200}
        shadow-bias={-0.0004}
        shadow-normalBias={0.05}
      />
      <hemisphereLight args={["#c3dedb", "#d2ba8d", 0.55]} />
    </>
  );
}
