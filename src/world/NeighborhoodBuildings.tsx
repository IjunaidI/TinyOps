import { windowGlass } from "./Atmosphere";
import { Ball, Box, Cylinder, Roof, Sign } from "./Primitives";
import type { BuildingStyle } from "./buildingStyles";

const trim = "#e9e4d5";
const stone = "#bbc1b6";
const slate = "#7d9397";
const timber = "#9d836b";

function Window({ x, y, z = 3.04, w = 1.15, h = 1.35, side = false, shutters = false }: {
  x: number; y: number; z?: number; w?: number; h?: number; side?: boolean; shutters?: boolean;
}) {
  return <group position={[x, y, z]} rotation={[0, side ? Math.PI / 2 : 0, 0]}>
    <Box scale={[w + 0.2, h + 0.2, 0.14]} color={trim} />
    <mesh position={[0, 0, 0.1]} scale={[w, h, 0.065]} material={windowGlass}><boxGeometry args={[1, 1, 1]} /></mesh>
    <Box position={[0, 0, 0.15]} scale={[0.075, h, 0.04]} color={trim} />
    <Box position={[0, -h / 2 - 0.1, 0.15]} scale={[w + 0.35, 0.12, 0.3]} color={stone} />
    {shutters && [-1, 1].map(s => <Box key={s} position={[s * (w / 2 + 0.27), 0, 0.05]} scale={[0.29, h + 0.13, 0.1]} color="#88a199" />)}
  </group>;
}

function Door({ x = 0, z = 3.06, color = "#6c8982", height = 2.2 }: { x?: number; z?: number; color?: string; height?: number }) {
  return <group position={[x, 0, z]}>
    <Box position={[0, height / 2, 0]} scale={[1.15, height, 0.14]} color={color} />
    <Box position={[0, height * 0.69, 0.08]} scale={[0.76, height * 0.24, 0.05]} color="#b6ceca" />
    <Box position={[0.38, 0.95, 0.13]} scale={[0.09, 0.13, 0.07]} color="#e0c184" />
    <Box position={[0, 0.1, 0.3]} scale={[1.6, 0.2, 0.65]} color={stone} />
  </group>;
}

function Planter({ x, z, y = 0.35, w = 1.25 }: { x: number; z: number; y?: number; w?: number }) {
  return <group position={[x, y, z]}>
    <Box scale={[w, 0.45, 0.6]} color="#b99779" />
    <Box position={[0, 0.3, 0]} scale={[w * 0.9, 0.35, 0.55]} color="#8ca47b" />
    {[-0.3, 0.3].map((v, i) => <Ball key={v} position={[v * w, 0.52, 0]} scale={[0.13, 0.12, 0.13]} color={i ? "#d7b778" : "#c8877c"} />)}
  </group>;
}

function Balcony({ x, y, z = 3.35, width = 2.5 }: { x: number; y: number; z?: number; width?: number }) {
  return <group position={[x, y, z]}>
    <Box scale={[width, 0.2, 1.05]} color={trim} />
    <Box position={[0, 0.5, 0.47]} scale={[width, 0.1, 0.1]} color={slate} />
    {[-0.42, -0.14, 0.14, 0.42].map(v => <Box key={v} position={[v * width, 0.25, 0.47]} scale={[0.075, 0.5, 0.075]} color={slate} />)}
    {[-1, 1].map(s => <Box key={s} position={[s * width / 2, 0.45, 0]} scale={[0.075, 0.1, 1]} color={slate} />)}
  </group>;
}

function Chimney({ x = 2, y = 5.6, z = -1.4 }: { x?: number; y?: number; z?: number }) {
  return <group position={[x, y, z]}>
    <Box scale={[0.68, 1.65, 0.76]} color="#af8c7b" />
    <Box position={[0, 0.8, 0]} scale={[0.9, 0.17, 0.96]} color={trim} />
  </group>;
}

