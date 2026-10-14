import { city, exportCityState, restoreCityState } from "./engine";
import {
  exportMayorSession,
  normalizeMayorSession,
  restoreMayorSession,
} from "./controller";
import type { ActionResult } from "./types";

export const CITY_SAVE_KEY = "tinyops.mayor.v1";
export const MAX_CITY_SAVE_BYTES = 1_000_000;
export interface CityLoadResult extends ActionResult {
  found: boolean;
}

/** A portable, deliberately whitelisted snapshot. Connection credentials never enter it. */
export function exportCitySave(): string {
  return JSON.stringify(
    {
      format: "tinyops-mayor",
      version: 1,
      savedAt: new Date().toISOString(),
      simulation: exportCityState(),
      advisor: exportMayorSession(),
    },
    null,
    2,
  );
}

/** Validate before touching the running world. Imported city clocks always start paused. */
export function importCitySave(serialized: string): ActionResult {
  if (
    typeof serialized !== "string" ||
    serialized.length > MAX_CITY_SAVE_BYTES ||
    new TextEncoder().encode(serialized).byteLength > MAX_CITY_SAVE_BYTES
  )
    return {
      ok: false,
      error: "Choose a Jevtown city save smaller than 1 MB.",
    };
  try {
    const value: unknown = JSON.parse(serialized);
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error("Choose a Jevtown city save file.");
    const input = value as Record<string, unknown>;
    if (input.format !== "tinyops-mayor" || input.version !== 1)
      throw new Error("This file is not a supported Jevtown city save.");
    const advisor = normalizeMayorSession(input.advisor);
    if (!advisor) throw new Error("The saved advisor session is invalid.");
    const result = restoreCityState(input.simulation);
    if (!result.ok) return result;
    // Normalization already succeeded, so this cannot leave a partially imported city.
    restoreMayorSession(advisor);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof SyntaxError
          ? "The city save is not valid JSON."
          : error instanceof Error
            ? error.message
            : "The city save could not be imported.",
    };
  }
}

export function saveCity(): ActionResult {
  if (city.phase === "lobby")
    return { ok: false, error: "Start a city before saving it." };
  try {
    const serialized = exportCitySave();
    if (new TextEncoder().encode(serialized).byteLength > MAX_CITY_SAVE_BYTES)
      return {
        ok: false,
        error: "The city save is too large for this version.",
      };
    localStorage.setItem(CITY_SAVE_KEY, serialized);
    return { ok: true };
  } catch {
    return {
      ok: false,
      error:
        "This browser could not save the city. You can still export a save file.",
    };
  }
}

export function loadCity(): CityLoadResult {
  try {
    const serialized = localStorage.getItem(CITY_SAVE_KEY);
    if (serialized === null) return { ok: true, found: false };
    return { ...importCitySave(serialized), found: true };
  } catch {
    return {
      ok: false,
      found: false,
      error: "This browser could not read the saved city.",
    };
  }
}

export function clearCitySave(): ActionResult {
  try {
    localStorage.removeItem(CITY_SAVE_KEY);
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "This browser could not remove the saved city.",
    };
  }
}
