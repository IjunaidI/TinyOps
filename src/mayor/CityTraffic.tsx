import { useLayoutEffect, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { CarModel, VanModel } from "../world/Vehicles";
import { Headlights } from "../world/Atmosphere";
import { Box, Cylinder, Sign, mat } from "../world/Primitives";
import { Baked } from "../world/Baked";
import { city } from "./engine";
import {
  districtAt,
  WorldLabel,
  type LivingOverlay,
  type LivingCitySelection,
} from "./LivingCityWorld";
import type { SceneState } from "../world/sceneTypes";
import {
  createTraffic,
  sampleTrafficRoute,
  tickTrafficFleet,
  trafficRoutes,
  vehicleTrafficRoute,
} from "./traffic";

const colors = [
  "#c79172",
  "#aabeb1",
  "#749896",
  "#d9bb7b",
  "#c1bac1",
  "#e1d7b6",
];
const pedestrianHead = new THREE.SphereGeometry(0.2, 6, 5);
const busIndices = [4, 6];
function CityBus({ index }: { index: number }) {
  return (
    <Baked>
      <Box position={[0, 1.15, 0]} scale={[1.8, 1.75, 3.6]} color="#b6c8bd" />
      <Box position={[0, 2.06, 0]} scale={[1.82, 0.17, 3.64]} color="#6e908c" />
      <Box
        position={[0, 1.56, 1.83]}
        scale={[1.52, 0.7, 0.06]}
        color="#607d86"
      />
      {[-1, 1].map((side) => (
        <group key={side}>
          {[-1.05, 0, 1.05].map((z) => (
            <Box
              key={z}
              position={[side * 0.92, 1.57, z]}
              scale={[0.035, 0.65, 0.85]}
              color="#657f87"
            />
          ))}
          <Box
            position={[side * 0.93, 0.99, 0]}
            scale={[0.035, 0.19, 3.5]}
            color="#ddcfab"
          />
          {[-1.07, 1.07].map((z) => (
            <group
              key={z}
              name="wheel"
              userData={{ dynamic: true }}
              position={[side * 0.94, 0.42, z]}
            >
              <Cylinder
                rotation={[0, 0, Math.PI / 2]}
                scale={[0.37, 0.18, 0.37]}
                color="#405662"
              />
            </group>
          ))}
        </group>
      ))}
      <Sign
        text={`CITY ${index === 4 ? "WEST" : "EAST"}`}
        position={[0, 2.02, 1.85]}
        width={1.6}
        height={0.22}
      />
    </Baked>
  );
}
export default function CityTraffic({
  scene,
  overlay = "none",
  onOpenCityLife,
}: {
  scene: SceneState;
  overlay?: LivingOverlay;
  onOpenCityLife?: (selection: LivingCitySelection) => void;
}) {
  const [hoveredBus, setHoveredBus] = useState<number | null>(null);
  const cars = useRef<THREE.Group>(null),
    people = useRef<THREE.Group>(null);
  const traffic = useRef(createTraffic());
  const wheels = useRef<THREE.Object3D[][]>([]);
  const time = useRef(0);
  useLayoutEffect(() => {
    wheels.current =
      cars.current?.children.map((car) =>
        car.getObjectsByProperty("name", "wheel"),
      ) ?? [];
  }, []);
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const animate = !scene.paused && !scene.reduced;
    if (animate) time.current += dt;
    if (animate)
      tickTrafficFleet(traffic.current, dt, {
        southBridgeClosed:
          city.living?.traffic.closures.includes("riverside_bridge"),
        speedAt: (point) => {
          const district = city.living?.districts.find(
            (d) => d.id === districtAt(point.x, point.z),
          );
          const weather = city.living?.weather.today;
          const weatherPace =
            weather === "storm"
              ? 0.72
              : weather === "rain"
                ? 0.86
                : weather === "heat"
                  ? 0.94
                  : 1;
          return (1 - (district?.congestion ?? 0) * 0.7) * weatherPace;
        },
        stopDuration: (vehicle, index) => {
          if (!busIndices.includes(index)) return 1.4;
          const pose = sampleTrafficRoute(
            vehicleTrafficRoute(vehicle),
            vehicle.distance,
          );
          const district = city.living?.districts.find(
            (d) => d.id === districtAt(pose.x, pose.z),
          );
          return 2.4 + (1 - (district?.access ?? 1)) * 2.8;
        },
      });
    cars.current?.children.forEach((car, i) => {
      const vehicle = traffic.current[i];
      const point = sampleTrafficRoute(
        vehicleTrafficRoute(vehicle),
        vehicle.distance,
      );
      car.position.set(point.x, 0.44, point.z);
      car.rotation.y = point.heading;
      wheels.current[i]?.forEach((wheel) => {
        if (wheel.userData.dynamic) wheel.rotation.x = vehicle.wheels;
      });
    });
    people.current?.children.forEach((person, i) => {
      const x = (i % 2 ? 1 : -1) * [8.45, 60.15, 15.6][i % 3];
      const period = 32;
      const wave = (time.current * 0.78 + i * 4.4) % (period * 2);
      const z = (i < 10 ? -44 : 8) + (wave < period ? wave : period * 2 - wave);
      person.position.set(
        x,
        0.43 + (animate ? Math.abs(Math.sin(time.current * 4 + i)) * 0.035 : 0),
        z,
      );
      person.rotation.y = wave < period ? 0 : Math.PI;
    });
  });
  return (
    <>
      <group ref={cars} name="city-traffic">
        {traffic.current.map((vehicle, i) => (
          <group
            key={i}
            onPointerOver={
              busIndices.includes(i)
                ? (event) => {
                    event.stopPropagation();
                    setHoveredBus(i);
                  }
                : undefined
            }
            onPointerOut={
              busIndices.includes(i) ? () => setHoveredBus(null) : undefined
            }
            onClick={
              busIndices.includes(i)
                ? (event: ThreeEvent<MouseEvent>) => {
                    if (event.delta > 5) return;
                    event.stopPropagation();
                    const pose = sampleTrafficRoute(
                      vehicleTrafficRoute(vehicle),
                      vehicle.distance,
                    );
                    const districtId = districtAt(pose.x, pose.z);
                    onOpenCityLife?.({
                      section: "transport",
                      id: districtId,
                      districtId,
                    });
                  }
                : undefined
            }
          >
            {busIndices.includes(i) ? (
              <CityBus index={i} />
            ) : i % 3 === 0 ? (
              <VanModel
                cold={i % 2 === 0}
                number={`C${String(i + 1).padStart(2, "0")}`}
              />
            ) : (
              <CarModel color={colors[i % colors.length]} />
            )}
            <Headlights game={scene} />
            {busIndices.includes(i) &&
              overlay === "none" &&
              hoveredBus === i && (
                <WorldLabel
                  text="CITY BUS · scheduled stops"
                  position={[0, 3.4, 0]}
                  width={148}
                />
              )}
          </group>
        ))}
      </group>
      {busIndices.map((i) => {
        const route = trafficRoutes[traffic.current[i].route],
          pose = sampleTrafficRoute(route, route.stop);
        const district = city.living?.districts.find(
          (d) => d.id === districtAt(pose.x, pose.z),
        );
        const passengers = district
          ? Math.min(4, Math.max(1, Math.ceil((1 - district.access) * 7)))
          : 1;
        const x = pose.x + Math.cos(pose.heading) * 2.5,
          z = pose.z - Math.sin(pose.heading) * 2.5;
        return (
          <group key={i} position={[x, 0.4, z]} rotation={[0, pose.heading, 0]}>
            <Cylinder
              position={[0, 1.8, 0]}
              scale={[0.065, 3.6, 0.065]}
              color="#779294"
            />
            <Sign
              text="BUS"
              position={[0, 3.3, 0.07]}
              width={1.4}
              height={0.7}
            />
            <Baked key={passengers}>
              {Array.from({ length: passengers }, (_, n) => (
                <group key={n} position={[0, 0, n + 1.4]}>
                  <Cylinder
                    position={[0, 0.61, 0]}
                    scale={[0.22, 0.65, 0.18]}
                    color={colors[n]}
                  />
                  <mesh
                    position={[0, 1.14, 0]}
                    geometry={pedestrianHead}
                    material={mat("#cda17a")}
                  />
                </group>
              ))}
            </Baked>
          </group>
        );
      })}
      <group ref={people}>
        {Array.from({ length: 12 }, (_, i) => (
          <group key={i}>
            <Cylinder
              position={[0, 0.62, 0]}
              scale={[0.22, 0.65, 0.18]}
              color={colors[i % colors.length]}
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
