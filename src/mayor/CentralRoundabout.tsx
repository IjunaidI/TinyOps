import { memo } from "react";
import * as THREE from "three";
import { Baked } from "../world/Baked";
import {
  Box,
  Cylinder,
  Ball,
  Lamp,
  Sign,
  mat,
  palette,
} from "../world/Primitives";
import { ROUNDABOUT } from "./traffic";

const disk = new THREE.CylinderGeometry(1, 1, 1, 64);
function Disc({
  radius,
  height,
  y,
  color,
}: {
  radius: number;
  height: number;
  y: number;
  color: string;
}) {
  return (
    <mesh
      geometry={disk}
      material={mat(color)}
      position={[0, y, 0]}
      scale={[radius, height, radius]}
      receiveShadow
      castShadow
    />
  );
}
function Arrow({ angle }: { angle: number }) {
  const radius = ROUNDABOUT.laneRadius;
  return (
    <group
      position={[Math.cos(angle) * radius, 0.432, Math.sin(angle) * radius]}
      rotation={[0, -angle, 0]}
    >
      <Box
        position={[0, 0, -0.2]}
        scale={[0.15, 0.015, 1.3]}
        color="#e8ebdf"
        shadow={false}
      />
      {[-1, 1].map((side) => (
        <Box
          key={side}
          position={[side * 0.23, 0, 0.37]}
          scale={[0.12, 0.015, 0.68]}
          rotation={[0, (side * -Math.PI) / 4, 0]}
          color="#e8ebdf"
          shadow={false}
        />
      ))}
    </group>
  );
}

/** The center is a supported bridge plaza, not an island detached from the grid.
 * Its level road deck meets the two bank streets at x ±12 without moving homes. */
export const CentralRoundabout = memo(function CentralRoundabout() {
  return (
    <Baked>
      <group name="central-roundabout">
        <Disc
          radius={ROUNDABOUT.deckRadius}
          height={0.45}
          y={0.14}
          color="#becdd3"
        />
        <Disc
          radius={ROUNDABOUT.roadRadius}
          height={0.08}
          y={0.395}
          color={palette.asphalt}
        />
        {[-1, 1].map((side) => (
          <group key={side}>
            <Box
              position={[side * 10.2, 0.15, 0]}
              scale={[7.6, 0.32, 7.2]}
              color="#d6dfe2"
              shadow={false}
            />
            <Box
              position={[side * 10.2, 0.39, 0]}
              scale={[7.6, 0.08, 5.55]}
              color={palette.asphalt}
              shadow={false}
            />
            <Box
              position={[side * 11.7, 0.438, 0]}
              scale={[1.25, 0.012, 0.12]}
              color="#e8ebdf"
              shadow={false}
            />
            <Box
              position={[side * 3.9, -0.8, 0]}
              scale={[1.2, 1.7, 11.5]}
              color="#90a6ae"
            />
            <Lamp x={side * 8.2} z={side * 5.4} />
            <Box
              position={[side * 9.1, 1.02, side * -3.5]}
              scale={[0.13, 1.3, 0.13]}
              color="#5f7480"
            />
            <Sign
              text="GIVE WAY"
              position={[side * 9.1, 1.77, side * -3.5]}
              rotation={[0, (side * Math.PI) / 2, 0]}
              width={1.25}
              height={0.4}
              background="#edf1f4"
              color="#876c45"
            />
          </group>
        ))}
        <Disc radius={4.0} height={0.18} y={0.48} color="#d8e1e4" />
        <Disc
          radius={ROUNDABOUT.islandRadius}
          height={0.14}
          y={0.57}
          color="#a1bfa1"
        />
        {Array.from({ length: 24 }, (_, i) => {
          const angle = (i * Math.PI * 2) / 24;
          return (
            <Box
              key={`kerb:${i}`}
              position={[Math.cos(angle) * 3.83, 0.58, Math.sin(angle) * 3.83]}
              rotation={[0, -angle, 0]}
              scale={[0.2, 0.12, 0.52]}
              color={i % 2 ? "#becb9d" : "#edf0e1"}
              shadow={false}
            />
          );
        })}
        {Array.from({ length: 12 }, (_, i) => {
          const angle = (i * Math.PI * 2) / 12;
          return (
            <group
              key={`garden:${i}`}
              position={[Math.cos(angle) * 2.7, 0, Math.sin(angle) * 2.7]}
            >
              <Ball
                position={[0, 0.78, 0]}
                scale={[0.49, 0.31, 0.49]}
                color="#719985"
              />
              <Ball
                position={[0.1, 1.02, 0.05]}
                scale={[0.17, 0.14, 0.17]}
                color={i % 2 ? "#d7b388" : "#cba6ae"}
              />
            </group>
          );
        })}
        <Disc radius={1.68} height={0.2} y={0.72} color="#a5bbc5" />
        <Disc radius={1.15} height={0.3} y={0.94} color="#d8e4e8" />
        <Cylinder
          position={[0, 2.05, 0]}
          scale={[0.46, 2, 0.46]}
          color="#bca176"
        />
        <Ball
          position={[0, 3.45, 0]}
          scale={[0.88, 0.78, 0.88]}
          color="#d0bd83"
        />
        <Sign
          text="UNITY CIRCLE"
          position={[0, 1.16, 1.2]}
          width={2.3}
          height={0.45}
          color="#567166"
          background="#edf1f4"
        />
        {[Math.PI / 2, Math.PI * 1.5].map((angle) => (
          <Arrow key={angle} angle={angle} />
        ))}
        {Array.from({ length: 40 }, (_, i) => {
          const angle = (i * Math.PI * 2) / 40;
          if (Math.abs(Math.sin(angle)) < 0.48) return null;
          return (
            <group
              key={`rail:${i}`}
              position={[Math.cos(angle) * 8.4, 0, Math.sin(angle) * 8.4]}
              rotation={[0, -angle, 0]}
            >
              <Box
                position={[0, 0.93, 0]}
                scale={[0.15, 1.16, 0.15]}
                color="#a9c2cb"
              />
              <Box
                position={[0, 1.47, 0]}
                scale={[0.16, 0.15, 1.39]}
                color="#e0e6e5"
              />
            </group>
          );
        })}
      </group>
    </Baked>
  );
});
