import { memo } from "react";
import { Baked } from "../world/Baked";
import {
  Box,
  Cylinder,
  Roof,
  Sign,
  Tree,
  Bench,
  Lamp,
  palette,
} from "../world/Primitives";
import { NeighborhoodBuilding } from "../world/NeighborhoodBuildings";
import { edgeBuildingStyle } from "../world/buildingStyles";

export const CITY_SIZE = {
  width: 180,
  depth: 148,
  originalWidth: 126,
  originalDepth: 106,
};
export type CityRoad = {
  from: [number, number];
  to: [number, number];
  bridge?: boolean;
};
export const expandedRoads: CityRoad[] = [];
for (const z of [-52, 52]) {
  expandedRoads.push(
    { from: [-64, z], to: [-12, z] },
    { from: [-12, z], to: [12, z], bridge: true },
    { from: [12, z], to: [64, z] },
  );
}
for (const x of [-64, -48, -30, -12, 12, 30, 48, 64]) {
  expandedRoads.push(
    { from: [x, -52], to: [x, -40] },
    { from: [x, 40], to: [x, 52] },
  );
}
for (const side of [-1, 1]) {
  expandedRoads.push({ from: [side * 64, -40], to: [side * 64, 40] });
  for (const z of [-40, -24, -8, 8, 24, 40])
    expandedRoads.push({ from: [side * 48, z], to: [side * 64, z] });
}
function Road({ road }: { road: CityRoad }) {
  const [ax, az] = road.from,
    [bx, bz] = road.to;
  const length = Math.hypot(bx - ax, bz - az);
  return (
    <group
      position={[(ax + bx) / 2, 0, (az + bz) / 2]}
      rotation={[0, Math.atan2(bx - ax, bz - az), 0]}
    >
      <Box
        position={[0, 0.15, 0]}
        scale={[7.2, 0.32, length]}
        color={road.bridge ? "#c5cfd3" : "#dbe1e1"}
        shadow={false}
      />
      <Box
        position={[0, 0.335, 0]}
        scale={[5.55, 0.1, length + 0.08]}
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
      {road.bridge &&
        [-1, 1].map((side) => (
          <group key={side}>
            <Box
              position={[side * 3.3, 1.3, 0]}
              scale={[0.2, 0.2, length]}
              color="#e0e6e5"
            />
            {Array.from({ length: 9 }, (_, i) => (
              <Box
                key={i}
                position={[side * 3.3, 0.85, -length / 2 + (i * length) / 8]}
                scale={[0.22, 1.3, 0.22]}
                color="#b5c4c8"
              />
            ))}
            <Box
              position={[side * 2.1, -0.8, 0]}
              scale={[0.9, 2, length * 0.8]}
              color="#91a6aa"
            />
          </group>
        ))}
    </group>
  );
}
const newJunctions = Array.from(
  new Map(
    expandedRoads
      .flatMap((road) => [road.from, road.to])
      .map((p) => [p.join(","), p]),
  ).values(),
);
export function NewStreets() {
  return (
    <Baked>
      {expandedRoads.map((road, i) => (
        <Road key={i} road={road} />
      ))}
      {newJunctions.map(([x, z]) => (
        <Box
          key={`${x}:${z}`}
          position={[x, 0.397, z]}
          scale={[5.55, 0.012, 5.55]}
          color={palette.asphalt}
          shadow={false}
        />
      ))}
    </Baked>
  );
}
function NeighborhoodLot({ x, z, color, face = 0, parcel }: {
  x: number; z: number; color: string; face?: number; parcel: number;
}) {
  return (
    <group position={[x, 0.24, z]} rotation={[0, face, 0]}>
      {/* The edge blocks have only 4.8 units between sidewalks. Keep every
          facade, balcony and garden inside that strip, including foundations. */}
      <group scale={[0.88, 0.92, 0.56]}>
        <NeighborhoodBuilding style={edgeBuildingStyle(x, z, parcel)} color={color} />
      </group>
    </group>
  );
}
function CivicHall() {
  return (
    <group position={[-78, 0.25, 0]} rotation={[0, Math.PI / 2, 0]}>
      <Box position={[0, 0.05, 0]} scale={[12.6, 0.1, 11.8]} color="#b9c9db" />
      <Box position={[0, 3, -1]} scale={[10, 6, 6.5]} color="#c8dbec" />
      <Roof position={[0, 6, -1]} scale={[10.7, 2.3, 7.2]} color="#738b9d" />
      <Box position={[0, 2.5, 3.1]} scale={[9.4, 0.3, 2]} color="#b1bec7" />
      {[-3.7, -1.2, 1.2, 3.7].map((x) => (
        <Cylinder
          key={x}
          position={[x, 1.3, 3.3]}
          scale={[0.22, 2.6, 0.22]}
          color="#e8f4fc"
        />
      ))}
      <Box position={[0, 1.25, 2.3]} scale={[1.8, 2.5, 0.12]} color="#6d808d" />
      <Sign
        text="CITY HALL"
        position={[0, 4.7, 2.3]}
        width={7.8}
        height={0.7}
        color="#58715c"
        background="#edf1f4"
      />
      <Cylinder
        position={[0, 8.6, -1]}
        scale={[0.08, 2.5, 0.08]}
        color="#c5b18a"
      />
      <Box position={[0.8, 9, -1]} scale={[1.6, 0.9, 0.08]} color="#a6ba8d" />
      <Bench x={-4.4} z={4.7} />
      <Bench x={4.4} z={4.7} />
    </group>
  );
}
function Apartments({ x, z, color }: { x: number; z: number; color: string }) {
  return (
    <group position={[x, 0.22, z]} rotation={[0, x > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}>
      <group scale={[1.15, 1.12, 1.15]}>
        <NeighborhoodBuilding style={x < 0 ? "brick-terrace" : "solar-steps"} color={color} />
      </group>
      <Tree x={-4.9} z={-4.9} size={0.6} />
    </group>
  );
}
function Garden({
  x,
  z,
  orchard = false,
}: {
  x: number;
  z: number;
  orchard?: boolean;
}) {
  return (
    <group position={[x, 0.22, z]}>
      <Box position={[0, 0.1, 0]} scale={[12, 0.2, 12]} color="#b0caa6" />
      <Box position={[0, 0.23, 0]} scale={[12, 0.06, 2]} color="#cbd6dc" />
      <Box position={[0, 0.23, 0]} scale={[2, 0.06, 12]} color="#cbd6dc" />
      {[-3.5, 3.5].flatMap((tx) =>
        [-3.5, 3.5].map((tz) => (
          <Tree key={`${tx}:${tz}`} x={tx} z={tz} size={orchard ? 1 : 0.75} />
        )),
      )}
      <Bench x={-3.8} z={1.9} />
      <Bench x={3.8} z={-1.9} rotation={Math.PI} />
      {!orchard && (
        <>
          <Cylinder
            position={[0, 0.45, 0]}
            scale={[1.7, 0.5, 1.7]}
            color="#b9cbd2"
          />
          <Cylinder
            position={[0, 0.72, 0]}
            scale={[1.42, 0.06, 1.42]}
            color="#79afba"
          />
        </>
      )}
    </group>
  );
}
function Riverfront() {
  return (
    <>
      {[-1, 1].map((side) => (
        <group key={side}>
          <Box
            position={[side * 8, 0.3, 0]}
            scale={[2.8, 0.12, 143]}
            color="#d6e0e1"
            shadow={false}
          />
          {[-64, -44, -28, -12, 4, 20, 36, 64].map((z, i) => (
            <Lamp key={z} x={side * 8.35} z={z} />
          ))}
          {[-64, -34, 2, 34, 64].map((z) => (
            <Bench
              key={z}
              x={side * 8.1}
              z={z + 4}
              rotation={(side * Math.PI) / 2}
            />
          ))}
          <Box
            position={[side * 4, -0.04, 64]}
            scale={[3, 0.25, 12]}
            color="#b79368"
          />
          {[-4, -2, 0, 2, 4].map((z) => (
            <Box
              key={z}
              position={[side * 4, 0.12, 64 + z]}
              scale={[3, 0.08, 0.12]}
              color="#dfc095"
            />
          ))}
        </group>
      ))}
      <Sign
        text="TINY RIVER"
        position={[0, -0.092, -14]}
        width={10}
        height={1.7}
        color="#e7f1ef"
        background={palette.water}
        rotation={[-Math.PI / 2, 0, -Math.PI / 2]}
      />
      <Sign
        text="NORTH GARDENS"
        position={[0, 1.58, -55.45]}
        width={9}
        height={0.55}
        color="#5b7466"
        background="#edf1f4"
        rotation={[0, Math.PI, 0]}
      />
      <Sign
        text="SOUTH PROMENADE"
        position={[0, 1.58, 55.45]}
        width={10}
        height={0.55}
        color="#5b7466"
        background="#edf1f4"
      />
    </>
  );
}
export const ExpandedCityDetails = memo(function ExpandedCityDetails() {
  return (
    <Baked>
      <Riverfront />
      <CivicHall />
      <Apartments x={-78} z={-16} color="#bfd4ca" />
      <Apartments x={78} z={-16} color="#dcc9b4" />
      <Garden x={78} z={0} />
      <Garden x={-78} z={49} orchard />
      <Garden x={78} z={49} orchard />
      {[-1, 1].flatMap((side) =>
        [-56, -39, -21, 21, 39, 56].map((x, i) => (
          <NeighborhoodLot
            key={`${side}:${x}`}
            x={x}
            z={side * 46}
            face={side < 0 ? Math.PI : 0}
            parcel={x < 0 ? i : i - 3}
            color={
              [
                "#decdb6",
                "#bed3bd",
                "#d8bcb8",
                "#cad4b3",
                "#b9cfd4",
                "#c7c8d8",
              ][i]
            }
          />
        )),
      )}
      <Garden x={-59} z={64} />
      <Garden x={59} z={64} />
      <Garden x={-59} z={-64} orchard />
      <Garden x={59} z={-64} orchard />
      {[-1, 1].flatMap((side) =>
        [-64, -40, -24, 8, 32, 64].map((z, i) => (
          <Tree
            key={`${side}:${z}`}
            x={side * 86}
            z={z}
            size={0.8 + (i % 3) * 0.2}
            pine={z < 0}
          />
        )),
      )}
      {[-1, 1].flatMap((side) =>
        [-60, -45, -15, 15, 45, 60].map((x, i) => (
          <Tree
            key={`edge:${side}:${x}`}
            x={x}
            z={side * 71}
            size={0.7 + (i % 2) * 0.2}
            pine={side < 0}
          />
        )),
      )}
      {[-1, 1].flatMap((side) =>
        [-34, -16, 2, 20, 36].map((z) => (
          <Lamp key={`avenue:${side}:${z}`} x={side * 67.7} z={z} />
        )),
      )}
      {[-1, 1].flatMap((side) =>
        [-44, -28, -12, 12, 28, 44].map((x, i) => (
          <Lamp key={`avenue:${side}:${x}`} x={x} z={side * 55.8} />
        )),
      )}
      {[
        [-56, -34],
        [-55, 16],
        [56, -36],
        [55, 19],
        [-7.9, -16],
        [7.9, -35],
        [-7.9, 15],
        [7.9, 14],
      ].map(([x, z], i) => (
        <Tree key={`inner:${i}`} x={x} z={z} size={0.72} />
      ))}
    </Baked>
  );
});
