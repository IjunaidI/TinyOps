import {
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createRoot, type Root } from "react-dom/client";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

function Content({
  children,
  center,
  style,
  invalidate,
}: {
  children: ReactNode;
  center: boolean;
  style?: CSSProperties;
  invalidate: () => void;
}) {
  // DOM refs (including alert collision refs) exist before this demand frame.
  useLayoutEffect(() => invalidate());
  return (
    <div
      style={{
        position: "absolute",
        transform: center ? "translate3d(-50%,-50%,0)" : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** A small projected DOM label with an independently owned container per mount. */
export function WorldHtml({
  children,
  position,
  center = false,
  style,
  zIndexRange = [40, 20],
}: {
  children: ReactNode;
  position: [number, number, number];
  center?: boolean;
  style?: CSSProperties;
  zIndexRange?: [number, number];
}) {
  const group = useRef<THREE.Group>(null);
  const owned = useRef<{ container: HTMLDivElement; root: Root } | null>(null);
  const world = useRef(new THREE.Vector3());
  const projected = useRef(new THREE.Vector3());
  const cameraPosition = useRef(new THREE.Vector3());
  const gl = useThree((state) => state.gl);
  const connected = useThree((state) => state.events.connected);
  const invalidate = useThree((state) => state.invalidate);
  const target = connected || gl.domElement.parentElement;

  useLayoutEffect(() => {
    if (!target) return;
    const container = document.createElement("div");
    container.style.cssText =
      "position:absolute;left:0;top:0;pointer-events:none;visibility:hidden;transform-origin:0 0;";
    const mounted = { container, root: createRoot(container) };
    owned.current = mounted;
    target.appendChild(container);
    return () => {
      if (owned.current === mounted) owned.current = null;
      // StrictMode may immediately set up another mount. Never reuse its DOM
      // container or synchronously unmount a DOM root during a Fiber commit.
      container.remove();
      queueMicrotask(() => mounted.root.unmount());
    };
  }, [target]);

  useLayoutEffect(() => {
    owned.current?.root.render(
      <Content center={center} style={style} invalidate={invalidate}>
        {children}
      </Content>,
    );
  });

  useFrame(({ camera, size }) => {
    const element = owned.current?.container;
    if (!element || !group.current) return;
    camera.updateMatrixWorld();
    group.current.updateWorldMatrix(true, false);
    world.current.setFromMatrixPosition(group.current.matrixWorld);
    projected.current.copy(world.current).project(camera);
    const { x, y, z } = projected.current;
    const px = ((x + 1) * size.width) / 2;
    const py = ((1 - y) * size.height) / 2;
    const visible =
      Number.isFinite(px) &&
      Number.isFinite(py) &&
      z >= -1 &&
      z <= 1 &&
      px >= -64 &&
      px <= size.width + 64 &&
      py >= -64 &&
      py <= size.height + 64;
    element.style.visibility = visible ? "visible" : "hidden";
    if (!visible) return;
    element.style.transform = `translate3d(${px}px,${py}px,0)`;
    camera.getWorldPosition(cameraPosition.current);
    const distance = cameraPosition.current.distanceTo(world.current);
    const depth = THREE.MathUtils.clamp(
      (distance - camera.near) / (camera.far - camera.near),
      0,
      1,
    );
    element.style.zIndex = String(
      Math.round(zIndexRange[0] + (zIndexRange[1] - zIndexRange[0]) * depth),
    );
  });

  return <group ref={group} position={position} />;
}
