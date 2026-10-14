import type { SVGProps } from "react";
import type { Category } from "./types";

export type PixelIconKind =
  | "heart"
  | "coin"
  | "people"
  | "trust"
  | "inbox"
  | "city"
  | "build"
  | "budget"
  | "journal"
  | "chat"
  | "star";

const palette = {
  n: "#40526b",
  b: "#6c8194",
  c: "#83b6c0",
  g: "#a4bf8c",
  y: "#dec58b",
  p: "#c995aa",
  w: "#f7f8fb",
} as const;

type Color = keyof typeof palette;

// Each character is one square pixel. Explicit rows keep every silhouette on
// the same 16 × 16 grid, including diagonal edges and small highlights.
const sprites: Record<PixelIconKind, string[]> = {
  heart: [
    "................",
    "................",
    "..nnnn....nnnn..",
    ".nppppn..nppppn.",
    "npwwpppnnppppppn",
    "npwppppppppppppn",
    "nppppppppppppppn",
    "nppppppppppppppn",
    ".nppppppppppppn.",
    "..nppppppppppn..",
    "...nppppppppn...",
    "....nppppppn....",
    ".....nppppn.....",
    "......nppn......",
    ".......nn.......",
    "................",
  ],
  coin: [
    ".....nnnnnn.....",
    "...nnyyyyyynn...",
    "..nyywwyyyyyyn..",
    ".nyywnnnnyyyyyn.",
    ".nywynyyyynyyyn.",
    "nyywynyyyynyyyyn",
    "nyywynnnnnyyyyyn",
    "nyywyyyyynyyyyyn",
    "nyywynnnnnyyyyyn",
    "nyywynyyyynyyyyn",
    "nyywynyyyynyyyyn",
    ".nyyynnnnyyyyyn.",
    ".nyyyyyyyyyyyyn.",
    "..nyyyyyyyyyyn..",
    "...nnyyyyyynn...",
    ".....nnnnnn.....",
  ],
  people: [
    "......nnnn......",
    ".....nwwwwn.....",
    ".....nwwwwn.....",
    ".nnn.nwwwwn.nnn.",
    "nyyyn.nnnn.npppn",
    "nyyyn......npppn",
    "nyyyn.nnnn.npppn",
    ".nnn.nccccn.nnn.",
    ".....nccccn.....",
    ".nnnnccccccnnnn.",
    "ngggnccccccnbbbn",
    "ngggnccccccnbbbn",
    "ngggnccccccnbbbn",
    "ngggnccccccnbbbn",
    ".nnnnnnnnnnnnnn.",
    "................",
  ],
  trust: [
    "......nnnn......",
    "....nnggggnn....",
    "..nnggggggggnn..",
    ".nggggggggggggn.",
    ".nggwgggggggggn.",
    ".nggwggggwggggn.",
    ".nggggggwwggggn.",
    ".nggwggwwgggggn.",
    ".nggwwwwggggggn.",
    "..nggwwggggggn..",
    "..nggggggggggn..",
    "...nggggggggn...",
    "....nggggggn....",
    ".....nggggn.....",
    "......nggn......",
    ".......nn.......",
  ],
  inbox: [
    "................",
    "....nnnnnnnn....",
    "....nwwwwwwn....",
    "....nwbbbbwn....",
    "....nwwwwwwn....",
    "....nwbbbwwn....",
    "..nnnwwwwwwnnn..",
    "..ncnbbbbbbncn..",
    ".nccnnnnnnnnccn.",
    ".nccccccccccccn.",
    "nccccccccccccccn",
    "nccccnnnnnnccccn",
    "nccccnbbbbnccccn",
    "nbbbbnccccnbbbbn",
    "nbbbbbbbbbbbbbbn",
    "nnnnnnnnnnnnnnnn",
  ],
  city: [
    ".......nn.......",
    "......nyyn......",
    ".....nyyyyn.....",
    "....nnnnnnnn....",
    "....nccccccn....",
    ".nn.ncyccycn.nn.",
    "nyynnyccyynnyyyn",
    "nyynccccccccnyyn",
    "nyynccyccyccnyyn",
    "nyynccccccccnyyn",
    "nyynccyccyccnyyn",
    "nyynccccccccnyyn",
    "nyynccnnnnccnyyn",
    "nyynccnwwnccnyyn",
    "nyynccnwwnccnyyn",
    "nnnnnnnnnnnnnnnn",
  ],
  build: [
    "................",
    "......nnnn......",
    "....nnyyyynn....",
    "...nyyyyyyyyn...",
    "..nyyyynnyyyyn..",
    "..nyyyynnyyyyn..",
    ".nyyyyynnyyyyyn.",
    ".nyyyyynnyyyyyn.",
    ".nyyyyynnyyyyyn.",
    "nwwyyyynnyyyywwn",
    "nyyyyyyyyyyyyyyn",
    "nnnnnnnnnnnnnnnn",
    ".nbbbbbbbbbbbbn.",
    "..nnnnnnnnnnnn..",
    "................",
    "................",
  ],
  budget: [
    "....nnnnnnnn....",
    "...nyyyyyyyyn...",
    "....nyyyyyyn....",
    ".....nnnnnn.....",
    "....nyyyyyyn....",
    "...nyyynnyyyn...",
    "..nyyynwwnyyyn..",
    ".nyyyynwwnyyyyn.",
    ".nyyynwwwwnyyyn.",
    "nyyyyynwwnyyyyyn",
    "nyyyyynwwnyyyyyn",
    "nyyynwwwwwwnyyyn",
    "nyyyyynwwnyyyyyn",
    ".nyyyyyyyyyyyyn.",
    "..nyyyyyyyyyyn..",
    "...nnnnnnnnnn...",
  ],
  journal: [
    "................",
    "..nnnnnnnnnnnn..",
    ".npnbbbbbbbbbbn.",
    ".npnbyyyyyyybbn.",
    ".npnbybbbbbybbn.",
    ".npnbybbbbbybbn.",
    ".npnbyyyyyyybbn.",
    ".npnbbbbbbbbbbn.",
    ".npnbwwwwwwwbbn.",
    ".npnbbbbbbbbbbn.",
    ".npnbwwwwwbbbbn.",
    ".npnbbbbbbbbbbn.",
    ".npnnnnnnnnnnnn.",
    ".nwwwwwwwwwwwwn.",
    "..nnnnnnnnnnnn..",
    "................",
  ],
  chat: [
    "................",
    "..nnnnnnnnnnnn..",
    ".nccccccccccccn.",
    "nccccccccccccccn",
    "ncwccccccccccccn",
    "nccccccccccccccn",
    "nccnnccnnccnnccn",
    "nccnnccnnccnnccn",
    "nccccccccccccccn",
    "nccccccccccccccn",
    ".nccccccccccccn.",
    "..nncccnnnnnnn..",
    "...nccn.........",
    "...ncn..........",
    "...nn...........",
    "................",
  ],
  star: [
    ".......nn.......",
    "......nyyn......",
    "......nyyn......",
    ".....nyyyyn.....",
    "nnnnnwwyyyynnnnn",
    "nyyyywyyyyyyyyyn",
    ".nyyyyyyyyyyyyn.",
    "..nyyyyyyyyyyn..",
    "...nyyyyyyyyn...",
    "...nyyyyyyyyn...",
    "..nyyyyyyyyyyn..",
    "..nyyyynnyyyyn..",
    "..nyyyn..nyyyn..",
    "..nyyn....nyyn..",
    "..nyn......nyn..",
    "...n........n...",
  ],
};