function SolarPanels({ x = 0, y, z = 0, width = 3.5 }: { x?: number; y: number; z?: number; width?: number }) {
  return <group position={[x, y, z]} rotation={[-0.19, 0, 0]}>
    <Box scale={[width + 0.15, 0.13, 2.35]} color="#b8c4c4" />
    {[-1, 0, 1].map(i => <Box key={i} position={[i * width / 3, 0.09, 0]} scale={[width / 3 - 0.05, 0.04, 2.16]} color="#617f90" />)}
    <Box position={[0, 0.12, 0]} scale={[width, 0.025, 0.05]} color="#92a8b4" />
  </group>;
}

function Storefront({ name, width = 7, color = "#899e85", y = 2.85, z = 3.05 }: { name?: string; width?: number; color?: string; y?: number; z?: number }) {
  return <group>
    <Door z={z} />
    {[-1, 1].map(s => <Window key={s} x={s * width * 0.29} y={1.4} z={z} w={width * 0.24} h={1.9} />)}
    <Box position={[0, y, z + 0.45]} scale={[width + 0.2, 0.17, 1.05]} rotation={[-0.1, 0, 0]} color={color} />
    {[-3, -1, 1, 3].map(i => <Box key={i} position={[i * width / 8, y - 0.12, z + 0.96]} scale={[width / 8, 0.33, 0.055]} color={trim} />)}
    {name && <Sign text={name.toUpperCase()} position={[0, y + 0.55, z + 0.1]} width={width - 0.45} height={0.58} background={trim} color="#556c65" />}
  </group>;
}

function VerandaCottage({ color }: { color: string }) {
  return <>
    <Box position={[0, 1.7, -0.4]} scale={[6.8, 3.4, 5.1]} color={color} />
    <Roof position={[0, 3.4, -0.4]} scale={[7.55, 2.15, 5.8]} color="#9b7770" />
    <Box position={[0, 0.22, 3.05]} scale={[7.2, 0.4, 1.65]} color={timber} />
    <Box position={[0, 2.8, 3]} scale={[7.4, 0.2, 2]} rotation={[-0.12, 0, 0]} color="#849c8a" />
    {[-3.1, 0.9, 3.1].map(x => <Box key={x} position={[x, 1.5, 3.75]} scale={[0.16, 2.6, 0.16]} color={trim} />)}
    <Door x={-0.4} z={2.21} /><Window x={-2.2} y={1.8} z={2.22} shutters /><Window x={2} y={1.8} z={2.22} shutters />
    <Chimney x={-2} y={4.65} />
    <Planter x={-2.15} z={3.6} w={1.55} /><Planter x={2.2} z={3.6} />
    <Box position={[-3.8, 0.56, -0.7]} scale={[0.13, 0.65, 4.6]} color={trim} />
    {[-2.7, -1.7, -0.7, 0.3, 1.3].map(z => <Box key={z} position={[-3.8, 0.57, z]} scale={[0.18, 1.1, 0.2]} color={trim} />)}
  </>;
}

function GardenVilla({ color }: { color: string }) {
  return <>
    <Box position={[-1.2, 2.55, -0.25]} scale={[4.6, 5.1, 5.5]} color={color} />
    <Roof position={[-1.2, 5.1, -0.25]} scale={[5.25, 1.7, 6.1]} color="#a17e76" />
    <Box position={[2.3, 1.45, 0.2]} scale={[2.5, 2.9, 4.6]} color="#acc1b2" />
    <Box position={[2.3, 3, 0.2]} scale={[2.8, 0.17, 4.9]} color={slate} />
    <Window x={2.35} y={1.55} z={2.54} w={1.75} h={1.85} />
    <Window x={3.6} y={1.55} z={0.2} w={2.3} h={1.85} side />
    <Door x={-0.75} z={2.56} /><Window x={-2.2} y={3.75} z={2.56} shutters /><Window x={-0.3} y={3.75} z={2.56} shutters />
    <Chimney x={-2.4} y={6} />
    <Planter x={2.3} z={3.3} w={2.4} />
    <Box position={[-2.3, 2.6, 3.3]} scale={[2.2, 0.12, 1.2]} color={timber} />
    {[-3.25, -1.3].map(x => <Box key={x} position={[x, 1.3, 3.85]} scale={[0.13, 2.6, 0.13]} color={timber} />)}
  </>;
}

