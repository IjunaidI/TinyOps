import { memo, Suspense, useRef, type ReactNode } from "react";
import {
  Canvas,
  useFrame,
  useThree,
  type ThreeEvent,
} from "@react-three/fiber";
import { OrbitControls, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { GameState, Selection } from "../types";
import { nodes, edges, places, nodeById, placeById } from "../data/map";
import { Box, Cylinder, Sign, Tree, Bench, Lamp, palette } from "./Primitives";
import { Baked } from "./Baked";
import { Building } from "./Buildings";
import { Ambient, DeliveryVan } from "./Vehicles";
import { Routes } from "./Routes";
import { NightDetails } from "./Atmosphere";
import { Streets, River, Lighting } from "./Scenery";
import { Celebrations } from "./Celebrations";
import { Neighborhood } from "./Neighborhood";

const grove: [number, number, number, boolean?][] = [
  [-56, -42, 1.25],
  [-53, -37, 1],
  [-57, -31, 0.8],
  [-54, 15, 1.3],
  [-57, 22, 1],
  [-50, 46, 0.9],
  [-40, 46, 1.1],
  [-29, 46, 0.75],
  [-19, 46, 1.1],
  [-11, 47, 0.8],
  [-54, 42, 1.25],
  [-55, 38, 0.8],
  [-56, 45, 0.7],
  [-8, -35, 0.8],
  [-8, -4, 0.7],
  [-8, 14, 0.7],
  [-8, 35, 0.8],
  [56, -43, 1.4, true],
  [51, -46, 1.1, true],
  [57, -35, 1, true],
  [54, 15, 1.1],
  [57, 24, 1.25],
  [55, 32, 1.4],
  [58, 38, 0.85],
  [54, 45, 1.3],
  [46, 46, 0.8],
  [32, 46, 0.95],
  [19, 47, 1.1],
  [8, 44, 0.85],
  [8, 33, 0.75],
  [8, 13, 0.75],
  [8, -3, 0.75],
  [8, -35, 0.8],
  [-31, -46, 0.9],
  [-15, -46, 1.15],
  [-38, -46, 1],
  [-22, -47, 0.8],
  [18, -46, 1.3, true],
  [25, -46, 0.9, true],
  [38, -46, 1.15, true],
];
function WorldDetails() {
  return (
    <>
      {grove.map(([x, z, size, pine], i) => (
        <Tree key={i} x={x} z={z} size={size} pine={pine} />
      ))}
      {[-34, -16, 2, 20, 36].flatMap((z, i) => [
        <Lamp key={`w${i}`} x={-8.35} z={z} />,
        <Lamp key={`e${i}`} x={8.35} z={z} />,
      ])}
      <Bench x={8.1} z={5} rotation={Math.PI / 2} />
      <Bench x={-8.1} z={-10} rotation={-Math.PI / 2} />
      <Bench x={19} z={46} />
      <Bench x={42} z={46} />
      <Box
        position={[35, 0.1, 46]}
        scale={[13, 0.16, 3.6]}
        color="#dce0c5"
        shadow={false}
      />
      <Cylinder
        position={[35, 0.7, 46]}
        scale={[1.45, 1.3, 1.45]}
        color="#cbcdb6"
      />
      <Cylinder
        position={[35, 1.38, 46]}
        scale={[1.25, 0.08, 1.25]}
        color="#8ab7ab"
      />
      <Cylinder
        position={[35, 1.75, 46]}
        scale={[0.26, 0.75, 0.26]}
        color="#c9d2ba"
      />
      <Sign
        text="WEST WORKS"
        position={[-37, 0.43, 46]}
        width={14}
        height={2.1}
        color="#82977c"
        background="#c8d4b4"
        rotation={[-Math.PI / 2, 0, 0]}
      />
      <Sign
        text="HILLVIEW"
        position={[35, 0.43, -46]}
        width={13}
        height={2.1}
        color="#81937c"
        background="#c8d4b4"
        rotation={[-Math.PI / 2, 0, 0]}
      />
      <Sign
        text="TINY RIVER"
        position={[0, -0.092, 3]}
        width={10}
        height={1.7}
        color="#b8dfd4"
        background={palette.water}
        rotation={[-Math.PI / 2, 0, -Math.PI / 2]}
      />
      <Sign
        text="NORTH BRIDGE"
        position={[0, 1.5, -27.45]}
        width={5.5}
        height={0.55}
        color="#4e6c5e"
        background="#e2dfc7"
        rotation={[0, Math.PI, 0]}
      />
      <Sign
        text="SOUTH CROSSING"
        position={[0, 1.5, 27.45]}
        width={6.6}
        height={0.55}
        color="#4e6c5e"
        background="#e2dfc7"
      />
    </>
  );
}
function IncidentProps({
  game,
  onSelect,
}: {
  game: GameState;
  onSelect: (s: Selection) => void;
}) {
  const barriers = useRef<THREE.Group>(null),
    congestion = useRef<THREE.Group>(null),
    lights = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (barriers.current)
      barriers.current.visible = game.incidents.some(
        (i) => i.kind === "bridge",
      );
    if (congestion.current)
      congestion.current.visible = game.incidents.some(
        (i) => i.kind === "congestion",
      );
    if (lights.current)
      lights.current.visible = Math.sin(clock.elapsedTime * 6) > -0.3;
  });
  const select = (kind: string) => (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 5) return;
    e.stopPropagation();
    const incident = game.incidents.find((i) => i.kind === kind);
    if (incident) onSelect({ type: "incident", id: incident.id });
  };
  return (
    <>
      <group ref={barriers} onClick={select("bridge")}>
        {[-8.8, 8.8].map((x) => (
          <group key={x} position={[x, 0.4, -24]}>
            <Box
              position={[0, 0.93, 0]}
              scale={[0.18, 0.68, 5.7]}
              color="#f3e2b5"
            />
            {[-2, -1, 0, 1, 2].map((z) => (
              <Box
                key={z}
                position={[0.105, 0.94, z]}
                scale={[0.045, 0.71, 0.46]}
                color="#e18548"
                rotation={[0.2, 0, 0]}
              />
            ))}
            {[-2.3, 2.3].map((z) => (
              <Box
                key={z}
                position={[0, 0.48, z]}
                scale={[0.42, 0.96, 0.35]}
                color="#aa9570"
              />
            ))}
          </group>
        ))}
        <group ref={lights}>
          {[-8.8, 8.8].flatMap((x) =>
            [-2.3, 2.3].map((z) => (
              <mesh key={`${x}:${z}`} position={[x, 2, -24 + z]}>
                <sphereGeometry args={[0.24, 8, 6]} />
                <meshStandardMaterial
                  color="#ffc86b"
                  emissive="#ec9c30"
                  emissiveIntensity={2}
                />
              </mesh>
            )),
          )}
        </group>
      </group>
      <group ref={congestion} onClick={select("congestion")}>
        <Box
          position={[-12, 0.416, -8]}
          scale={[5.5, 0.025, 30]}
          color="#b5a16d"
          shadow={false}
        />
        {[-20, -16, -12, -8, -4, 0, 4].map((z) => (
          <group key={z} position={[-9.15, 0.4, z]}>
            <Box
              position={[0, 0.05, 0]}
              scale={[0.5, 0.1, 0.5]}
              color="#f0dbb5"
            />
            <mesh position={[0, 0.35, 0]}>
              <coneGeometry args={[0.21, 0.64, 5]} />
              <meshStandardMaterial color="#da9651" />
            </mesh>
          </group>
        ))}
      </group>
    </>
  );
}
function SelectionEffects({ game }: { game: GameState }) {
  const marker = useRef<THREE.Group>(null);
  const selectedVan =
    game.selection?.type === "van"
      ? game.vans.find((v) => v.id === game.selection!.id)
      : null;
  const selectedOrder =
    game.selection?.type === "order"
      ? game.orders.find((o) => o.id === game.selection!.id)
      : selectedVan?.orderId
        ? game.orders.find((o) => o.id === selectedVan.orderId)
        : null;
  const selectedPlace =
    game.selection?.type === "depot"
      ? placeById[game.selection.id]
      : selectedOrder
        ? placeById[selectedOrder.destination]
        : null;
  useFrame(({ clock }) => {
    if (marker.current && selectedPlace)
      marker.current.position.set(
        selectedPlace.x,
        10.7 + Math.sin(clock.elapsedTime * 2) * 0.35,
        selectedPlace.z,
      );
  });
  if (game.cinematic) return null;
  return (
    <>
      {selectedPlace && (
        <group ref={marker}>
          <mesh rotation={[0, 0, Math.PI]}>
            <coneGeometry args={[0.7, 1.7, 6]} />
            <meshStandardMaterial
              color="#eb9a4e"
              emissive="#eb9a4e"
              emissiveIntensity={0.15}
            />
          </mesh>
          <Cylinder
            position={[0, 1.1, 0]}
            scale={[1, 0.3, 1]}
            color="#f4d59f"
          />
        </group>
      )}
    </>
  );
}
function DeliveryEffects({ game }: { game: GameState }) {
  const root = useRef<THREE.Group>(null);
  useFrame(() => {
    root.current?.children.forEach((pulse, i) => {
      const p = game.pulses[i];
      pulse.visible = !!p && game.time - p.started < 2.4 && !game.reduced;
      if (p) {
        const age = game.time - p.started;
        pulse.position.set(p.x, 0.48, p.z);
        pulse.scale.setScalar(1 + age * 2);
        (
          pulse as THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>
        ).material.opacity = Math.max(0, 0.7 - age * 0.28);
      }
    });
  });
  return (
    <group ref={root}>
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.8, 1, 36]} />
          <meshBasicMaterial
            color="#e9c36a"
            transparent
            opacity={0.7}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}
