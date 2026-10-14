import type { Place } from "../types";

/** Architectural identities stay fixed to parcels, including across saved games. */
export const buildingStyles = {
  "veranda-cottage": "Veranda cottage",
  "garden-villa": "Garden villa",
  "brick-terrace": "Brick terrace",
  "gabled-house": "Gabled townhouse",
  "bay-shop": "Bay-window shop",
  "garden-shop": "Roof-garden grocer",
  "market-arcade": "Market arcade",
  "sawtooth-works": "Sawtooth workshop",
  "water-tower-works": "Water-tower works",
  "corner-cafe": "Corner café",
  "solar-steps": "Solar terraces",
  "split-duplex": "Split-level duplex",
  "courtyard-homes": "Courtyard homes",
  "balcony-tower": "Balcony apartments",
} as const;

export type BuildingStyle = keyof typeof buildingStyles;
export const BUILDING_STYLE_COUNT = Object.keys(buildingStyles).length;

const parcelStyles: Record<string, BuildingStyle> = {
  cafe: "corner-cafe",
  maple: "split-duplex",
  willow: "garden-villa",
  books: "bay-shop",
  grocer: "garden-shop",
  studio: "sawtooth-works",
  bakery: "bay-shop",
  terrace: "brick-terrace",
  "warehouse-north": "sawtooth-works",
  "market-stores": "market-arcade",
  "west-workshop": "water-tower-works",
  "riverside-home": "veranda-cottage",
  "garden-house": "solar-steps",
  "east-corner": "market-arcade",
  "east-workshop": "water-tower-works",
  "hillview-home": "gabled-house",
  "west-end": "bay-shop",
  "west-yard": "sawtooth-works",
  "east-villa": "courtyard-homes",
  "east-townhouse": "balcony-tower",
};

export function buildingStyleFor(place: Place): BuildingStyle {
  return parcelStyles[place.id] ?? (place.kind === "warehouse"
    ? "sawtooth-works"
    : place.kind === "shop" ? "bay-shop" : "veranda-cottage");
}

/** Edges follow the same four neighborhood identities as the inner city. */
export function edgeBuildingStyle(x: number, z: number, parcel: number): BuildingStyle {
  const choices: readonly BuildingStyle[] = x < 0
    ? z < 0
      ? ["brick-terrace", "gabled-house", "bay-shop"]
      : ["veranda-cottage", "garden-villa", "courtyard-homes"]
    : z < 0
      ? ["solar-steps", "split-duplex", "balcony-tower"]
      : ["market-arcade", "sawtooth-works", "bay-shop"];
  return choices[((parcel % choices.length) + choices.length) % choices.length];
}

export function roofGardenHeight(place: Place): number | undefined {
  return buildingStyleFor(place) === "garden-shop" ? 6.55 : undefined;
}