function BrickTerrace({ color }: { color: string }) {
  return <>{[-2.4, 0, 2.4].map((x, i) => {
    const h = [5.5, 6.25, 5.85][i];
    return <group key={x}>
      <Box position={[x, h / 2, 0]} scale={[2.32, h, 5.7]} color={i === 1 ? color : i === 0 ? "#bb9180" : "#bca695"} />
      <Roof position={[x, h, 0]} scale={[2.55, 1.45, 6.1]} color={i === 1 ? "#778c8d" : "#a57c74"} />
      {[0.45, 2.65, h - 0.18].map(y => <Box key={y} position={[x, y, 2.89]} scale={[2.32, 0.14, 0.12]} color={trim} />)}
      <Door x={x} z={2.94} color={i === 1 ? "#9b766d" : "#6c8982"} />
      <Window x={x} y={h - 1.45} z={2.94} w={1.18} h={1.45} />
      <Chimney x={x + 0.6} y={h + 0.65} z={-1.5} />
    </group>;
  })}</>;
}

function GabledHouse({ color }: { color: string }) {
  return <>
    <Box position={[0, 3.1, 0]} scale={[4.5, 6.2, 5.9]} color={color} />
    <Roof position={[0, 6.2, 0]} scale={[5.2, 2.5, 6.5]} color="#8a7e79" />
    <Box position={[-2.9, 1.65, -0.65]} scale={[1.55, 3.3, 4.6]} color="#b7bda9" />
    <Roof position={[-2.9, 3.3, -0.65]} scale={[1.9, 0.85, 5]} color="#8a7e79" />
    <Window x={-1.05} y={4.7} /><Window x={1.05} y={4.7} /><Window x={0} y={6.95} z={3.08} w={0.7} h={0.7} />
    <Door x={0.95} /><Box position={[-1.1, 1.3, 3.16]} scale={[1.65, 2.4, 0.9]} color={trim} />
    <Window x={-1.1} y={1.4} z={3.67} w={1.3} h={1.65} />
    <Roof position={[-1.1, 2.55, 3.17]} scale={[2.05, 0.65, 1.2]} color={slate} />
    <Chimney x={1.5} y={7.3} /><Planter x={-3} z={2.45} />
  </>;
}

function BayShop({ color, name }: { color: string; name?: string }) {
  return <>
    <Box position={[0, 3.2, 0]} scale={[7, 6.4, 6]} color={color} />
    <Roof position={[0, 6.4, 0]} scale={[7.5, 1.6, 6.55]} color="#8c9490" />
    <Box position={[0, 4.85, 3.23]} scale={[3.2, 2.3, 0.7]} color={trim} />
    {[-0.95, 0.95].map(x => <Window key={x} x={x} y={4.9} z={3.64} w={1.05} h={1.7} />)}
    <Box position={[0, 6.12, 3.28]} scale={[3.55, 0.21, 1.1]} color={slate} />
    <Storefront name={name} color="#8ba18c" /><Chimney x={2.6} y={7.1} />
    <Planter x={-2.75} z={3.7} w={0.85} />
  </>;
}

function GardenShop({ color, name }: { color: string; name?: string }) {
  return <>
    <Box position={[0, 3.15, -0.2]} scale={[7.4, 6.3, 6.7]} color={color} />
    <Box position={[0, 6.35, -0.2]} scale={[7.65, 0.2, 7]} color={trim} />
    <Storefront name={name} width={7.25} color="#819b77" z={3.2} />
    {[-2.3, 0, 2.3].map(x => <Window key={x} x={x} y={4.9} z={3.2} w={1.25} />)}
    <Box position={[-3.74, 3.2, -0.1]} scale={[0.12, 5.6, 0.12]} color={slate} />
    {Array.from({ length: 11 }, (_, i) => <Box key={i} position={[-3.77, 0.6 + i * 0.5, -0.1]} scale={[0.17, 0.075, 0.8]} color={slate} />)}
  </>;
}