function CameraRig({
  game,
  centered = false,
}: {
  game: GameState;
  centered?: boolean;
}) {
  const controls = useRef<OrbitControlsImpl>(null),
    home = useRef(""),
    focus = useRef(-1),
    resetting = useRef(true),
    focused = useRef(false),
    fps = useRef({ elapsed: 0, frames: 0 });
  const seen = useRef(new Set<string>()),
    interaction = useRef(game.cameraInteraction);
  const shot = useRef<{
    elapsed: number;
    position: THREE.Vector3;
    target: THREE.Vector3;
    zoom: number;
    point: THREE.Vector3;
  } | null>(null);
  const { camera, size, gl } = useThree();
  useFrame((_, dt) => {
    const c = controls.current;
    if (!c) return;
    const orthographic = camera as THREE.OrthographicCamera;
    const welcome = game.phase === "welcome",
      zoom =
        Math.min(size.width / 172, size.height / 121) * (welcome ? 0.84 : 0.86);
    const horizontalOffset = centered ? 0 : welcome ? 120 : 30;
    const homeTarget = new THREE.Vector3(-0.775, 0, 0.632).multiplyScalar(
      horizontalOffset / zoom,
    );
    const homePosition = homeTarget
      .clone()
      .add(new THREE.Vector3(110, 120, 135));
    const homeKey = `${game.cameraHome}:${welcome}:${centered}:${size.width}:${size.height}`;
    if (homeKey !== home.current) {
      home.current = homeKey;
      shot.current = null;
      game.sceneMoment = null;
      resetting.current = true;
      focused.current = false;
    }
    if (game.cameraFocus && game.cameraFocus.serial !== focus.current) {
      shot.current = null;
      game.sceneMoment = null;
      focus.current = game.cameraFocus.serial;
      focused.current = true;
      resetting.current = false;
    }
    const van =
      game.follow && game.selection?.type === "van"
        ? game.vans.find((v) => v.id === game.selection!.id)
        : null;
    if (
      interaction.current !== game.cameraInteraction ||
      !game.incidentCameras ||
      game.reduced
    ) {
      shot.current = null;
      game.sceneMoment = null;
      interaction.current = game.cameraInteraction;
    }
    for (const incident of game.incidents)
      if (!seen.current.has(incident.id)) {
        seen.current.add(incident.id);
        if (
          game.incidentCameras &&
          !game.reduced &&
          !shot.current &&
          game.time - incident.started < 0.5
        ) {
          const p =
            incident.kind === "bridge"
              ? { x: 0, z: -24 }
              : incident.kind === "power"
                ? placeById["west-depot"]
                : placeById.market;
          shot.current = {
            elapsed: 0,
            position: camera.position.clone(),
            target: c.target.clone(),
            zoom: orthographic.zoom,
            point: new THREE.Vector3(p.x, 0, p.z),
          };
          game.sceneMoment =
            incident.kind === "bridge"
              ? "NORTH BRIDGE · FINDING ANOTHER WAY"
              : incident.kind === "power"
                ? "WEST DEPOT · LIGHTS OUT"
                : "RIVERSIDE MARKET · SLOWING DOWN";
          resetting.current = false;
        }
      }
    if (shot.current) {
      const s = shot.current;
      if (!game.paused) s.elapsed += Math.min(dt, 0.08);
      const returning = s.elapsed > 2.6,
        target = returning ? s.target : s.point;
      const destination = returning
        ? s.position
        : s.point.clone().add(new THREE.Vector3(100, 110, 125));
      const step = 1 - Math.exp(-dt * (returning ? 3.5 : 2.8));
      c.target.lerp(target, step);
      camera.position.lerp(destination, step);
      orthographic.zoom = THREE.MathUtils.lerp(
        orthographic.zoom,
        returning ? s.zoom : Math.min(11, s.zoom * 1.28),
        step,
      );
      camera.updateProjectionMatrix();
      if (s.elapsed > 4.5) {
        shot.current = null;
        game.sceneMoment = null;
      }
    } else if (resetting.current) {
      const step = 1 - Math.exp(-dt * 3);
      c.target.lerp(homeTarget, step);
      camera.position.lerp(homePosition, step);
      orthographic.zoom = THREE.MathUtils.lerp(orthographic.zoom, zoom, step);
      camera.updateProjectionMatrix();
      if (
        camera.position.distanceTo(homePosition) < 0.04 &&
        Math.abs(orthographic.zoom - zoom) < 0.005
      )
        resetting.current = false;
    } else if (van || (focused.current && game.cameraFocus)) {
      const x = van ? van.x : game.cameraFocus!.x,
        z = van ? van.z : game.cameraFocus!.z,
        target = new THREE.Vector3(x, 0, z),
        delta = target
          .clone()
          .sub(c.target)
          .multiplyScalar(1 - Math.exp(-dt * 2.8));
      c.target.add(delta);
      camera.position.add(delta);
      if (!van && target.distanceTo(c.target) < 0.05) focused.current = false;
    }
    c.autoRotate = game.cinematic && !shot.current && !game.paused;
    c.autoRotateSpeed = 0.28;
    c.target.x = THREE.MathUtils.clamp(c.target.x, -45, 45);
    c.target.z = THREE.MathUtils.clamp(c.target.z, -36, 36);
    c.update();
    fps.current.elapsed += dt;
    fps.current.frames++;
    if (fps.current.elapsed > 1) {
      (window as unknown as Record<string, unknown>).__tinyopsFps = Math.round(
        fps.current.frames / fps.current.elapsed,
      );
      (window as unknown as Record<string, unknown>).__tinyopsRender = {
        calls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
      };
      fps.current = { elapsed: 0, frames: 0 };
    }
  });
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.075}
      minZoom={4}
      maxZoom={22}
      minPolarAngle={0.34}
      maxPolarAngle={1.2}
      maxDistance={300}
      mouseButtons={{
        LEFT: THREE.MOUSE.PAN,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.ROTATE,
      }}
      onStart={() => {
        game.cameraInteraction++;
        shot.current = null;
        game.sceneMoment = null;
        resetting.current = false;
        focused.current = false;
        game.follow = false;
      }}
    />
  );
}
export default function World({
  game,
  onSelect,
  children,
  centered = false,
}: {
  game: GameState;
  onSelect: (selection: Selection) => void;
  children?: ReactNode;
  centered?: boolean;
}) {
  return (
    <div className="world-canvas" style={{ position: "absolute", inset: 0 }}>
      <Canvas
        orthographic
        shadows={!game.reduced}
        dpr={game.reduced ? 1 : [1, 1.5]}
        camera={{ position: [110, 120, 135], zoom: 7, near: 0.1, far: 450 }}
        gl={{ antialias: true, alpha: false, toneMappingExposure: 0.8 }}
        onPointerMissed={(e) => {
          if (e.type === "click") onSelect(null);
        }}
      >
        <color attach="background" args={["#f2f0e7"]} />
        <fog attach="fog" args={["#f2f0e7", 230, 390]} />
        <Suspense fallback={null}>
          <Scenery
            key={game.generation}
            game={game}
            reduced={game.reduced}
            onSelect={onSelect}
            centered={centered}
          />
          <SelectionEffects game={game} />
          <Routes game={game} />
          {children}
        </Suspense>
      </Canvas>
    </div>
  );
}