type PixelIconProps = Omit<SVGProps<SVGSVGElement>, "children"> & {
  kind: PixelIconKind;
  size?: number;
};

export function PixelIcon({
  kind,
  size = 24,
  className = "",
  ...props
}: PixelIconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
      className={`pixel-icon ${className}`}
      {...props}
    >
      {sprites[kind].flatMap((row, y) =>
        [...row].flatMap((color, x) =>
          color === "."
            ? []
            : [
                <rect
                  key={`${x}-${y}`}
                  x={x}
                  y={y}
                  width="1"
                  height="1"
                  fill={palette[color as Color]}
                />,
              ],
        ),
      )}
    </svg>
  );
}

function PixelTree({
  x,
  y,
  pink = false,
}: {
  x: number;
  y: number;
  pink?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="3" y="7" width="2" height="7" fill={palette.y} />
      <rect
        x="1"
        y="2"
        width="6"
        height="7"
        fill={pink ? palette.p : palette.g}
      />
      <rect
        x="0"
        y="4"
        width="8"
        height="4"
        fill={pink ? palette.p : palette.g}
      />
      <rect
        x="2"
        y="0"
        width="4"
        height="2"
        fill={pink ? palette.p : palette.g}
      />
      <rect x="2" y="2" width="2" height="3" fill={palette.w} opacity=".35" />
      <rect x="5" y="8" width="2" height="2" fill={palette.n} opacity=".25" />
    </g>
  );
}