function MarketArcade({ color, name }: { color: string; name?: string }) {
  return <>
    <Box position={[0, 1.9, -0.9]} scale={[7.7, 3.8, 4.1]} color={color} />
    <Box position={[0, 3.68, 0.35]} scale={[8.1, 0.32, 6.7]} color={trim} />
    {[-2.6, 0, 2.6].map((x, i) => <group key={x}>
      <Roof position={[x, 3.85, 0]} scale={[2.65, i === 1 ? 1.5 : 0.85, 6]} color={i === 1 ? "#8b9d96" : "#ac8271"} />
      <Window x={x} y={1.7} z={1.2} w={1.75} h={2.35} />
      <Box position={[x, 0.45, 2.8]} scale={[1.9, 0.8, 0.9]} color={timber} />
      <Box position={[x, 0.93, 2.8]} scale={[1.75, 0.22, 0.8]} color={i % 2 ? "#d1b280" : "#8fa479"} />
    </group>)}
    {[-3.8, -1.25, 1.25, 3.8].map(x => <Box key={x} position={[x, 1.8, 3.55]} scale={[0.24, 3.6, 0.24]} color={trim} />)}
    {name && <Sign text={name.toUpperCase()} position={[0, 3.18, 3.62]} width={6.9} height={0.62} color="#566e62" background={trim} />}
  </>;
}

function SawtoothWorks({ color, name }: { color: string; name?: string }) {
  return <>
    <Box position={[0, 2.1, 0]} scale={[8.4, 4.2, 6]} color={color} />
    {[-2.8, 0, 2.8].map(x => <group key={x}>
      <Roof position={[x, 4.2, 0]} scale={[2.8, 1.6, 6.4]} color="#78918f" />
      <Box position={[x - 0.78, 5, 0]} scale={[0.12, 1.75, 5.55]} rotation={[0, 0, -0.72]} color="#bad1cf" />
      <Box position={[x, 0.34, 3.11]} scale={[2.5, 0.55, 0.2]} color={stone} />
    </group>)}
    <Box position={[-1.5, 1.65, 3.1]} scale={[3.8, 3.3, 0.15]} color="#78918b" />
    {[0.6, 1.2, 1.8, 2.4, 3].map(y => <Box key={y} position={[-1.5, y, 3.2]} scale={[3.6, 0.075, 0.05]} color="#567671" />)}
    <Window x={2.65} y={2} w={1.6} h={1.6} />
    {name && <Sign text={name.toUpperCase()} position={[0, 3.85, 3.15]} width={6.9} height={0.5} background={trim} color="#5c716a" />}
    <Box position={[3.5, 0.45, 3.55]} scale={[0.8, 0.85, 0.8]} color={timber} />
  </>;
}

function WaterTowerWorks({ color, name }: { color: string; name?: string }) {
  return <>
    <Box position={[-1.6, 2.5, 0]} scale={[5, 5, 6]} color={color} />
    <Box position={[-1.6, 5.12, 0]} scale={[5.4, 0.24, 6.4]} color={slate} />
    <Box position={[2.55, 1.6, 0.1]} scale={[3.2, 3.2, 5.8]} color="#a5b7b3" />
    <Box position={[2.55, 3.3, 0.1]} scale={[3.5, 0.2, 6.2]} color={slate} rotation={[0, 0, -0.07]} />
    {[-1, 1].flatMap(x => [-1, 1].map(z => <Box key={`${x}:${z}`} position={[-1.6 + x * 0.9, 6.2, -0.8 + z * 0.9]} scale={[0.15, 2.1, 0.15]} color={timber} />))}
    <Cylinder position={[-1.6, 7.2, -0.8]} scale={[1.35, 1.7, 1.35]} color="#a78c76" />
    {[6.55, 7.6].map(y => <Cylinder key={y} position={[-1.6, y, -0.8]} scale={[1.38, 0.1, 1.38]} color={slate} />)}
    <Cylinder position={[-3.3, 6, -2]} scale={[0.22, 2.4, 0.22]} color="#81938e" />
    <Window x={-2.8} y={3.7} w={1.4} h={1.25} /><Window x={-0.55} y={3.7} w={1.4} h={1.25} />
    <Door x={-1.6} /><Box position={[2.6, 1.38, 3.1]} scale={[2.4, 2.65, 0.15]} color="#768b8a" />
    {[0.6, 1.2, 1.8, 2.4].map(y => <Box key={y} position={[2.6, y, 3.2]} scale={[2.35, 0.07, 0.05]} color="#5c7272" />)}
    {name && <Sign text={name.toUpperCase()} position={[-1.6, 2.65, 3.16]} width={4.65} height={0.48} background={trim} color="#536b66" />}
  </>;
}

