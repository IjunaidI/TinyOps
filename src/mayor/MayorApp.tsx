import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Activity,
  Bell,
  Minus,
  Maximize2,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Building2,
  Check,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  Clock3,
  Coins,
  Download,
  Compass,
  FileText,
  Flag,
  GraduationCap,
  HandHeart,
  Heart,
  HeartPulse,
  HardHat,
  History,
  Landmark,
  Leaf,
  Mail,
  MapPin,
  MessageCircle,
  Moon,
  Pause,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sprout,
  Sun,
  Target,
  TrendingUp,
  Truck,
  Users,
  Upload,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { jev } from "../ai/jev";
import {
  city,
  startCity,
  tickCity,
  resolveRequest,
  clarifyRequest,
  buildProject,
  setDepartment,
  setTax,
  addBriefing,
  pauseCity,
  setSpeed,
  continueTerm,
  resetCity,
  getOpenRequests,
  getConstructionIssues,
  getConstructionProgress,
  estimateBudget,
} from "./engine";
import {
  mayorAI,
  updateMayorAI,
  resetMayorAI,
  stopMayorAI,
  retryMayorAI,
  setMayorMode,
} from "./controller";
import {
  REQUEST_CATALOG,
  requestById,
  PROJECTS,
  projectById,
  metricLabels,
  categoryLabels,
  mandateLabels,
  departmentLabels,
} from "./catalog";
import type {
  ActionResult,
  Category,
  CityRequest,
  DecisionRecord,
  Department,
  DistrictId,
  Effects,
  Mandate,
  MayorMode,
  Metric,
  RequestTemplate,
} from "./types";
import MayorScene from "./MayorScene";
import { locateCitySelection } from "./cityLocations";
import { getCityAlerts, type CityAlert } from "./cityAlerts";
import { AlertTray, CityAlertCenter } from "./CityAlertPanel";
import CitizenPortrait from "./CitizenPortrait";
import NeighborhoodVoices from "./NeighborhoodVoices";
import { getRequestVoice, type RequestVoice } from "./citizenReactions";
import { citizenEmotionLabels } from "./citizenIdentity";
import CitizenChat, { PetitionRow, PetitionTile } from "./CitizenChat";
import ConstructionDesk from "./ConstructionDesk";
import LivingCity, {
  DailyLivingBriefing,
  type LivingCitySelection,
} from "./LivingCityPanel";
import { PixelIcon, PixelProjectArt, type PixelIconKind } from "./PixelArt";
import {
  saveCity,
  loadCity,
  clearCitySave,
  exportCitySave,
  importCitySave,
} from "./storage";
import "./mayor.css";
import "./pixel-theme.css";
import "./pixel-pages.css";
import "./living-city.css";
import "./world-ui.css";
import "./world-inspector.css";

const money = (n: number) =>
  `${n < 0 ? "−" : ""}$${Math.round(Math.abs(n)).toLocaleString()}`;
const number = (n: number) => Math.round(n).toLocaleString();
const round = (n: number) => Math.round(n);
const dayLabel = (n: number) => String(Math.max(1, Math.floor(n + 1e-6)));
const daysLabel = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;
const metrics: Metric[] = [
  "happiness",
  "trust",
  "health",
  "safety",
  "environment",
  "mobility",
  "economy",
  "education",
];
const metricIcons = {
  happiness: Heart,
  trust: HandHeart,
  health: HeartPulse,
  safety: ShieldCheck,
  environment: Leaf,
  mobility: Truck,
  economy: TrendingUp,
  education: GraduationCap,
};
const categoryIcons = {
  housing: Building2,
  health: HeartPulse,
  transport: Truck,
  environment: Leaf,
  education: GraduationCap,
  safety: ShieldCheck,
  economy: TrendingUp,
  community: Users,
  authority: Landmark,
  emergency: Zap,
};
const modeNames: Record<MayorMode, string> = {
  manual: "You are mayor",
  local: "Local civic advisor",
  jev: "Jev is mayor",
};
const mandates: {
  id: Mandate;
  label: string;
  text: string;
  icon: typeof Heart;
}[] = [
  {
    id: "balanced",
    label: "A city for everyone",
    text: "Steady services. Fair choices. A healthy reserve.",
    icon: Compass,
  },
  {
    id: "people",
    label: "People come first",
    text: "Care, opportunity, and a happier neighborhood.",
    icon: Heart,
  },
  {
    id: "green",
    label: "A greener tomorrow",
    text: "Clean air, shared spaces, and better journeys.",
    icon: Sprout,
  },
  {
    id: "growth",
    label: "Room to thrive",
    text: "Local jobs, new homes, and a growing economy.",
    icon: TrendingUp,
  },
];
type Tab =
  | "city"
  | "life"
  | "requests"
  | "projects"
  | "budget"
  | "journal"
  | "chat"
  | "alerts"
  | "mayor";
type Modal = "connect" | "catalog" | "help" | "new" | "save" | null;
let checkedSavedCity = false;

