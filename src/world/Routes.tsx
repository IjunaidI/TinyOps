import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { GameState } from "../types";
import {
  assignmentPoints,
  getAssignmentOptions,
  vanRoutePoints,
  shortestPath,
} from "../sim/engine";
import { nodeById, placeById } from "../data/map";

type Point = [number, number];
/** Flat ribbons and a handful of moving arrowheads; no post-processing pass. */
function Ribbon({
  points,
  color,
  age,
  ghost = false,
  reduced,
}: {
  points: Point[];
  color: string;
  age: () => number;
  ghost?: boolean;
  reduced: boolean;
}) {
  const mesh = useRef<THREE.Mesh>(null),
    arrows = useRef<THREE.Group>(null);
  const material = useRef<THREE.MeshBasicMaterial>(null);
  const path = useMemo(() => {
    const cleaned = points.filter(
      (p, i) =>
        i === 0 ||
        Math.hypot(p[0] - points[i - 1][0], p[1] - points[i - 1][1]) > 0.02,
    );
    const lengths = cleaned
      .slice(1)
      .map((p, i) => Math.hypot(p[0] - cleaned[i][0], p[1] - cleaned[i][1]));
    const total = lengths.reduce((a, b) => a + b, 0);
    const samples: Point[] = [];
    cleaned.slice(1).forEach((p, i) => {
      const steps = Math.max(1, Math.ceil(lengths[i] / 1.2));
      for (let k = 0; k < steps; k++)
        samples.push([
          THREE.MathUtils.lerp(cleaned[i][0], p[0], k / steps),
          THREE.MathUtils.lerp(cleaned[i][1], p[1], k / steps),
        ]);
    });
    if (cleaned.length) samples.push(cleaned[cleaned.length - 1]);
    const vertices: number[] = [];
    for (let i = 1; i < samples.length; i++) {
      const a = samples[i - 1],
        b = samples[i],
        dx = b[0] - a[0],
        dz = b[1] - a[1],
        len = Math.hypot(dx, dz) || 1;
      const w = ghost ? 0.2 : 0.36,
        ox = (dz / len) * w,
        oz = (-dx / len) * w;
      vertices.push(
        a[0] - ox,
        0.52,
        a[1] - oz,
        b[0] - ox,
        0.52,
        b[1] - oz,
        b[0] + ox,
        0.52,
        b[1] + oz,
        a[0] - ox,
        0.52,
        a[1] - oz,
        b[0] + ox,
        0.52,
        b[1] + oz,
        a[0] + ox,
        0.52,
        a[1] + oz,
      );
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    return { geometry, cleaned, lengths, total, count: vertices.length / 3 };
  }, [points, ghost]);
  useEffect(() => () => path.geometry.dispose(), [path]);
  useFrame(() => {
    const t = age(),
      reveal = ghost || reduced ? 1 : Math.min(1, t / 1.25);
    path.geometry.setDrawRange(0, Math.floor((path.count * reveal) / 6) * 6);
    if (material.current)
      material.current.opacity = ghost ? Math.max(0, 0.58 - t * 0.19) : 0.78;
    if (mesh.current) mesh.current.visible = t >= 0;
    arrows.current?.children.forEach((arrow, i) => {
      arrow.visible = !ghost && path.total > 1 && reveal > 0.2;
      let distance =
        (((t * 7 + (i * path.total) / 4) % path.total) + path.total) %
        path.total;
      if (distance > path.total * reveal) {
        arrow.visible = false;
        return;
      }
      let k = 0;
      while (k < path.lengths.length - 1 && distance > path.lengths[k])
        distance -= path.lengths[k++];
      const a = path.cleaned[k],
        b = path.cleaned[k + 1];
      if (!a || !b) return;
      const f = distance / path.lengths[k];
      arrow.position.set(
        THREE.MathUtils.lerp(a[0], b[0], f),
        0.68,
        THREE.MathUtils.lerp(a[1], b[1], f),
      );
      arrow.rotation.y = Math.atan2(b[0] - a[0], b[1] - a[1]);
    });
  });
  return (
    <group>
      <mesh
        ref={mesh}
        geometry={path.geometry}
        renderOrder={2}
        raycast={() => {}}
      >
        <meshBasicMaterial
          ref={material}
          color={color}
          transparent
          opacity={0.8}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      {!ghost && (
        <group ref={arrows}>
          {Array.from({ length: reduced ? 1 : 4 }, (_, i) => (
            <mesh key={i} rotation={[0, 0, 0]} raycast={() => {}}>
              <coneGeometry
                args={[0.48, 1.25, 3]}
                onUpdate={(geometry) => geometry.rotateX(Math.PI / 2)}
              />
              <meshBasicMaterial color={color} toneMapped={false} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}
export function Routes({ game }: { game: GameState }) {
  const order =
    game.selection?.type === "order"
      ? game.orders.find((o) => o.id === game.selection!.id)
      : undefined;
  const van =
    game.selection?.type === "van"
      ? game.vans.find((v) => v.id === game.selection!.id)
      : order?.vanId
        ? game.vans.find((v) => v.id === order.vanId)
        : undefined;
  const options =
    order?.status === "queued" ? getAssignmentOptions(order.id) : [];
  const candidate =
    options.find((o) => o.van.id === game.previewVan) ?? options[0];
  const selectedPoints = van
    ? vanRoutePoints(van)
    : candidate
      ? assignmentPoints(candidate)
      : [];
  const activeOrder = order ?? game.orders.find((o) => o.id === van?.orderId);
  if (van && activeOrder && !van.carrying) {
    // The rest of the delivery leg stays visible after the pickup route.
    const delivery = getDeliveryLeg(
      activeOrder.source,
      activeOrder.destination,
    );
    selectedPoints.push(...delivery);
  }
  const latest = game.routeVisuals
    .filter((v) => game.time - v.started < 7)
    .slice(-3);
  return (
    <>
      {latest.map((event) => (
        <group key={event.id}>
          {event.previous && (
            <Ribbon
              points={event.previous}
              color="#ed9275"
              ghost
              age={() => game.time - event.started}
              reduced={game.reduced}
            />
          )}
          {(!van || van.id !== event.vanId) && (
            <Ribbon
              points={event.points}
              color={event.kind === "reroute" ? "#ffb95f" : "#96efe0"}
              age={() => game.time - event.started}
              reduced={game.reduced}
            />
          )}
        </group>
      ))}
      {selectedPoints.length > 1 && (
        <Ribbon
          points={selectedPoints}
          color={candidate ? "#89e1d2" : "#ffda88"}
          age={() =>
            game.time -
            ([...latest].reverse().find((e) => e.vanId === van?.id)?.started ??
              -2)
          }
          reduced={game.reduced}
        />
      )}
    </>
  );
}
function getDeliveryLeg(source: string, destination: string): Point[] {
  return shortestPath(
    placeById[source].node,
    placeById[destination].node,
  ).route.map((id) => [nodeById[id].x, nodeById[id].z]);
}
