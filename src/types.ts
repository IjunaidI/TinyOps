export type Policy = "balanced" | "deadline" | "cold";
export type Mode = "shift" | "free" | "showcase" | "battle";
export type Phase = "welcome" | "playing" | "ended";
export type Selection = {
  type: "van" | "order" | "depot" | "incident";
  id: string;
} | null;
export type IncidentKind = "bridge" | "power" | "congestion";
export interface RoadNode {
  id: string;
  x: number;
  z: number;
}
export interface RoadEdge {
  id: string;
  a: string;
  b: string;
  kind?: "bridge" | "south" | "market";
}
export interface Place {
  id: string;
  name: string;
  node: string;
  x: number;
  z: number;
  kind: "depot" | "home" | "shop" | "cafe" | "market" | "clinic" | "warehouse";
  color?: string;
  rotation?: number;
}
export interface Order {
  id: string;
  source: string;
  destination: string;
  created: number;
  due: number;
  expiry: number;
  note: string;
  chilled: boolean;
  urgency: number;
  status: "queued" | "assigned" | "loaded" | "delivered" | "failed";
  vanId?: string;
  pinned: boolean;
  held?: boolean;
  interpretation: "pending" | "local" | "jev" | "review" | "manual";
  interpretedService?: string;
  onTime?: boolean;
  classifiedAt?: number;
  assignment?: { at: number; eta: number; pickup: number; reason: string };
}
export interface Van {
  id: string;
  name: string;
  chilled: boolean;
  home: string;
  node: string;
  x: number;
  z: number;
  prevX: number;
  prevZ: number;
  angle: number;
  state:
    | "idle"
    | "pickup"
    | "loading"
    | "delivering"
    | "unloading"
    | "returning"
    | "waiting";
  route: string[];
  edgeFrom?: string;
  edgeTo?: string;
  edgeProgress: number;
  orderId?: string;
  timer: number;
  rushUntil: number;
  carrying: boolean;
  target?: string;
}
export interface Incident {
  id: string;
  kind: IncidentKind;
  started: number;
  until: number;
  report: string;
}
export interface FeedItem {
  id: number;
  time: number;
  text: string;
  kind: "info" | "delivery" | "incident" | "ai";
}
export interface Pulse {
  x: number;
  z: number;
  started: number;
  kind: "delivery" | "incident";
  onTime?: boolean;
}
export interface RouteVisual {
  id: number;
  vanId: string;
  started: number;
  kind: "dispatch" | "reroute";
  points: [number, number][];
  previous?: [number, number][];
  pickupCount: number;
}
export interface GameState {
  generation: number;
  phase: Phase;
  mode: Mode;
  time: number;
  speed: 1 | 2;
  paused: boolean;
  score: number;
  delivered: number;
  onTime: number;
  failed: number;
  boosts: number;
  policy: Policy;
  policyLocked: boolean;
  policyRevision: number;
  auto: boolean;
  orders: Order[];
  vans: Van[];
  incidents: Incident[];
  feed: FeedItem[];
  pulses: Pulse[];
  routeVisuals: RouteVisual[];
  previewVan: string | null;
  incidentCameras: boolean;
  cameraInteraction: number;
  sceneMoment: string | null;
  selection: Selection;
  cinematic: boolean;
  follow: boolean;
  daylight: number | null;
  reduced: boolean;
  cameraFocus: { x: number; z: number; serial: number } | null;
  cameraHome: number;
  showcaseBeat: number;
  medal: string;
}
