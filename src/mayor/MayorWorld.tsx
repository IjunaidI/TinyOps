import { Suspense, useEffect, useRef, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { places } from "../data/map";
import { Box, palette } from "../world/Primitives";
import { Building } from "../world/Buildings";
import { Baked } from "../world/Baked";
import { Streets, River, Lighting } from "../world/Scenery";
import { NightDetails } from "../world/Atmosphere";
import { Neighborhood } from "../world/Neighborhood";
import type { SceneState } from "../world/sceneTypes";
import { city } from "./engine";
import type { DistrictId } from "./types";
import { CITY_SIZE, ExpandedCityDetails, NewStreets } from "./ExpandedCity";
import CityTraffic from "./CityTraffic";
import { CentralRoundabout } from "./CentralRoundabout";
import LivingCityWorld, {
  type LivingOverlay,
  type LivingCitySelection,
} from "./LivingCityWorld";
import WorldAlertMarkers, { districtCoordinates } from "./WorldAlertMarkers";
import type { CityAlert } from "./cityAlerts";

export { districtCoordinates } from "./WorldAlertMarkers";
const ignoreSelection = () => {};
function Camera({
  focus,
  focusKey,
  reduced,
  centerFocus,
  focusPoint,
  zoomStep,
}: {
  focus?: DistrictId | null;
  focusKey: number;
  reduced: boolean;
  centerFocus: boolean;
  focusPoint?: [number, number] | null;
  zoomStep: number;
}) {
  const controls = useRef<OrbitControlsImpl>(null);
  const previous = useRef("");
  const moving = useRef(true);
  const previousZoomStep = useRef(zoomStep);
  const zooming = useRef(false);
  const destinationZoom = useRef(2);
  const { camera, size, invalidate } = useThree();
  const target = useRef(new THREE.Vector3());
  const destination = useRef(new THREE.Vector3());
  const base = useRef(new THREE.Vector3(140, 155, 170));
  // A paused demand canvas needs a first frame before useFrame can notice a
  // new target. Subsequent interpolation frames are requested below.
  useEffect(() => {
    invalidate();
  }, [
    focus,
    focusKey,
    centerFocus,
    focusPoint?.[0],
    focusPoint?.[1],
    zoomStep,
    reduced,
    size.width,
    size.height,
    invalidate,
  ]);
  useFrame((_, dt) => {
    const c = controls.current;
    if (!c) return;
    const orthographic = camera as THREE.OrthographicCamera;
    // Fill the map with the complete board; focused views reveal street life.
    const homeZoom = Math.min(size.width / 250, size.height / 180) * 0.95;
    const next = `${focusPoint?.join(",") ?? ""}:${centerFocus ? "center" : (focus ?? "city")}:${focusKey}:${size.width}:${size.height}`;
    if (next !== previous.current) {
      previous.current = next;
      moving.current = true;
      zooming.current = false;
      destinationZoom.current =
        homeZoom * (focusPoint ? 2.7 : centerFocus ? 2.4 : focus ? 2.05 : 1);
    }
    if (zoomStep !== previousZoomStep.current) {
      destinationZoom.current = THREE.MathUtils.clamp(
        orthographic.zoom * Math.pow(1.22, zoomStep - previousZoomStep.current),
        0.45,
        18,
      );
      previousZoomStep.current = zoomStep;
      moving.current = false;
      zooming.current = true;
    }
    const step = reduced ? 1 : 1 - Math.exp(-Math.min(dt, 0.1) * 4);
    const changing = moving.current || zooming.current;
    if (moving.current) {
      const [x, z] =
        focusPoint ??
        (focus && !centerFocus ? districtCoordinates[focus] : [0, 0]);
      target.current.set(
        THREE.MathUtils.clamp(x, -86, 86),
        0,
        THREE.MathUtils.clamp(z, -68, 68),
      );
      destination.current.copy(target.current).add(base.current);
      c.target.lerp(target.current, step);
      camera.position.lerp(destination.current, step);
      orthographic.zoom = THREE.MathUtils.lerp(
        orthographic.zoom,
        destinationZoom.current,
        step,
      );
      camera.updateProjectionMatrix();
      if (
        camera.position.distanceTo(destination.current) < 0.03 &&
        Math.abs(orthographic.zoom - destinationZoom.current) < 0.003
      )
        moving.current = false;
    }
    if (zooming.current) {
      orthographic.zoom = THREE.MathUtils.lerp(
        orthographic.zoom,
        destinationZoom.current,
        step,
      );
      camera.updateProjectionMatrix();
      if (Math.abs(orthographic.zoom - destinationZoom.current) < 0.003)
        zooming.current = false;
    }
    c.target.x = THREE.MathUtils.clamp(c.target.x, -86, 86);
    c.target.z = THREE.MathUtils.clamp(c.target.z, -68, 68);
    c.update();
    // Include a final settling frame for camera-facing labels. Drei's controls
    // separately invalidate on change, including their damping after a drag.
    if (changing) invalidate();
  });
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping={!reduced}
      dampingFactor={0.075}
      minZoom={0.45}
      maxZoom={18}
      minPolarAngle={0.34}
      maxPolarAngle={1.2}
      maxDistance={440}
      mouseButtons={{
        LEFT: THREE.MOUSE.PAN,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.ROTATE,
      }}
      onStart={() => {
        moving.current = false;
        zooming.current = false;
      }}
    />
  );
}
function Scene({
  children,
  reduced,
  evening,
  focus,
  focusKey,
  centerFocus,
  overlay,
  onOpenCityLife,
  alerts,
  onSelectAlert,
  selectedAlertId,
  focusPoint,
  zoomStep,
}: {
  children: ReactNode;
  reduced: boolean;
  evening: boolean;
  focus?: DistrictId | null;
  focusKey: number;
  centerFocus: boolean;
  overlay: LivingOverlay;
  onOpenCityLife?: (selection: LivingCitySelection) => void;
  alerts: CityAlert[];
  onSelectAlert?: (alert: CityAlert) => void;
  selectedAlertId?: string | null;
  focusPoint?: [number, number] | null;
  zoomStep: number;
}) {
  const invalidate = useThree((state) => state.invalidate);
  // Engine state is mutable: a parent refresh may change lighting or a service
  // indicator without replacing its props. Paint it once, without an idle loop.
  useEffect(() => {
    invalidate();
  });
  // This adapter only renders the engine's city conditions. Animation never
  // advances service demand, spends money, or chooses a mayoral decision.
  const ref = useRef<SceneState>({
    phase: "playing",
    time: 0,
    speed: 1,
    paused: true,
    reduced,
    daylight: evening ? 0.9 : 0.2,
    vans: [],
    orders: [],
    incidents: [],
  });
  const scene = ref.current;
  scene.reduced = reduced;
  scene.daylight = evening ? 0.9 : 0.2;
  scene.paused = reduced || city.phase !== "playing" || city.paused;
  useFrame((_, dt) => {
    scene.paused = reduced || city.phase !== "playing" || city.paused;
    if (!scene.paused) scene.time += Math.min(dt, 0.1);
  }, -1);
  return (
    <>
      <Lighting game={scene} expanded />
      <RoundedBox
        args={[CITY_SIZE.width, 3.2, CITY_SIZE.depth]}
        radius={1.5}
        smoothness={3}
        position={[0, -2, 0]}
        receiveShadow
      >
        <meshStandardMaterial color="#99b29e" roughness={1} />
      </RoundedBox>
      {[-1, 1].map((side) => (
        <Box
          key={side}
          position={[side * 47, 0.01, 0]}
          scale={[82, 0.4, 145]}
          color={palette.grass}
        />
      ))}
      <River game={scene} length={145} />
      <Baked>
        <Streets />
      </Baked>
      <NewStreets />
      <CentralRoundabout />
      {places.map((place, index) => (
        <Building
          key={place.id}
          place={place}
          index={index}
          game={scene}
          onSelect={ignoreSelection}
        />
      ))}
      <ExpandedCityDetails />
      <CityTraffic
        scene={scene}
        overlay={overlay}
        onOpenCityLife={onOpenCityLife}
      />
      <LivingCityWorld
        scene={scene}
        overlay={overlay}
        focus={focus}
        onOpenCityLife={onOpenCityLife}
      />
      <NightDetails game={scene} />
      <Neighborhood game={scene} fountainPosition={[78, 0]} />
      {children}
      <WorldAlertMarkers
        alerts={alerts}
        focus={focus}
        selectedAlertId={selectedAlertId}
        onSelectAlert={onSelectAlert}
      />
      <Camera
        focus={focus}
        focusKey={focusKey}
        reduced={reduced}
        centerFocus={centerFocus}
        focusPoint={focusPoint}
        zoomStep={zoomStep}
      />
      <mesh
        name="backdrop"
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -3.63, 0]}
        receiveShadow
      >
        <planeGeometry args={[2000, 2000]} />
        <meshStandardMaterial color="#e9edf2" roughness={1} />
      </mesh>
    </>
  );
}
export default function MayorWorld({
  children,
  focus,
  focusKey = 0,
  evening = false,
  reduced = false,
  centerFocus = false,
  overlay = "none",
  onOpenCityLife,
  onMiss,
  alerts = [],
  onSelectAlert,
  selectedAlertId,
  focusPoint,
  zoomStep = 0,
}: {
  children: ReactNode;
  focus?: DistrictId | null;
  focusKey?: number;
  evening?: boolean;
  reduced?: boolean;
  centerFocus?: boolean;
  overlay?: LivingOverlay;
  onOpenCityLife?: (selection: LivingCitySelection) => void;
  onMiss: () => void;
  alerts?: CityAlert[];
  onSelectAlert?: (alert: CityAlert) => void;
  selectedAlertId?: string | null;
  focusPoint?: [number, number] | null;
  zoomStep?: number;
}) {
  return (
    <div className="world-canvas" style={{ position: "absolute", inset: 0 }}>
      <Canvas
        orthographic
        frameloop={city.phase === "playing" && !city.paused ? "always" : "demand"}
        shadows={!reduced}
        dpr={reduced ? 1 : [1, 1.25]}
        camera={{ position: [140, 155, 170], zoom: 2, near: 0.1, far: 700 }}
        gl={{ antialias: true, alpha: false, toneMappingExposure: 0.8 }}
        onPointerMissed={(event) => {
          if (event.type === "click") onMiss();
        }}
      >
        <color attach="background" args={["#e9edf2"]} />
        <fog attach="fog" args={["#e9edf2", 360, 550]} />
        <Suspense fallback={null}>
          <Scene
            reduced={reduced}
            evening={evening}
            focus={focus}
            focusKey={focusKey}
            centerFocus={centerFocus}
            overlay={overlay}
            onOpenCityLife={onOpenCityLife}
            alerts={alerts}
            onSelectAlert={onSelectAlert}
            selectedAlertId={selectedAlertId}
            focusPoint={focusPoint}
            zoomStep={zoomStep}
          >
            {children}
          </Scene>
        </Suspense>
      </Canvas>
    </div>
  );
}
