import type { SceneState } from "./sceneTypes";
import { memo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import type { Group, Mesh } from "three";
import type { Place, Selection } from "../types";
import { windowGlass, depotGlass } from "./Atmosphere";
import { BuildingLife } from "./Neighborhood";
import { NeighborhoodBuilding } from "./NeighborhoodBuildings";
import { buildingStyleFor } from "./buildingStyles";
import { Baked } from "./Baked";
import {
  Box,
  Cylinder,
  Sign,
  Tree,
  Bench,
  Crate,
  palette,
} from "./Primitives";

function Window({
  x,
  y,
  z,
  side = false,
}: {
  x: number;
  y: number;
  z: number;
  side?: boolean;
}) {
  return (
    <group position={[x, y, z]} rotation={[0, side ? Math.PI / 2 : 0, 0]}>
      <Box scale={[1.05, 1.35, 0.13]} color="#f6efd9" />
      <mesh
        position={[0, 0, 0.085]}
        scale={[0.78, 1.08, 0.06]}
        material={windowGlass}
      >
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
      <Box
        position={[0, 0, 0.13]}
        scale={[0.075, 1.12, 0.04]}
        color="#e4dec6"
      />
      <Box
        position={[0, -0.65, 0.15]}
        scale={[1.18, 0.13, 0.32]}
        color="#d2c5a8"
      />
    </group>
  );
}
function Awning({
  width = 5,
  color = palette.orange,
  z = 3.2,
  y = 2.8,
}: {
  width?: number;
  color?: string;
  z?: number;
  y?: number;
}) {
  return (
    <group position={[0, y, z]}>
      {Array.from({ length: 8 }, (_, i) => (
        <group key={i}>
          <Box
            position={[-width / 2 + ((i + 0.5) * width) / 8, 0, 0.7]}
            scale={[width / 8, 0.12, 1.7]}
            rotation={[-0.2, 0, 0]}
            color={i % 2 ? "#eee6d1" : color}
          />
          <Box
            position={[-width / 2 + ((i + 0.5) * width) / 8, -0.28, 1.52]}
            scale={[width / 8, 0.4, 0.08]}
            color={i % 2 ? "#eee6d1" : color}
          />
        </group>
      ))}
    </group>
  );
}
function Depot({ place, game }: { place: Place; game: SceneState }) {
  const beacon = useRef<Mesh>(null);
  const shutters = useRef<(Group | null)[]>([]);
  const west = place.id === "west-depot";
  useFrame(({ clock }, dt) => {
    const loading = game.vans.some(
      (v) =>
        v.state === "loading" &&
        game.orders.find((o) => o.id === v.orderId)?.source === place.id,
    );
    const outage = west && game.incidents.some((i) => i.kind === "power");
    shutters.current.forEach((shutter, i) => {
      if (shutter)
        shutter.position.y +=
          ((loading && !outage && i === 1 ? 2.7 : 0) - shutter.position.y) *
          Math.min(1, dt * 7);
    });
    if (beacon.current) {
      const active = west && game.incidents.some((i) => i.kind === "power");
      beacon.current.visible = active;
      beacon.current.scale.setScalar(
        0.8 + Math.sin(clock.elapsedTime * 7) * 0.15,
      );
    }
  });
  return (
    <>
      <Box position={[0, 0.11, 1]} scale={[13.4, 0.22, 12]} color="#b3bba8" />
      <Box
        position={[0, 3.05, -0.85]}
        scale={[11, 6.1, 7.3]}
        color={west ? "#c99377" : "#88aaa2"}
      />
      <Box
        position={[0, 6.12, -0.85]}
        scale={[11.8, 0.35, 8]}
        color="#ede6cf"
      />
      <Box
        position={[0, 6.43, -0.85]}
        scale={[10.9, 0.3, 7.15]}
        color="#9da79b"
      />
      <Box
        position={[0, 4.9, 2.87]}
        scale={[11, 0.55, 0.17]}
        color={west ? "#e88148" : "#5a847e"}
      />
      {[-3.35, 0, 3.35].map((x, i) => (
        <group key={x}>
          <Box
            position={[x, 1.95, 2.9]}
            scale={[2.7, 3.45, 0.17]}
            color="#475d56"
          />
          <group
            ref={(el) => {
              shutters.current[i] = el;
            }}
            userData={{ dynamic: true }}
          >
            <Box
              position={[x, 1.7, 3.04]}
              scale={[2.4, 2.95, 0.08]}
              color={i === 1 ? "#788b7e" : "#b6b6a0"}
            />
            {[0.6, 1.2, 1.8, 2.4].map((y) => (
              <Box
                key={y}
                position={[x, y, 3.09]}
                scale={[2.4, 0.05, 0.03]}
                color="#808e7d"
              />
            ))}
          </group>
          <Box
            position={[x, 0.25, 3.25]}
            scale={[2.85, 0.4, 0.7]}
            color="#8e9f8a"
          />
          <mesh
            position={[x, 3.95, 3.02]}
            scale={[0.6, 0.2, 0.12]}
            material={west ? depotGlass : windowGlass}
          >
            <boxGeometry args={[1, 1, 1]} />
          </mesh>
          <Box
            position={[x, 0.24, 5.35]}
            scale={[2.25, 0.025, 2.25]}
            color="#acb49f"
            shadow={false}
          />
          <Box
            position={[x - 1.1, 0.26, 5.35]}
            scale={[0.08, 0.02, 2.3]}
            color="#eee1bb"
            shadow={false}
          />
          <Box
            position={[x + 1.1, 0.26, 5.35]}
            scale={[0.08, 0.02, 2.3]}
            color="#eee1bb"
            shadow={false}
          />
        </group>
      ))}
      <Sign
        text={west ? "WEST WORKS" : "EAST DEPOT"}
        position={[0, 5.55, 2.84]}
        width={7.3}
        height={0.83}
        background={west ? "#c99377" : "#88aaa2"}
        color="#fff7df"
      />
      <Box position={[-3, 6.92, -1]} scale={[2.6, 0.8, 2]} color="#c0c5b5" />
      <Cylinder
        position={[3.5, 7, -2.5]}
        scale={[0.5, 1.5, 0.5]}
        color="#a9b3a5"
      />
      <Crate x={5.9} z={1.9} />
      <Crate x={5.9} z={3} />
      <Crate x={5.9} z={2.4} y={1.38} />
      <mesh
        userData={{ dynamic: true }}
        ref={beacon}
        position={[4.2, 6.8, 1.8]}
      >
        <sphereGeometry args={[0.4, 10, 8]} />
        <meshStandardMaterial
          color="#f2ac47"
          emissive="#f2ac47"
          emissiveIntensity={2}
        />
      </mesh>
    </>
  );
}
function Clinic() {
  return (
    <>
      <Box position={[0, 0.14, 0]} scale={[10, 0.28, 9.7]} color="#e2dcc6" />
      <Box position={[0, 3, 0]} scale={[8.5, 6, 6.3]} color="#e9e8d4" />
      <Box position={[0, 6.04, 0]} scale={[9.2, 0.4, 7]} color="#8fa898" />
      <Box
        position={[-2.3, 7.03, -0.5]}
        scale={[3.7, 1.6, 4.4]}
        color="#d8ddc9"
      />
      <Box position={[0.6, 1.5, 3.19]} scale={[2.6, 3, 0.14]} color="#769d95" />
      <Box position={[0.6, 3.1, 3.6]} scale={[4, 0.22, 1.3]} color="#92b6a5" />
      <Box
        position={[2.5, 4.5, 3.24]}
        scale={[0.48, 1.6, 0.2]}
        color="#d87460"
      />
      <Box
        position={[2.5, 4.5, 3.25]}
        scale={[1.6, 0.48, 0.21]}
        color="#d87460"
      />
      <Sign
        text="HILLVIEW CLINIC"
        position={[-0.6, 4.75, 3.19]}
        width={4.1}
        height={0.62}
        background="#e9e8d4"
        color="#4e7970"
      />
      {[-2.6, -0.6, 1.4].map((x) => (
        <Window key={x} x={x} y={4.3} z={-3.18} />
      ))}
      <Window x={-2.55} y={1.85} z={3.2} />
      <Box
        position={[0.6, 0.13, 4.12]}
        scale={[4, 0.25, 1.7]}
        color="#cdcdb7"
      />
      <Tree x={-5.4} z={-1.8} size={0.8} />
    </>
  );
}
function Market() {
  return (
    <>
      <Box position={[0, 0.13, 0]} scale={[12, 0.26, 10]} color="#d9d1b2" />
      {[-3, 3].map((x, i) => (
        <group key={x} position={[x, 0, 0]}>
          <Box position={[0, 0.9, 1]} scale={[3.8, 1.6, 2]} color="#b7976e" />
          {[-1.55, 1.55].map((v) => (
            <Cylinder
              key={v}
              position={[v, 1.7, 0]}
              scale={[0.075, 3.4, 0.075]}
              color="#8a7055"
            />
          ))}
          <Awning
            width={4.2}
            color={i ? "#819a75" : "#d98c58"}
            z={-0.9}
            y={3.4}
          />
          {[-1, 0, 1].map((v, k) => (
            <group key={v}>
              <Box
                position={[v, 1.72, 1]}
                scale={[0.9, 0.17, 1.5]}
                color="#826c4d"
              />
              {[0, 1, 2].map((q) => (
                <Cylinder
                  key={q}
                  position={[v + (q % 2) * 0.22 - 0.1, 1.95, 0.6 + q * 0.35]}
                  scale={[0.24, 0.24, 0.24]}
                  color={k % 2 ? "#db9e54" : "#9baf72"}
                />
              ))}
            </group>
          ))}
        </group>
      ))}
      <Sign
        text="RIVERSIDE MARKET"
        position={[0, 3.82, 0.59]}
        width={8}
        height={0.67}
        background="#e6dac0"
        color="#526d55"
      />
      <Crate x={-4} z={-2.7} />
      <Crate x={-3} z={-2.7} />
      <Crate x={3.6} z={3.5} />
    </>
  );
}
function TownBuilding({ place }: { place: Place }) {
  return (
    <>
      <NeighborhoodBuilding
        style={buildingStyleFor(place)}
        color={place.color}
        name={place.kind === "home" ? undefined : place.name}
      />
      {place.kind === "cafe" && (
        <group position={[4.1, 0, 1.5]}>
          <Cylinder position={[0, 1.08, 0]} scale={[0.87, 0.15, 0.87]} color="#d8bd8e" />
          <Cylinder position={[0, 0.55, 0]} scale={[0.14, 1.1, 0.14]} color="#877653" />
          <Cylinder position={[0, 2.3, 0]} scale={[0.055, 4, 0.055]} color="#978460" />
          <mesh position={[0, 3.8, 0]}>
            <coneGeometry args={[1.15, 0.5, 8]} />
            <meshStandardMaterial color="#d6b584" roughness={1} />
          </mesh>
          <Bench x={0} z={1.8} />
        </group>
      )}
    </>
  );
}
export const Building = memo(function Building({
  place,
  index,
  game,
  onSelect,
}: {
  place: Place;
  index: number;
  game: SceneState;
  onSelect: (s: Selection) => void;
}) {
  const root = useRef<Group>(null);
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 5) return;
    e.stopPropagation();
    if (place.kind === "depot") onSelect({ type: "depot", id: place.id });
    else {
      const order = game.orders.find(
        (o) =>
          o.destination === place.id &&
          o.status !== "failed" &&
          o.status !== "delivered",
      );
      if (order) onSelect({ type: "order", id: order.id });
    }
  };
  return (
    <group
      ref={root}
      position={[place.x, 0.16, place.z]}
      rotation={[0, place.rotation || 0, 0]}
      onClick={onClick}
    >
      <Baked>
        {place.kind === "depot" ? (
          <Depot place={place} game={game} />
        ) : place.kind === "clinic" ? (
          <Clinic />
        ) : place.kind === "market" ? (
          <Market />
        ) : (
          <TownBuilding place={place} />
        )}
      </Baked>
      <BuildingLife place={place} index={index} game={game} />
    </group>
  );
});
