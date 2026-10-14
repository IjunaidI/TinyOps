import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { GameState } from "../types";

export function Celebrations({ game }: { game: GameState }) {
  const particles = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colors = useMemo(
    () => ["#ffe5a1", "#85cab0", "#efaa70"].map((c) => new THREE.Color(c)),
    [],
  );
  useFrame(() => {
    if (!particles.current) return;
    particles.current.visible = !game.reduced;
    const deliveries = game.pulses
      .filter(
        (p) => p.kind === "delivery" && p.onTime && game.time - p.started < 2.2,
      )
      .slice(-8);
    for (let i = 0; i < 96; i++) {
      const pulse = deliveries[Math.floor(i / 12)],
        j = i % 12;
      const age = pulse ? game.time - pulse.started : 99;
      if (pulse && age < 2.2) {
        const angle = (j * Math.PI) / 6,
          spread = age * 2.5;
        dummy.position.set(
          pulse.x + Math.cos(angle) * spread,
          2.4 + age * 7 - age * age * 2,
          pulse.z + Math.sin(angle) * spread,
        );
        dummy.rotation.set(age * 3 + j, age * 2, age * 4 + j);
        dummy.scale.setScalar(0.18 * Math.min(1, (2.2 - age) * 3));
      } else dummy.scale.setScalar(0);
      dummy.updateMatrix();
      particles.current.setMatrixAt(i, dummy.matrix);
      particles.current.setColorAt(i, colors[j % 3]);
    }
    particles.current.instanceMatrix.needsUpdate = true;
    if (particles.current.instanceColor)
      particles.current.instanceColor.needsUpdate = true;
  });
  return (
    <instancedMesh
      ref={particles}
      args={[undefined, undefined, 96]}
      frustumCulled={false}
      raycast={() => {}}
    >
      <boxGeometry args={[1, 0.25, 1]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}