function CornerCafe({ color, name }: { color: string; name?: string }) {
  return <>
    <Box position={[-0.7, 2.6, -0.1]} scale={[5.4, 5.2, 5.8]} color={color} />
    <Roof position={[-0.7, 5.2, -0.1]} scale={[6, 1.65, 6.4]} color="#ad8075" />
    <Window x={-2} y={4} z={2.85} /><Window x={0.5} y={4} z={2.85} />
    <Storefront name={name ?? "River & Rye"} width={5.3} color="#b98978" z={2.9} />
    <Chimney x={-2.2} y={6} />
    <Box position={[2.15, 1.4, -0.35]} scale={[0.3, 2.8, 3.5]} color={trim} />
    <Window x={2.35} y={1.55} z={-0.35} side w={2.9} h={1.75} />
    <Planter x={-3} z={3.5} w={0.7} />
  </>;
}

function SolarSteps({ color }: { color: string }) {
  return <>
    <Box position={[0, 1.65, 0]} scale={[7.5, 3.3, 6]} color={color} />
    <Box position={[1.15, 4.4, -0.7]} scale={[5.2, 2.2, 4.6]} color="#c6d0c6" />
    <Box position={[2, 6.25, -1.2]} scale={[3.5, 1.5, 3.6]} color={color} />
    <Box position={[0, 3.4, 0]} scale={[7.7, 0.18, 6.2]} color={trim} />
    <Box position={[1.15, 5.6, -0.7]} scale={[5.4, 0.18, 4.8]} color={trim} />
    <Box position={[2, 7.1, -1.2]} scale={[3.7, 0.18, 3.8]} color={trim} />
    <SolarPanels x={1.9} y={7.4} z={-1.2} width={2.9} />
    <Door x={-2.5} />{[-0.1, 2.4].map(x => <Window key={x} x={x} y={1.65} w={1.65} />)}
    <Window x={0} y={4.45} z={1.65} w={1.5} h={1.2} /><Window x={2.35} y={4.45} z={1.65} w={1.5} h={1.2} />
    <Planter x={-2.5} z={0.6} y={3.75} w={1.3} /><Planter x={0} z={0.9} y={5.92} />
    <Balcony x={1.2} y={3.48} z={2.55} width={4.8} />
  </>;
}

function SplitDuplex({ color }: { color: string }) {
  return <>{[-1, 1].map(s => <group key={s} position={[s * 1.85, 0, s * 0.32]}>
    <Box position={[0, s < 0 ? 2.4 : 2.85, 0]} scale={[3.5, s < 0 ? 4.8 : 5.7, 5.3]} color={s < 0 ? color : "#adbfb9"} />
    <Box position={[0, s < 0 ? 4.9 : 5.8, 0]} scale={[3.85, 0.22, 5.65]} color={slate} />
    <Door x={s * 0.5} z={2.73} /><Window x={0} y={s < 0 ? 3.55 : 4.1} z={2.73} w={1.65} />
    <Balcony x={0} y={s < 0 ? 2.65 : 3.18} z={3.1} width={2.8} />
    <SolarPanels y={s < 0 ? 5.25 : 6.15} z={-0.3} width={2.7} />
  </group>)}</>;
}

