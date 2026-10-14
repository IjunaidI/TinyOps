import { memo, useEffect, useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import {
  Ball,
  Bench,
  Box,
  Cone,
  Cylinder,
  Lamp,
  Roof,
  Sign,
  Tree,
} from "../world/Primitives";
import { Baked } from "../world/Baked";
import { windowGlass } from "../world/Atmosphere";
import { city, getConstructionIssues, getConstructionProgress } from "./engine";
import ConstructionActivity from "./ConstructionActivity";
import { projectById } from "./catalog";
import type { DistrictId, ProjectDefinition } from "./types";

// Civic parcels sit on the expanded city's outer avenue and garden streets.
// Their footpath spurs meet the pavement without crossing a traffic lane.
export const civicProjectLocations: Record<
  string,
  { x: number; z: number; rotation: number }
> = {
  riverside_rain_garden: { x: -78, z: 16, rotation: Math.PI / 2 },
  riverside_health_stop: { x: -78, z: 32, rotation: Math.PI / 2 },
  riverside_boardwalk: { x: -43, z: 64, rotation: Math.PI },
  riverside_play_garden: { x: -25, z: 64, rotation: Math.PI },
  oldtown_clinic: { x: -78, z: -32, rotation: Math.PI / 2 },
  oldtown_safe_lanes: { x: -78, z: -48, rotation: Math.PI / 2 },
  oldtown_learning: { x: -43, z: -64, rotation: 0 },
  oldtown_housing: { x: -25, z: -64, rotation: 0 },
  market_incubator: { x: 78, z: 16, rotation: -Math.PI / 2 },
  market_logistics: { x: 78, z: 32, rotation: -Math.PI / 2 },
  market_reuse: { x: 43, z: 64, rotation: Math.PI },
  market_square: { x: 25, z: 64, rotation: Math.PI },
  hillview_school: { x: 78, z: -32, rotation: -Math.PI / 2 },
  hillview_bus: { x: 78, z: -48, rotation: -Math.PI / 2 },
  hillview_center: { x: 43, z: -64, rotation: 0 },
  hillview_crossings: { x: 25, z: -64, rotation: 0 },
};

const cube = new THREE.BoxGeometry(1, 1, 1);
function Windows({
  y = 2.35,
  width = 6,
  z = 2.56,
}: {
  y?: number;
  width?: number;
  z?: number;
}) {
  return (
    <group userData={{ dynamic: true }}>
      {[-1, 0, 1].map((i) => (
        <mesh
          key={i}
          geometry={cube}
          material={windowGlass}
          position={[(i * width) / 3, y, z]}
          scale={[width / 4.6, 1.3, 0.09]}
          dispose={null}
        />
      ))}
    </group>
  );
}
function Solar({
  x = 0,
  y = 4.6,
  z = 0,
  width = 4,
}: {
  x?: number;
  y?: number;
  z?: number;
  width?: number;
}) {
  return (
    <group position={[x, y, z]} rotation={[-0.18, 0, 0]}>
      <Box scale={[width, 0.16, 2.3]} color="#667f92" />
      {[-0.75, 0, 0.75].map((t) => (
        <Box
          key={t}
          position={[(t * width) / 3, 0.09, 0]}
          scale={[0.045, 0.03, 2.3]}
          color="#a1c4cd"
        />
      ))}
      <Box
        position={[0, 0.09, 0]}
        scale={[width, 0.03, 0.045]}
        color="#a1c4cd"
      />
    </group>
  );
}
function Planter({
  x,
  z,
  color = "#a5bf93",
}: {
  x: number;
  z: number;
  color?: string;
}) {
  return (
    <group position={[x, 0, z]}>
      <Box position={[0, 0.4, 0]} scale={[1.8, 0.65, 1.1]} color="#cba584" />
      <Ball position={[0, 0.9, 0]} scale={[0.9, 0.6, 0.65]} color={color} />
      <Ball
        position={[0.5, 1, 0.15]}
        scale={[0.22, 0.26, 0.24]}
        color="#e8bf72"
      />
    </group>
  );
}
function CivicBuilding({ type, quality }: { type: string; quality: number }) {
  const leaf =
    quality === 2 ? "#a0bd97" : quality === 1 ? "#b7c49a" : "#c4b698";
  switch (type) {
    case "riverside_health_stop":
    case "oldtown_clinic": {
      const large = type === "oldtown_clinic";
      return (
        <>
          <Box
            position={[0, 2.25, -0.5]}
            scale={[7.7, 4.5, 5.7]}
            color="#d7edf0"
          />
          <Box
            position={[0, 4.65, -0.5]}
            scale={[8.2, 0.4, 6.1]}
            color="#81aaa1"
          />
          <Box
            position={[-2.2, 1.5, 2.7]}
            scale={[2.5, 3, 1.8]}
            color="#bfd9d1"
          />
          <Box
            position={[-2.2, 3.14, 3]}
            scale={[3.2, 0.25, 2.6]}
            color="#e5eef4"
          />
          <Windows width={5} z={2.4} />
          <Box
            position={[-2.2, 1.2, 3.63]}
            scale={[1.1, 2.4, 0.12]}
            color="#6a838e"
          />
          <Box
            position={[1, 3.52, 2.4]}
            scale={[1.7, 0.5, 0.13]}
            color="#c89799"
          />
          <Box
            position={[1, 3.52, 2.4]}
            scale={[0.5, 1.7, 0.14]}
            color="#c89799"
          />
          {large ? (
            <>
              <Box
                position={[2.8, 5.25, -1]}
                scale={[2, 1, 2]}
                color="#d7edf0"
              />
              <Solar x={-1} y={4.93} width={3.5} />
            </>
          ) : (
            <Solar y={4.93} width={3} />
          )}
          <Bench x={3.8} z={4.3} />
          <Planter x={-4.4} z={3.5} color={leaf} />
        </>
      );
    }
    case "oldtown_learning":
    case "hillview_school": {
      const school = type === "hillview_school";
      return (
        <>
          <Box
            position={[0, 2.6, -0.7]}
            scale={[8, 5.2, 5.9]}
            color={school ? "#dbc8a3" : "#d0e3ee"}
          />
          <Roof
            position={[0, 5.2, -0.7]}
            scale={[8.7, 2.1, 6.6]}
            color={school ? "#b88687" : "#7595a1"}
          />
          <Windows width={6.3} y={2.8} z={2.3} />
          <Box
            position={[0, 1.25, 2.37]}
            scale={[1.1, 2.5, 0.16]}
            color="#728795"
          />
          <Sign
            text={school ? "LEARN" : "READ · DISCOVER"}
            position={[0, 4.32, 2.39]}
            width={5.8}
            height={0.66}
            background="#edf1f4"
          />
          <Box
            position={[0, 0.2, 3.6]}
            scale={[8.3, 0.26, 2]}
            color="#bacfe0"
          />
          {school ? (
            <>
              <Cylinder
                position={[4.4, 3.8, 3.4]}
                scale={[0.07, 7.6, 0.07]}
                color="#8aafc6"
              />
              <Box
                position={[5.05, 6.8, 3.4]}
                scale={[1.3, 0.8, 0.06]}
                color="#98bca7"
              />
              <Box
                position={[-3, 0.37, 4.6]}
                scale={[2, 0.06, 1.1]}
                color="#ccbc87"
              />
            </>
          ) : (
            <>
              <Bench x={-3.2} z={4.3} />
              <Planter x={3.2} z={4.3} color={leaf} />
            </>
          )}
        </>
      );
    }
    case "oldtown_housing":
      return (
        <>
          {[-2.35, 2.35].map((x, i) => (
            <group key={x} position={[x, 0, -0.4]}>
              <Box
                position={[0, 2.2, 0]}
                scale={[3.8, 4.4, 5.3]}
                color={i ? "#c5d8c8" : "#dcc6a9"}
              />
              <Roof
                position={[0, 4.4, 0]}
                scale={[4.2, 1.9, 5.9]}
                color={i ? "#85aaa4" : "#b7838a"}
              />
              <Box
                position={[0, 1.1, 2.72]}
                scale={[0.9, 2.2, 0.12]}
                color="#7194a1"
              />
              <Windows width={2.6} y={3.05} z={2.71} />
              <Solar y={5.65} z={0.1} width={2.8} />
            </group>
          ))}
          <Box
            position={[0, 0.3, 4]}
            scale={[9.5, 0.25, 1.8]}
            color="#b8cede"
          />
          <Planter x={0} z={4.3} color={leaf} />
        </>
      );
    case "market_incubator":
      return (
        <>
          <Box
            position={[0, 2.6, -0.8]}
            scale={[9.2, 5.2, 5.8]}
            color="#d9c0a4"
          />
          <Roof
            position={[0, 5.2, -0.8]}
            scale={[9.6, 1.8, 6.2]}
            color="#ae808a"
          />
          {[-2.8, 0, 2.8].map((x, i) => (
            <group key={x} position={[x, 0, 0]}>
              <Box
                position={[0, 2.1, 2.16]}
                scale={[2.3, 3.2, 0.13]}
                color="#587a72"
              />
              <Box
                position={[0, 3.3, 3]}
                scale={[2.6, 0.17, 1.9]}
                color={i === 1 ? "#c6ad88" : "#98b7a4"}
                rotation={[0.14, 0, 0]}
              />
              <Box
                position={[0, 0.95, 3.7]}
                scale={[2, 1.4, 0.9]}
                color="#d2aa7c"
              />
              <Ball
                position={[0.45, 1.8, 3.7]}
                scale={[0.35, 0.28, 0.35]}
                color={i === 1 ? "#d9a16e" : leaf}
              />
            </group>
          ))}
          <Sign
            text="MAKERS HALL"
            position={[0, 4.35, 2.17]}
            width={6.6}
            height={0.65}
            background="#edf1f4"
          />
        </>
      );
    case "market_reuse":
      return (
        <>
          <Box
            position={[0, 2.2, -0.7]}
            scale={[8.5, 4.4, 5.7]}
            color="#c1d4bf"
          />
          <Box
            position={[0, 4.6, -0.7]}
            scale={[9, 0.4, 6.2]}
            color="#81aa9b"
          />
          <Box
            position={[0, 1.8, 2.2]}
            scale={[3.8, 3.6, 0.16]}
            color="#879e88"
          />
          {[-1.2, 0, 1.2].map((x) => (
            <Box
              key={x}
              position={[x, 1.8, 2.32]}
              scale={[0.04, 3.4, 0.03]}
              color="#bfd0bd"
            />
          ))}
          <Solar y={4.86} x={1.4} width={3.7} />
          <Sign
            text="REPAIR + REUSE"
            position={[0, 3.7, 2.33]}
            width={5.4}
            height={0.55}
            background="#edf1f4"
          />
          {[-3.5, 3.5].map((x, i) => (
            <Box
              key={x}
              position={[x, 0.6, 3.8]}
              scale={[1.45, 1.2, 1.5]}
              color={i ? "#e1bc77" : "#86a19c"}
            />
          ))}
          <Bench x={0} z={4.4} />
        </>
      );
    case "market_logistics":
      return (
        <>
          <Box
            position={[0, 2.35, -1.6]}
            scale={[8.7, 4.7, 4.6]}
            color="#d0e1ed"
          />
          <Box
            position={[0, 4.9, -1.5]}
            scale={[9.3, 0.4, 5.2]}
            color="#8dabb2"
          />
          <Box
            position={[0, 2, 0.78]}
            scale={[5.6, 3.6, 0.12]}
            color="#59766f"
          />
          {[-2.2, 0, 2.2].map((x) => (
            <Box
              key={x}
              position={[x, 2, 0.87]}
              scale={[0.08, 3.6, 0.08]}
              color="#b7c5b1"
            />
          ))}
          <Box
            position={[0, 0.2, 3.05]}
            scale={[9.5, 0.26, 4]}
            color="#a4b3a2"
          />
          {[-3.5, -0.8, 1.9].map((x) => (
            <Box
              key={x}
              position={[x, 0.36, 3.1]}
              scale={[0.1, 0.04, 3.1]}
              color="#e9dfba"
            />
          ))}
          <CargoBike />
          <Box
            position={[3.5, 0.9, 2.4]}
            scale={[1.4, 1.2, 1.4]}
            color="#cb9b6a"
          />
          <Box
            position={[3.5, 1.8, 2.4]}
            scale={[1.1, 0.6, 1.1]}
            color="#e3bd86"
          />
          <Solar y={5.15} width={4.5} />
        </>
      );
    case "hillview_center":
      return (
        <>
          <Box position={[0, 2.5, -0.6]} scale={[8.7, 5, 6]} color="#d6e4ef" />
          <Box
            position={[0, 5.15, -0.6]}
            scale={[9.2, 0.4, 6.5]}
            color="#8bafa0"
          />
          <Windows width={6.8} z={2.47} y={3} />
          <Box
            position={[0, 1.3, 2.53]}
            scale={[1.3, 2.6, 0.12]}
            color="#5d8074"
          />
          <Box
            position={[0, 3.45, 3.3]}
            scale={[4, 0.22, 2.1]}
            color="#d4b27a"
          />
          {[-3, 3].map((x) => (
            <group key={x} position={[x, 5.43, -0.4]}>
              <Box
                position={[0, 0.14, 0]}
                scale={[1.2, 0.3, 4.5]}
                color="#b9a784"
              />
              <Ball
                position={[0, 0.64, 0]}
                scale={[0.75, 0.8, 2]}
                color={leaf}
              />
            </group>
          ))}
          <Bench x={-3.4} z={4.5} />
          <Planter x={3.4} z={4.5} color={leaf} />
          <Sign
            text="COMMUNITY"
            position={[0, 4.3, 2.49]}
            width={6}
            height={0.5}
            background="#edf1f4"
          />
        </>
      );
    case "hillview_bus":
      return (
        <>
          <Box position={[0, 0.15, 0]} scale={[10, 0.3, 8]} color="#cccbb0" />
          {[-4, 4].flatMap((x) =>
            [-2.4, 0.5].map((z) => (
              <Box
                key={`${x}${z}`}
                position={[x, 2.1, z]}
                scale={[0.18, 4.2, 0.18]}
                color="#789c90"
              />
            )),
          )}
          <Box
            position={[0, 4.25, -1]}
            scale={[9.6, 0.28, 4.1]}
            color="#718e78"
          />
          <Solar y={4.52} z={-1} width={6} />
          <Box position={[0, 2, -2.5]} scale={[8, 3.6, 0.1]} color="#b8cfc0" />
          <Bench x={0} z={-1.3} />
          <Cylinder
            position={[4.3, 2.3, 3]}
            scale={[0.08, 4.6, 0.08]}
            color="#6d8b7d"
          />
          <Box
            position={[4.3, 4.1, 3]}
            scale={[1.2, 1.2, 0.18]}
            color="#7794a4"
          />
          <Sign
            text="BUS"
            position={[4.3, 4.1, 3.1]}
            width={1.05}
            height={0.5}
            background="#edf1f4"
          />
          <Box
            position={[-1, 1.15, 2.4]}
            scale={[4.4, 1.75, 1.8]}
            color="#d3ba82"
          />
          <Windows width={3.3} y={1.65} z={3.33} />
          {[-2.4, 0.4].flatMap((x) =>
            [1.48, 3.3].map((z) => (
              <Cylinder
                key={`${x}${z}`}
                position={[x, 0.46, z]}
                scale={[0.4, 0.23, 0.4]}
                rotation={[Math.PI / 2, 0, 0]}
                color="#4d655c"
              />
            )),
          )}
        </>
      );
    case "riverside_rain_garden":
      return (
        <>
          <Box position={[0, 0.15, 0]} scale={[10, 0.3, 8.5]} color="#c8bd9e" />
          {[-2.8, 2.8].map((x) => (
            <group key={x}>
              <Box
                position={[x, 0.3, 0]}
                scale={[3.6, 0.4, 7.5]}
                color="#a2b698"
              />
              <Box
                position={[x, 0.54, -0.2]}
                scale={[2.8, 0.05, 5.8]}
                color="#76aaa0"
              />
              {[-2, 0, 2].map((z, i) => (
                <group key={z}>
                  <Cylinder
                    position={[x + (i % 2 ? 0.7 : -0.6), 1.22, z]}
                    scale={[0.07, 1.5, 0.07]}
                    color="#70916a"
                  />
                  <Cone
                    position={[x + (i % 2 ? 0.7 : -0.6), 1.45, z]}
                    scale={[0.3, 1.2, 0.3]}
                    color={leaf}
                  />
                </group>
              ))}
            </group>
          ))}
          <Box position={[0, 0.7, 0]} scale={[1.6, 0.3, 9]} color="#cab58f" />
          <Bench x={3} z={4.6} />
          <Tree x={-4.6} z={-4.7} size={0.6} />
        </>
      );
    case "riverside_boardwalk":
      return (
        <>
          <Box
            position={[0, 0.45, 0]}
            scale={[9.5, 0.65, 8.5]}
            color="#bdaa81"
          />
          {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map((x) => (
            <Box
              key={x}
              position={[x, 0.81, 0]}
              scale={[0.07, 0.025, 8.2]}
              color="#e1cfaa"
            />
          ))}
          {[-4.7, 4.7].map((x) => (
            <group key={x}>
              <Box
                position={[x, 1.7, 0]}
                scale={[0.14, 0.2, 8.5]}
                color="#7e9582"
              />
              {[-3.8, 0, 3.8].map((z) => (
                <Box
                  key={z}
                  position={[x, 1.2, z]}
                  scale={[0.16, 1.4, 0.16]}
                  color="#8d9b82"
                />
              ))}
            </group>
          ))}
          <Bench x={-2.6} z={-2.8} />
          <Bench x={2.6} z={-2.8} />
          <Box
            position={[0, 0.6, 4.7]}
            scale={[3, 0.35, 2]}
            rotation={[0.15, 0, 0]}
            color="#c8b58e"
          />
          <Planter x={0} z={-3.1} color={leaf} />
        </>
      );
    case "riverside_play_garden":
      return (
        <>
          <Box
            position={[0, 0.13, 0]}
            scale={[10.3, 0.25, 8.8]}
            color="#d8c69a"
          />
          {[-2.5, -0.2].flatMap((x) =>
            [-1, 1.3].map((z) => (
              <Cylinder
                key={`${x}${z}`}
                position={[x, 1.8, z]}
                scale={[0.11, 3.6, 0.11]}
                color="#a98a62"
              />
            )),
          )}
          <Box
            position={[-1.35, 2.2, 0.2]}
            scale={[2.8, 0.25, 2.8]}
            color="#aabea4"
          />
          <Roof
            position={[-1.35, 3.7, 0.2]}
            scale={[3.2, 1.1, 3.2]}
            color="#c89462"
          />
          <Box
            position={[0.85, 1.4, 0.2]}
            scale={[3.7, 0.18, 1.1]}
            rotation={[0, 0, -0.58]}
            color="#799e97"
          />
          {[-0.3, 1.6].map((x) => (
            <Cylinder
              key={x}
              position={[x + 2.1, 1.85, -2.4]}
              scale={[0.1, 3.7, 0.1]}
              color="#a38b63"
            />
          ))}
          <Box
            position={[2.75, 3.7, -2.4]}
            scale={[3, 0.18, 0.2]}
            color="#a38b63"
          />
          <Box
            position={[2.8, 1.3, -2.4]}
            scale={[1.1, 0.12, 0.6]}
            color="#759b8b"
          />
          {[2.3, 3.3].map((x) => (
            <Box
              key={x}
              position={[x, 2.5, -2.4]}
              scale={[0.04, 2.3, 0.04]}
              color="#8a9e93"
            />
          ))}
          <Bench x={-2.8} z={4.4} />
          <Tree x={4.6} z={4.2} size={0.65} />
        </>
      );
    case "market_square":
      return (
        <>
          <Box position={[0, 0.15, 0]} scale={[10.2, 0.3, 9]} color="#e0d4b5" />
          <Cylinder
            position={[0, 0.5, -0.2]}
            scale={[2.1, 0.6, 2.1]}
            color="#bfbea5"
          />
          <Cylinder
            position={[0, 0.82, -0.2]}
            scale={[1.8, 0.08, 1.8]}
            color="#77aaa1"
          />
          <Cylinder
            position={[0, 1.3, -0.2]}
            scale={[0.35, 1, 0.35]}
            color="#d1d7bd"
          />
          <Ball
            position={[0, 1.84, -0.2]}
            scale={[0.36, 0.27, 0.36]}
            color="#b4d4c7"
          />
          {[-3.8, 3.8].map((x) => (
            <group key={x}>
              <Bench
                x={x}
                z={2.7}
                rotation={x > 0 ? -Math.PI / 2 : Math.PI / 2}
              />
              <Tree x={x} z={-3.4} size={0.75} />
            </group>
          ))}
          <Planter x={0} z={4.2} color={leaf} />
        </>
      );
    case "oldtown_safe_lanes":
    case "hillview_crossings":
      return (
        <>
          <Box
            position={[0, 0.12, 0]}
            scale={[6.2, 0.26, 10]}
            color="#859993"
          />
          <Box
            position={[0, 0.36, 0.8]}
            scale={[6.1, 0.22, 3.4]}
            color="#a2b19f"
          />
          {[-2.2, -1.1, 0, 1.1, 2.2].map((x) => (
            <Box
              key={x}
              position={[x, 0.49, 0.8]}
              scale={[0.65, 0.03, 2.8]}
              color="#eee6c7"
            />
          ))}
          {[-4.1, 4.1].map((x) => (
            <group key={x}>
              <Box
                position={[x, 0.23, 0]}
                scale={[1.8, 0.32, 10]}
                color="#dad5b8"
              />
              <Lamp x={x} z={-2.8} />
              <Cylinder
                position={[x, 1.05, 2.9]}
                scale={[0.2, 1.8, 0.2]}
                color="#789b85"
              />
              <Box
                position={[x, 0.43, 0.8]}
                scale={[1.45, 0.06, 1.8]}
                color="#d8ba76"
              />
            </group>
          ))}
          <Box
            position={[0, 0.29, -3.8]}
            scale={[0.15, 0.025, 1.2]}
            color="#e5dfbf"
          />
          {type === "oldtown_safe_lanes" && (
            <Tree x={5.2} z={4.4} size={0.65} />
          )}
        </>
      );
    default:
      return null;
  }
}
function CargoBike() {
  return (
    <group position={[-2.2, 0.45, 3.4]} rotation={[0, Math.PI / 2, 0]}>
      {[-1.1, 1.15].map((x) => (
        <Cylinder
          key={x}
          position={[x, 0.2, 0]}
          scale={[0.38, 0.16, 0.38]}
          rotation={[Math.PI / 2, 0, 0]}
          color="#4e6860"
        />
      ))}
      <Box position={[0, 0.5, 0]} scale={[2.1, 0.12, 0.15]} color="#6a9684" />
      <Box
        position={[-0.75, 0.94, 0]}
        scale={[0.12, 1, 0.13]}
        color="#7a9d8b"
      />
      <Box
        position={[-0.75, 1.45, 0]}
        scale={[0.18, 0.1, 0.65]}
        color="#5b756a"
      />
      <Box position={[0.7, 0.7, 0]} scale={[1.4, 1.1, 1.3]} color="#d3a775" />
    </group>
  );
}

const CompletedBuilding = memo(function CompletedBuilding({
  type,
  quality,
}: {
  type: string;
  quality: number;
}) {
  return (
    <Baked key={`${type}:${quality}`}>
      <CivicBuilding type={type} quality={quality} />
    </Baked>
  );
});

function Crane({ reduced }: { reduced: boolean }) {
  const boom = useRef<THREE.Group>(null);
  const hook = useRef<THREE.Group>(null);
  const cable = useRef<THREE.Mesh>(null);
  const elapsed = useRef(0);
  useFrame((_, dt) => {
    if (reduced || city.paused || city.phase !== "playing") return;
    elapsed.current += Math.min(dt, 0.1);
    if (boom.current)
      boom.current.rotation.y = -0.55 + Math.sin(elapsed.current * 0.15) * 0.28;
    const hookY = -4.25 + Math.sin(elapsed.current * 0.45) * 0.8;
    if (hook.current) hook.current.position.y = hookY;
    if (cable.current) {
      cable.current.position.y = hookY / 2;
      cable.current.scale.y = -hookY;
    }
  });
  return (
    <group position={[-4.7, 0, -3.8]}>
      <Box position={[0, 0.55, 0]} scale={[1.7, 1.1, 1.7]} color="#a9ac91" />
      <Box position={[0, 5.2, 0]} scale={[0.55, 9.3, 0.55]} color="#cbb080" />
      {[1.8, 3.6, 5.4, 7.2, 9].map((y) => (
        <Box
          key={y}
          position={[0, y, 0.31]}
          scale={[0.55, 0.07, 0.06]}
          color="#e1cea3"
        />
      ))}
      <group ref={boom} position={[0, 9.65, 0]} rotation={[0, -0.55, 0]}>
        <Box position={[2, 0, 0]} scale={[7.8, 0.4, 0.38]} color="#d4b98a" />
        <Box
          position={[-1.45, -0.45, 0]}
          scale={[1.1, 0.9, 0.9]}
          color="#a6aaa0"
        />
        <mesh
          ref={cable}
          position={[4.7, -2.125, 0]}
          scale={[0.045, 4.25, 0.045]}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#737e6b" />
        </mesh>
        <group ref={hook} position={[4.7, -4.25, 0]}>
          <Box scale={[0.4, 0.22, 0.25]} color="#cdb68b" />
          <Box
            position={[0, -0.6, 0]}
            scale={[0.06, 1.15, 0.06]}
            color="#747d6c"
          />
          <Box
            position={[0, -1.22, 0]}
            scale={[1.25, 0.3, 0.85]}
            color="#c7ac7c"
          />
        </group>
      </group>
    </group>
  );
}
const Scaffold = memo(function Scaffold({ stage }: { stage: number }) {
  return (
    <Baked key={stage}>
      <Box position={[0, 0.18, 0]} scale={[9.2, 0.3, 7.5]} color="#c5b394" />
      {stage === 0 ? (
        <>
          {[-3, 0, 3].map((x) => (
            <Box
              key={x}
              position={[x, 0.6, 0]}
              scale={[0.18, 0.65, 6.8]}
              color="#b68a61"
            />
          ))}
          {[-1, 1].map((v) => (
            <Box
              key={v}
              position={[2.6, 0.65, v * 2.6]}
              scale={[2.5, 0.8, 1.4]}
              color="#c4a57b"
            />
          ))}
        </>
      ) : (
        <>
          {[-3.7, 0, 3.7].flatMap((x) =>
            [-2.8, 2.8].map((z) => (
              <Box
                key={`${x}${z}`}
                position={[x, stage === 1 ? 2 : 3, z]}
                scale={[0.3, stage === 1 ? 4 : 6, 0.3]}
                color="#b9b39a"
              />
            )),
          )}
          <Box
            position={[0, stage === 1 ? 3.7 : 5.8, 0]}
            scale={[8, 0.3, 6]}
            color="#c7c7ad"
          />
          {stage === 2 && (
            <>
              <Box
                position={[0, 2.2, -2.55]}
                scale={[7.7, 4.4, 0.24]}
                color="#d9cfb4"
              />
              <Box
                position={[-3.7, 2.2, 0]}
                scale={[0.24, 4.4, 5.2]}
                color="#d9cfb4"
              />
            </>
          )}
        </>
      )}
      {[-5.1, 5.1].map((x) => (
        <group key={x}>
          <Box position={[x, 1, 0]} scale={[0.12, 0.6, 9.1]} color="#d9c090" />
          {[-3.8, 0, 3.8].map((z) => (
            <Box
              key={z}
              position={[x, 0.7, z]}
              scale={[0.18, 1.4, 0.18]}
              color="#9c9476"
            />
          ))}
        </group>
      ))}
      <Box position={[0, 1, 5.1]} scale={[8.8, 0.65, 0.15]} color="#dbc69d" />
      {[-3, -1, 1, 3].map((x) => (
        <Box
          key={x}
          position={[x, 1, 5.2]}
          scale={[0.55, 0.68, 0.06]}
          rotation={[0, 0, -0.32]}
          color="#ae895d"
        />
      ))}
      <Box position={[3.8, 0.6, 4]} scale={[1.2, 1.2, 1.6]} color="#aaa890" />
      <Cone
        position={[-3.5, 0.65, 4.3]}
        scale={[0.3, 1.05, 0.3]}
        color="#cfab82"
      />
    </Baked>
  );
});

// These labels stay inside the WebGL scene. In particular, they do not create
// secondary React DOM roots when the map mounts or unmounts during navigation.
function CanvasBadge({
  text,
  color,
  position,
  width = 34,
}: {
  text: string;
  color: string;
  position: [number, number, number];
  width?: number;
}) {
  const root = useRef<THREE.Group>(null);
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    const resolution = 3;
    canvas.width = Math.ceil(width * resolution);
    canvas.height = 20 * resolution;
    const context = canvas.getContext("2d")!;
    context.scale(resolution, resolution);
    context.clearRect(0, 0, width, 20);
    context.fillStyle = "#f7f8fb";
    context.fillRect(0, 0, width, 20);
    context.strokeStyle = color;
    context.lineWidth = 1;
    context.strokeRect(0.5, 0.5, width - 1, 19);
    context.fillStyle = color;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font =
      '700 11px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    context.fillText(text, width / 2, 10.5, width - 7);
    const output = new THREE.CanvasTexture(canvas);
    output.colorSpace = THREE.SRGBColorSpace;
    return output;
  }, [text, color, width]);
  useEffect(() => () => texture.dispose(), [texture]);
  useFrame(({ camera }) => {
    if (!root.current) return;
    root.current.quaternion.copy(camera.quaternion);
    const zoom = (camera as THREE.OrthographicCamera).zoom || 1;
    root.current.scale.setScalar(1 / zoom);
  });
  return (
    <group ref={root} position={position}>
      <mesh renderOrder={8} raycast={() => {}}>
        <planeGeometry args={[width, 20]} />
        <meshBasicMaterial
          map={texture}
          transparent
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function ProjectSite({
  definition,
  completed,
  progress,
  issues,
  focused,
  reduced,
  quality,
  selected,
  labels,
  onSelect,
  onHover,
}: {
  definition: ProjectDefinition;
  completed: boolean;
  progress: number;
  issues: number;
  focused: boolean;
  reduced: boolean;
  quality: number;
  selected: boolean;
  labels: boolean;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
}) {
  const location = civicProjectLocations[definition.id];
  const district = city.districts.find((d) => d.id === definition.district)!;
  if (!location) return null;
  const stage = Math.min(2, Math.floor(progress * 3));
  const staffed =
    city.living?.construction.assignments.find(
      (assignment) => assignment.projectId === definition.id,
    )?.crew !== false;
  const select = (event: ThreeEvent<MouseEvent>) => {
    if (event.delta > 5) return;
    event.stopPropagation();
    onSelect(selected ? null : definition.id);
  };
  const outerX = Math.abs(location.x) > 60;
  return (
    <group position={[location.x, 0.2, location.z]}>
      <Baked key={`parcel:${completed}:${quality}`}>
        <Box
          position={[0, -1.66, 0]}
          scale={[12.4, 3.5, 12.4]}
          color="#a1bba9"
        />
        <Box
          position={[0, 0.18, 0]}
          scale={[12.7, 0.28, 12.7]}
          color={
            completed
              ? quality === 2
                ? "#bed1ac"
                : quality === 1
                  ? "#cad3b4"
                  : "#cbc4a8"
              : "#c1b89e"
          }
        />
        <Box
          position={
            outerX
              ? [-Math.sign(location.x) * 8.5, 0.13, 0]
              : [0, 0.13, -Math.sign(location.z) * 7.1]
          }
          scale={outerX ? [5.1, 0.34, 2.5] : [2.5, 0.34, 4.2]}
          color="#d1dde3"
        />
      </Baked>
      <group
        position={[0, 0.35, 0]}
        rotation={[0, location.rotation, 0]}
        onClick={select}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(definition.id);
        }}
        onPointerOut={() => onHover(null)}
      >
        {completed ? (
          <CompletedBuilding type={definition.id} quality={quality} />
        ) : (
          <>
            <Scaffold stage={stage} />
            <Crane reduced={reduced || !staffed} />
            <ConstructionActivity
              reduced={reduced}
              issue={issues > 0}
              working={staffed}
            />
            <Sign
              text={
                !staffed
                  ? "AWAITING CREW"
                  : issues > 0
                    ? "SITE REVIEW"
                    : "CITY WORKS"
              }
              position={[0, 1.1, 5.31]}
              width={3.5}
              height={0.42}
              background={issues > 0 ? "#f0e6d4" : "#edf1f4"}
            />
          </>
        )}
        <Cylinder
          position={[5.3, 2.15, -5.2]}
          scale={[0.055, 4.3, 0.055]}
          color="#7b939e"
        />
        <Box
          position={[4.7, 3.7, -5.2]}
          scale={[1.3, 0.8, 0.07]}
          color={completed ? district.color : "#c7b386"}
        />
      </group>
      {!completed && labels && (focused || selected) && (
        <CanvasBadge
          text={
            !staffed
              ? "AWAITING CREW"
              : issues > 0
                ? `SITE ISSUE · ${Math.round(progress * 100)}%`
                : `BUILDING · ${Math.round(progress * 100)}%`
          }
          color={issues > 0 ? "#7e6741" : "#7c6b43"}
          position={[0, 11.4, 0]}
          width={focused || selected || issues > 0 ? 118 : 100}
        />
      )}
      {completed && selected && labels && (
        <CanvasBadge
          text="OPEN"
          color="#4f7462"
          position={[0, 8.2, 0]}
          width={38}
        />
      )}
    </group>
  );
}

