import { useMemo, useRef } from "react";
import { WorldHtml } from "../world/WorldHtml";
import { useFrame } from "@react-three/fiber";
import {
  Flag,
  HardHat,
  Landmark,
  Mail,
  MessageSquare,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import * as THREE from "three";
import type { CityAlert } from "./cityAlerts";
import type { DistrictId } from "./types";

export const districtCoordinates: Record<DistrictId, [number, number]> = {
  riverside: [-40, 29],
  oldtown: [-40, -29],
  market: [40, 29],
  hillview: [40, -29],
};

const alertIcons = {
  request: MessageSquare,
  petition: Mail,
  asset: Wrench,
  service: Users,
  promise: Flag,
  construction: HardHat,
  council: Landmark,
  budget: Wallet,
};
type AlertPin = {
  alert: CityAlert;
  count: number;
  position: [number, number];
};
const priorityOrder = (a: CityAlert, b: CityAlert) =>
  b.priority - a.priority ||
  a.day - b.day ||
  (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** Whole-city pins summarize districts; focused pins retain exact source locations. */
export function visibleAlertPins(
  alerts: CityAlert[],
  focus?: DistrictId | null,
  selectedAlertId?: string | null,
): AlertPin[] {
  const ordered = [...alerts].sort(
    (a, b) =>
      Number(b.id === selectedAlertId) - Number(a.id === selectedAlertId) ||
      priorityOrder(a, b),
  );
  if (focus) {
    return ordered
      .filter((alert) => alert.districtId === focus)
      .slice(0, 6)
      .map((alert) => ({
        alert,
        count: 1,
        position: alert.position ?? districtCoordinates[focus],
      }));
  }
  const groups = new Map<DistrictId | "city", CityAlert[]>();
  for (const alert of ordered) {
    const key = alert.districtId ?? "city";
    const group = groups.get(key) ?? [];
    group.push(alert);
    groups.set(key, group);
  }
  return [...groups].map(([district, group]) => ({
    alert: group[0],
    count: group.length,
    position: district === "city" ? [0, 0] : districtCoordinates[district],
  }));
}

// Screen-space offsets keep nearby pins individually clickable without moving
// their underlying world positions. A small leader links displaced pins back.
const collisionOffsets = [
  [0, 0],
  [0, -46],
  [46, 0],
  [-46, 0],
  [0, 46],
  [46, -46],
  [-46, -46],
  [46, 46],
  [-46, 46],
  [0, -92],
  [92, 0],
  [-92, 0],
];

export default function WorldAlertMarkers({
  alerts,
  focus,
  selectedAlertId,
  onSelectAlert,
}: {
  alerts: CityAlert[];
  focus?: DistrictId | null;
  selectedAlertId?: string | null;
  onSelectAlert?: (alert: CityAlert) => void;
}) {
  const pins = useMemo(
    () => visibleAlertPins(alerts, focus, selectedAlertId),
    [alerts, focus, selectedAlertId],
  );
  const elements = useRef(new Map<string, HTMLDivElement>());
  const projection = useRef(new THREE.Vector3());
  useFrame(({ camera, size }) => {
    const occupied: [number, number][] = [];
    for (const pin of pins) {
      const element = elements.current.get(pin.alert.id);
      if (!element) continue;
      projection.current
        .set(pin.position[0], 7, pin.position[1])
        .project(camera);
      const x = ((projection.current.x + 1) * size.width) / 2;
      const y = ((1 - projection.current.y) * size.height) / 2;
      const visible =
        projection.current.z >= -1 &&
        projection.current.z <= 1 &&
        x >= -20 &&
        x <= size.width + 20 &&
        y >= -20 &&
        y <= size.height + 20;
      element.style.visibility = visible ? "visible" : "hidden";
      if (!visible) continue;
      const offset = collisionOffsets.find(
        ([dx, dy]) =>
          x + dx >= 24 &&
          x + dx <= size.width - 24 &&
          y + dy >= 24 &&
          y + dy <= size.height - 24 &&
          occupied.every(
            ([px, py]) =>
              Math.abs(x + dx - px) >= 42 || Math.abs(y + dy - py) >= 42,
          ),
      ) ?? [0, 0];
      const [dx, dy] = offset;
      occupied.push([x + dx, y + dy]);
      element.style.transform = `translate(${dx}px, ${dy}px)`;
      const leader = element.querySelector("line");
      if (leader) {
        leader.setAttribute("x2", String(-dx));
        leader.setAttribute("y2", String(-dy));
        leader.style.opacity = dx || dy ? "0.55" : "0";
      }
    }
  });
  return (
    <group>
      {pins.map(({ alert, count, position }) => {
        const Icon = alertIcons[alert.kind];
        return (
          <WorldHtml
            key={alert.id}
            position={[position[0], 7, position[1]]}
            center
            zIndexRange={[40, 20]}
            style={{ pointerEvents: "none" }}
          >
            <div
              ref={(element) => {
                if (element) elements.current.set(alert.id, element);
                else elements.current.delete(alert.id);
              }}
              className="world-alert-anchor"
              style={{ position: "relative" }}
            >
              <svg
                aria-hidden="true"
                width="0"
                height="0"
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  overflow: "visible",
                  pointerEvents: "none",
                }}
              >
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="0"
                  stroke="#6d7f82"
                  strokeWidth="1.5"
                />
              </svg>
              <button
                type="button"
                className={`world-alert-pin is-${alert.severity}${selectedAlertId === alert.id ? " is-selected" : ""}`}
                aria-label={`Inspect alert: ${alert.title}`}
                aria-pressed={selectedAlertId === alert.id}
                title={`${alert.title}${count > 1 ? ` · ${count} alerts in this area` : ""}`}
                data-alert-id={alert.id}
                style={{ position: "relative", pointerEvents: "auto" }}
                onPointerDown={(event) => event.stopPropagation()}
                onDoubleClick={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectAlert?.(alert);
                }}
              >
                <Icon
                  className="world-alert-glyph"
                  size={18}
                  strokeWidth={2}
                  aria-hidden="true"
                />
                {count > 1 && (
                  <span className="world-alert-count" aria-hidden="true">
                    {count}
                  </span>
                )}
              </button>
            </div>
          </WorldHtml>
        );
      })}
    </group>
  );
}
