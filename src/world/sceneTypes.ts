import type { GameState } from "../types";

/** The scenery only needs these visual fields, independently of any game engine. */
export type SceneState = Pick<
  GameState,
  | "phase"
  | "time"
  | "speed"
  | "paused"
  | "reduced"
  | "daylight"
  | "vans"
  | "orders"
  | "incidents"
>;