// GameState is a stable mutable simulation object. Animation hooks read its current
// values; only quality changes or a new generation need to rebuild the scene tree.
const Scenery = memo(function Scenery({
  game,
  onSelect,
  centered,
}: {
  game: GameState;
  reduced: boolean;
  onSelect: (selection: Selection) => void;
  centered?: boolean;
}) {
  return (
    <>
      <Lighting game={game} />
      <RoundedBox
        args={[126, 3.2, 106]}
        radius={1.4}
        smoothness={3}
        position={[0, -2, 0]}
        receiveShadow
      >
        <meshStandardMaterial color="#b4c3a4" roughness={1} />
      </RoundedBox>
      <Box
        position={[-34, 0.01, 0]}
        scale={[56, 0.4, 103]}
        color={palette.grass}
      />
      <Box
        position={[34, 0.01, 0]}
        scale={[56, 0.4, 103]}
        color={palette.grass}
      />
      <River game={game} />
      <Baked>
        <Streets />
      </Baked>
      {places.map((place, index) => (
        <Building
          key={`${game.generation}:${place.id}`}
          place={place}
          index={index}
          game={game}
          onSelect={onSelect}
        />
      ))}
      <Baked>
        <WorldDetails />
      </Baked>
      <IncidentProps game={game} onSelect={onSelect} />
      {game.vans.map((van) => (
        <DeliveryVan
          key={`${game.generation}:${van.id}`}
          van={van}
          game={game}
          onSelect={onSelect}
        />
      ))}
      <Ambient game={game} />
      <NightDetails game={game} />
      <Neighborhood game={game} />
      <DeliveryEffects game={game} />
      <Celebrations game={game} />
      <CameraRig game={game} centered={centered} />
      <mesh
        name="backdrop"
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -3.63, 0]}
        receiveShadow
      >
        <planeGeometry args={[2000, 2000]} />
        <meshStandardMaterial color="#f2f0e7" roughness={1} />
      </mesh>
    </>
  );
});
