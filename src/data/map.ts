import type { Place, RoadEdge, RoadNode } from "../types";

// One deliberately small district: two street grids and exactly two river crossings.
const rows = [-40, -24, -8, 8, 24, 40];
export const nodes: RoadNode[] = [];
export const edges: RoadEdge[] = [];
for (const [bank, columns] of [
  ["w", [-48, -30, -12]],
  ["e", [12, 30, 48]],
] as const) {
  columns.forEach((x, col) =>
    rows.forEach((z, row) => nodes.push({ id: `${bank}${col}_${row}`, x, z })),
  );
  columns.forEach((_, col) =>
    rows.forEach((_, row) => {
      if (row < rows.length - 1)
        edges.push({
          id: `${bank}-v${col}-${row}`,
          a: `${bank}${col}_${row}`,
          b: `${bank}${col}_${row + 1}`,
          ...(bank === "w" && col === 2 && (row === 1 || row === 2)
            ? { kind: "market" as const }
            : {}),
        });
      if (col < columns.length - 1)
        edges.push({
          id: `${bank}-h${col}-${row}`,
          a: `${bank}${col}_${row}`,
          b: `${bank}${col + 1}_${row}`,
        });
    }),
  );
}
edges.push({ id: "north-bridge", a: "w2_1", b: "e0_1", kind: "bridge" });
edges.push({ id: "south-crossing", a: "w2_4", b: "e0_4", kind: "south" });

export const places: Place[] = [
  {
    id: "west-depot",
    name: "West Depot",
    node: "w1_3",
    x: -39,
    z: 0,
    kind: "depot",
    color: "#c2815b",
  },
  {
    id: "east-depot",
    name: "East Depot",
    node: "e1_3",
    x: 39,
    z: 0,
    kind: "depot",
    color: "#669b9b",
  },
  {
    id: "market",
    name: "Riverside Market",
    node: "w2_2",
    x: -21,
    z: -16,
    kind: "market",
    color: "#e5c18b",
  },
  {
    id: "cafe",
    name: "Corner Cafe",
    node: "w1_1",
    x: -39,
    z: -16,
    kind: "cafe",
    color: "#e9d4b3",
  },
  {
    id: "clinic",
    name: "Hillview Clinic",
    node: "e1_0",
    x: 39,
    z: -32,
    kind: "clinic",
    color: "#d6e2d5",
  },
  {
    id: "maple",
    name: "Maple House",
    node: "e0_0",
    x: 21,
    z: -32,
    kind: "home",
    color: "#ecc8a9",
  },
  {
    id: "willow",
    name: "Willow House",
    node: "e2_1",
    x: 39,
    z: -16,
    kind: "home",
    color: "#e9d9b4",
  },
  {
    id: "books",
    name: "Paper & Pine",
    node: "w0_0",
    x: -39,
    z: -32,
    kind: "shop",
    color: "#b8cbba",
  },
  {
    id: "grocer",
    name: "Green Basket",
    node: "w2_4",
    x: -21,
    z: 16,
    kind: "shop",
    color: "#c6d1aa",
  },
  {
    id: "studio",
    name: "Clay Studio",
    node: "e0_4",
    x: 21,
    z: 16,
    kind: "shop",
    color: "#cfa88f",
  },
  {
    id: "bakery",
    name: "Morning Bakery",
    node: "e2_5",
    x: 39,
    z: 32,
    kind: "shop",
    color: "#e9c796",
  },
  {
    id: "terrace",
    name: "Sunset Terrace",
    node: "w0_5",
    x: -39,
    z: 32,
    kind: "home",
    color: "#d4c4b6",
  },
  {
    id: "warehouse-north",
    name: "Foundry Stores",
    node: "w2_0",
    x: -21,
    z: -32,
    kind: "warehouse",
    color: "#b28e76",
  },
  {
    id: "market-stores",
    name: "Market Stores",
    node: "w2_3",
    x: -21,
    z: 0,
    kind: "shop",
    color: "#e8c9a4",
  },
  {
    id: "west-workshop",
    name: "The Workshop",
    node: "w0_4",
    x: -39,
    z: 16,
    kind: "warehouse",
    color: "#b77e5b",
  },
  {
    id: "riverside-home",
    name: "Riverside House",
    node: "w2_5",
    x: -21,
    z: 32,
    kind: "home",
    color: "#c3c8b3",
  },
  {
    id: "garden-house",
    name: "Garden House",
    node: "e0_1",
    x: 21,
    z: -16,
    kind: "home",
    color: "#cad6bc",
  },
  {
    id: "east-corner",
    name: "East Corner",
    node: "e0_3",
    x: 21,
    z: 0,
    kind: "shop",
    color: "#a5bfbc",
  },
  {
    id: "east-workshop",
    name: "Blue Workshop",
    node: "e2_4",
    x: 39,
    z: 16,
    kind: "warehouse",
    color: "#84a6af",
  },
  {
    id: "hillview-home",
    name: "Hillview House",
    node: "e0_5",
    x: 21,
    z: 32,
    kind: "home",
    color: "#d7d6bc",
  },
  {
    id: "west-end",
    name: "West End Stores",
    node: "w0_2",
    x: -55,
    z: -16,
    kind: "shop",
    color: "#ceb996",
    rotation: Math.PI / 2,
  },
  {
    id: "west-yard",
    name: "Works Annex",
    node: "w0_3",
    x: -55,
    z: 0,
    kind: "warehouse",
    color: "#b89679",
    rotation: Math.PI / 2,
  },
  {
    id: "east-villa",
    name: "Eastern Villa",
    node: "e2_2",
    x: 55,
    z: -16,
    kind: "home",
    color: "#ded3b5",
    rotation: -Math.PI / 2,
  },
  {
    id: "east-townhouse",
    name: "East Townhouse",
    node: "e2_3",
    x: 55,
    z: 0,
    kind: "home",
    color: "#c1ccc4",
    rotation: -Math.PI / 2,
  },
];

export const nodeById: Record<string, RoadNode> = Object.fromEntries(
  nodes.map((node) => [node.id, node]),
);
export const placeById: Record<string, Place> = Object.fromEntries(
  places.map((place) => [place.id, place]),
);