function CourtyardHomes({ color }: { color: string }) {
  return <>
    <Box position={[0, 2.2, -1.9]} scale={[7.4, 4.4, 2.2]} color={color} />
    {[-1, 1].map(s => <group key={s}>
      <Box position={[s * 2.8, 2.2, 0.7]} scale={[1.8, 4.4, 3.1]} color={s < 0 ? "#b3c3b0" : color} />
      <Roof position={[s * 2.8, 4.4, 0]} scale={[2.25, 1, 6.2]} color="#889b8e" />
      <Window x={s * 2.8} y={3.2} z={2.32} w={1} h={1.2} /><Door x={s * 2.8} z={2.33} height={1.9} />
    </group>)}
    <Box position={[0, 4.5, -1.9]} scale={[3.5, 0.2, 2.5]} color={slate} />
    <Window x={-0.9} y={3.05} z={-0.7} w={1} /><Window x={0.9} y={3.05} z={-0.7} w={1} />
    <Box position={[0, 0.2, 0.65]} scale={[3.45, 0.18, 4]} color="#c7c3ac" />
    <Cylinder position={[0, 0.55, 0.3]} scale={[0.8, 0.6, 0.8]} color="#b59677" />
    <Cylinder position={[0, 1.2, 0.3]} scale={[0.13, 1.4, 0.13]} color={timber} />
    <Ball position={[0, 2.3, 0.3]} scale={[0.85, 1, 0.85]} color="#8eab86" />
    <Box position={[0, 2.75, 3]} scale={[3.9, 0.15, 0.6]} color={timber} />
    {[-1.8, 1.8].map(x => <Box key={x} position={[x, 1.4, 3]} scale={[0.16, 2.8, 0.16]} color={timber} />)}
  </>;
}

function BalconyTower({ color }: { color: string }) {
  return <>
    <Box position={[0.65, 4.05, -0.25]} scale={[5.8, 8.1, 5.5]} color={color} />
    <Box position={[-2.9, 2.8, -0.25]} scale={[1.3, 5.6, 5.5]} color="#9bb2af" />
    <Box position={[0.65, 8.2, -0.25]} scale={[6.25, 0.25, 5.95]} color={slate} />
    {[1.6, 4.1, 6.55].map((y, i) => <group key={y}>
      <Window x={-0.85} y={y} z={2.58} w={1.5} h={1.65} /><Window x={1.95} y={y} z={2.58} w={1.5} h={1.65} />
      <Balcony x={i % 2 ? -0.9 : 1.9} y={y - 1.05} z={3.1} width={2.5} />
      <Window x={3.61} y={y} z={-0.35} side w={2} h={1.65} />
    </group>)}
    <Box position={[-2.9, 5.72, -0.25]} scale={[1.6, 0.22, 5.9]} color={trim} />
    <Door x={-2.8} z={2.58} /><Planter x={-2.9} z={0} y={6.05} w={1} />
    <Box position={[0.2, 8.65, -1]} scale={[2.5, 0.65, 2]} color="#bcc8bc" />
  </>;
}

/** Static geometry is merged by the parcel's existing Baked parent. */
export function NeighborhoodBuilding({ style, color = "#ccd1bd", name, foundation = true }: {
  style: BuildingStyle; color?: string; name?: string; foundation?: boolean;
}) {
  return <>
    {foundation && <Box position={[0, 0.09, 0]} scale={[8.9, 0.18, 8.25]} color="#d4d7c8" />}
    {style === "veranda-cottage" && <VerandaCottage color={color} />}
    {style === "garden-villa" && <GardenVilla color={color} />}
    {style === "brick-terrace" && <BrickTerrace color={color} />}
    {style === "gabled-house" && <GabledHouse color={color} />}
    {style === "bay-shop" && <BayShop color={color} name={name} />}
    {style === "garden-shop" && <GardenShop color={color} name={name} />}
    {style === "market-arcade" && <MarketArcade color={color} name={name} />}
    {style === "sawtooth-works" && <SawtoothWorks color={color} name={name} />}
    {style === "water-tower-works" && <WaterTowerWorks color={color} name={name} />}
    {style === "corner-cafe" && <CornerCafe color={color} name={name} />}
    {style === "solar-steps" && <SolarSteps color={color} />}
    {style === "split-duplex" && <SplitDuplex color={color} />}
    {style === "courtyard-homes" && <CourtyardHomes color={color} />}
    {style === "balcony-tower" && <BalconyTower color={color} />}
  </>;
}