function Dot({ color = "#79966b" }: { color?: string }) {
  return <i className="civic-dot" style={{ background: color }} />;
}
function Actor({ actor }: { actor: DecisionRecord["actor"] }) {
  return (
    <span className={`civic-actor actor-${actor}`}>
      {actor === "jev" ? (
        <Sparkles size={11} />
      ) : actor === "local" ? (
        <Settings2 size={11} />
      ) : (
        <Users size={11} />
      )}
      {actor === "jev"
        ? "Live Jev"
        : actor === "local"
          ? "Local advisor"
          : "You"}
    </span>
  );
}
function Meter({ value, color }: { value: number; color?: string }) {
  return (
    <div
      className="civic-meter"
      role="meter"
      aria-valuenow={round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <i
        style={{
          width: `${Math.max(0, Math.min(100, value))}%`,
          backgroundColor:
            color ??
            (value < 40 ? "#b77c72" : value < 60 ? "#baab79" : "#79966b"),
        }}
      />
    </div>
  );
}
function Pill({ children, kind = "" }: { children: ReactNode; kind?: string }) {
  return <span className={`civic-pill ${kind}`}>{children}</span>;
}

function decisionChoiceText(decision: DecisionRecord): string {
  const [action, target, option, detail] = decision.choice.split(":");
  switch (action) {
    case "staff":
      return detail === "remove"
        ? "Mobile team recalled for reassignment"
        : "Mobile team assigned to the neighborhood";
    case "shuttle":
      return option === "stop"
        ? "Neighborhood shuttle withdrawn"
        : "Neighborhood shuttle service started";
    case "pledge_service":
      return "A service restoration commitment was published";
    case "inspect":
      return "Inspection commissioned; results will follow";
    case "maintain":
      return "Preventive maintenance approved";
    case "repair":
      return "Repair funded and added to the crew schedule";
    case "traffic":
      return target === "transit"
        ? "Public transport given street priority"
        : target === "freight"
          ? "Freight given street priority"
          : "Balanced street priority adopted";
    case "contractor":
      return target === "quality"
        ? "Quality delivery standards selected"
        : target === "economy"
          ? "Economy delivery standards selected"
          : "Standard delivery standards selected";
    case "commit_project":
      return "Future funding authorized when the published conditions are met";
    case "crew":
      return target === "hire"
        ? "Temporary relief crew contracted"
        : "Construction queue priority updated";
    case "motion":
      return "A proposal was brought before the city council";
    case "withdraw":
      return "Unapproved council proposal withdrawn";
    case "amend":
      return option === "none"
        ? "Council proposal amendments removed"
        : option === "affordable"
          ? "Affordable housing conditions added"
          : option === "green"
            ? "Green building conditions added"
            : "Local employment conditions added";
    case "vote": {
      const motion = city.living.council.motions.find(
        (item) => item.id === target,
      );
      return motion?.status === "passed"
        ? "Council approved the proposal and authorized funding"
        : motion?.status === "rejected"
          ? "Council rejected the proposal; no funding was spent"
          : "Council vote recorded";
    }
    case "promise":
      return target === "renegotiate"
        ? "Commitment deadline publicly renegotiated"
        : "Commitment progress reviewed and published";
    default:
      return decision.choice;
  }
}

export default function MayorApp() {
  const [, render] = useState(0);
  const redraw = () => render((n) => n + 1);
  const [tab, setTab] = useState<Tab>("city");
  const [modal, setModal] = useState<Modal>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedPetition, setSelectedPetition] = useState<string | null>(null);
  const [district, setDistrict] = useState<DistrictId | null>(null);
  const [centerFocus, setCenterFocus] = useState(false);
  const [mapFocusKey, setMapFocusKey] = useState(0);
  const [focusPoint, setFocusPoint] = useState<[number, number] | null>(null);
  const [zoomStep, setZoomStep] = useState(0);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [lifeSelection, setLifeSelection] = useState<LivingCitySelection>();
  const [mapOverlay, setMapOverlay] = useState<
    "none" | "traffic" | "services" | "infrastructure"
  >("none");
  const [mandate, setMandate] = useState<Mandate>("balanced");
  const [evening, setEvening] = useState(false);
  const [brief, setBrief] = useState("");
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pendingStart, setPendingStart] = useState(false);
  const [catalogFilter, setCatalogFilter] = useState<Category | "all">("all");
  const [search, setSearch] = useState("");
  const [requestFilter, setRequestFilter] = useState<
    "open" | "resolved" | "all"
  >("open");
  const [showResult, setShowResult] = useState(true);
  const [saveError, setSaveError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  function persist() {
    if (city.phase === "lobby") return;
    const result = saveCity();
    setSaveError(
      result.ok
        ? ""
        : result.error || "Autosave is unavailable in this browser.",
    );
  }
  function exportSave() {
    const blob = new Blob([exportCitySave()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `jevtown-riverside-term-${city.term}-day-${dayLabel(city.day)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    inform("City save downloaded. Your API key is never included.");
  }
  async function importSave(file?: File) {
    if (!file) return;
    if (file.size > 1_000_000) {
      inform("This save is too large. Choose a Jevtown city save under 1 MB.");
      return;
    }
    try {
      const result = importCitySave(await file.text());
      if (result.ok) {
        resetMayorAI();
        setModal(null);
        setSelected(null);
        setTab("city");
        homeMap();
        setLifeSelection(undefined);
        setSelectedPetition(null);
        setShowResult(true);
        persist();
        inform("Your city is restored and paused. Resume when you’re ready.");
      } else inform(result.error || "This city save could not be loaded.");
      redraw();
    } catch {
      inform("This file could not be read. Choose a Jevtown city save.");
    }
  }
  function inform(text: string) {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 5000);
  }
  function act(result: ActionResult, success: string) {
    inform(result.ok ? success : result.error || "This action is unavailable.");
    redraw();
    return result.ok;
  }
  useEffect(() => {
    if (!checkedSavedCity) {
      checkedSavedCity = true;
      if (city.phase === "lobby") {
        const restored = loadCity();
        if (!restored.ok)
          setSaveError(
            restored.error || "The saved city could not be restored.",
          );
        else if (restored.found)
          inform("Welcome back. Your city is restored and paused.");
      }
    }
    resetMayorAI();
    let frame = 0,
      last = performance.now(),
      hud = 0,
      saveElapsed = 0;
    const run = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      tickCity(dt);
      updateMayorAI();
      saveElapsed += dt;
      if (saveElapsed >= 2) {
        saveElapsed = 0;
        persist();
      }
      hud += dt;
      if (hud >= 0.15) {
        hud = 0;
        redraw();
      }
      frame = requestAnimationFrame(run);
    };
    frame = requestAnimationFrame(run);
    const visibility = () => {
      if (document.hidden && city.phase === "playing") pauseCity(true);
      if (document.hidden) persist();
      last = performance.now();
    };
    const keyboard = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModal(null);
        setSelected(null);
        setTab("city");
        setSelectedAlertId(null);
        return;
      }
      if ((e.target as HTMLElement).closest("input,textarea,select,button"))
        return;
      if (e.code === "Space" && city.phase === "playing") {
        e.preventDefault();
        pauseCity(!city.paused);
        redraw();
      }
    };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("keydown", keyboard);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("keydown", keyboard);
      if (city.phase === "playing") pauseCity(true);
      persist();
      stopMayorAI();
    };
  }, []);
  function launch(mode: MayorMode) {
    if (mode === "jev" && (!jev.connected || jev.error)) {
      setPendingStart(true);
      setModal("connect");
      return;
    }
    startCity(mode, mandate, Math.floor(Math.random() * 1000000));
    resetMayorAI();
    persist();
    setTab("city");
    setModal(null);
    setSelected(null);
    homeMap();
    setLifeSelection(undefined);
    setSelectedPetition(null);
    setShowResult(true);
    redraw();
  }
  function changeMode(mode: MayorMode) {
    if (mode === "jev" && (!jev.connected || jev.error)) {
      pauseCity(true);
      setPendingStart(false);
      setModal("connect");
      return;
    }
    setMayorMode(mode);
    if (mode !== "jev" && city.paused) pauseCity(false);
    inform(modeNames[mode]);
    redraw();
  }
  function submitBrief(e: FormEvent) {
    e.preventDefault();
    if (act(addBriefing(brief), "Your briefing is on the mayor’s desk."))
      setBrief("");
  }
  const open = getOpenRequests();
  const pendingPetitions = city.petitions.filter((p) => p.status === "pending");
  const inboxCount = open.length + pendingPetitions.length;
  const answeredCount =
    city.resolved + city.petitions.filter((p) => p.status !== "pending").length;
  const visiblePetitions = city.petitions
    .filter(
      (p) =>
        (requestFilter === "all" ||
          (requestFilter === "open"
            ? p.status === "pending"
            : p.status !== "pending")) &&
        `${p.text} ${p.response?.text ?? ""} your request`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .slice()
    .reverse();
  function openPetition(id: string | null = null) {
    setSelected(null);
    setSelectedPetition(id);
    setTab("chat");
  }
  function openCityLife(selection: LivingCitySelection) {
    setSelected(null);
    setLifeSelection(selection);
    setTab("life");
  }
  function navigate(next: Tab) {
    setSelected(null);
    setSelectedAlertId(null);
    setTab(next === tab ? "city" : next);
  }
  function homeMap() {
    setDistrict(null);
    setCenterFocus(false);
    setFocusPoint(null);
    setSelectedAlertId(null);
    setMapFocusKey((n) => n + 1);
  }
  function focusDistrict(id: DistrictId | null) {
    setDistrict(id);
    setCenterFocus(false);
    setFocusPoint(null);
    setSelectedAlertId(null);
    setMapFocusKey((n) => n + 1);
  }
  function openAlert(alert: CityAlert) {
    setSelected(null);
    setSelectedAlertId(alert.id);
    setDistrict(alert.districtId ?? null);
    setCenterFocus(false);
    setFocusPoint(alert.position ?? null);
    setMapFocusKey((n) => n + 1);
    if (alert.target.kind === "request") {
      setTab("requests");
      setSelected(alert.target.id ?? null);
    } else if (alert.target.kind === "petition") {
      openPetition(alert.target.id);
    } else if (alert.target.kind === "budget") setTab("budget");
    else
      openCityLife({
        section: alert.target.section ?? "services",
        id: alert.target.id,
        districtId: alert.target.districtId,
      });
  }
  function locateLife(selection: LivingCitySelection) {
    const alert = alerts.find(
      (a) =>
        a.target.id === selection.id && a.target.section === selection.section,
    );
    const location = locateCitySelection(city, selection);
    setDistrict(location.districtId ?? null);
    setCenterFocus(false);
    setFocusPoint(location.position ?? alert?.position ?? null);
    setMapFocusKey((n) => n + 1);
    setSelectedAlertId(alert?.id ?? null);
    setSelected(null);
    setTab("city");
  }
  const selectedRequest = city.requests.find((r) => r.id === selected);
  const termDay = ((city.day - 1) % city.termDays) + 1;
  const budget = estimateBudget();
  const isLobby = city.phase === "lobby";
  const building = city.projects.filter((p) => p.status === "building");
  const urgent = open.filter(
    (r) => requestById[r.templateId]?.priority === "urgent",
  ).length;
  const latest = city.decisions[0];
  const disabled = city.phase !== "playing" || city.paused;
  const alerts = getCityAlerts(city);
  const inspectorOpen = tab !== "city" || !!selectedRequest;
  const panelNames: Record<Tab, string> = {
    city: "City",
    life: "City life",
    requests: "The inbox",
    projects: "Build & improve",
    budget: "Budget & services",
    journal: "City journal",
    chat: "Ask Mayor Jev",
    alerts: "City alerts",
    mayor: "City Hall",
  };
  return (
    <main
      className={`mayor-app ${isLobby ? "mayor-lobby" : "mayor-world-ui"} ${inspectorOpen ? "has-inspector" : ""}`}
    >
      <header className="civic-header">
        <button
          className="civic-brand"
          onClick={() => {
            setTab("city");
            setSelected(null);
            homeMap();
          }}
          aria-label="Jevtown City Hall"
        >
          <span className="civic-logo">
            <PixelIcon kind="city" size={30} />
          </span>
          <b>
            jevtown<span>.</span>
          </b>
          <span className="civic-edition">CITY SIMULATOR</span>
        </button>
        {!isLobby && (
          <div className="civic-term">
            <span>TERM {city.term.toString().padStart(2, "0")}</span>
            <strong>
              Day {city.day}
              <small> / {city.term * city.termDays}</small>
            </strong>
            <i>
              <b
                style={{
                  width: `${((termDay - 1 + city.dayProgress) / city.termDays) * 100}%`,
                }}
              />
            </i>
          </div>
        )}
        <div className="civic-header-actions">
          {!isLobby && (
            <div className="civic-clock-controls">
              <button
                aria-label={city.paused ? "Resume city" : "Pause city"}
                title="Space to pause or resume"
                disabled={city.phase !== "playing" || !!city.issue}
                onClick={() => {
                  pauseCity(!city.paused);
                  redraw();
                }}
              >
                {city.paused ? <Play size={14} /> : <Pause size={14} />}
              </button>
              {([1, 2, 4] as const).map((s) => (
                <button
                  key={s}
                  className={city.speed === s ? "active" : ""}
                  disabled={
                    city.phase !== "playing" || (city.mode === "jev" && s !== 1)
                  }
                  title={
                    city.mode === "jev" && s !== 1
                      ? "Live Jev runs at 1× so network delays do not rush its decisions"
                      : `${s}× city speed`
                  }
                  onClick={() => {
                    setSpeed(s);
                    redraw();
                  }}
                >
                  {s}×
                </button>
              ))}
            </div>
          )}
          <button
            className="civic-icon"
            title={evening ? "Day view" : "Evening view"}
            aria-label={evening ? "Day view" : "Evening view"}
            onClick={() => setEvening(!evening)}
          >
            {evening ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button
            className="civic-icon"
            title="Save & restore city"
            aria-label="Save & restore city"
            onClick={() => setModal("save")}
          >
            <Download size={16} />
          </button>
          <button
            className="civic-icon"
            title="Mayor’s handbook"
            aria-label="Mayor’s handbook"
            onClick={() => setModal("help")}
          >
            <CircleHelp size={17} />
          </button>
          {!isLobby && (
            <button
              className="civic-chat-link"
              aria-label="Ask Mayor Jev"
              onClick={() => openPetition()}
            >
              <MessageCircle size={15} />
              <span>Ask Jev</span>
              <ArrowUpRight size={13} />
            </button>
          )}
        </div>
      </header>

      {isLobby ? (
        <>
          <div className="civic-lobby-world">
            <MayorScene evening={evening} />
          </div>
          <section className="civic-welcome">
            <div className="civic-eyebrow">
              <Dot /> WELCOME TO RIVERSIDE
            </div>
            <h1>
              A little city.
              <br />A thousand
              <br />
              <em>possibilities.</em>
            </h1>
            <p>
              Every letter is a life in your city.
              <br />
              Build a place where people want to stay.
            </p>
            <div className="civic-mandate-label">
              WHAT WILL YOUR CITY STAND FOR?
            </div>
            <div className="civic-mandates">
              {mandates.map((m) => (
                <button
                  key={m.id}
                  className={mandate === m.id ? "selected" : ""}
                  onClick={() => setMandate(m.id)}
                >
                  <m.icon size={18} />
                  <span>
                    <b>{m.label}</b>
                    <small>{m.text}</small>
                  </span>
                  {mandate === m.id && <Check size={14} />}
                </button>
              ))}
            </div>
            <button
              className="civic-primary civic-start"
              onClick={() => launch("jev")}
            >
              <Sparkles size={17} /> Let Jev run the city{" "}
              <ArrowRight size={18} />
            </button>
            <div className="civic-start-secondary">
              <button onClick={() => launch("manual")}>
                I’ll be mayor <ArrowUpRight size={13} />
              </button>
              <span />
              <button onClick={() => launch("local")}>
                Try the local advisor <ArrowUpRight size={13} />
              </button>
            </div>
            <div className="civic-lobby-facts">
              <span>
                <b>{REQUEST_CATALOG.length}</b> DIFFERENT REQUESTS
              </span>
              <span>
                <b>04</b> NEIGHBORHOODS
              </span>
              <span>
                <b>30</b> DAYS PER TERM
              </span>
            </div>
          </section>
          <aside className="civic-lobby-note">
            <span className="civic-eyebrow">A CITY WITH SOMETHING TO SAY</span>
            <Mail size={21} />
            <p>
              “The library closes before my shift ends. Could we keep it open a
              little longer?”
            </p>
            <small>One letter. A real trade-off. Your call.</small>
            <button onClick={() => setModal("catalog")}>
              Explore the request catalog <ArrowRight size={14} />
            </button>
          </aside>
          <div className="civic-lobby-bottom">
            <span>
              <Dot /> A living city · Connected stories · Real consequences
            </span>
            <button onClick={() => setModal("save")}>
              <Upload size={12} /> Import a saved city
            </button>
          </div>
        </>
      ) : (
        <>
          <section className="world-resource-bar" aria-label="City statistics">
            <button
              onClick={() => openCityLife({ section: "residents" })}
              title="Citizen happiness"
            >
              <Heart size={16} />
              <span>
                <small>Happiness</small>
                <b>
                  {round(city.metrics.happiness)}
                  <em>%</em>
                </b>
              </span>
            </button>
            <button onClick={() => navigate("budget")} title="Open city budget">
              <Wallet size={16} />
              <span>
                <small>Treasury</small>
                <b>{money(city.treasury)}</b>
              </span>
              <em className={budget.net < 0 ? "negative" : "positive"}>
                {budget.net >= 0 ? "+" : ""}
                {money(budget.net)}/day
              </em>
            </button>
            <button
              onClick={() => openCityLife({ section: "residents" })}
              title="Meet your residents"
            >
              <Users size={16} />
              <span>
                <small>Population</small>
                <b>{number(city.population)}</b>
              </span>
            </button>
            <button
              onClick={() => openCityLife({ section: "promises" })}
              title="Public trust and commitments"
            >
              <HandHeart size={16} />
              <span>
                <small>Trust</small>
                <b>
                  {round(city.metrics.trust)}
                  <em>%</em>
                </b>
              </span>
            </button>
          </section>
          <nav className="civic-nav" aria-label="City management">
            <div>
              {(
                [
                  {
                    id: "city",
                    name: "City overview",
                    short: "City",
                    icon: "city",
                  },
                  {
                    id: "requests",
                    name: "The inbox",
                    short: "Inbox",
                    icon: "inbox",
                  },
                  {
                    id: "life",
                    name: "City life",
                    short: "Life",
                    icon: "people",
                  },
                  {
                    id: "projects",
                    name: "Build & improve",
                    short: "Build",
                    icon: "build",
                  },
                  {
                    id: "budget",
                    name: "Budget & services",
                    short: "Budget",
                    icon: "budget",
                  },
                  {
                    id: "journal",
                    name: "City journal",
                    short: "Journal",
                    icon: "journal",
                  },
                  { id: "chat", name: "Ask Jev", short: "Jev", icon: "chat" },
                  {
                    id: "mayor",
                    name: "City Hall",
                    short: "Mayor",
                    icon: "star",
                  },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  className={tab === t.id ? "selected" : ""}
                  onClick={() => navigate(t.id)}
                  aria-label={t.name}
                  aria-pressed={tab === t.id}
                  title={t.name}
                >
                  <PixelIcon kind={t.icon} size={22} />
                  <span className="civic-nav-label">{t.name}</span>
                  <span className="civic-nav-short" aria-hidden="true">
                    {t.short}
                  </span>
                  {t.id === "requests" && inboxCount > 0 && <b>{inboxCount}</b>}
                </button>
              ))}
            </div>
            <div className="civic-nav-right">
              <button
                className="civic-catalog-link"
                onClick={() => setModal("catalog")}
              >
                <BookOpen size={13} /> Catalog
              </button>
              <span className={`civic-state ${city.paused ? "paused" : ""}`}>
                <Dot color={city.paused ? "#baab79" : undefined} />
                {city.phase === "ended"
                  ? "Term complete"
                  : city.issue
                    ? "Needs attention"
                    : city.paused
                      ? "City paused"
                      : "City is living"}
              </span>
            </div>
          </nav>
          <div className="civic-workspace world-workspace">
            <div className="world-stage" aria-label="Interactive city map">
              <MayorScene
                focus={district}
                focusKey={mapFocusKey}
                evening={evening}
                centerFocus={centerFocus}
                focusPoint={focusPoint}
                zoomStep={zoomStep}
                overlay={mapOverlay}
                alerts={alerts}
                selectedAlertId={selectedAlertId}
                onSelectAlert={openAlert}
                onOpenRequest={(id) => {
                  setSelected(id);
                  setTab("requests");
                }}
                onOpenCityLife={openCityLife}
              />
              <div className="world-location">
                <span className="civic-eyebrow">
                  RIVERSIDE · YOUR LIVING CITY
                </span>
                <label>
                  <MapPin size={16} />
                  <select
                    aria-label="Focus neighborhood"
                    value={centerFocus ? "center" : (district ?? "all")}
                    onChange={(e) => {
                      if (e.target.value === "center") {
                        setDistrict(null);
                        setCenterFocus(true);
                        setFocusPoint(null);
                        setMapFocusKey((n) => n + 1);
                      } else
                        focusDistrict(
                          e.target.value === "all"
                            ? null
                            : (e.target.value as DistrictId),
                        );
                    }}
                  >
                    <option value="all">The whole city</option>
                    <option value="center">Central roundabout</option>
                    {city.districts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </label>
                <span className="world-location-note">
                  {district
                    ? city.districts.find((d) => d.id === district)?.description
                    : "Every little decision changes this place."}
                </span>
              </div>
              {city.issue && (
                <button
                  className="world-connection"
                  onClick={() => {
                    setPendingStart(false);
                    setModal("connect");
                  }}
                >
                  <Radio size={13} /> Jev offline · Reconnect{" "}
                  <ChevronRight size={13} />
                </button>
              )}
              <AlertTray
                alerts={alerts}
                generation={city.generation}
                onOpen={openAlert}
                onBrowse={() => navigate("alerts")}
              />
              <div className="world-map-tools" aria-label="Map controls">
                <label title="Map layer">
                  <span>Map layer</span>
                  <select
                    aria-label="City map overlay"
                    value={mapOverlay}
                    onChange={(e) =>
                      setMapOverlay(e.target.value as typeof mapOverlay)
                    }
                  >
                    <option value="none">Everyday life</option>
                    <option value="traffic">Traffic</option>
                    <option value="services">Services</option>
                    <option value="infrastructure">Infrastructure</option>
                  </select>
                </label>
                <button
                  aria-label="Zoom in"
                  title="Zoom in"
                  onClick={() => setZoomStep((n) => n + 1)}
                >
                  <Plus size={17} />
                </button>
                <button
                  aria-label="Zoom out"
                  title="Zoom out"
                  onClick={() => setZoomStep((n) => n - 1)}
                >
                  <Minus size={17} />
                </button>
                <button
                  aria-label="Whole city"
                  title="Whole city"
                  onClick={homeMap}
                >
                  <Maximize2 size={16} />
                </button>
                <button
                  aria-label="Central roundabout"
                  title="Central roundabout"
                  aria-pressed={centerFocus}
                  onClick={() => {
                    setDistrict(null);
                    setFocusPoint(null);
                    setCenterFocus(true);
                    setMapFocusKey((n) => n + 1);
                  }}
                >
                  <Target size={17} />
                </button>
              </div>
              <div className="world-bottom-note">
                <NeighborhoodVoices
                  state={city}
                  onSelect={openCityLife}
                  inspectorOpen={inspectorOpen}
                />
                <button
                  className="world-mayor-peek"
                  onClick={() => navigate("mayor")}
                >
                  <span
                    className={`civic-ai-orb ${mayorAI.busy ? "thinking" : ""}`}
                  >
                    <PixelIcon kind="star" size={22} />
                  </span>
                  <span>
                    <b>
                      {city.mode === "jev"
                        ? "Mayor Jev"
                        : city.mode === "local"
                          ? "Local advisor"
                          : "You are mayor"}
                    </b>
                    <small>
                      {city.issue
                        ? "Connection needs attention"
                        : city.paused
                          ? "City paused · ready when you are"
                          : mayorAI.busy
                            ? "Considering the next decision…"
                            : mayorAI.priority}
                    </small>
                  </span>
                  <ChevronRight size={15} />
                </button>
                <span className="world-gesture-hint">
                  Drag to explore · Scroll to zoom · Select a pin
                </span>
              </div>
            </div>
            {inspectorOpen && (
              <aside className="world-inspector" aria-label="City inspector">
                <header className="world-inspector-heading">
                  <div>
                    <span className="civic-eyebrow">CITY MANAGEMENT</span>
                    <h2>
                      {selectedRequest ? "Citizen letter" : panelNames[tab]}
                    </h2>
                  </div>
                  <button
                    className="civic-icon"
                    aria-label="Close inspector"
                    title="Close · Esc"
                    onClick={() => {
                      setTab("city");
                      setSelected(null);
                      setSelectedAlertId(null);
                    }}
                  >
                    <X size={19} />
                  </button>
                </header>
                <div className="world-inspector-body">
                  {selectedRequest ? (
                    <RequestDetail
                      inline
                      request={selectedRequest}
                      onClose={() => setSelected(null)}
                      onAction={act}
                      redraw={redraw}
                      onOpenResident={(id) =>
                        openCityLife({
                          section: "residents",
                          id,
                          districtId: city.living.citizens.find(
                            (person) => person.id === id,
                          )?.districtId,
                        })
                      }
                    />
                  ) : (
                    <>
                      {tab === "alerts" && (
                        <CityAlertCenter
                          alerts={alerts}
                          onOpen={openAlert}
                          selectedId={selectedAlertId}
                        />
                      )}
                      {tab === "mayor" && (
                        <>
                          <aside className="civic-cabinet civic-paper">
                            {" "}
                            {city.issue && (
                              <div className="civic-issue" role="alert">
                                <Radio size={17} />
                                <span>
                                  <b>Jev needs a connection.</b> {city.issue}
                                </span>
                                <button
                                  onClick={() => {
                                    retryMayorAI();
                                    redraw();
                                  }}
                                >
                                  Retry Jev
                                </button>
                                <button
                                  onClick={() => {
                                    setPendingStart(false);
                                    setModal("connect");
                                  }}
                                >
                                  Reconnect
                                </button>
                                <button onClick={() => changeMode("local")}>
                                  Use local advisor
                                </button>
                              </div>
                            )}
                            <div className="civic-mayor-status">
                              <span
                                className={`civic-ai-orb ${mayorAI.busy ? "thinking" : ""}`}
                              >
                                <PixelIcon kind="star" size={30} />
                              </span>
                              <div>
                                <span className="civic-eyebrow">
                                  CITY COMMANDER
                                </span>
                                <select
                                  aria-label="Who runs the city"
                                  value={city.mode}
                                  onChange={(e) =>
                                    changeMode(e.target.value as MayorMode)
                                  }
                                >
                                  <option value="jev">Jev is mayor</option>
                                  <option value="local">
                                    Local civic advisor
                                  </option>
                                  <option value="manual">You are mayor</option>
                                </select>
                                <small>
                                  <Dot
                                    color={
                                      city.mode === "jev"
                                        ? "#75a6b1"
                                        : "#baab79"
                                    }
                                  />
                                  {city.mode === "jev"
                                    ? mayorAI.busy
                                      ? "Considering the next decision…"
                                      : city.paused
                                        ? "Waiting for the city to resume"
                                        : "Listening. Deciding. Governing."
                                    : city.mode === "local"
                                      ? "Local rules · no model requests"
                                      : "Every decision is yours"}
                                </small>
                              </div>
                            </div>
                            {city.mode !== "manual" && (
                              <div
                                className="civic-mayor-activity"
                                role="status"
                              >
                                <span>
                                  <Dot /> {mayorAI.priority}
                                </span>
                                <p>{mayorAI.lastAction}</p>
                                {!mayorAI.busy && (
                                  <small>{mayorAI.lastReason}</small>
                                )}
                                {city.mode === "jev" && (
                                  <div className="civic-ai-meta">
                                    <span>
                                      {mayorAI.liveDecisions} live choices made
                                    </span>
                                    <span>
                                      {jev.attempts} / {jev.requestCap} requests
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                            <div className="civic-latest-decision">
                              <span className="civic-eyebrow">LATEST MOVE</span>
                              {latest ? (
                                <>
                                  <h3>{latest.title}</h3>
                                  <p>{decisionChoiceText(latest)}</p>
                                  <small>{latest.rationale}</small>
                                  <div>
                                    <Actor actor={latest.actor} />
                                    <span>Day {dayLabel(latest.day)}</span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <h3>A new chapter begins.</h3>
                                  <p>The first requests are on the desk.</p>
                                  <small>
                                    {city.mode === "manual"
                                      ? "Open a letter to make your first decision."
                                      : "Your mayor will work through the inbox, then plan the city’s next investment."}
                                  </small>
                                </>
                              )}
                            </div>
                            <div className="civic-service-pulse">
                              <div>
                                <span className="civic-eyebrow">
                                  CITY VITALS
                                </span>
                                <Activity size={14} />
                              </div>
                              {metrics
                                .filter(
                                  (m) => m !== "happiness" && m !== "trust",
                                )
                                .map((m) => {
                                  const Icon = metricIcons[m];
                                  return (
                                    <div className="civic-pulse-row" key={m}>
                                      <Icon size={13} />
                                      <span>{metricLabels[m]}</span>
                                      <Meter value={city.metrics[m]} />
                                      <b>{round(city.metrics[m])}</b>
                                    </div>
                                  );
                                })}
                            </div>
                            <form
                              className="civic-brief"
                              onSubmit={submitBrief}
                            >
                              <label htmlFor="mayor-brief">
                                <MessageCircle size={15} /> Set the direction
                              </label>
                              <p>Give Jev a priority for its next decisions.</p>
                              <textarea
                                id="mayor-brief"
                                placeholder="Protect clinic funding. Keep at least $4,000 in reserve…"
                                maxLength={500}
                                value={brief}
                                onChange={(e) => setBrief(e.target.value)}
                              />
                              <div>
                                <span>{brief.length}/500</span>
                                <button
                                  disabled={disabled || !brief.trim()}
                                  type="submit"
                                >
                                  Send briefing <Send size={13} />
                                </button>
                              </div>
                              {city.briefings.length > 0 && (
                                <small className="civic-last-brief">
                                  Latest: “
                                  {
                                    city.briefings[city.briefings.length - 1]
                                      ?.text
                                  }
                                  ”
                                </small>
                              )}
                            </form>
                          </aside>
                          <DailyLivingBriefing onOpen={openCityLife} />
                          <button
                            className="civic-secondary world-catalog-button"
                            onClick={() => setModal("catalog")}
                          >
                            <BookOpen size={15} /> Browse the request catalog
                          </button>
                        </>
                      )}
                      {tab === "life" && (
                        <LivingCity
                          compact
                          onLocate={locateLife}
                          selection={lifeSelection}
                          onSelectionChange={setLifeSelection}
                          onAction={act}
                          onResume={() => {
                            act(pauseCity(false), "City resumed.");
                          }}
                        />
                      )}

                      {tab === "requests" && (
                        <section className="civic-page">
                          <PageHeading
                            eyebrow="LETTERS TO CITY HALL"
                            title="Every voice matters."
                            text="Your messages to Jev appear here alongside letters from citizens and public authorities."
                            action={
                              <button
                                className="civic-secondary"
                                onClick={() => openPetition()}
                              >
                                <MessageCircle size={15} /> Write to Mayor Jev
                              </button>
                            }
                          />
                          <div className="civic-filter-bar">
                            <div className="civic-segments">
                              {(["open", "resolved", "all"] as const).map(
                                (f) => (
                                  <button
                                    key={f}
                                    className={
                                      requestFilter === f ? "selected" : ""
                                    }
                                    onClick={() => setRequestFilter(f)}
                                  >
                                    {f === "open"
                                      ? `On the desk · ${inboxCount}`
                                      : f === "resolved"
                                        ? "Decisions made"
                                        : "All correspondence"}
                                  </button>
                                ),
                              )}
                            </div>
                            <label className="civic-search">
                              <Search size={15} />
                              <input
                                placeholder="Search people, places, requests…"
                                aria-label="Search city requests"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                              />
                            </label>
                          </div>
                          <div className="civic-request-grid">
                            {visiblePetitions.map((p) => (
                              <PetitionTile
                                key={p.id}
                                petition={p}
                                onClick={() => openPetition(p.id)}
                              />
                            ))}
                            {city.requests
                              .filter(
                                (r) =>
                                  requestFilter === "all" ||
                                  (requestFilter === "open"
                                    ? r.status === "open"
                                    : r.status !== "open"),
                              )
                              .filter((r) =>
                                `${requestById[r.templateId].title} ${requestById[r.templateId].sender} ${requestById[r.templateId].text}`
                                  .toLowerCase()
                                  .includes(search.toLowerCase()),
                              )
                              .slice()
                              .sort((a, b) =>
                                requestFilter === "open"
                                  ? a.dueDay - b.dueDay
                                  : b.arrivedDay - a.arrivedDay,
                              )
                              .map((r) => (
                                <RequestTile
                                  key={r.id}
                                  request={r}
                                  onClick={() => setSelected(r.id)}
                                />
                              ))}
                          </div>
                          {city.requests.filter(
                            (r) =>
                              requestFilter === "all" ||
                              (requestFilter === "open"
                                ? r.status === "open"
                                : r.status !== "open"),
                          ).length === 0 &&
                            visiblePetitions.length === 0 && (
                              <div className="civic-empty civic-empty-wide">
                                <Mail size={32} />
                                <h3>
                                  {requestFilter === "open"
                                    ? "All caught up."
                                    : "The story is still being written."}
                                </h3>
                                <p>
                                  New requests arrive as the city’s days pass.
                                </p>
                              </div>
                            )}
                        </section>
                      )}
                      {tab === "chat" && (
                        <CitizenChat
                          selectedId={selectedPetition}
                          onChange={() => {
                            persist();
                            redraw();
                          }}
                          onInbox={() => setTab("requests")}
                          onConnect={() => {
                            if (jev.connected && !jev.error) changeMode("jev");
                            else {
                              setPendingStart(false);
                              setModal("connect");
                            }
                          }}
                        />
                      )}
                      {tab === "projects" && (
                        <section className="civic-page">
                          <PageHeading
                            eyebrow="MAKE GOOD THINGS PERMANENT"
                            title="A city worth building."
                            text="Manage active sites, resolve construction problems, and invest in what comes next. Benefits and upkeep begin when a project opens."
                            action={
                              <span className="civic-budget-badge">
                                <Wallet size={16} /> {money(city.treasury)}{" "}
                                available
                              </span>
                            }
                          />
                          <ConstructionDesk onOpenRequest={setSelected} />
                          <div className="civic-project-grid">
                            {PROJECTS.map((p) => {
                              const project = city.projects.find(
                                (x) => x.definitionId === p.id,
                              );
                              const Icon = categoryIcons[p.category];
                              const d = city.districts.find(
                                (x) => x.id === p.district,
                              );
                              return (
                                <article
                                  className={`civic-project-card ${project?.status || ""}`}
                                  key={p.id}
                                >
                                  <div
                                    className={`civic-project-art art-${p.category}`}
                                  >
                                    <ProjectDrawing
                                      category={p.category}
                                      complete={project?.status === "complete"}
                                    />
                                    <span>
                                      <Icon size={14} />
                                      {categoryLabels[p.category]}
                                    </span>
                                    {project && (
                                      <b>
                                        {project.status === "complete" ? (
                                          <>
                                            <Check size={12} /> OPEN TO THE CITY
                                          </>
                                        ) : (
                                          <>
                                            <Clock3 size={12} /> UNDER
                                            CONSTRUCTION
                                          </>
                                        )}
                                      </b>
                                    )}
                                  </div>
                                  <div className="civic-project-body">
                                    <span className="civic-eyebrow">
                                      <MapPin size={11} />
                                      {d?.name}
                                    </span>
                                    <h3>{p.name}</h3>
                                    <p>{p.description}</p>
                                    <EffectChips effects={p.effects} />
                                    <div className="civic-project-finance">
                                      <span>
                                        <b>{money(p.cost)}</b>{" "}
                                        {project?.inherited
                                          ? "previously funded"
                                          : "investment"}
                                      </span>
                                      <span>
                                        {money(p.upkeep)} / day upkeep
                                      </span>
                                    </div>
                                    {project ? (
                                      <div className="civic-project-progress">
                                        <span>
                                          {project.status === "complete"
                                            ? `Serving residents since day ${dayLabel(project.completesDay)}`
                                            : `Opens on day ${dayLabel(project.completesDay)} · ${daysLabel(Math.max(0, Math.ceil(project.completesDay - city.day - city.dayProgress)))} left`}
                                        </span>
                                        <Meter
                                          value={
                                            getConstructionProgress(project) *
                                            100
                                          }
                                        />
                                      </div>
                                    ) : (
                                      <button
                                        className="civic-secondary"
                                        disabled={
                                          disabled || city.treasury < p.cost
                                        }
                                        onClick={() =>
                                          act(
                                            buildProject(p.id, {
                                              actor: "you",
                                              rationale:
                                                "A direct investment approved by you.",
                                            }),
                                            `${p.name} is under construction.`,
                                          )
                                        }
                                      >
                                        <Plus size={14} />
                                        {city.treasury < p.cost
                                          ? "Needs more funding"
                                          : "Approve project"}
                                        <small>
                                          Base: {p.duration} workdays
                                        </small>
                                      </button>
                                    )}
                                  </div>
                                </article>
                              );
                            })}
                          </div>
                        </section>
                      )}
                      {tab === "budget" && (
                        <section className="civic-page">
                          <PageHeading
                            eyebrow="GOOD INTENTIONS NEED A BUDGET"
                            title="Keep the city in balance."
                            text="Taxes fund the day-to-day. Service levels change both spending and the city’s health at each new day."
                          />
                          <div className="civic-budget-layout">
                            <div className="civic-budget-ledger civic-paper">
                              <div className="civic-eyebrow">
                                THE CITY’S ACCOUNTS
                              </div>
                              <h2>{money(city.treasury)}</h2>
                              <p>Current treasury</p>
                              <div className="civic-budget-line">
                                <span>Estimated daily revenue</span>
                                <b className="positive">
                                  +{money(budget.revenue)}
                                </b>
                              </div>
                              <div className="civic-budget-line">
                                <span>Daily operations & services</span>
                                <b>−{money(budget.expenses)}</b>
                              </div>
                              <div
                                className="living-budget-components"
                                aria-label="Daily spending breakdown"
                              >
                                <div className="civic-budget-line">
                                  <span>City administration</span>
                                  <b>
                                    {money(
                                      budget.expenses -
                                        budget.departmentExpenses -
                                        budget.projectUpkeep -
                                        budget.livingExpenses,
                                    )}
                                  </b>
                                </div>
                                <div className="civic-budget-line">
                                  <span>Department funding</span>
                                  <b>{money(budget.departmentExpenses)}</b>
                                </div>
                                <div className="civic-budget-line">
                                  <span>Open building upkeep</span>
                                  <b>{money(budget.projectUpkeep)}</b>
                                </div>
                                <div className="civic-budget-line">
                                  <span>City life operations</span>
                                  <b>{money(budget.livingExpenses)}</b>
                                </div>
                                <small>
                                  Mobile teams, shuttles, tenant protection,
                                  relief crews, and contractor costs or savings.
                                </small>
                                <button
                                  className="living-text-button"
                                  onClick={() =>
                                    openCityLife({ section: "services" })
                                  }
                                >
                                  Manage city operations{" "}
                                  <ArrowRight size={12} />
                                </button>
                              </div>
                              <div className="civic-budget-line total">
                                <span>Daily balance</span>
                                <b
                                  className={
                                    budget.net >= 0 ? "positive" : "negative"
                                  }
                                >
                                  {budget.net >= 0 ? "+" : ""}
                                  {money(budget.net)}
                                </b>
                              </div>
                              <small>
                                Request costs and new construction are paid
                                separately when approved. Revenue responds to
                                population, the economy, and your tax policy.
                                Construction schedules also depend on available
                                crews, weather, and delivery standards.
                              </small>
                              <HistoryChart kind="treasury" />
                              <h3>Tax policy</h3>
                              <div className="civic-tax-options">
                                {(
                                  [
                                    {
                                      id: "low",
                                      name: "Light touch",
                                      text: "More breathing room for households. Less revenue.",
                                    },
                                    {
                                      id: "balanced",
                                      name: "Fair share",
                                      text: "Steady revenue with balanced public sentiment.",
                                    },
                                    {
                                      id: "high",
                                      name: "Raise revenue",
                                      text: "Stronger finances. Pressure on happiness and the economy.",
                                    },
                                  ] as const
                                ).map((t) => (
                                  <button
                                    key={t.id}
                                    disabled={disabled}
                                    className={
                                      city.tax === t.id ? "selected" : ""
                                    }
                                    onClick={() =>
                                      act(
                                        setTax(t.id, { actor: "you" }),
                                        `${t.name} tax policy adopted.`,
                                      )
                                    }
                                  >
                                    <span>
                                      <b>{t.name}</b>
                                      <small>{t.text}</small>
                                      <small className="civic-policy-forecast">
                                        {money(
                                          estimateBudget({ tax: t.id }).revenue,
                                        )}{" "}
                                        revenue ·{" "}
                                        {money(
                                          estimateBudget({ tax: t.id }).net,
                                        )}{" "}
                                        daily balance
                                      </small>
                                    </span>
                                    {city.tax === t.id ? (
                                      <Check size={16} />
                                    ) : (
                                      <span className="civic-radio" />
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="civic-departments">
                              <h2>Departments at work</h2>
                              <p>
                                Every service has a daily cost. Higher funding
                                supports gradual improvements; cuts reduce
                                service quality.
                              </p>
                              {(
                                Object.keys(departmentLabels) as Department[]
                              ).map((dept) => {
                                const m: Metric =
                                  dept === "transport" ? "mobility" : dept;
                                const Icon = metricIcons[m];
                                return (
                                  <article
                                    className="civic-department civic-paper"
                                    key={dept}
                                  >
                                    <div className="civic-department-icon">
                                      <Icon size={21} />
                                    </div>
                                    <div>
                                      <h3>{departmentLabels[dept]}</h3>
                                      <div className="civic-department-health">
                                        <Meter value={city.metrics[m]} />
                                        <span>
                                          {round(city.metrics[m])} / 100
                                        </span>
                                      </div>
                                    </div>
                                    <div className="civic-funding-levels">
                                      {([0, 1, 2] as const).map((l) => (
                                        <button
                                          key={l}
                                          disabled={disabled}
                                          className={
                                            city.departments[dept] === l
                                              ? "selected"
                                              : ""
                                          }
                                          onClick={() =>
                                            act(
                                              setDepartment(dept, l, {
                                                actor: "you",
                                              }),
                                              `${departmentLabels[dept]} funding updated.`,
                                            )
                                          }
                                        >
                                          {
                                            ["Reduced", "Standard", "Enhanced"][
                                              l
                                            ]
                                          }
                                          <small>
                                            {city.departments[dept] === l
                                              ? "Current"
                                              : `${estimateBudget({ departments: { [dept]: l } }).expenses > budget.expenses ? "+" : "−"}${money(Math.abs(estimateBudget({ departments: { [dept]: l } }).expenses - budget.expenses))}/day`}
                                          </small>
                                        </button>
                                      ))}
                                    </div>
                                  </article>
                                );
                              })}
                              <div className="civic-advice-note">
                                <ShieldCheck size={20} />
                                <p>
                                  <b>Leave room for the unexpected.</b> A cash
                                  reserve lets you respond to urgent requests
                                  without cutting the services people rely on.
                                </p>
                              </div>
                            </div>
                          </div>
                        </section>
                      )}
                      {tab === "journal" && (
                        <section className="civic-page">
                          <PageHeading
                            eyebrow="THE RECORD OF YOUR CITY"
                            title="See what changed. And why."
                            text="Real choices, their immediate effects, and the consequences that arrive later."
                            action={
                              <button
                                className="civic-secondary"
                                onClick={() => setModal("new")}
                              >
                                <RefreshCw size={14} /> New city
                              </button>
                            }
                          />
                          <div className="civic-journal-layout">
                            <div>
                              <div className="civic-journal-chart civic-paper">
                                <div>
                                  <h3>A sense of progress</h3>
                                  <span>Happiness & public trust</span>
                                </div>
                                <HistoryChart kind="metrics" />
                                <div className="civic-chart-legend">
                                  <span>
                                    <Dot /> Happiness
                                  </span>
                                  <span>
                                    <Dot color="#b98299" /> Trust
                                  </span>
                                </div>
                              </div>
                              <h3 className="civic-section-title">
                                The decision ledger{" "}
                                <span>{city.decisions.length} recorded</span>
                              </h3>
                              <div className="civic-ledger">
                                {city.decisions.map((d) => (
                                  <article key={d.id} className="civic-paper">
                                    <div className="civic-ledger-day">
                                      DAY<b>{dayLabel(d.day)}</b>
                                    </div>
                                    <div>
                                      <div className="civic-ledger-top">
                                        <h3>{d.title}</h3>
                                        <Actor actor={d.actor} />
                                      </div>
                                      <strong>{decisionChoiceText(d)}</strong>
                                      <p>{d.rationale}</p>
                                      <EffectChips effects={d.effects} />
                                      {d.actor === "jev" && (
                                        <details>
                                          <summary>
                                            Live decision details
                                          </summary>
                                          <p>
                                            Model: {d.model || "Not reported"}
                                            <br />
                                            Returned choice confidence:{" "}
                                            {d.confidence == null
                                              ? "Not reported"
                                              : `${Math.round(d.confidence * 100)}%`}
                                            <br />
                                            Request duration:{" "}
                                            {d.durationMs == null
                                              ? "Not reported"
                                              : `${Math.round(d.durationMs)} ms`}
                                          </p>
                                          <small>
                                            The reason is Jev’s selected
                                            decision summary. Confidence is a
                                            model output, not a measure of
                                            correctness.
                                          </small>
                                        </details>
                                      )}
                                    </div>
                                  </article>
                                ))}
                              </div>
                              {!city.decisions.length && (
                                <div className="civic-empty">
                                  <BookOpen size={26} />
                                  <p>Your first decision will appear here.</p>
                                </div>
                              )}
                            </div>
                            <aside className="civic-journal-news civic-paper">
                              <span className="civic-eyebrow">
                                THE RIVERSIDE POST
                              </span>
                              <h2>Life goes on.</h2>
                              {city.news.slice(0, 50).map((n) => (
                                <article key={n.id}>
                                  <span>
                                    DAY {dayLabel(n.day)} ·{" "}
                                    {n.kind.toUpperCase()}
                                  </span>
                                  <h3>{n.title}</h3>
                                  <p>{n.text}</p>
                                </article>
                              ))}
                            </aside>
                          </div>
                        </section>
                      )}
                    </>
                  )}
                </div>
              </aside>
            )}
          </div>
          <footer className="civic-footer">
            <span>
              <Dot />
              {modeNames[city.mode]}
              {city.mode === "jev" && mayorAI.lastModel
                ? ` · ${mayorAI.lastModel}`
                : ""}
            </span>
            <span>
              {city.projects.filter((p) => p.status === "complete").length}{" "}
              projects open · {answeredCount} requests answered · {city.expired}{" "}
              unanswered
            </span>
            <button onClick={() => setModal("help")}>
              <CircleHelp size={12} /> Mayor’s handbook
            </button>
            <button
              className={saveError ? "negative" : ""}
              onClick={() => setModal("save")}
            >
              <Download size={12} />
              {saveError ? "Save needs attention" : "Saved on this device"}
            </button>
          </footer>
          {city.phase === "ended" && city.result && showResult && (
            <ModalShell
              title="THE PEOPLE HAVE SPOKEN"
              onClose={() => setShowResult(false)}
              className="civic-election"
            >
              <div className="civic-election-icon">
                <Landmark size={35} />
              </div>
              <span className="civic-eyebrow">
                TERM {city.term} · ELECTION NIGHT
              </span>
              <h2>
                {city.result.won
                  ? "A vote of confidence."
                  : "A city asking for more."}
              </h2>
              <p>{city.result.summary}</p>
              <div className="civic-election-approval">
                <b>
                  {round(city.result.approval)}
                  <small>%</small>
                </b>
                <span>APPROVAL RATING</span>
                <strong>{city.result.grade}</strong>
              </div>
              <div className="civic-election-stats">
                <span>
                  <b>{answeredCount}</b> requests answered since founding
                </span>
                <span>
                  <b>
                    {
                      city.projects.filter((p) => p.status === "complete")
                        .length
                    }
                  </b>{" "}
                  projects delivered
                </span>
                <span>
                  <b>{money(city.treasury)}</b> in the treasury
                </span>
              </div>
              <HistoryChart kind="metrics" />
              <button
                className="civic-primary"
                onClick={() => {
                  continueTerm();
                  resetMayorAI();
                  setShowResult(true);
                  redraw();
                }}
              >
                Keep governing · next term <ArrowRight size={16} />
              </button>
              <div className="civic-election-links">
                <button
                  onClick={() => {
                    setShowResult(false);
                    setTab("journal");
                  }}
                >
                  Read the term’s record
                </button>
                <button
                  onClick={() => {
                    resetCity();
                    clearCitySave();
                    resetMayorAI();
                    setShowResult(true);
                    redraw();
                  }}
                >
                  Start a new city
                </button>
              </div>
            </ModalShell>
          )}
          {city.phase === "ended" && !showResult && (
            <button
              className="civic-return-result civic-primary"
              onClick={() => setShowResult(true)}
            >
              Election results <ArrowRight size={14} />
            </button>
          )}
        </>
      )}

      {modal === "connect" && (
        <ConnectDialog
          onClose={() => setModal(null)}
          onConnected={() => {
            setModal(null);
            if (pendingStart || city.phase === "lobby") launch("jev");
            else {
              setMayorMode("jev");
              retryMayorAI();
              redraw();
            }
          }}
        />
      )}
      {modal === "catalog" && (
        <ModalShell
          title="THE REQUEST LIBRARY"
          className="civic-catalog-modal"
          onClose={() => setModal(null)}
        >
          <h2>A hundred ways a city comes alive.</h2>
          <p>
            {REQUEST_CATALOG.length} authored requests, including construction
            problems, connected stories, and follow-up letters. Each city draws
            a different sequence.
          </p>
          <div className="civic-catalog-filters">
            <button
              className={catalogFilter === "all" ? "selected" : ""}
              onClick={() => setCatalogFilter("all")}
            >
              All stories · {REQUEST_CATALOG.length}
            </button>
            {(Object.keys(categoryLabels) as Category[]).map((c) => (
              <button
                key={c}
                className={catalogFilter === c ? "selected" : ""}
                onClick={() => setCatalogFilter(c)}
              >
                {categoryLabels[c]}
              </button>
            ))}
          </div>
          <div className="civic-catalog-list">
            {REQUEST_CATALOG.filter(
              (r) => catalogFilter === "all" || r.category === catalogFilter,
            ).map((t) => (
              <details key={t.id}>
                <summary>
                  <span
                    className={`civic-category-symbol category-${t.category}`}
                  >
                    {(() => {
                      const Icon = categoryIcons[t.category];
                      return <Icon size={16} />;
                    })()}
                  </span>
                  <span>
                    <b>{t.title}</b>
                    <small>
                      {t.sender} · {t.role}
                    </small>
                  </span>
                  {t.constructionOnly ? (
                    <Pill>On site</Pill>
                  ) : t.followUpOnly ? (
                    <Pill>Follow-up</Pill>
                  ) : (
                    <Pill>{categoryLabels[t.category]}</Pill>
                  )}
                  <ChevronRight size={15} />
                </summary>
                <div>
                  <p>“{t.text}”</p>
                  <div className="civic-catalog-options">
                    {t.options.map((o) => (
                      <span key={o.id}>
                        <b>{o.label}</b>
                        <small>{o.description}</small>
                        <EffectChips effects={o.effects} />
                        <ConstructionEffect days={o.constructionDelayDays} />
                      </span>
                    ))}
                  </div>
                  {t.clarification && (
                    <small className="civic-catalog-clarification">
                      <MessageCircle size={12} /> A clarification conversation
                      is available in play.
                    </small>
                  )}
                </div>
              </details>
            ))}
          </div>
        </ModalShell>
      )}
      {modal === "help" && (
        <ModalShell
          title="THE MAYOR’S HANDBOOK"
          className="civic-handbook"
          onClose={() => setModal(null)}
        >
          <h2>The city is in your hands.</h2>
          <p>
            Keep people happy, services healthy, and the budget solvent through
            a 30-day term. Then face the electorate. Re-election needs at least
            55% approval, a treasury of at least −$5,000, and core services at
            25 or above. Completing no projects costs two approval points.
          </p>
          <div className="civic-handbook-grid">
            <article>
              <Mail size={22} />
              <h3>Listen to the city</h3>
              <p>
                Letters arrive each day. Every request has real choices, costs,
                and a deadline. Unanswered letters have consequences. Ask a
                follow-up when the request offers one; the reply takes part of a
                day.
              </p>
            </article>
            <article>
              <Sparkles size={22} />
              <h3>Let Jev govern</h3>
              <p>
                Connect your OpenRouter key for live decisions. Jev receives the
                current state, available choices, your mandate, and briefings.
                It handles requests, investments, and service decisions. A lost
                connection pauses the city.
              </p>
            </article>
            <article>
              <Coins size={22} />
              <h3>Plan beyond today</h3>
              <p>
                New cities inherit two funded building sites. Review their
                progress in Build & improve: site problems can require extra
                spending or delay opening. Taxes and service costs settle each
                day; project benefits and upkeep begin when construction ends.
              </p>
            </article>
            <article>
              <Users size={22} />
              <h3>Stay in control</h3>
              <p>
                Switch to manual play whenever you like. The local advisor uses
                visible rules and works without a key. Pause with Space; choose
                1×, 2×, or 4× for manual or local play. Live Jev runs at 1× to
                give every decision time to arrive. The city pauses when the tab
                is hidden.
              </p>
            </article>
          </div>
          <div className="civic-handbook-note">
            <ShieldCheck size={17} />
            <p>
              Your key stays in page memory and is never saved. Requests are
              sent directly to OpenRouter, with a limit of 160 attempts per
              mayoral term. Your city auto-saves on this device and restores
              paused after refresh. Export a city file from Save & restore to
              keep a separate copy. Use Ask Jev to send your own request into
              the inbox and receive the mayor’s decision.
            </p>
          </div>
          <button className="civic-primary" onClick={() => setModal(null)}>
            Let’s make a good city <ArrowRight size={15} />
          </button>
          <button
            className="civic-text-button"
            onClick={() => setModal("save")}
          >
            Save & restore city
          </button>
          <button
            className="civic-text-button"
            onClick={() => setModal("catalog")}
          >
            Browse the request catalog
          </button>
          <button
            className="civic-text-button"
            onClick={() => {
              pauseCity(true);
              setPendingStart(false);
              setModal("connect");
            }}
          >
            Jev connection settings
          </button>
        </ModalShell>
      )}
      {modal === "save" && (
        <ModalShell
          title="A CITY TO COME BACK TO"
          onClose={() => setModal(null)}
        >
          <h2>Keep your city’s story.</h2>
          <p>
            Your city automatically saves on this browser every two seconds.
            Refreshing restores it paused. Your API key is never saved or
            included in a city file.
          </p>
          {saveError && (
            <p className="civic-form-error" role="alert">
              {saveError} You can still download a city file.
            </p>
          )}
          <div className="civic-save-actions">
            <button
              className="civic-primary"
              disabled={city.phase === "lobby"}
              onClick={exportSave}
            >
              <Download size={16} /> Download this city <ArrowRight size={15} />
            </button>
            <button
              className="civic-secondary"
              onClick={() => fileInput.current?.click()}
            >
              <Upload size={16} /> Import a city file
            </button>
            <small>
              Importing a valid Jevtown save replaces the current city and
              pauses it. Save your current city first if you want to keep both.
              Only gameplay data and in-game briefings are stored.
            </small>
          </div>
        </ModalShell>
      )}
      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        aria-label="Import Jevtown city save"
        hidden
        onChange={(e) => {
          void importSave(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {modal === "new" && (
        <ModalShell title="A FRESH START" onClose={() => setModal(null)}>
          <h2>Begin a new city?</h2>
          <p>
            This ends the current term and resets its decisions, budget, and
            construction. Your Jev connection stays available.
          </p>
          <div className="civic-dialog-actions">
            <button className="civic-secondary" onClick={() => setModal(null)}>
              Keep this city
            </button>
            <button
              className="civic-primary"
              onClick={() => {
                resetCity();
                clearCitySave();
                resetMayorAI();
                setModal(null);
                setSelected(null);
                setShowResult(true);
                redraw();
              }}
            >
              Start fresh <ArrowRight size={15} />
            </button>
          </div>
        </ModalShell>
      )}
      {toast && (
        <div className="civic-toast" role="status">
          <Check size={16} />
          {toast}
          <button aria-label="Dismiss message" onClick={() => setToast("")}>
            <X size={14} />
          </button>
        </div>
      )}
    </main>
  );
}

function Stat({
  icon,
  label,
  value,
  note,
  trend,
  color,
  meter,
  onClick,
}: {
  icon: PixelIconKind;
  label: string;
  value: string;
  note?: string;
  trend?: number;
  color?: string;
  meter?: number;
  onClick?: () => void;
}) {
  return (
    <button
      className={`civic-stat ${color || ""}`}
      onClick={onClick}
      disabled={!onClick}
    >
      <div>
        <PixelIcon kind={icon} size={22} />
        <span>{label}</span>
      </div>
      <strong>
        {value}
        {trend != null && Math.abs(trend) >= 0.1 && (
          <small className={trend >= 0 ? "positive" : "negative"}>
            {trend >= 0 ? (
              <ArrowUpRight size={12} />
            ) : (
              <ArrowDownRight size={12} />
            )}
            {Math.abs(trend).toFixed(1)}
          </small>
        )}
      </strong>
      {meter != null ? (
        <Meter value={meter} color="#b98299" />
      ) : (
        <small>{note}</small>
      )}
    </button>
  );
}
function PageHeading({
  eyebrow,
  title,
  text,
  action,
}: {
  eyebrow: string;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <header className="civic-page-heading">
      <div>
        <span className="civic-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
      {action}
    </header>
  );
}
function RequestRow({
  request: r,
  onClick,
}: {
  request: CityRequest;
  onClick: () => void;
}) {
  const t = requestById[r.templateId];
  const Icon = categoryIcons[t.category];
  return (
    <button className="civic-request-row" onClick={onClick}>
      <span className={`civic-category-symbol category-${t.category}`}>
        <Icon size={16} />
      </span>
      <span>
        <small>
          {r.projectId
            ? `SITE · ${projectById[r.projectId].name}`
            : t.source === "authority"
              ? "REGIONAL AUTHORITY"
              : t.sender.split(" · ")[0]}
        </small>
        <b>{t.title}</b>
        <span>
          <Dot color={t.priority === "urgent" ? "#b77c72" : "#718196"} />
          {r.clarificationDue
            ? "Waiting for a reply"
            : r.clarified
              ? "Reply received"
              : `Due day ${dayLabel(r.dueDay)}`}
        </span>
      </span>
      <ChevronRight size={13} />
    </button>
  );
}
function RequestVoiceChip({ voice }: { voice: RequestVoice }) {
  return (
    <span className="request-neighbor-chip">
      <CitizenPortrait
        identity={voice.identity}
        name={voice.name}
        emotion={voice.emotion}
        size={38}
      />
      <span>
        <b>{voice.name}</b>
        <small>
          {voice.relationship === "sender"
            ? "Resident sender"
            : "Neighborhood perspective"}
        </small>
      </span>
    </span>
  );
}
function RequestTile({
  request: r,
  onClick,
}: {
  request: CityRequest;
  onClick: () => void;
}) {
  const t = requestById[r.templateId];
  const Icon = categoryIcons[t.category];
  const voice = getRequestVoice(city, r);
  return (
    <button className="civic-request-tile civic-paper" onClick={onClick}>
      <div>
        {voice ? (
          <RequestVoiceChip voice={voice} />
        ) : (
          <span className={`civic-category-symbol category-${t.category}`}>
            <Icon size={18} />
          </span>
        )}
        <Pill kind={r.status === "open" ? t.priority : r.status}>
          {r.status === "open" ? t.priority : r.status}
        </Pill>
      </div>
      <span className="civic-eyebrow">
        {r.projectId
          ? `CONSTRUCTION · ${projectById[r.projectId].name}`
          : `${categoryLabels[t.category]} · ${t.source}`}
      </span>
      <h3>{t.title}</h3>
      <p>“{t.text}”</p>
      <footer>
        <span>
          <b>{t.sender}</b>
          <small>{t.role}</small>
        </span>
        <span>
          {r.status === "open"
            ? `Due day ${dayLabel(r.dueDay)}`
            : `Day ${dayLabel(r.resolvedDay ?? r.dueDay)}`}
          <ChevronRight size={14} />
        </span>
      </footer>
    </button>
  );
}
function EffectChips({ effects }: { effects: Effects }) {
  const list: { label: string; value: number; money?: boolean }[] = [];
  if (effects.treasury)
    list.push({ label: "", value: effects.treasury, money: true });
  if (effects.population)
    list.push({ label: "residents", value: effects.population });
  for (const [metric, value] of Object.entries(effects.metrics || {}))
    if (value) list.push({ label: metricLabels[metric as Metric], value });
  if (effects.districtHappiness)
    list.push({
      label: "neighborhood happiness",
      value: effects.districtHappiness,
    });
  return (
    <div className="civic-effects">
      {list.length ? (
        list.map((v, i) => (
          <span
            key={i}
            className={
              v.value >= 0 ? "positive" : v.money ? "cost" : "negative"
            }
          >
            {v.money
              ? `${v.value >= 0 ? "+" : ""}${money(v.value)}`
              : `${v.value > 0 ? "+" : ""}${v.value} ${v.label}`}
          </span>
        ))
      ) : (
        <span>No immediate change</span>
      )}
    </div>
  );
}
function ConstructionEffect({ days }: { days?: number }) {
  if (days === undefined) return null;
  return (
    <span className={`civic-schedule-effect ${days ? "delayed" : ""}`}>
      <Clock3 size={12} />
      {days
        ? `Opening delayed by ${days} city day${days === 1 ? "" : "s"}`
        : "Opening date unchanged"}
    </span>
  );
}
function RequestDetail({
  request: r,
  onClose,
  onAction,
  redraw,
  inline = false,
  onOpenResident,
}: {
  onOpenResident?: (id: string) => void;
  inline?: boolean;
  request: CityRequest;
  onClose: () => void;
  onAction: (r: ActionResult, text: string) => boolean;
  redraw: () => void;
}) {
  const t = requestById[r.templateId];
  const voice = getRequestVoice(city, r);
  const neighbor = voice?.citizenId
    ? city.living.citizens.find((person) => person.id === voice.citizenId)
    : null;
  const Icon = categoryIcons[t.category];
  const project = r.projectId
    ? city.projects.find((p) => p.definitionId === r.projectId)
    : undefined;
  const definition = project ? projectById[project.definitionId] : undefined;
  const district = city.districts.find(
    (d) => d.id === (definition?.district ?? t.district),
  );
  const resolvedOption = t.options.find((o) => o.id === r.decision);
  const available =
    r.status === "open" && city.phase === "playing" && !city.paused;
  return (
    <ModalShell
      inline={inline}
      title={`CITY CORRESPONDENCE · ${r.id}`}
      onClose={onClose}
      className="civic-letter"
    >
      <div className="civic-letter-tags">
        <Pill kind={t.priority}>{t.priority}</Pill>
        <span>
          <Icon size={13} />
          {categoryLabels[t.category]}
        </span>
        <span>
          <MapPin size={12} />
          {district?.name}
        </span>
      </div>
      <h2>{t.title}</h2>
      <div className="civic-letter-author">
        {voice?.relationship === "sender" ? (
          <CitizenPortrait
            identity={voice.identity}
            name={voice.name}
            emotion={voice.emotion}
            size={42}
          />
        ) : (
          <span>
            {t.sender
              .split(" ")
              .map((s) => s[0])
              .slice(0, 2)
              .join("")}
          </span>
        )}
        <div>
          <b>{t.sender}</b>
          <small>
            {t.role} · {t.source}
          </small>
        </div>
        <div>
          <small>RECEIVED DAY {dayLabel(r.arrivedDay)}</small>
          <b>Answer by day {dayLabel(r.dueDay)}</b>
        </div>
      </div>
      <blockquote>{t.text}</blockquote>
      {voice && neighbor && (
        <aside
          className="request-neighbor-card"
          aria-label={
            voice.relationship === "sender"
              ? "About the resident"
              : "Neighborhood perspective"
          }
        >
          <CitizenPortrait
            identity={voice.identity}
            name={voice.name}
            emotion={voice.emotion}
            size={60}
          />
          <div>
            <small>
              {voice.relationship === "sender"
                ? "YOUR NEIGHBOR, IN THEIR OWN WORDS"
                : "NEIGHBORHOOD PERSPECTIVE"}
            </small>
            <strong>
              {voice.name}
              <span className="request-mood">
                {citizenEmotionLabels[voice.emotion]}
              </span>
            </strong>
            <span>
              {voice.role} ·{" "}
              {city.districts.find((d) => d.id === neighbor.districtId)?.name}
            </span>
            <p>{neighbor.story}</p>
            {onOpenResident && (
              <button onClick={() => onOpenResident(neighbor.id)}>
                Meet {voice.name.split(" ")[0]} <ChevronRight size={12} />
              </button>
            )}
          </div>
        </aside>
      )}
      {project && definition && (
        <div className="civic-letter-site">
          <HardHat size={22} />
          <div>
            <span className="civic-eyebrow">
              THIS REQUEST AFFECTS A REAL BUILDING SITE
            </span>
            <h3>{definition.name}</h3>
            <p>
              {Math.round(getConstructionProgress(project) * 100)}% complete ·{" "}
              {project.status === "complete" ? "Opened" : "Expected opening"}{" "}
              day {dayLabel(project.completesDay)}
              {!!project.delayDays &&
                ` · ${project.delayDays} days of accumulated delay`}
            </p>
            {project.inherited && (
              <small>
                The construction contract was paid before your term; you manage
                its delivery.
              </small>
            )}
          </div>
        </div>
      )}
      {t.clarification && (
        <div className="civic-clarification">
          {r.clarified ? (
            <>
              <span>
                <MessageCircle size={15} /> FOLLOW-UP REPLY
              </span>
              <p>“{t.clarification.answer}”</p>
              <small>{t.clarification.effectsNote}</small>
            </>
          ) : r.clarificationDue ? (
            <>
              <Clock3 size={16} />
              <p>
                A follow-up has been sent. The reply will arrive shortly while
                the city is running.
              </p>
            </>
          ) : (
            <>
              <span>
                <MessageCircle size={15} /> SOMETHING TO CLARIFY
              </span>
              <p>{t.clarification.question}</p>
              <button
                className="civic-secondary"
                disabled={!available}
                onClick={() =>
                  onAction(
                    clarifyRequest(r.id),
                    "Question sent. The reply will arrive shortly.",
                  )
                }
              >
                Ask for details <Send size={13} />
              </button>
            </>
          )}
        </div>
      )}
      {r.status === "open" ? (
        <>
          <div className="civic-letter-choices-heading">
            <h3>What should the city do?</h3>
            <span>
              <Wallet size={13} />
              {money(city.treasury)} available
            </span>
          </div>
          {city.paused && (
            <div className="civic-inline-paused">
              <Pause size={14} />
              <span>The city is paused. Resume to make a decision.</span>
              <button
                onClick={() => {
                  pauseCity(false);
                  redraw();
                }}
              >
                Resume <Play size={12} />
              </button>
            </div>
          )}
          <div className="civic-letter-options">
            {t.options.map((o) => {
              const cost = Math.max(0, -(o.effects.treasury || 0));
              return (
                <button
                  key={o.id}
                  disabled={
                    !available ||
                    (cost > 0 && cost > city.treasury) ||
                    !!r.clarificationDue
                  }
                  onClick={() => {
                    if (
                      onAction(
                        resolveRequest(r.id, o.id, {
                          actor: "you",
                          rationale:
                            "You chose this response after reviewing the request and its trade-offs.",
                        }),
                        `${t.title}: ${o.label}`,
                      )
                    )
                      onClose();
                  }}
                >
                  <div>
                    <h4>{o.label}</h4>
                    <ChevronRight size={15} />
                  </div>
                  <p>{o.description}</p>
                  <EffectChips effects={o.effects} />
                  <ConstructionEffect days={o.constructionDelayDays} />
                  {o.delayed && (
                    <small>
                      <Clock3 size={12} /> In {o.delayed.days} days:{" "}
                      {o.delayed.title}
                      <EffectChips effects={o.delayed.effects} />
                    </small>
                  )}
                  {o.followUp && (
                    <small>
                      <Mail size={12} /> This choice can open a follow-up story.
                    </small>
                  )}
                  {cost > 0 && cost > city.treasury && (
                    <small className="negative">
                      Needs {money(cost - city.treasury)} more funding.
                    </small>
                  )}
                </button>
              );
            })}
          </div>
          <div className="civic-letter-expiry">
            <Clock3 size={13} />
            <span>If unanswered by day {dayLabel(r.dueDay)}:</span>
            <EffectChips effects={t.expiry} />
            <ConstructionEffect days={t.constructionExpiryDelayDays} />
          </div>
        </>
      ) : (
        <div className="civic-letter-resolution">
          <span className="civic-eyebrow">
            {r.status === "expired"
              ? "DEADLINE PASSED"
              : `DECIDED DAY ${dayLabel(r.resolvedDay ?? city.day)}`}
          </span>
          <h3>
            {r.status === "expired"
              ? "This request went unanswered."
              : resolvedOption?.label}
          </h3>
          <p>
            {r.rationale ||
              (r.status === "expired"
                ? "The city applied the request’s stated consequences."
                : resolvedOption?.description)}
          </p>
          <EffectChips
            effects={
              r.status === "expired" ? t.expiry : resolvedOption?.effects || {}
            }
          />
          {r.actor && <Actor actor={r.actor} />}
          <ConstructionEffect
            days={
              r.status === "expired"
                ? t.constructionExpiryDelayDays
                : resolvedOption?.constructionDelayDays
            }
          />
        </div>
      )}
    </ModalShell>
  );
}
function ModalShell({
  title,
  onClose,
  children,
  className = "",
  inline = false,
}: {
  inline?: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (inline) return;
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Tab") {
        const items = ref.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]),input,select,textarea,summary,[tabindex="0"]',
        );
        if (!items?.length) return;
        const first = items[0],
          last = items[items.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  if (inline)
    return (
      <section className={`${className} civic-inline-detail`}>
        {children}
      </section>
    );
  return (
    <div
      className="civic-modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className={`civic-modal ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <header>
          <span className="civic-eyebrow">{title}</span>
          <button
            className="civic-icon"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </header>
        <div className="civic-modal-content">{children}</div>
      </div>
    </div>
  );
}
function ConnectDialog({
  onClose,
  onConnected,
}: {
  onClose: () => void;
  onConnected: () => void;
}) {
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  async function connect(e: FormEvent) {
    e.preventDefault();
    if (!key.trim() || busy) return;
    const secret = key.trim();
    setKey("");
    setBusy(true);
    setError("");
    try {
      const result = await jev.connect(secret);
      if (!alive.current) return;
      if (result.source === "jev") onConnected();
      else setError(result.error || "Jev could not connect. Please try again.");
    } catch {
      if (alive.current)
        setError(
          "Connection could not be completed. Please check the key and try again.",
        );
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  return (
    <ModalShell
      title="WELCOME TO THE MAYOR’S OFFICE"
      onClose={onClose}
      className="civic-connect"
    >
      <span className="civic-connect-icon">
        <Sparkles size={29} />
      </span>
      <h2>Give Jev the keys to the city.</h2>
      <p>
        Jev will read the inbox, make decisions, fund services, and plan
        investments. You can watch every choice and change direction at any
        time.
      </p>
      <form onSubmit={connect}>
        <label htmlFor="mayor-api-key">OpenRouter API key</label>
        <input
          id="mayor-api-key"
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder="sk-or-…"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          disabled={busy}
        />
        <small>
          <ShieldCheck size={13} /> Stays in page memory. Cleared on refresh.
          Never saved.
        </small>
        {error && (
          <p className="civic-form-error" role="alert">
            {error}
          </p>
        )}
        <button
          className="civic-primary"
          disabled={busy || !key.trim()}
          type="submit"
        >
          <Sparkles size={16} />
          {busy ? "Connecting to live Jev…" : "Connect & let Jev govern"}
          <ArrowRight size={16} />
        </button>
      </form>
      <p className="civic-connect-footnote">
        The local civic advisor and manual mode work without a key. Live
        requests use your OpenRouter account.
      </p>
      {jev.hasKey && (
        <button
          className="civic-text-button"
          onClick={() => {
            jev.clearKey();
            if (city.mode === "jev") {
              setMayorMode("manual");
              pauseCity(true);
            }
            setError("Key cleared from this page.");
          }}
        >
          Clear the current key
        </button>
      )}
    </ModalShell>
  );
}
function HistoryChart({ kind }: { kind: "metrics" | "treasury" }) {
  const h = city.history;
  const values = h.map((p) =>
    kind === "treasury" ? p.treasury : p.metrics.happiness,
  );
  const max = kind === "treasury" ? Math.max(1000, ...values) : 100;
  const min = kind === "treasury" ? Math.min(0, ...values) : 0;
  const path = (data: number[]) =>
    data
      .map(
        (v, i) =>
          `${i ? "L" : "M"}${20 + (i / Math.max(1, data.length - 1)) * 460},${95 - ((v - min) / Math.max(1, max - min)) * 75}`,
      )
      .join(" ");
  return (
    <div className="civic-history-chart">
      <svg
        viewBox="0 0 500 115"
        role="img"
        aria-label={
          kind === "treasury"
            ? "Treasury history by day"
            : "Happiness and trust history by day"
        }
      >
        <path
          d="M20 20H480 M20 57H480 M20 95H480"
          stroke="#cad3df"
          fill="none"
          strokeDasharray="3 4"
        />
        {h.length > 1 ? (
          <>
            <path d={`${path(values)} L480 95 L20 95 Z`} fill="#75a6b119" />
            <path
              d={path(values)}
              stroke="#75a6b1"
              strokeWidth="2.5"
              fill="none"
              strokeLinejoin="round"
            />
            {kind === "metrics" && (
              <path
                d={path(h.map((p) => p.metrics.trust))}
                stroke="#b98299"
                strokeWidth="2"
                fill="none"
                strokeLinejoin="round"
              />
            )}
          </>
        ) : (
          <text x="250" y="58" textAnchor="middle" fill="#718196" fontSize="11">
            Your city’s story begins today
          </text>
        )}
        <text x="20" y="111" fill="#718196" fontSize="9">
          Day {h[0]?.day ?? city.day}
        </text>
        <text x="480" y="111" textAnchor="end" fill="#718196" fontSize="9">
          Day {h[h.length - 1]?.day ?? city.day}
        </text>
      </svg>
    </div>
  );
}
function ProjectDrawing({
  category,
  complete,
}: {
  category: Category;
  complete: boolean;
}) {
  return <PixelProjectArt kind={category} complete={complete} />;
}
