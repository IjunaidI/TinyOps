import { useLayoutEffect, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { GameState, Selection, Van } from "../types";
import { Baked } from "./Baked";
import { Box, Cylinder, Sign, mat } from "./Primitives";
import { nodeById, placeById } from "../data/map";
import { Headlights } from "./Atmosphere";

function Wheel({
  x,
  z,
  animated = true,
}: {
  x: number;
  z: number;
  animated?: boolean;
}) {
  return (
    <group
      name="wheel"
      userData={{ dynamic: animated }}
      position={[x, 0.43, z]}
    >
      <Cylinder
        scale={[0.38, 0.25, 0.38]}
        rotation={[0, 0, Math.PI / 2]}
        color="#344642"
      />
      <Cylinder
        position={[x > 0 ? 0.14 : -0.14, 0, 0]}
        scale={[0.18, 0.025, 0.18]}
        rotation={[0, 0, Math.PI / 2]}
        color="#c6cabb"
      />
    </group>
  );
}
export function VanModel({
  cold = false,
  number = "01",
}: {
  cold?: boolean;
  number?: string;
}) {
  return (
    <group>
      <Baked>
        <Box position={[0, 0.65, 0]} scale={[1.6, 0.4, 3.55]} color="#415b54" />
        <Box
          position={[0, 1.38, -0.45]}
          scale={[1.76, 1.65, 2.5]}
          color="#f3ecda"
        />
        <Box
          position={[0, 2.22, -0.45]}
          scale={[1.67, 0.12, 2.44]}
          color="#dedccc"
        />
        <Box
          position={[0, 1.23, 1.24]}
          scale={[1.68, 1.31, 1.05]}
          color="#e8e4d1"
        />
        <Box
          position={[0, 1.92, 1.17]}
          scale={[1.68, 0.11, 1.02]}
          color="#e8e4d1"
        />
        <Box
          position={[0, 1.65, 1.78]}
          scale={[1.35, 0.53, 0.045]}
          color="#496e67"
        />
        {[-1, 1].map((side) => (
          <group key={side}>
            <Box
              position={[side * 0.853, 1.65, 1.25]}
              scale={[0.045, 0.52, 0.8]}
              color="#496e67"
            />
            <Box
              position={[side * 0.901, 1.02, -0.4]}
              scale={[0.025, 0.36, 2.5]}
              color={cold ? "#70a7a7" : "#e88143"}
            />
            <Box
              position={[side * 0.99, 1.51, 1.8]}
              scale={[0.25, 0.19, 0.18]}
              color="#435d51"
            />
            <Box
              position={[side * 0.58, 0.95, 1.806]}
              scale={[0.36, 0.19, 0.03]}
              color="#ffedbf"
              emissive
            />
            <Box
              position={[side * 0.57, 1.02, -1.72]}
              scale={[0.22, 0.45, 0.04]}
              color="#cc7259"
            />
            <Wheel x={side * 0.87} z={-1.02} />
            <Wheel x={side * 0.87} z={1.1} />
          </group>
        ))}
        <Box
          position={[0, 0.61, 1.8]}
          scale={[1.65, 0.15, 0.18]}
          color="#7b8f7b"
        />
        {[-1, 1].map((side) => (
          <group
            key={`door${side}`}
            name={`rear-door-${side}`}
            userData={{ dynamic: true }}
            position={[side * 0.86, 1.38, -1.735]}
          >
            <Box
              position={[-side * 0.43, 0, -0.035]}
              scale={[0.83, 1.5, 0.1]}
              color="#e7e4d4"
            />
            <Box
              position={[-side * 0.43, -0.32, -0.095]}
              scale={[0.83, 0.3, 0.025]}
              color={cold ? "#70a7a7" : "#e88143"}
            />
            <Box
              position={[-side * 0.7, 0, -0.1]}
              scale={[0.07, 0.25, 0.04]}
              color="#829789"
            />
          </group>
        ))}
        <Sign
          text={`JEVTOWN ${number}`}
          position={[0.894, 1.64, -0.48]}
          width={1.95}
          height={0.38}
          color={cold ? "#4a797b" : "#ac603c"}
          background="#f3ecda"
          rotation={[0, Math.PI / 2, 0]}
        />
        {cold && (
          <>
            <Box
              position={[0, 2.44, 0.25]}
              scale={[1.05, 0.4, 0.8]}
              color="#a6c7c1"
            />
            <Box
              position={[0, 2.45, 0.663]}
              scale={[0.8, 0.18, 0.03]}
              color="#668a82"
            />
            {[-0.25, 0, 0.25].map((x) => (
              <Box
                key={x}
                position={[x, 2.66, 0.25]}
                scale={[0.07, 0.035, 0.63]}
                color="#668a82"
              />
            ))}
          </>
        )}
      </Baked>
    </group>
  );
}
export function DeliveryVan({
  van,
  game,
  onSelect,
}: {
  van: Van;
  game: GameState;
  onSelect: (s: Selection) => void;
}) {
  const root = useRef<THREE.Group>(null),
    body = useRef<THREE.Group>(null),
    ring = useRef<THREE.Mesh>(null),
    parcel = useRef<THREE.Group>(null);
  const last = useRef({ x: van.x, z: van.z, angle: van.angle });
  const wheels = useRef<THREE.Object3D[]>([]),
    doors = useRef<THREE.Object3D[]>([]);
  useLayoutEffect(() => {
    if (root.current) {
      wheels.current = root.current.getObjectsByProperty("name", "wheel");
      doors.current = [-1, 1].flatMap((side) =>
        root.current!.getObjectsByProperty("name", `rear-door-${side}`),
      );
    }
  }, []);
  useFrame(({ clock }, dt) => {
    const r = root.current;
    if (!r) return;
    const smooth = 1 - Math.exp(-dt * 19);
    const servicing = van.state === "loading" || van.state === "unloading";
    const order = game.orders.find((o) => o.id === van.orderId);
    const place = order
      ? placeById[van.state === "loading" ? order.source : order.destination]
      : undefined;
    const progress = servicing
      ? Math.max(0, Math.min(1, 1 - van.timer / 2))
      : 0;
    const dock = servicing
      ? THREE.MathUtils.smoothstep(progress, 0, 0.22) *
        (1 - THREE.MathUtils.smoothstep(progress, 0.78, 1))
      : 0;
    const rotation = place?.rotation ?? 0;
    const dockX = place ? place.x + Math.sin(rotation) * 5.8 : van.x;
    const dockZ = place ? place.z + Math.cos(rotation) * 5.8 : van.z;
    r.position.x = THREE.MathUtils.lerp(
      r.position.x,
      THREE.MathUtils.lerp(van.x, dockX, dock),
      smooth,
    );
    r.position.z = THREE.MathUtils.lerp(
      r.position.z,
      THREE.MathUtils.lerp(van.z, dockZ, dock),
      smooth,
    );
    const targetAngle = servicing && dock > 0.2 ? rotation : van.angle;
    let turn = targetAngle - last.current.angle;
    turn = Math.atan2(Math.sin(turn), Math.cos(turn));
    last.current.angle += turn * (1 - Math.exp(-dt * 9));
    r.rotation.y = last.current.angle;
    r.position.y = 0.44;
    if (body.current) {
      body.current.rotation.z = THREE.MathUtils.lerp(
        body.current.rotation.z,
        -turn * 0.05,
        smooth,
      );
      body.current.position.y =
        van.state === "loading" || van.state === "unloading"
          ? Math.sin(clock.elapsedTime * 7) * 0.03
          : 0;
    }
    if (ring.current)
      ring.current.visible =
        !game.cinematic &&
        game.selection?.type === "van" &&
        game.selection.id === van.id;
    const doorOpen =
      THREE.MathUtils.smoothstep(progress, 0.16, 0.28) *
      (1 - THREE.MathUtils.smoothstep(progress, 0.72, 0.87));
    doors.current.forEach(
      (door, i) => (door.rotation.y = (i === 0 ? 1 : -1) * doorOpen * 1.8),
    );
    if (parcel.current) {
      parcel.current.visible = servicing && progress > 0.25 && progress < 0.76;
      const travel = THREE.MathUtils.smoothstep(progress, 0.28, 0.72);
      const fraction = van.state === "loading" ? 1 - travel : travel;
      const doorX = place ? place.x + Math.sin(rotation) * 3.5 : r.position.x;
      const doorZ = place ? place.z + Math.cos(rotation) * 3.5 : r.position.z;
      const dx = doorX - r.position.x,
        dz = doorZ - r.position.z;
      const localX = dx * Math.cos(r.rotation.y) - dz * Math.sin(r.rotation.y);
      const localZ = dx * Math.sin(r.rotation.y) + dz * Math.cos(r.rotation.y);
      parcel.current.position.set(
        localX * fraction,
        0.85 + Math.sin(fraction * Math.PI) * 0.35,
        THREE.MathUtils.lerp(-2.1, localZ, fraction),
      );
      parcel.current.rotation.y = fraction * 0.5;
    }
    const travelled = Math.hypot(
      van.x - last.current.x,
      van.z - last.current.z,
    );
    wheels.current.forEach((wheel) => (wheel.rotation.x += travelled / 0.38));
    last.current.x = van.x;
    last.current.z = van.z;
  });
  const select = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 5) return;
    e.stopPropagation();
    onSelect({ type: "van", id: van.id });
  };
  return (
    <group ref={root} position={[van.x, 0.44, van.z]} onClick={select}>
      <Headlights game={game} />
      <group ref={body}>
        <VanModel
          cold={van.chilled}
          number={van.id.replace(/\D/g, "").padStart(2, "0")}
        />
      </group>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[2.08, 2.3, 40]} />
        <meshBasicMaterial color="#ed9c57" transparent opacity={0.82} />
      </mesh>
      <group ref={parcel} position={[0, 1.4, -2.2]}>
        <Box scale={[0.58, 0.58, 0.58]} color="#d3aa72" />
        <Box position={[0, 0.3, 0]} scale={[0.13, 0.02, 0.6]} color="#f4ddb6" />
      </group>
    </group>
  );
}
export function CarModel({ color = "#bb8975" }: { color?: string }) {
  return (
    <group scale={0.83}>
      <Baked>
        <Box position={[0, 0.75, 0]} scale={[1.7, 0.73, 3.1]} color={color} />
        <Box
          position={[0, 1.29, -0.15]}
          scale={[1.5, 0.6, 1.7]}
          color={color}
        />
        <Box
          position={[0, 1.34, 0.722]}
          scale={[1.25, 0.45, 0.04]}
          color="#59736d"
        />
        <Box
          position={[0, 1.34, -1.02]}
          scale={[1.25, 0.45, 0.04]}
          color="#59736d"
        />
        {[-1, 1].map((s) => (
          <group key={s}>
            <Box
              position={[s * 0.764, 1.3, -0.16]}
              scale={[0.03, 0.42, 1.34]}
              color="#59736d"
            />
            <Wheel x={s * 0.86} z={-0.93} animated={false} />
            <Wheel x={s * 0.86} z={0.97} animated={false} />
            <Box
              position={[s * 0.56, 0.83, 1.57]}
              scale={[0.35, 0.2, 0.03]}
              color="#e9e2b0"
            />
          </group>
        ))}
      </Baked>
    </group>
  );
}
const loops = [
  ["w0_0", "w1_0", "w1_1", "w1_2", "w0_2", "w0_1"],
  ["w1_3", "w2_3", "w2_4", "w2_5", "w1_5", "w1_4"],
  ["e0_0", "e1_0", "e2_0", "e2_1", "e1_1", "e0_1"],
  ["e1_3", "e2_3", "e2_4", "e2_5", "e1_5", "e1_4"],
  ["e0_2", "e1_2", "e1_3", "e1_4", "e0_4", "e0_3"],
];
const ambientRoutes = loops.map((route) => {
  const nodes = route.map((id) => nodeById[id]);
  const lengths = nodes.map((node, i) =>
    Math.hypot(
      node.x - nodes[(i + 1) % nodes.length].x,
      node.z - nodes[(i + 1) % nodes.length].z,
    ),
  );
  return {
    nodes,
    lengths,
    total: lengths.reduce((sum, length) => sum + length, 0),
  };
});
const pedestrianHead = new THREE.SphereGeometry(0.2, 6, 5);
const colors = [
  "#aabeb1",
  "#c79172",
  "#c9bd93",
  "#749896",
  "#e1d7b6",
  "#b7b59b",
];
export function Ambient({ game }: { game: GameState }) {
  const cars = useRef<THREE.Group>(null),
    people = useRef<THREE.Group>(null);
  const elapsed = useRef(0);
  useFrame((_, dt) => {
    if (game.phase === "welcome" || (!game.paused && game.phase === "playing"))
      elapsed.current +=
        Math.min(dt, 0.08) * (game.phase === "welcome" ? 1 : game.speed);
    const t = elapsed.current;
    cars.current?.children.forEach((car, i) => {
      car.visible = !game.reduced || i < 5;
      const {
        nodes: ns,
        lengths,
        total,
      } = ambientRoutes[i % ambientRoutes.length];
      let remaining = (t * 3.7 + i * 23) % total;
      let k = 0;
      while (remaining > lengths[k]) remaining -= lengths[k++];
      const a = ns[k],
        b = ns[(k + 1) % ns.length],
        progress = remaining / lengths[k],
        angle = Math.atan2(b.x - a.x, b.z - a.z);
      car.position.set(
        THREE.MathUtils.lerp(a.x, b.x, progress) + Math.cos(angle) * 1.08,
        0.44,
        THREE.MathUtils.lerp(a.z, b.z, progress) - Math.sin(angle) * 1.08,
      );
      car.rotation.y = angle;
    });
    people.current?.children.forEach((person, i) => {
      person.visible = !game.reduced || i < 8;
      const west = i < 8;
      const x = west ? [-44.3, -26.3, -8.4][i % 3] : [15.6, 33.6, 51.6][i % 3];
      const wave = (t * 0.9 + i * 5.3) % 28;
      const z = (i % 2 ? -32 : 8) + (wave < 14 ? wave : 28 - wave);
      person.position.set(x, 0.42 + Math.abs(Math.sin(t * 5 + i)) * 0.055, z);
      person.rotation.y = wave < 14 ? 0 : Math.PI;
    });
  });
  return (
    <>
      <group ref={cars}>
        {Array.from({ length: 10 }, (_, i) => (
          <group key={i}>
            <CarModel color={colors[i % colors.length]} />
          </group>
        ))}
      </group>
      <group ref={people}>
        {Array.from({ length: 16 }, (_, i) => (
          <group key={i}>
            <Cylinder
              position={[0, 0.62, 0]}
              scale={[0.22, 0.65, 0.18]}
              color={["#cb8f62", "#869d85", "#f0deaf", "#6b8e8c"][i % 4]}
            />
            <mesh
              position={[0, 1.15, 0]}
              geometry={pedestrianHead}
              material={mat("#cda17a")}
              castShadow
            />
            <Box
              position={[-0.1, 0.2, 0]}
              scale={[0.11, 0.4, 0.13]}
              color="#5d736a"
            />
            <Box
              position={[0.1, 0.2, 0]}
              scale={[0.11, 0.4, 0.13]}
              color="#5d736a"
            />
          </group>
        ))}
      </group>
    </>
  );
}