function DistrictMarker({
  id,
  position,
  focused,
  labels,
}: {
  id: DistrictId;
  position: [number, number];
  focused: boolean;
  labels: boolean;
}) {
  const district = city.districts.find((d) => d.id === id)!;
  const happiness = Math.round(district.happiness);
  const color =
    happiness >= 70 ? "#4f7462" : happiness >= 45 ? "#7c6b43" : "#995e68";
  return (
    <group position={[position[0], 0.4, position[1]]}>
      <Cylinder
        position={[0, 2.6, 0]}
        scale={[0.07, 5.2, 0.07]}
        color="#94aeb9"
      />
      <Box position={[0.8, 4.55, 0]} scale={[1.6, 0.9, 0.075]} color={color} />
      <Cylinder
        position={[0, 0.1, 0]}
        scale={[0.5, 0.2, 0.5]}
        color="#c4d4d8"
      />
      {labels && focused && (
        <CanvasBadge
          text={focused ? `${district.name} · ${happiness}%` : `${happiness}%`}
          color={color}
          position={[0, 6.35, 0]}
          width={focused ? 130 : 34}
        />
      )}
    </group>
  );
}

export default function CivicLandmarks({
  focus,
  reduced = false,
  selected = null,
  labels = true,
  onSelect,
  onHover,
}: {
  focus?: DistrictId | null;
  reduced?: boolean;
  selected?: string | null;
  labels?: boolean;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
}) {
  const quality =
    city.metrics.environment >= 70 ? 2 : city.metrics.environment >= 45 ? 1 : 0;
  return (
    <group name="civic-infrastructure">
      {city.projects.map((project) => (
        <ProjectSite
          key={`${city.generation}:${project.definitionId}`}
          definition={projectById[project.definitionId]}
          completed={project.status === "complete"}
          progress={getConstructionProgress(project)}
          issues={getConstructionIssues(project.definitionId).length}
          focused={focus === projectById[project.definitionId].district}
          reduced={reduced}
          quality={quality}
          selected={selected === project.definitionId}
          labels={labels}
          onSelect={onSelect}
          onHover={onHover}
        />
      ))}
      <DistrictMarker
        id="riverside"
        position={[-8.7, 32]}
        focused={focus === "riverside"}
        labels={labels}
      />
      <DistrictMarker
        id="oldtown"
        position={[-8.7, -32]}
        focused={focus === "oldtown"}
        labels={labels}
      />
      <DistrictMarker
        id="market"
        position={[8.7, 32]}
        focused={focus === "market"}
        labels={labels}
      />
      <DistrictMarker
        id="hillview"
        position={[8.7, -32]}
        focused={focus === "hillview"}
        labels={labels}
      />
    </group>
  );
}
