import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { WorldHtml } from "../world/WorldHtml";
import * as THREE from "three";
import { Box, Ball, Cylinder, Cone, Roof, Sign } from "../world/Primitives";
import { Baked } from "../world/Baked";
import type { SceneState } from "../world/sceneTypes";
import type { DistrictId } from "./types";
import type {
  CivicAsset,
  LivingCitizen,
  LivingDistrict,
  CouncilMotion,
  CivicWork,
} from "./livingTypes";
import { city } from "./engine";
import CitizenPortrait from "./CitizenPortrait";
import {
  citizenEmotion,
  citizenEmotionLabels,
  getCitizenAppearance,
} from "./citizenIdentity";

export type LivingOverlay = "none" | "traffic" | "services" | "infrastructure";
export type LivingCitySelection = {
  section:
    | "residents"
    | "infrastructure"
    | "projects"
    | "services"
    | "transport"
    | "housing"
    | "council";
  id?: string;
  districtId?: DistrictId;
};
export const districtAt = (x: number, z: number): DistrictId =>
  x < 0 ? (z < 0 ? "oldtown" : "riverside") : z < 0 ? "hillview" : "market";
const districtPoints: Record<DistrictId, [number, number]> = {
  oldtown: [-55, -32],
  riverside: [-55, 32],
  hillview: [55, -32],
  market: [55, 32],
};
export const assetLocations: Record<string, [number, number]> = {
  riverside_bridge: [0, 24],
  riverside_drainage: [-51.6, 18],
  oldtown_power: [-59.5, -30],
  market_drainage: [51.6, 18],
  hillview_power: [59.5, -30],
};
const personColors = ["#9baea5", "#b99582", "#8c9eaf", "#c0af88"];
export function ResidentFigure({
  color = "#8ea69c",
  identity,
}: {
  color?: string;
  identity?: string;
}) {
  if (identity) {
    const appearance = getCitizenAppearance(identity);
    const { skin, hair, shirt, accent, hairStyle, accessory } = appearance;
    return (
      <Baked key={identity}>
        <Box position={[0, 0.69, 0]} scale={[0.42, 0.6, 0.29]} color={shirt} />
        <Box position={[0, 1.15, 0]} scale={[0.4, 0.4, 0.36]} color={skin} />
        <Box
          position={[0, 1.34, -0.025]}
          scale={[0.44, 0.13, 0.39]}
          color={hairStyle === "headscarf" ? accent : hair}
        />
        {[-1, 1].map((side) => (
          <group key={side}>
            <Box
              position={[side * 0.125, 0.22, 0]}
              scale={[0.15, 0.4, 0.2]}
              color="#536673"
            />
            <Box
              position={[side * 0.125, 0.06, 0.035]}
              scale={[0.18, 0.1, 0.28]}
              color="#3f5058"
            />
            <Box
              position={[side * 0.27, 0.72, 0]}
              scale={[0.12, 0.32, 0.19]}
              color={shirt}
            />
            <Box
              position={[side * 0.27, 0.5, 0]}
              scale={[0.115, 0.18, 0.17]}
              color={skin}
            />
            <Box
              position={[side * 0.09, 1.17, 0.187]}
              scale={[0.045, 0.055, 0.012]}
              color="#34404a"
              shadow={false}
            />
          </group>
        ))}
        <Box
          position={[0, 1.065, 0.189]}
          scale={[0.105, 0.024, 0.012]}
          color={appearance.shadow}
          shadow={false}
        />
        {(hairStyle === "short" || hairStyle === "sidepart") && (
          <Box
            position={[-0.115, 1.265, 0.145]}
            scale={[0.21, 0.12, 0.12]}
            color={hair}
          />
        )}
        {hairStyle === "bun" && (
          <>
            <Ball
              position={[0, 1.41, -0.16]}
              scale={[0.18, 0.16, 0.16]}
              color={hair}
            />
            <Box
              position={[0, 1.25, -0.18]}
              scale={[0.4, 0.21, 0.1]}
              color={hair}
            />
          </>
        )}
        {hairStyle === "curls" &&
          [-0.16, 0, 0.16].map((x, i) => (
            <Ball
              key={x}
              position={[x, 1.36 + (i === 1 ? 0.035 : 0), 0]}
              scale={[0.145, 0.14, 0.2]}
              color={hair}
            />
          ))}
        {(hairStyle === "bob" || hairStyle === "headscarf") && (
          <>
            {[-0.22, 0.22].map((x) => (
              <Box
                key={x}
                position={[x, 1.13, -0.06]}
                scale={[0.1, hairStyle === "headscarf" ? 0.45 : 0.37, 0.34]}
                color={hairStyle === "headscarf" ? accent : hair}
              />
            ))}
            <Box
              position={[0, 1.11, -0.21]}
              scale={[0.44, 0.4, 0.1]}
              color={hairStyle === "headscarf" ? accent : hair}
            />
          </>
        )}
        {hairStyle === "headscarf" && (
          <Box
            position={[0, 0.98, 0.1]}
            scale={[0.46, 0.14, 0.22]}
            color={accent}
          />
        )}
        {hairStyle === "cap" && (
          <>
            <Box
              position={[0, 1.39, 0]}
              scale={[0.46, 0.18, 0.41]}
              color={accent}
            />
            <Box
              position={[0, 1.315, 0.22]}
              scale={[0.49, 0.045, 0.24]}
              color={accent}
            />
          </>
        )}
        {accessory === "glasses" && (
          <>
            {[-0.09, 0.09].map((x) => (
              <group key={x} position={[x, 1.17, 0.196]}>
                <Box
                  scale={[0.15, 0.095, 0.015]}
                  color="#4f575d"
                  shadow={false}
                />
                <Box
                  position={[0, 0, 0.01]}
                  scale={[0.105, 0.052, 0.012]}
                  color={skin}
                  shadow={false}
                />
                <Box
                  position={[0, 0, 0.021]}
                  scale={[0.025, 0.035, 0.01]}
                  color="#34404a"
                  shadow={false}
                />
              </group>
            ))}
            <Box
              position={[0, 1.17, 0.2]}
              scale={[0.09, 0.02, 0.015]}
              color="#4f575d"
              shadow={false}
            />
          </>
        )}
        {accessory === "badge" && (
          <Box
            position={[0.11, 0.78, 0.155]}
            scale={[0.1, 0.13, 0.025]}
            color="#f1ebd6"
          />
        )}
        {accessory === "strap" && (
          <>
            <Box
              position={[-0.015, 0.73, 0.165]}
              rotation={[0, 0, 0.55]}
              scale={[0.07, 0.57, 0.025]}
              color={accent}
            />
            <Box
              position={[0.245, 0.54, -0.075]}
              scale={[0.16, 0.22, 0.24]}
              color={accent}
            />
          </>
        )}
        {accessory === "apron" && (
          <Box
            position={[0, 0.64, 0.16]}
            scale={[0.31, 0.39, 0.025]}
            color={accent}
          />
        )}
        {accessory === "vest" &&
          [-0.145, 0.145].map((x) => (
            <group key={x}>
              <Box
                position={[x, 0.71, 0.16]}
                scale={[0.12, 0.49, 0.025]}
                color={accent}
              />
              <Box
                position={[x, 0.63, 0.178]}
                scale={[0.12, 0.075, 0.015]}
                color="#ebdcae"
              />
            </group>
          ))}
        {appearance.beard && (
          <Box
            position={[0, 1.01, 0.145]}
            scale={[0.28, 0.095, 0.11]}
            color={hair}
          />
        )}
      </Baked>
    );
  }
  return (
    <group>
      <Cylinder
        position={[0, 0.61, 0]}
        scale={[0.23, 0.67, 0.19]}
        color={color}
      />
      <Ball position={[0, 1.14, 0]} scale={[0.2, 0.23, 0.19]} color="#c6a68c" />
      {[-0.11, 0.11].map((x) => (
        <Box
          key={x}
          position={[x, 0.2, 0]}
          scale={[0.13, 0.4, 0.15]}
          color="#596c76"
        />
      ))}
    </group>
  );
}
export function WorldLabel({
  text,
  position,
  color = "#526c79",
  width = 112,
  onSelect,
}: {
  text: string;
  position: [number, number, number];
  color?: string;
  width?: number;
  onSelect?: () => void;
}) {
  const root = useRef<THREE.Group>(null);
  const parentRotation = useRef(new THREE.Quaternion());
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = width * 2;
    canvas.height = 38;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(2, 2);
    ctx.fillStyle = "#f7f8fb";
    ctx.fillRect(0, 0, width, 19);
    ctx.strokeStyle = color;
    ctx.strokeRect(0.5, 0.5, width - 1, 18);
    ctx.fillStyle = color;
    ctx.font =
      '600 10px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, width / 2, 9.5, width - 8);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, [text, width, color]);
  useEffect(() => () => texture.dispose(), [texture]);
  useFrame(({ camera }) => {
    if (root.current) {
      root.current.parent?.getWorldQuaternion(parentRotation.current);
      root.current.quaternion
        .copy(parentRotation.current.invert())
        .multiply(camera.quaternion);
      root.current.scale.setScalar(
        1 / ((camera as THREE.OrthographicCamera).zoom || 1),
      );
    }
  });
  return (
    <group ref={root} position={position}>
      <mesh
        raycast={onSelect ? THREE.Mesh.prototype.raycast : () => {}}
        onClick={onSelect ? click(onSelect) : undefined}
        renderOrder={9}
      >
        <planeGeometry args={[width, 19]} />
        <meshBasicMaterial
          map={texture}
          transparent
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
const click = (callback: () => void) => (event: ThreeEvent<MouseEvent>) => {
  if (event.delta > 5) return;
  event.stopPropagation();
  callback();
};
function Resident({
  resident,
  index,
  scene,
  labels,
  onSelect,
}: {
  resident: LivingCitizen;
  index: number;
  scene: SceneState;
  labels: boolean;
  onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const emotion = citizenEmotion(resident, city.day);
  const root = useRef<THREE.Group>(null),
    elapsed = useRef(index * 7.3);
  const [dx, dz] = districtPoints[resident.districtId];
  const x = Math.sign(dx) * 15.7,
    z = Math.sign(dz) * (index % 2 ? 32 : 18);
  const color = resident.displaced
    ? "#a46b74"
    : resident.satisfaction < 45
      ? "#aa8958"
      : "#6c9686";
  useFrame((_, dt) => {
    if (!scene.paused && !scene.reduced) elapsed.current += Math.min(dt, 0.1);
    const phase = elapsed.current * 0.13;
    if (root.current) {
      root.current.position.set(
        x + Math.sin(phase) * 0.22,
        0.45,
        z + Math.cos(phase) * 4.5,
      );
      root.current.rotation.y = Math.atan2(
        Math.cos(phase) * 0.22,
        -Math.sin(phase) * 4.5,
      );
    }
  });
  return (
    <group
      ref={root}
      position={[x, 0.45, z]}
      onClick={click(onSelect)}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      <ResidentFigure identity={resident.id} />
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.45, 0.65, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.75}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.85, 0.85, 2.1, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {labels && hovered && (
        <WorldHtml
          position={[0, 2.4, 0]}
          center
          zIndexRange={[12, 6]}
          style={{ pointerEvents: "none" }}
        >
          <div className="world-citizen-badge">
            <CitizenPortrait
              identity={resident.id}
              name={resident.name}
              emotion={emotion}
              size={40}
              decorative
            />
            <div>
              <strong>{resident.name}</strong>
              <span>{citizenEmotionLabels[emotion]} · Click to meet</span>
            </div>
          </div>
        </WorldHtml>
      )}
    </group>
  );
}
function ServiceHub({
  district,
  labels,
  onSelect,
}: {
  district: LivingDistrict;
  labels: boolean;
  onSelect: () => void;
}) {
  const [x, z] = districtPoints[district.id];
  return (
    <group position={[x, 0.35, z]} onClick={click(onSelect)}>
      <Baked>
        <Box position={[0, 0, 0]} scale={[9, 0.14, 6.8]} color="#d4ddda" />
        {district.services.map((service, i) => (
          <group key={service.kind} position={[(i - 1) * 3, 0, -1.2]}>
            <Box
              position={[0, 1, 0]}
              scale={[2.25, 2, 2.4]}
              color={
                service.kind === "care"
                  ? "#cbded9"
                  : service.kind === "learning"
                    ? "#d9d8c3"
                    : "#bfd0d4"
              }
            />
            <Box
              position={[0, 2.1, 0]}
              scale={[2.55, 0.2, 2.65]}
              color="#819c98"
            />
            <Box
              position={[0, 0.7, 1.23]}
              scale={[0.72, 1.4, 0.06]}
              color="#607a83"
            />
            <Sign
              text={
                service.kind === "care"
                  ? "CARE"
                  : service.kind === "learning"
                    ? "LEARN"
                    : "CLEAN"
              }
              position={[0, 1.65, 1.26]}
              width={1.95}
              height={0.32}
            />
          </group>
        ))}
      </Baked>
      {district.services.map((service, i) => {
        const count = Math.min(
          4,
          Math.ceil(service.backlog / Math.max(1, service.capacity * 0.12)),
        );
        return (
          <group key={service.kind} position={[(i - 1) * 3, 0, 0]}>
            <Baked key={count}>
              {Array.from({ length: count }, (_, n) => (
                <group
                  key={n}
                  position={[
                    n % 2 ? 0.48 : -0.48,
                    0.08,
                    1.3 + Math.floor(n / 2) * 0.9,
                  ]}
                  rotation={[0, Math.PI, 0]}
                >
                  <ResidentFigure color={personColors[n % 4]} />
                </group>
              ))}
            </Baked>
          </group>
        );
      })}
      {labels && (
        <WorldLabel
          text={`${district.name} · ${Math.round(district.services.reduce((sum, service) => sum + service.backlog, 0))} waiting`}
          position={[0, 5.6, 0]}
          width={178}
          color={district.access < 0.7 ? "#9b754e" : "#5d8071"}
          onSelect={onSelect}
        />
      )}
    </group>
  );
}
function Barrier({
  x,
  z,
  horizontal = false,
}: {
  x: number;
  z: number;
  horizontal?: boolean;
}) {
  return (
    <group
      position={[x, 0.42, z]}
      rotation={[0, horizontal ? Math.PI / 2 : 0, 0]}
    >
      <Box position={[0, 0.78, 0]} scale={[0.16, 0.5, 4.8]} color="#d6bd88" />
      {[-1.8, 0, 1.8].map((v) => (
        <group key={v}>
          <Box
            position={[0.03, 0.78, v]}
            scale={[0.18, 0.54, 0.5]}
            color="#92775b"
          />
          <Box
            position={[0, 0.4, v]}
            scale={[0.25, 0.8, 0.25]}
            color="#7e8d89"
          />
        </group>
      ))}
    </group>
  );
}
function RepairCrew({ scene }: { scene: SceneState }) {
  const worker = useRef<THREE.Group>(null),
    time = useRef(0);
  useFrame((_, dt) => {
    if (!scene.paused && !scene.reduced) time.current += Math.min(dt, 0.1);
    if (worker.current)
      worker.current.rotation.z = Math.sin(time.current * 2) * 0.06;
  });
  return (
    <group>
      {[-1.5, 1.5].map((x) => (
        <group key={x} position={[x, 0, 1.8]}>
          <Box
            position={[0, 0.1, 0]}
            scale={[0.7, 0.15, 0.7]}
            color="#778887"
          />
          <Cone
            position={[0, 0.5, 0]}
            scale={[0.3, 0.8, 0.3]}
            color="#ce9f71"
          />
        </group>
      ))}
      <group ref={worker} position={[0.8, 0.1, 1.1]}>
        <ResidentFigure color="#c9a879" />
        <Cylinder
          position={[0, 1.39, 0]}
          scale={[0.26, 0.1, 0.26]}
          color="#d9c497"
        />
      </group>
      <Box
        position={[-0.6, 0.45, 1.5]}
        scale={[1.1, 0.8, 0.8]}
        color="#8b9e9f"
      />
    </group>
  );
}
function AssetSite({
  asset,
  scene,
  labels,
  hoverLabels,
  onSelect,
}: {
  asset: CivicAsset;
  scene: SceneState;
  labels: boolean;
  hoverLabels: boolean;
  onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const location = assetLocations[asset.id];
  if (!location) return null;
  const [x, z] = location,
    now = city.day + city.dayProgress;
  const failed = asset.outageUntil > now;
  const repairing = asset.repairDue !== null;
  const repairIndex = city.living.works.findIndex(
    (work) => work.kind === "repair" && work.targetId === asset.id,
  );
  const repairStaffed =
    repairing &&
    repairIndex >= 0 &&
    repairIndex < city.living.construction.crews;
  const closed = city.living?.traffic.closures.includes(asset.id);
  const worn = asset.observedCondition !== null && asset.observedCondition < 65;
  const label = closed
    ? "CLOSED · detour via outer bridge"
    : repairing
      ? repairStaffed
        ? "REPAIR CREW ON SITE"
        : "REPAIR · AWAITING CREW"
      : failed
        ? asset.kind === "power"
          ? "LOCAL POWER OUTAGE"
          : "DRAINAGE FLOODING"
        : asset.observedCondition === null
          ? "INSPECTION NEEDED"
          : `${Math.round(asset.observedCondition)}% condition`;
  return (
    <group
      position={[x, 0.45, z]}
      onClick={click(onSelect)}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      {asset.kind === "power" && (
        <Baked key={failed ? "offline" : "powered"}>
          <Box
            position={[0, 0.85, 0]}
            scale={[1.6, 1.7, 1.3]}
            color={failed ? "#7f858e" : "#90a8a5"}
          />
          <Box
            position={[0, 1.5, 0.67]}
            scale={[0.32, 0.24, 0.03]}
            color={failed ? "#b68479" : "#c4d5af"}
          />
          <Cylinder
            position={[1.2, 2.4, 0]}
            scale={[0.065, 4.8, 0.065]}
            color="#718289"
          />
          <Box
            position={[1.2, 4.85, 0]}
            scale={[0.8, 0.12, 0.4]}
            color={failed ? "#727d83" : "#d6d7bd"}
          />
        </Baked>
      )}
      {asset.kind === "drainage" && (
        <Baked>
          <Box
            position={[0, 0.02, 0]}
            scale={[1.5, 0.08, 2.1]}
            color="#737f84"
          />
          {[-0.45, 0, 0.45].map((v) => (
            <Box
              key={v}
              position={[v, 0.07, 0]}
              scale={[0.12, 0.05, 1.8]}
              color="#b4c2c4"
            />
          ))}
        </Baked>
      )}
      {asset.kind === "bridge" && (
        <>
          <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[12, 4.2]} />
            <meshBasicMaterial
              color={closed ? "#bc9272" : "#829d9d"}
              transparent
              opacity={labels ? 0.3 : worn ? 0.13 : 0}
              depthWrite={false}
            />
          </mesh>
          {closed && (
            <>
              <Barrier x={-8.8} z={0} />
              <Barrier x={8.8} z={0} />
            </>
          )}
        </>
      )}
      {asset.kind === "drainage" &&
        failed &&
        [-1, 1].map((side, i) => (
          <mesh
            key={side}
            position={[side * 1.3, 0.04, i * 1.9]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[1.5, 0.85, 1]}
          >
            <circleGeometry args={[1.6, 9]} />
            <meshStandardMaterial
              color="#6faaa9"
              transparent
              opacity={0.78}
              roughness={0.25}
            />
          </mesh>
        ))}
      {asset.kind === "power" && failed && (
        <mesh position={[0, -0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[5.5, 16]} />
          <meshBasicMaterial
            color="#5c6575"
            transparent
            opacity={0.2}
            depthWrite={false}
          />
        </mesh>
      )}
      {worn && (
        <group>
          <Box
            position={[0.1, 0.08, 0.35]}
            rotation={[0, 0.45, 0]}
            scale={[0.13, 0.045, 1.8]}
            color="#67797f"
          />
          <Box
            position={[-0.2, 0.08, -0.25]}
            rotation={[0, -0.55, 0]}
            scale={[0.13, 0.045, 1.2]}
            color="#67797f"
          />
        </group>
      )}
      {repairStaffed && (
        <group
          position={[
            asset.kind === "bridge" ? 7 : 0,
            0,
            asset.kind === "bridge" ? 3.9 : 0,
          ]}
        >
          <RepairCrew scene={scene} />
        </group>
      )}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry
          args={[
            asset.kind === "bridge" ? 3 : 1.4,
            asset.kind === "bridge" ? 3 : 1.4,
            2,
            12,
          ]}
        />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {(labels || (hoverLabels && hovered)) && (
        <WorldLabel
          text={label}
          position={[0, asset.kind === "power" ? 6 : 3.4, 0]}
          width={closed ? 195 : 156}
          color={
            failed || closed ? "#996c57" : repairing ? "#8d7950" : "#617d84"
          }
          onSelect={onSelect}
        />
      )}
    </group>
  );
}
/** Two compact infill parcels fit between each outer garden and the board edge.
 * Only a passed development motion can occupy one; archived votes remain the
 * source of truth after their matching construction work leaves the work list. */
function CouncilDevelopment({
  motion,
  work,
  slot,
  district,
  scene,
  labels,
  onSelect,
}: {
  motion: CouncilMotion;
  work?: CivicWork;
  slot: number;
  district: LivingDistrict;
  scene: SceneState;
  labels: boolean;
  onSelect: () => void;
}) {
  const [dx, dz] = districtPoints[district.id];
  const x = Math.sign(dx) * (slot === 0 ? 73 : 81),
    z = Math.sign(dz) * 63;
  const front = dz < 0 ? 1 : -1;
  const progress = Math.min(1, Math.max(0, work?.progress ?? 1));
  const staffed =
    !work ||
    city.living.works.findIndex((item) => item.id === work.id) <
      city.living.construction.crews;
  const stage = Math.min(2, Math.floor(progress * 3));
  const homes = motion.kind === "housing";
  const occupancy = Math.min(
    1,
    district.population / Math.max(1, district.homes * 2.8),
  );
  const litWindows = Math.round(occupancy * 6);
  const evening = (scene.daylight ?? 0.2) > 0.5;
  return (
    <group position={[x, 0.35, z]} onClick={click(onSelect)}>
      <Baked key={work ? `building-${stage}` : `open-${motion.kind}`}>
        <Box
          position={[0, 0, 0]}
          scale={[6.4, 0.15, 7]}
          color={work ? "#c9bea3" : "#cdd7c8"}
        />
        <Box
          position={[0, 0.04, front * 3.8]}
          scale={[6.5, 0.1, 1.1]}
          color="#d5dfe0"
        />
        {work ? (
          <>
            <Box
              position={[0, 0.17, 0]}
              scale={[5.2, 0.25, 4.6]}
              color="#a9b6b4"
            />
            {[-2.2, 2.2].flatMap((px) =>
              [-1.8, 1.8].map((pz) => (
                <Box
                  key={`${px}:${pz}`}
                  position={[px, 1.65 + stage * 0.8, pz]}
                  scale={[0.18, 3.3 + stage * 1.6, 0.18]}
                  color="#a59370"
                />
              )),
            )}
            <Box
              position={[0, 3.25 + stage * 1.6, 0]}
              scale={[4.7, 0.17, 4]}
              color="#bec7bd"
            />
            {stage > 0 && (
              <Box
                position={[0, 1.5, -front * 1.85]}
                scale={[4.6, 2.7, 0.16]}
                color="#d3c7b1"
              />
            )}
            {stage > 1 && (
              <Box
                position={[-2.15, 2.5, 0]}
                scale={[0.16, 4.8, 3.7]}
                color="#d3c7b1"
              />
            )}
            {[-2.85, 2.85].map((px) => (
              <Box
                key={px}
                position={[px, 0.8, 0]}
                scale={[0.12, 0.4, 5.8]}
                color="#c7ad76"
              />
            ))}
            <Sign
              text="COUNCIL APPROVED"
              position={[0, 0.85, front * 3.1]}
              rotation={[0, front < 0 ? Math.PI : 0, 0]}
              width={4.6}
              height={0.38}
            />
          </>
        ) : homes ? (
          <>
            <Box
              position={[0, 2.65, 0]}
              scale={[4.8, 5.3, 4.6]}
              color={motion.amendment === "affordable" ? "#c9d8c8" : "#ded3bd"}
            />
            <Roof
              position={[0, 5.3, 0]}
              scale={[5.4, 1.2, 5.15]}
              color="#9b8882"
            />
            <Box
              position={[0, 0.95, front * 2.34]}
              scale={[0.9, 1.9, 0.09]}
              color="#7c9194"
            />
            <Sign
              text={
                motion.amendment === "affordable"
                  ? "AFFORDABLE HOMES"
                  : "NEIGHBORHOOD HOMES"
              }
              position={[0, 5, front * 2.37]}
              rotation={[0, front < 0 ? Math.PI : 0, 0]}
              width={4.3}
              height={0.31}
            />
          </>
        ) : (
          <>
            <Box
              position={[0, 1.55, 0]}
              scale={[5.3, 3.1, 4.5]}
              color="#c7d1d3"
            />
            <Roof
              position={[0, 3.1, 0]}
              scale={[5.9, 1.1, 5]}
              color="#81969c"
            />
            <Box
              position={[0, 1.1, front * 2.3]}
              scale={[2.35, 2.2, 0.08]}
              color="#819e9c"
            />
            <Box
              position={[0, 2.4, front * 3.1]}
              scale={[5, 0.2, 1.7]}
              color="#c9b88d"
            />
            <Sign
              text="LOCAL WORKSHOP"
              position={[0, 2.87, front * 2.31]}
              rotation={[0, front < 0 ? Math.PI : 0, 0]}
              width={4.4}
              height={0.33}
            />
            {[-1.8, 1.8].map((px) => (
              <Box
                key={px}
                position={[px, 0.48, front * 2.85]}
                scale={[0.8, 0.9, 0.85]}
                color="#bba786"
              />
            ))}
          </>
        )}
      </Baked>
      {work && staffed && (
        <group
          position={[0, 0, front * 1.9]}
          rotation={[0, front < 0 ? Math.PI : 0, 0]}
        >
          <RepairCrew scene={scene} />
        </group>
      )}
      {!work &&
        homes &&
        Array.from({ length: 6 }, (_, i) => {
          const occupied = i < litWindows;
          return (
            <Box
              key={i}
              position={[
                ((i % 3) - 1) * 1.45,
                i < 3 ? 2.05 : 3.8,
                front * 2.34,
              ]}
              scale={[0.8, 0.92, 0.1]}
              color={occupied ? (evening ? "#d9c695" : "#aac4c7") : "#7d929b"}
              emissive={occupied && evening}
            />
          );
        })}
      {labels && (
        <WorldLabel
          text={
            work
              ? `${homes ? "HOMES" : "WORKSHOP"} · ${Math.round(progress * 100)}%${staffed ? "" : " · CREW QUEUED"}`
              : homes
                ? "NEW HOMES · OPEN"
                : "LOCAL WORKSHOP · OPEN"
          }
          position={[0, 8.1, 0]}
          width={staffed ? 152 : 192}
          color={work ? "#897247" : "#5f7d6a"}
          onSelect={onSelect}
        />
      )}
    </group>
  );
}
function CouncilDevelopments({
  scene,
  overlay,
  focus,
  onOpenCityLife,
}: {
  scene: SceneState;
  overlay: LivingOverlay;
  focus?: DistrictId | null;
  onOpenCityLife?: (selection: LivingCitySelection) => void;
}) {
  return (
    <group name="council-developments">
      {city.living.districts.map((district) => {
        const motions = city.living.council.motions
          .filter(
            (m) =>
              m.status === "passed" &&
              m.kind !== "protection" &&
              m.districtId === district.id,
          )
          .sort(
            (a, b) =>
              (a.resolvedDay ?? a.createdDay) -
                (b.resolvedDay ?? b.createdDay) ||
              Number(a.id.split("-").at(-1)) - Number(b.id.split("-").at(-1)),
          )
          .slice(0, 2);
        if (!motions.length) return null;
        const [dx, dz] = districtPoints[district.id],
          side = Math.sign(dx),
          bank = Math.sign(dz);
        return (
          <group key={district.id}>
            <Baked key={motions.length}>
              <Box
                position={[side * 64, 0.31, bank * 57]}
                scale={[1.1, 0.1, 4.8]}
                color="#d5dfe0"
              />
              <Box
                position={[
                  side * (motions.length === 1 ? 68.5 : 72.5),
                  0.31,
                  bank * 59.2,
                ]}
                scale={[motions.length === 1 ? 10 : 18, 0.1, 1.1]}
                color="#d5dfe0"
              />
            </Baked>
            {motions.map((motion, slot) => (
              <CouncilDevelopment
                key={motion.id}
                motion={motion}
                slot={slot}
                district={district}
                scene={scene}
                work={city.living.works.find((w) => w.targetId === motion.id)}
                labels={overlay === "none" && focus === district.id}
                onSelect={() =>
                  onOpenCityLife?.({
                    section: "council",
                    id: motion.id,
                    districtId: district.id,
                  })
                }
              />
            ))}
          </group>
        );
      })}
    </group>
  );
}
function WeatherActivity({ scene }: { scene: SceneState }) {
  const drops = useRef<THREE.Group>(null),
    time = useRef(0);
  useFrame((_, delta) => {
    if (!scene.paused && !scene.reduced) time.current += Math.min(delta, 0.1);
    drops.current?.children.forEach((drop, index) => {
      drop.position.y =
        1 + ((((index * 3.4 - time.current * 7) % 13) + 13) % 13);
    });
  });
  if (!["rain", "storm"].includes(city.living?.weather.today ?? "clear"))
    return null;
  return (
    <group ref={drops} name="local-rain">
      {Array.from({ length: 32 }, (_, i) => (
        <mesh
          key={i}
          position={[((i * 37) % 150) - 75, 8, ((i * 23) % 118) - 59]}
          rotation={[0, 0, -0.15]}
          raycast={() => {}}
        >
          <boxGeometry args={[0.055, 0.65, 0.055]} />
          <meshBasicMaterial
            color="#adc6d0"
            transparent
            opacity={0.55}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}
export default function LivingCityWorld({
  scene,
  overlay = "none",
  focus,
  onOpenCityLife,
}: {
  scene: SceneState;
  overlay?: LivingOverlay;
  focus?: DistrictId | null;
  onOpenCityLife?: (selection: LivingCitySelection) => void;
}) {
  const living = city.living;
  if (!living || city.phase === "lobby") return null;
  return (
    <group name="living-city">
      <WeatherActivity scene={scene} />
      <CouncilDevelopments
        scene={scene}
        overlay={overlay}
        focus={focus}
        onOpenCityLife={onOpenCityLife}
      />
      {living.citizens.map((resident, i) => (
        <Resident
          key={resident.id}
          resident={resident}
          index={i}
          scene={scene}
          labels={overlay === "none"}
          onSelect={() =>
            onOpenCityLife?.({
              section: "residents",
              id: resident.id,
              districtId: resident.districtId,
            })
          }
        />
      ))}
      {living.districts.map((district) => (
        <ServiceHub
          key={district.id}
          district={district}
          labels={overlay === "services"}
          onSelect={() =>
            onOpenCityLife?.({
              section: "services",
              id: district.id,
              districtId: district.id,
            })
          }
        />
      ))}
      {living.assets.map((asset) => (
        <AssetSite
          key={asset.id}
          asset={asset}
          scene={scene}
          labels={overlay === "infrastructure"}
          hoverLabels={overlay === "none"}
          onSelect={() =>
            onOpenCityLife?.({
              section: "infrastructure",
              id: asset.id,
              districtId: asset.districtId,
            })
          }
        />
      ))}
      {overlay === "traffic" &&
        living.districts.map((district) => {
          const [x, z] = districtPoints[district.id];
          return (
            <group key={district.id}>
              <mesh
                position={[Math.sign(x) * 48, 0.46, Math.sign(z) * 15]}
                rotation={[-Math.PI / 2, 0, 0]}
              >
                <planeGeometry args={[5.2, 17]} />
                <meshBasicMaterial
                  color={
                    district.congestion > 0.65
                      ? "#c58c71"
                      : district.congestion > 0.35
                        ? "#c7b27f"
                        : "#81aa9e"
                  }
                  transparent
                  opacity={0.4}
                  depthWrite={false}
                />
              </mesh>
              <WorldLabel
                text={`${district.name} · ${Math.round(district.congestion * 100)}% traffic`}
                position={[Math.sign(x) * 48, 4, Math.sign(z) * 15]}
                width={172}
                color="#617c86"
              />
            </group>
          );
        })}
    </group>
  );
}