export function PixelProjectArt({
  kind,
  complete = false,
  className = "",
}: {
  kind: Category;
  complete?: boolean;
  className?: string;
}) {
  const park = kind === "environment" || kind === "community";
  const transit = kind === "transport";
  const accent =
    kind === "health" || kind === "emergency"
      ? palette.p
      : kind === "education" || kind === "economy"
        ? palette.y
        : palette.c;
  return (
    <svg
      viewBox="0 0 120 44"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
      className={`pixel-project-art ${className}`}
    >
      <rect width="120" height="44" fill="#e6edf4" />
      <rect y="29" width="120" height="15" fill="#b9cfc4" />
      <rect y="29" width="120" height="2" fill={palette.c} opacity=".25" />
      <rect x="5" y="8" width="9" height="2" fill="#c9d5e0" />
      <rect x="8" y="6" width="4" height="2" fill="#c9d5e0" />
      <rect x="96" y="10" width="15" height="2" fill="#c9d5e0" />
      <rect x="99" y="8" width="7" height="2" fill="#c9d5e0" />
      <rect x="21" y="4" width="1" height="1" fill={palette.w} />
      <rect x="88" y="3" width="1" height="1" fill={palette.y} />
      <rect x="106" y="3" width="2" height="2" fill={palette.c} />
      <rect y="37" width="120" height="7" fill="#6c8194" />
      {[4, 24, 44, 64, 84, 104].map((x) => (
        <rect key={x} x={x} y="40" width="8" height="1" fill="#f0e6cd" />
      ))}
      <rect x="25" y="30" width="70" height="2" fill={palette.n} opacity=".4" />
      {park ? (
        <>
          <rect
            x="24"
            y="27"
            width="70"
            height="7"
            fill={palette.g}
            opacity=".25"
          />
          <rect x="31" y="30" width="53" height="2" fill={palette.y} />
          <rect x="54" y="22" width="4" height="12" fill={palette.y} />
          <PixelTree x={30} y={10} />
          <PixelTree x={43} y={5} pink={kind === "community"} />
          <PixelTree x={68} y={7} />
          <PixelTree x={83} y={12} pink={kind === "community"} />
          <rect x="63" y="25" width="9" height="2" fill={palette.p} />
          <rect x="64" y="27" width="1" height="3" fill={palette.y} />
          <rect x="70" y="27" width="1" height="3" fill={palette.y} />
          <rect x="47" y="32" width="2" height="2" fill={palette.p} />
          <rect x="78" y="32" width="2" height="2" fill={palette.y} />
        </>
      ) : transit ? (
        <>
          <rect x="28" y="12" width="38" height="2" fill={palette.c} />
          <rect x="31" y="14" width="2" height="17" fill={palette.c} />
          <rect x="61" y="14" width="2" height="17" fill={palette.c} />
          <rect x="34" y="16" width="26" height="11" fill={palette.b} />
          <rect x="36" y="17" width="9" height="7" fill={palette.c} />
          <rect
            x="47"
            y="17"
            width="10"
            height="7"
            fill={palette.c}
            opacity=".55"
          />
          <rect x="57" y="23" width="34" height="10" fill={palette.y} />
          <rect x="60" y="20" width="26" height="3" fill={palette.y} />
          <rect x="61" y="23" width="7" height="4" fill={palette.n} />
          <rect x="70" y="23" width="7" height="4" fill={palette.n} />
          <rect x="79" y="23" width="9" height="4" fill={palette.n} />
          <rect x="60" y="31" width="5" height="4" fill={palette.n} />
          <rect x="81" y="31" width="5" height="4" fill={palette.n} />
          <rect x="89" y="29" width="2" height="2" fill={palette.w} />
        </>
      ) : (
        <>
          <rect x="39" y="10" width="38" height="21" fill={accent} />
          <rect x="37" y="8" width="42" height="3" fill={palette.w} />
          <rect
            x="68"
            y="11"
            width="9"
            height="20"
            fill={palette.b}
            opacity=".35"
          />
          <rect x="36" y="30" width="44" height="3" fill={palette.w} />
          {[44, 54, 64].flatMap((x) =>
            [14, 21].map((y) => (
              <g key={`${x}-${y}`}>
                <rect x={x} y={y} width="6" height="4" fill={palette.n} />
                <rect x={x} y={y} width="2" height="1" fill={palette.w} />
              </g>
            )),
          )}
          <rect x="54" y="26" width="7" height="6" fill={palette.n} />
          <rect x="59" y="28" width="1" height="1" fill={palette.y} />
          {kind === "health" || kind === "emergency" ? (
            <>
              <rect x="54" y="2" width="8" height="8" fill={palette.w} />
              <rect x="57" y="3" width="2" height="6" fill={palette.p} />
              <rect x="55" y="5" width="6" height="2" fill={palette.p} />
            </>
          ) : kind === "education" ? (
            <>
              <rect x="54" y="0" width="1" height="8" fill={palette.w} />
              <rect x="55" y="0" width="8" height="4" fill={palette.p} />
            </>
          ) : kind === "housing" ? (
            <>
              <rect x="41" y="5" width="34" height="3" fill={palette.p} />
              <rect x="46" y="2" width="24" height="3" fill={palette.p} />
            </>
          ) : (
            <>
              <rect x="48" y="5" width="20" height="3" fill={palette.y} />
              <rect x="53" y="3" width="10" height="2" fill={palette.y} />
            </>
          )}
        </>
      )}
      <PixelTree x={17} y={16} />
      <PixelTree x={96} y={19} pink />
      <rect x="12" y="31" width="2" height="2" fill={palette.g} />
      <rect x="107" y="32" width="2" height="2" fill={palette.g} />
      <rect x="85" y="30" width="2" height="2" fill={palette.w} />
      <rect x="84" y="32" width="4" height="3" fill={palette.p} />
      <rect x="84" y="35" width="1" height="2" fill={palette.n} />
      <rect x="87" y="35" width="1" height="2" fill={palette.n} />
      {complete && (
        <g transform="translate(105 14)">
          <rect x="0" y="0" width="9" height="7" fill={palette.g} />
          <rect x="2" y="3" width="2" height="2" fill={palette.n} />
          <rect x="4" y="2" width="2" height="2" fill={palette.n} />
          <rect x="6" y="1" width="1" height="2" fill={palette.n} />
        </g>
      )}
    </svg>
  );
}
