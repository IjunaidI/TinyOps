import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Box,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Coffee,
  Crosshair,
  Eye,
  Flag,
  Gauge,
  Home,
  MapPin,
  Mail,
  Package,
  Pause,
  Pin,
  Play,
  Radio,
  RotateCcw,
  Send,
  Settings2,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Swords,
  Truck,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import World from "./world/World";
import { BattleLobby, BattleBoard, BattleResults } from "./battle/BattleUI";
import { DispatchInbox } from "./battle/Inbox";
import {
  strategyNames,
  reasonChoices,
  type MatchVariant,
} from "./battle/chaos";
import {
  match,
  chaos,
  startMatch,
  stopMatch,
  tickMatch,
  updateMatch,
  retryMatch,
  type Opponent,
} from "./battle/match";
import {
  game,
  startGame,
  tick,
  setPolicy,
  assignOrder,
  pinOrder,
  rushVan,
  triggerIncident,
  clearIncidents,
  select,
  focusPlace,
  homeCamera,
  getAssignmentOptions,
  resolveOrder,
  log,
} from "./sim/engine";
import { places, placeById } from "./data/map";
import { jev, type Decision } from "./ai/jev";
import {
  updateAssistance,
  resetAssistance,
  command,
  approveDecision,
} from "./ai/controller";
import type { Mode, Order, Policy, Selection } from "./types";
const policyNames: Record<Policy, string> = {
  balanced: "Balanced",
  deadline: "Deadline first",
  cold: "Cold first",
};
const incidentNames = {
  bridge: "North Bridge closed",
  power: "West Depot outage",
  congestion: "Market congestion",
};
function clock(t: number) {
  return `${Math.floor(Math.max(0, t) / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(Math.max(0, t) % 60)
    .toString()
    .padStart(2, "0")}`;
}
let audioContext: AudioContext | null = null;
function chime(kind: string) {
  if (!audioContext) return;
  const a = audioContext;
  const osc = a.createOscillator(),
    gain = a.createGain();
  osc.connect(gain);
  gain.connect(a.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(
    kind === "delivery" ? 660 : kind === "incident" ? 220 : 440,
    a.currentTime,
  );
  osc.frequency.exponentialRampToValueAtTime(
    kind === "delivery" ? 990 : 330,
    a.currentTime + 0.13,
  );
  gain.gain.setValueAtTime(0.035, a.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.3);
  osc.start();
  osc.stop(a.currentTime + 0.3);
}
export default function App() {
  const [, render] = useState(0);
  const redraw = () => render((n) => n + 1);
  const [battleLobby, setBattleLobby] = useState(false);
  const [inbox, setInbox] = useState(false);
  const [director, setDirector] = useState(false),
    [connect, setConnect] = useState(false),
    [help, setHelp] = useState(false),
    [decisions, setDecisions] = useState(false),
    [sound, setSound] = useState(false),
    [text, setText] = useState(""),
    [key, setKey] = useState(""),
    [connecting, setConnecting] = useState(false),
    [connectionMessage, setConnectionMessage] = useState("");
  const soundRef = useRef(false);
  soundRef.current = sound;
  useEffect(() => {
    let raf = 0,
      last = performance.now(),
      acc = 0,
      hud = 0,
      lastFeed = 0;
    function frame(now: number) {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (game.phase === "playing" && !game.paused) {
        acc += dt * game.speed;
        while (acc >= 0.05) {
          if (game.mode === "battle") tickMatch(0.05);
          else tick(0.05);
          acc -= 0.05;
        }
      } else acc = 0;
      if (game.mode === "battle") updateMatch();
      else updateAssistance();
      hud += dt;
      if (hud > 0.12) {
        hud = 0;
        render((n) => n + 1);
        const latest = game.feed[0];
        if (latest && latest.id !== lastFeed) {
          lastFeed = latest.id;
          if (soundRef.current) chime(latest.kind);
        }
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    const visibility = () => {
      if (document.hidden && game.phase === "playing") {
        game.paused = true;
        log("Shift paused while you were away.", "info");
      }
      last = performance.now();
      acc = 0;
    };
    const shortcuts = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches("input,textarea,select")) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (game.phase === "playing") game.paused = !game.paused;
      }
      if (e.key === "Home") {
        e.preventDefault();
        homeCamera();
      }
      if (e.key.toLowerCase() === "f" && game.selection?.type === "van")
        game.follow = !game.follow;
      if (e.key.toLowerCase() === "c") game.cinematic = !game.cinematic;
      if (e.key === "Escape") {
        select(null);
        setBattleLobby(false);
        setInbox(false);
        setDirector(false);
        setDecisions(false);
        setHelp(false);
        setConnect(false);
        setKey("");
        game.cinematic = false;
      }
      redraw();
    };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("keydown", shortcuts);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("keydown", shortcuts);
    };
  }, []);
  function openBattle() {
    if (game.phase === "playing") game.paused = true;
    setBattleLobby(true);
    setDirector(false);
    setDecisions(false);
    setInbox(false);
  }
  function launchBattle(opponent: Opponent, variant: MatchVariant) {
    if (!startMatch(opponent, variant)) {
      setConnect(true);
      return;
    }
    setBattleLobby(false);
    setDirector(false);
    setDecisions(false);
    setConnect(false);
    setText("");
    setInbox(variant === "chaos");
    redraw();
  }
  function start(mode: Mode) {
    if (mode === "battle") {
      openBattle();
      return;
    }
    stopMatch();
    setInbox(false);
    startGame(mode);
    resetAssistance();
    setDirector(false);
    setDecisions(false);
    redraw();
  }
  const choose = useCallback((selection: Selection) => {
    select(selection);
    setInbox(false);
    render((n) => n + 1);
  }, []);
  const active = game.phase === "playing";
  const isBattle = game.mode === "battle" && match.active;
  const queued = game.orders.filter((o) => o.status === "queued");
  const inTransit = game.orders.filter((o) =>
    ["assigned", "loaded"].includes(o.status),
  );
  const order =
    game.selection?.type === "order"
      ? game.orders.find((o) => o.id === game.selection?.id)
      : undefined;
  const assignmentOptions =
    order?.status === "queued" ? getAssignmentOptions(order.id) : [];
  const van =
    game.selection?.type === "van"
      ? game.vans.find((v) => v.id === game.selection?.id)
      : undefined;
  const depot =
    game.selection?.type === "depot" ? placeById[game.selection.id] : undefined;
  const reviews = jev.decisions
    .filter((d) => d.status === "review" && d.generation === game.generation)
    .sort(
      (a, b) =>
        ({ command: 0, dispatch: 0, inbox: 0, mayor: 0, incident: 1, order: 2 })[a.kind] -
        { command: 0, dispatch: 0, inbox: 0, mayor: 0, incident: 1, order: 2 }[b.kind],
    );
  const live = jev.connected && !jev.error;
  const modeLabel = isBattle
    ? "You · manual dispatch"
    : !game.auto
      ? "Manual"
      : live
        ? "Live Jev"
        : "Local Autopilot";
  async function doConnect(e: React.FormEvent) {
    e.preventDefault();
    setConnecting(true);
    const secret = key.trim();
    setKey("");
    try {
      const result = await jev.connect(secret);
      setConnectionMessage(
        result.source === "jev"
          ? `Connected · ${result.model} · ${Math.round(result.durationMs)} ms`
          : result.error || "Connection failed. Local Autopilot is ready.",
      );
    } catch {
      setConnectionMessage("Connection failed. Local Autopilot is ready.");
    } finally {
      setConnecting(false);
      redraw();
    }
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    command(text.trim());
    setText("");
    redraw();
  }
  const elapsed = Math.min(game.time / 360, 1);
  return (
    <main
      className={`app${isBattle ? " battle-mode" : ""}${isBattle && match.variant === "chaos" ? " chaos-mode" : ""}${inbox ? " inbox-open" : ""}${game.cinematic ? " cinematic" : ""}${(game.daylight ?? elapsed) > 0.6 ? " at-night" : ""}`}
    >
      <World game={game} onSelect={choose} />
      <header className="topbar">
        <button
          className="brand"
          onClick={() => homeCamera()}
          title="Home view"
        >
          <span className="brand-icon">
            <Box size={21} />
          </span>
          jevtown<span className="brand-dot">.</span>
          <span className="edition">RIVERSIDE DISTRICT</span>
        </button>
        {active ? (
          <div className="shift-stats">
            <div className="stat time">
              <Clock3 size={15} />
              <strong>
                {game.mode === "free"
                  ? clock(game.time)
                  : clock(360 - game.time)}
              </strong>
              <span>
                {game.mode === "free"
                  ? "FREE PLAY"
                  : isBattle
                    ? "MATCH LEFT"
                    : game.mode === "showcase"
                      ? "SHOWCASE"
                      : "SHIFT LEFT"}
              </span>
            </div>
            <div className="stat">
              <strong>{game.score.toLocaleString()}</strong>
              <span>POINTS</span>
            </div>
            <div className="stat">
              <strong>
                {game.delivered}
                <small>
                  {" "}
                  / {game.mode === "free" ? game.orders.length : 24}
                </small>
              </strong>
              <span>DELIVERED</span>
            </div>
          </div>
        ) : (
          <div className="top-caption">A tiny city. A big day.</div>
        )}
        <div className="top-actions">
          {active && (
            <>
              <div className="speed-control">
                <button
                  title={game.paused ? "Resume shift" : "Pause shift"}
                  aria-label={game.paused ? "Resume shift" : "Pause shift"}
                  className={game.paused ? "selected" : ""}
                  onClick={() => {
                    game.paused = !game.paused;
                    redraw();
                  }}
                >
                  {game.paused ? <Play size={14} /> : <Pause size={14} />}
                </button>
                {([1, 2] as const).map((s) => (
                  <button
                    key={s}
                    disabled={isBattle && (s === 2 || !!match.issue)}
                    className={
                      game.speed === s && !game.paused ? "selected" : ""
                    }
                    onClick={() => {
                      game.speed = s;
                      game.paused = false;
                      redraw();
                    }}
                  >
                    {s}×
                  </button>
                ))}
              </div>
              <span className="divider" />
            </>
          )}
          <button
            className="icon-button"
            title={sound ? "Mute sound" : "Enable sound"}
            onClick={() => {
              if (!audioContext) audioContext = new AudioContext();
              audioContext.resume();
              setSound(!sound);
            }}
          >
            {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button
            className="icon-button"
            title="How to play"
            onClick={() => setHelp(true)}
          >
            <CircleHelp size={18} />
          </button>
          <button
            className={`director-button ${director ? "selected" : ""}`}
            onClick={() => {
              setDirector(!director);
              setDecisions(false);
              setInbox(false);
            }}
          >
            <Settings2 size={16} />
            <span>Director</span>
          </button>
        </div>
      </header>
      <div className="district-tag">
        <span className="status-dot" /> RIVERSIDE <span> / </span> DISTRICT 01{" "}
        <span className="weather">☀ 24°</span>
      </div>
      {game.phase === "welcome" && (
        <section className="welcome">
          <div className="eyebrow">
            <span /> YOUR SHIFT STARTS HERE
          </div>
          <h1>
            Small city.
            <br />
            Big delivery
            <br />
            <em>day.</em>
          </h1>
          <p>
            Deliver the city’s orders.
            <br />
            Handle disruptions.
            <br />
            Keep the fleet moving.
          </p>
          <button
            className="primary start-button"
            onClick={() => start("shift")}
          >
            Start shift <ArrowRight size={20} />
          </button>
          <button className="battle-start" onClick={openBattle}>
            <Swords size={16} />
            <span>
              I will beat Jev<small>Chaos Shift + classic dispatch duel</small>
            </span>
            <ArrowRight size={16} />
          </button>
          <div className="welcome-secondary">
            <button onClick={() => start("free")}>
              Free play <ArrowUpRight size={14} />
            </button>
            <span />
            <button onClick={() => setConnect(true)}>
              Connect Jev <Sparkles size={14} />
            </button>
          </div>
          <div className="welcome-facts">
            <div>
              <strong>08</strong>
              <span>VANS</span>
            </div>
            <div>
              <strong>24</strong>
              <span>ORDERS</span>
            </div>
            <div>
              <strong>06</strong>
              <span>MINUTES</span>
            </div>
          </div>
        </section>
      )}
      {active && !game.cinematic && (
        <>
          <aside className="queue-panel panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">THE DAY’S WORK</span>
                <h2>
                  Dispatch board{" "}
                  <span className="count">
                    {queued.length + inTransit.length}
                  </span>
                </h2>
              </div>
              <Package size={18} />
            </div>
            <div className="queue-tabs">
              <span>
                Waiting <b>{queued.length}</b>
              </span>
              <span>
                On the road <b>{inTransit.length}</b>
              </span>
            </div>
            <div className="orders-scroll">
              {[
                ...queued.sort(
                  (a, b) =>
                    Number(b.pinned) - Number(a.pinned) || a.due - b.due,
                ),
                ...inTransit,
              ].map((o) => (
                <OrderCard
                  key={o.id}
                  order={o}
                  selected={order?.id === o.id}
                  onSelect={() => choose({ type: "order", id: o.id })}
                  onPin={() => {
                    pinOrder(o.id);
                    redraw();
                  }}
                />
              ))}
              {queued.length + inTransit.length === 0 && (
                <div className="empty">
                  <Check size={25} />
                  <strong>All caught up.</strong>
                  <span>
                    {game.time < 240
                      ? "More orders are on their way."
                      : "Bring the fleet home."}
                  </span>
                </div>
              )}
            </div>
            <div className="queue-footer">
              <span className="status-dot" />{" "}
              {game.auto ? "Automatic dispatch on" : "Manual dispatch"}
              {!isBattle && (
                <button
                  onClick={() => {
                    game.auto = !game.auto;
                    redraw();
                  }}
                >
                  {game.auto ? "Take over" : "Enable"}
                </button>
              )}
              {isBattle && (
                <span className="human-control">Your choices only</span>
              )}
            </div>
          </aside>
          <div className="fleet-strip">
            <span className="eyebrow">YOUR FLEET</span>
            <div>
              {game.vans.map((v) => (
                <button
                  key={v.id}
                  title={`${v.name} · ${v.chilled ? "refrigerated · " : ""}${v.state}`}
                  className={`${v.chilled ? "cold " : ""}${v.id === van?.id ? "chosen " : ""}${v.state === "idle" ? "idle" : "moving"}`}
                  onClick={() => choose({ type: "van", id: v.id })}
                >
                  <Truck size={18} />
                  <span>{v.id.replace("van-", "").padStart(2, "0")}</span>
                  <i />
                </button>
              ))}
            </div>
            <span className="fleet-summary">
              {game.vans.filter((v) => v.state !== "idle").length} out and about
            </span>
          </div>
          {game.incidents.length > 0 && (
            <div className="incident-stack">
              {game.incidents.map((i) => (
                <button
                  key={i.id}
                  className="incident-banner"
                  onClick={() => {
                    choose({ type: "incident", id: i.id });
                    game.cameraFocus = {
                      x: i.kind === "power" ? -36 : 0,
                      z: i.kind === "bridge" ? -24 : 8,
                      serial: Date.now(),
                    };
                  }}
                >
                  <span className="incident-symbol">!</span>
                  <span>
                    <b>{incidentNames[i.kind]}</b>
                    <small>
                      {i.kind === "bridge"
                        ? "Traffic rerouting via South Crossing"
                        : i.kind === "power"
                          ? "Loading paused · loaded vans can leave"
                          : "Reduced speed around the market"}
                    </small>
                  </span>
                  <strong>{Math.ceil(i.until - game.time)}s</strong>
                </button>
              ))}
            </div>
          )}
          {reviews.length > 0 && (
            <ReviewCard
              decision={reviews[0]}
              count={reviews.length}
              redraw={redraw}
            />
          )}
          {(order || van || depot || game.selection?.type === "incident") &&
            !director &&
            !inbox &&
            !decisions && (
              <aside className="inspector panel">
                <button
                  className="close"
                  title="Close inspector"
                  onClick={() => choose(null)}
                >
                  <X size={17} />
                </button>
                {order && (
                  <>
                    <span className="eyebrow">
                      ORDER {order.id.replace("order-", "#")}
                    </span>
                    <h2>{placeById[order.destination]?.name}</h2>
                    <div className="type-pill">
                      {order.chilled ? (
                        <Snowflake size={13} />
                      ) : (
                        <Package size={13} />
                      )}{" "}
                      {order.chilled ? "Chilled delivery" : "Standard parcel"}
                    </div>
                    <blockquote>“{order.note}”</blockquote>
                    {isBattle && match.variant === "chaos" && (
                      <button
                        className="inbox-order-link"
                        onClick={() => {
                          choose(null);
                          setInbox(true);
                        }}
                      >
                        <Mail size={13} />
                        Check the inbox for customer updates
                        {order.held ? " · THIS ORDER IS HELD" : ""}
                      </button>
                    )}
                    <dl>
                      <div>
                        <dt>Pickup</dt>
                        <dd>{placeById[order.source]?.name}</dd>
                      </div>
                      <div>
                        <dt>Due in</dt>
                        <dd>{Math.ceil(order.due - game.time)} seconds</dd>
                      </div>
                      <div>
                        <dt>Status</dt>
                        <dd>{order.status}</dd>
                      </div>
                      <div>
                        <dt>Interpretation</dt>
                        <dd>
                          {order.interpretation === "jev"
                            ? "Live Jev"
                            : order.interpretation === "local"
                              ? "Local rules"
                              : order.interpretation}
                        </dd>
                      </div>
                    </dl>
                    {order.status === "queued" && (
                      <>
                        <button
                          className="secondary full"
                          onClick={() => {
                            pinOrder(order.id);
                            redraw();
                          }}
                        >
                          <Pin size={14} />
                          {order.pinned ? "Unpin order" : "Pin as next"}
                        </button>
                        {order.interpretation === "review" && (
                          <div className="button-row">
                            <button
                              className="secondary"
                              onClick={() =>
                                resolveOrder(
                                  order.id,
                                  "standard",
                                  order.urgency,
                                  "manual",
                                )
                              }
                            >
                              Standard
                            </button>
                            <button
                              className="secondary"
                              onClick={() =>
                                resolveOrder(
                                  order.id,
                                  "chilled",
                                  order.urgency,
                                  "manual",
                                )
                              }
                            >
                              Chilled
                            </button>
                          </div>
                        )}
                        <label className="small-label">
                          DELIVERY ESTIMATES
                        </label>
                        <p className="estimate-note">
                          Road travel + loading + known depot delays. Hover or
                          focus a van to preview its route.
                          {game.paused && " Resume to assign."}
                        </p>
                        <div className="assign-grid eta-grid">
                          {assignmentOptions.map((option, index) => (
                            <button
                              className={`secondary eta-option ${index === 0 ? "recommended" : ""}`}
                              key={option.van.id}
                              title={
                                game.paused
                                  ? "Preview route · resume to assign"
                                  : "Assign this van"
                              }
                              onMouseEnter={() => {
                                game.previewVan = option.van.id;
                                redraw();
                              }}
                              onFocus={() => {
                                game.previewVan = option.van.id;
                                redraw();
                              }}
                              onMouseLeave={() => {
                                game.previewVan = null;
                                redraw();
                              }}
                              onBlur={() => {
                                game.previewVan = null;
                                redraw();
                              }}
                              onClick={() => {
                                game.previewVan = option.van.id;
                                if (!game.paused)
                                  assignOrder(order.id, option.van.id);
                                redraw();
                              }}
                            >
                              <span className="eta-title">
                                <Truck size={14} />
                                {option.van.name}
                                <b>~{Math.ceil(option.totalSeconds)}s</b>
                              </span>
                              <span>
                                Pickup {Math.ceil(option.pickupSeconds)}s
                                {option.outageSeconds > 0.5
                                  ? ` · depot wait ${Math.ceil(option.outageSeconds)}s`
                                  : ""}
                              </span>
                              <span
                                className={
                                  option.onTime ? "eta-ontime" : "eta-late"
                                }
                              >
                                {index === 0 ? "Fastest compatible · " : ""}
                                {option.onTime ? "On time" : "Late risk"}
                              </span>
                            </button>
                          ))}
                          {!assignmentOptions.length && (
                            <small>
                              No available van has a compatible route yet.
                            </small>
                          )}
                        </div>
                        <p className="estimate-note">
                          {isBattle
                            ? "Choose the van that best fits your plan."
                            : "Autopilot balances these estimates across the whole queue."}{" "}
                          Traffic at junctions can change arrival times.
                        </p>
                      </>
                    )}
                    {order.assignment && (
                      <div className="assignment-reason">
                        <span className="eyebrow">WHY THIS VAN</span>
                        <p>{order.assignment.reason}</p>
                        <small>
                          At assignment: ~{Math.ceil(order.assignment.eta)}s
                          delivery · {Math.ceil(order.assignment.pickup)}s to
                          pickup
                        </small>
                      </div>
                    )}
                    {order.vanId && (
                      <button
                        className="secondary full"
                        onClick={() =>
                          choose({ type: "van", id: order.vanId! })
                        }
                      >
                        Inspect assigned van <ArrowRight size={14} />
                      </button>
                    )}
                  </>
                )}
                {van && (
                  <>
                    <span className="eyebrow">
                      FLEET / {van.chilled ? "COLD CHAIN" : "STANDARD"}
                    </span>
                    <div className="van-illustration">
                      <Truck size={68} strokeWidth={1} />
                      {van.chilled && <Snowflake size={18} />}
                    </div>
                    <h2>{van.name}</h2>
                    <div className="type-pill">
                      <span className="status-dot" />
                      {van.state.replaceAll("_", " ")}
                    </div>
                    <dl>
                      <div>
                        <dt>Home base</dt>
                        <dd>{placeById[van.home]?.name}</dd>
                      </div>
                      <div>
                        <dt>Current job</dt>
                        <dd>
                          {van.orderId?.replace("order-", "#") || "Available"}
                        </dd>
                      </div>
                      <div>
                        <dt>Rush boost</dt>
                        <dd>
                          {van.rushUntil > game.time
                            ? `${Math.ceil(van.rushUntil - game.time)}s active`
                            : "Ready"}
                        </dd>
                      </div>
                    </dl>
                    <button
                      className="primary full"
                      disabled={game.boosts === 0 || van.rushUntil > game.time}
                      onClick={() => {
                        rushVan(van.id);
                        redraw();
                      }}
                    >
                      <Zap size={15} /> Rush · {game.boosts} left
                    </button>
                    <button
                      className="secondary full"
                      onClick={() => {
                        game.follow = !game.follow;
                        redraw();
                      }}
                    >
                      <Crosshair size={14} />
                      {game.follow ? "Stop following" : "Follow van"}
                    </button>
                  </>
                )}
                {depot && (
                  <>
                    <span className="eyebrow">OPERATIONS BASE</span>
                    <h2>{depot.name}</h2>
                    <p className="muted">
                      {game.incidents.some((i) => i.kind === "power") &&
                      depot.id === "west-depot"
                        ? "Power interrupted. New loading resumes when the outage clears."
                        : "Loading bays open. Ready for the next delivery."}
                    </p>
                    <dl>
                      <div>
                        <dt>Waiting pickups</dt>
                        <dd>
                          {
                            game.orders.filter(
                              (o) =>
                                o.source === depot.id && o.status === "queued",
                            ).length
                          }
                        </dd>
                      </div>
                      <div>
                        <dt>Fleet based here</dt>
                        <dd>4 vans</dd>
                      </div>
                    </dl>
                    <button
                      className="secondary full"
                      onClick={() => focusPlace(depot.id)}
                    >
                      Focus depot <Crosshair size={14} />
                    </button>
                  </>
                )}
                {game.selection?.type === "incident" && (
                  <>
                    <span className="eyebrow">CITY BULLETIN</span>
                    <h2>
                      {
                        incidentNames[
                          game.incidents.find(
                            (i) => i.id === game.selection?.id,
                          )?.kind || "bridge"
                        ]
                      }
                    </h2>
                    <p className="muted">
                      {game.incidents.find((i) => i.id === game.selection?.id)
                        ?.report ||
                        "This incident has cleared. All routes are open."}
                    </p>
                    <button
                      className="secondary full"
                      onClick={() => {
                        setDecisions(true);
                      }}
                    >
                      Inspect decisions <ArrowRight size={14} />
                    </button>
                  </>
                )}
              </aside>
            )}
          <div className="bottom-dock">
            <div className="command-meta">
              <button
                className={`mode-badge ${live ? "live" : ""}`}
                onClick={() => setConnect(true)}
              >
                <Radio size={13} />
                {modeLabel}
                {jev.active && <span className="request-dot" />}
              </button>
              {!isBattle && (
                <div className="policy-picker">
                  <span>POLICY</span>
                  <select
                    aria-label="Dispatch policy"
                    value={game.policy}
                    onChange={(e) => {
                      setPolicy(e.target.value as Policy);
                      redraw();
                    }}
                  >
                    {Object.entries(policyNames).map(([id, name]) => (
                      <option value={id} key={id}>
                        {name}
                      </option>
                    ))}
                  </select>
                  {game.policyLocked && (
                    <span title="Your policy choice is locked">
                      <ShieldCheck size={12} />
                    </span>
                  )}
                </div>
              )}
              <button
                className="decision-link"
                onClick={() => {
                  setDecisions(!decisions);
                  setDirector(false);
                  setInbox(false);
                }}
              >
                <Sparkles size={13} />
                Decisions
              </button>
            </div>
            {isBattle ? (
              <div className="battle-instructions">
                {match.variant === "chaos" ? (
                  <button
                    className="inbox-launch"
                    onClick={() => {
                      choose(null);
                      setDirector(false);
                      setDecisions(false);
                      setInbox(!inbox);
                    }}
                  >
                    <Mail size={16} />
                    <span>
                      Dispatch Inbox
                      <b>
                        {chaos.you?.state.inbox.filter(
                          (m) => m.status !== "handled",
                        ).length ?? 0}{" "}
                        open
                      </b>
                    </span>
                  </button>
                ) : (
                  <Swords size={18} />
                )}
                <span>
                  <b>
                    {match.variant === "chaos"
                      ? "Read. Clarify. Adapt."
                      : "Your city. Your decisions."}
                  </b>
                  {match.variant === "chaos"
                    ? "Update the plan, then choose a van."
                    : "Select an order → choose a van. Rush can save a deadline."}
                </span>
              </div>
            ) : (
              <form className="command-bar" onSubmit={submit}>
                <span className="command-icon">
                  <Radio size={18} />
                </span>
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  aria-label="Dispatch command"
                  placeholder="Tell dispatch what matters…"
                />
                <kbd>↵</kbd>
                <button title="Send command" type="submit">
                  <ArrowRight size={20} />
                </button>
              </form>
            )}
            {!isBattle && jev.error && (
              <div className="fallback-note">Local fallback · {jev.error}</div>
            )}
          </div>
          <div className="activity-feed">
            {game.feed.slice(0, 3).map((f) => (
              <div key={f.id} className={`feed-item ${f.kind}`}>
                <span>
                  {f.kind === "delivery" ? (
                    <Check size={12} />
                  ) : f.kind === "incident" ? (
                    <Flag size={12} />
                  ) : (
                    <span className="mini-dot" />
                  )}
                </span>
                <p>{f.text}</p>
                <time>{clock(f.time)}</time>
              </div>
            ))}
          </div>
        </>
      )}
      {isBattle && active && (
        <BattleBoard
          showOpponent={
            !game.selection && !director && !decisions && !game.cinematic
          }
          onShowOpponent={() => {
            choose(null);
            setDirector(false);
            setDecisions(false);
            setInbox(false);
          }}
          onConnect={() => setConnect(true)}
          onRetry={() => {
            retryMatch();
            redraw();
          }}
          onDecisions={() => {
            setDecisions(true);
            setDirector(false);
            setInbox(false);
          }}
        />
      )}
      {isBattle && active && inbox && !game.cinematic && (
        <DispatchInbox
          onClose={() => setInbox(false)}
          onInspect={(id) => choose({ type: "order", id })}
        />
      )}
      {director && (
        <aside className="director panel">
          <button
            className="close"
            title="Close director"
            onClick={() => setDirector(false)}
          >
            <X size={17} />
          </button>
          <span className="eyebrow">SET THE SCENE</span>
          <h2>Director’s desk</h2>
          <p className="muted">
            {isBattle
              ? "Match incidents are scheduled identically in both cities."
              : "Real incidents. Real consequences."}
          </p>
          <button className="secondary full" onClick={openBattle}>
            <Swords size={14} />I will beat Jev
          </button>
          <label className="small-label">CITY DISRUPTIONS</label>
          {(["bridge", "power", "congestion"] as const).map((kind) => (
            <button
              className="director-event"
              key={kind}
              disabled={
                !active ||
                isBattle ||
                game.incidents.some((i) => i.kind === kind)
              }
              onClick={() => {
                triggerIncident(kind);
                redraw();
              }}
            >
              <span>
                {kind === "bridge"
                  ? "Close North Bridge"
                  : kind === "power"
                    ? "Cut West Depot power"
                    : "Slow the market"}
              </span>
              <span>
                {kind === "bridge" ? "35s" : kind === "power" ? "25s" : "30s"}{" "}
                <ArrowUpRight size={13} />
              </span>
            </button>
          ))}
          <div className="button-row">
            <button
              className="text-button"
              disabled={!active || isBattle}
              onClick={() => {
                clearIncidents();
                redraw();
              }}
            >
              Clear incidents
            </button>
            <button
              className="text-button"
              disabled={!active || isBattle}
              onClick={() => command("Something is wrong at the depot.")}
            >
              Ambiguous report
            </button>
          </div>
          <label className="small-label">AFTERNOON → DUSK</label>
          <input
            className="daylight-slider"
            aria-label="Daylight"
            type="range"
            min="0"
            max="1"
            step=".01"
            value={game.daylight ?? elapsed}
            onChange={(e) => {
              game.daylight = Number(e.target.value);
              redraw();
            }}
          />
          <div className="toggle-row">
            <span>Incident camera moments</span>
            <button
              className={`toggle ${game.incidentCameras ? "on" : ""}`}
              aria-label="Incident camera moments"
              aria-pressed={game.incidentCameras}
              onClick={() => {
                game.incidentCameras = !game.incidentCameras;
                redraw();
              }}
            >
              <i />
            </button>
          </div>
          <div className="toggle-row">
            <span>Reduced effects</span>
            <button
              className={`toggle ${game.reduced ? "on" : ""}`}
              aria-label="Reduced effects"
              onClick={() => {
                game.reduced = !game.reduced;
                redraw();
              }}
            >
              <i />
            </button>
          </div>
          <button
            className="secondary full"
            onClick={() => {
              game.cinematic = !game.cinematic;
              setDirector(false);
              redraw();
            }}
          >
            <Eye size={14} />
            Cinematic mode <kbd>C</kbd>
          </button>
          <button className="primary full" onClick={() => start("showcase")}>
            <Play size={14} />
            Start showcase
          </button>
          <button className="secondary full" onClick={() => start("shift")}>
            <RotateCcw size={14} />
            Restart shift
          </button>
          <button className="text-button full" onClick={() => start("free")}>
            Switch to free play <ArrowUpRight size={13} />
          </button>
          <div className="technical">
            <span>
              {Math.round(
                (window as Window & { __tinyopsFps?: number }).__tinyopsFps ||
                  0,
              )}{" "}
              FPS
            </span>
            <span>{jev.attempts}/100 requests</span>
            <span>8 vans · 2 depots</span>
          </div>
        </aside>
      )}
      {decisions && (
        <aside className="decisions panel">
          <button
            className="close"
            title="Close decisions"
            onClick={() => setDecisions(false)}
          >
            <X size={17} />
          </button>
          <span className="eyebrow">THE ACTUAL DECISION</span>
          <h2>Dispatch notebook</h2>
          <p className="muted">
            Inputs, returned probabilities, and what the city applied.
          </p>
          <div className="decisions-scroll">
            {jev.decisions.map((d) => (
              <DecisionCard key={d.id} decision={d} />
            ))}
            {!jev.decisions.length && (
              <p className="muted">
                Decisions appear as orders and reports arrive.
              </p>
            )}
          </div>
        </aside>
      )}
      {game.sceneMoment && (
        <div className="scene-moment" role="status">
          <span>{game.sceneMoment}</span>
          <small>Drag the city to take control</small>
        </div>
      )}
      <div className="camera-tools">
        <button title="Home view (Home)" onClick={() => homeCamera()}>
          <Home size={17} />
        </button>
        <button
          title="Cinematic mode (C)"
          className={game.cinematic ? "selected" : ""}
          onClick={() => {
            game.cinematic = !game.cinematic;
            redraw();
          }}
        >
          <Eye size={17} />
        </button>
      </div>
      <footer className="world-caption">
        <span>
          {game.cinematic
            ? `${modeLabel} · ${game.mode === "showcase" ? "SHOWCASE" : "CINEMATIC"}`
            : "BUILT FOR THE LITTLE THINGS"}
        </span>
        <span>
          DRAG TO PAN <b>·</b> SCROLL TO ZOOM <b>·</b> RIGHT DRAG TO ORBIT
        </span>
      </footer>
      {game.paused && active && !game.cinematic && (
        <button
          className="paused-banner"
          onClick={() => {
            game.paused = false;
            redraw();
          }}
        >
          <Pause size={15} />
          <strong>Shift paused</strong>
          <span>Click to resume</span>
          <Play size={14} />
        </button>
      )}
      {battleLobby && (
        <BattleLobby
          onClose={() => setBattleLobby(false)}
          onConnect={() => setConnect(true)}
          onStart={launchBattle}
        />
      )}
      {connect && (
        <div className="modal-scrim">
          <section className="modal connection-modal">
            <button
              className="close"
              title="Close connection"
              onClick={() => {
                setConnect(false);
                setKey("");
              }}
            >
              <X size={19} />
            </button>
            <span className="modal-symbol">
              <Sparkles size={25} />
            </span>
            <span className="eyebrow">A LITTLE INTELLIGENCE</span>
            <h2>
              {battleLobby || isBattle
                ? "Connect your opponent."
                : "Meet your co-dispatcher."}
            </h2>
            <p>
              {battleLobby || isBattle
                ? "Jev will choose its own fleet assignments in your live match. Your key stays in this page session."
                : "Jev interprets customer notes and dispatch reports. You stay in charge of the fleet."}
            </p>
            <form onSubmit={doConnect}>
              <label htmlFor="api-key">OpenRouter API key</label>
              <input
                id="api-key"
                type="password"
                autoComplete="off"
                spellCheck={false}
                placeholder="Paste your OpenRouter key"
                value={key}
                onChange={(e) => setKey(e.target.value)}
              />
              <small>Kept in memory for this page session only.</small>
              <button
                className="primary full"
                disabled={!key.trim() || connecting}
              >
                {connecting ? "Checking connection…" : "Connect Jev"}
                <ArrowRight size={17} />
              </button>
            </form>
            {connectionMessage && (
              <div
                className={`connection-result ${live ? "success" : ""}`}
                role="status"
              >
                {connectionMessage}
              </div>
            )}
            {(battleLobby || isBattle) && live && (
              <button
                className="secondary full"
                onClick={() => setConnect(false)}
              >
                Return to match <ArrowRight size={15} />
              </button>
            )}
            <button
              className="text-button full"
              onClick={() => {
                jev.clearKey();
                setKey("");
                if (
                  isBattle &&
                  match.opponent === "jev" &&
                  game.phase === "playing"
                ) {
                  game.paused = true;
                  match.issue =
                    "Jev disconnected. Reconnect and retry to continue this same match.";
                }
                setConnectionMessage(
                  battleLobby || isBattle
                    ? "Key cleared. A live match requires a Jev connection."
                    : "Key cleared. Local Autopilot is ready.",
                );
              }}
            >
              {battleLobby || isBattle
                ? "Disconnect Jev · clear key"
                : "Clear key · use Local Autopilot"}
            </button>
          </section>
        </div>
      )}
      {help && (
        <div className="modal-scrim">
          <section className="modal">
            <button
              className="close"
              title="Close help"
              onClick={() => setHelp(false)}
            >
              <X size={19} />
            </button>
            <span className="eyebrow">WELCOME TO RIVERSIDE</span>
            <h2>Keep good things moving.</h2>
            <p>
              Complete 24 deliveries in six minutes. On-time deliveries earn 100
              points; late ones earn 50. A failed order costs 50.
            </p>
            <div className="help-steps">
              <div>
                <Truck />
                <span>
                  <b>Dispatch your way</b>Local Autopilot gets vans moving. Take
                  over to assign jobs yourself, or pin an order as next.
                </span>
              </div>
              <div>
                <Snowflake />
                <span>
                  <b>Mind the cold chain</b>Chilled orders need a refrigerated
                  van. Cold first reserves those vans when needed.
                </span>
              </div>
              <div>
                <Zap />
                <span>
                  <b>A little extra speed</b>Select a van and use one of three
                  Rush boosts: 25% faster for 15 seconds.
                </span>
              </div>
            </div>
            <div className="shortcut-grid">
              <span>
                <kbd>Space</kbd> Pause
              </span>
              <span>
                <kbd>Home</kbd> Reset view
              </span>
              <span>
                <kbd>F</kbd> Follow van
              </span>
              <span>
                <kbd>C</kbd> Cinematic
              </span>
            </div>
            <button className="primary full" onClick={() => setHelp(false)}>
              Got it <ArrowRight size={16} />
            </button>
          </section>
        </div>
      )}
      {isBattle && game.phase === "ended" && !battleLobby && !connect && (
        <BattleResults onRematch={openBattle} onExit={() => start("shift")} />
      )}
      {game.phase === "ended" && !isBattle && !battleLobby && !connect && (
        <div className="modal-scrim end-scrim">
          <section className="modal end-card">
            <div className="medal">
              <Flag size={34} />
            </div>
            <span className="eyebrow">RIVERSIDE THANKS YOU</span>
            <h2>
              {game.medal === "Gold"
                ? "A golden delivery day."
                : game.medal === "Silver"
                  ? "A very good shift."
                  : game.medal === "Bronze"
                    ? "You kept things moving."
                    : "That’s a wrap."}
            </h2>
            <span className="medal-label">
              {game.medal === "Shift complete"
                ? "SHIFT COMPLETE"
                : `${game.medal.toUpperCase()} DISPATCHER`}
            </span>
            <div className="final-score">
              {game.score.toLocaleString()}
              <span>POINTS</span>
            </div>
            <div className="end-totals">
              <div>
                <b>{game.delivered}</b>
                <span>DELIVERED</span>
              </div>
              <div>
                <b>{game.onTime}</b>
                <span>ON TIME</span>
              </div>
              <div>
                <b>{game.failed}</b>
                <span>FAILED</span>
              </div>
            </div>
            <p>
              {game.boosts} unused Rush boosts · {game.boosts * 25} bonus points
            </p>
            <button className="primary full" onClick={() => start("shift")}>
              One more shift <RotateCcw size={16} />
            </button>
            <button className="secondary full" onClick={() => start("free")}>
              Keep going in free play <ArrowRight size={16} />
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
function OrderCard({
  order: o,
  selected,
  onSelect,
  onPin,
}: {
  order: Order;
  selected: boolean;
  onSelect: () => void;
  onPin: () => void;
}) {
  const due = Math.ceil(o.due - game.time);
  return (
    <div
      className={`order-card ${selected ? "selected" : ""} ${o.chilled ? "chilled" : ""}`}
    >
      <button className="order-select" onClick={onSelect}>
        <div className="order-top">
          <span className={`parcel-icon ${o.chilled ? "cold" : ""}`}>
            {o.chilled ? <Snowflake size={17} /> : <Package size={17} />}
          </span>
          <div>
            <b>{placeById[o.destination]?.name}</b>
            <span>
              {o.id.replace("order-", "#")} <i>·</i>{" "}
              {o.held
                ? "Holding for instructions"
                : o.status === "queued"
                  ? o.chilled
                    ? "Keep it cool"
                    : "Standard parcel"
                  : o.status === "loaded"
                    ? "On the road"
                    : "Picking up"}
            </span>
          </div>
          <ChevronRight size={13} />
        </div>
        <div className="order-bottom">
          <span className={due < 15 ? "urgent" : ""}>
            <Clock3 size={11} />
            {due >= 0 ? `Due in ${due}s` : `${-due}s late`}
          </span>
          <small>
            {o.interpretation === "jev"
              ? "JEV"
              : o.interpretation === "pending"
                ? "RECEIVED"
                : o.interpretation === "review"
                  ? "REVIEW"
                  : "LOCAL"}
          </small>
        </div>
      </button>
      {o.status === "queued" && (
        <button
          className={`pin-button ${o.pinned ? "pinned" : ""}`}
          aria-label={`${o.pinned ? "Unpin" : "Pin"} ${o.id}`}
          onClick={onPin}
        >
          <Pin size={12} />
        </button>
      )}
    </div>
  );
}
function DecisionCard({ decision: d }: { decision: Decision }) {
  return (
    <article className="decision-card">
      <div>
        <span className={d.source === "jev" ? "live-text" : ""}>
          {d.source === "jev" ? "LIVE JEV" : "LOCAL RULES"}
        </span>
        <b>{d.status}</b>
      </div>
      <p>“{d.input}”</p>
      <strong>{d.choice.replaceAll("_", " ").replace("|", " → ")}</strong>
      {d.kind === "dispatch" && d.rushVan && (
        <small>Rush: {d.rushVan === "none" ? "saved" : d.rushVan}</small>
      )}
      {d.kind === "inbox" && d.choice === "apply_update" && (
        <p className="decision-update">
          {d.target ?? "No order"} ·{" "}
          {d.destination === "keep"
            ? "same address"
            : (placeById[d.destination ?? ""]?.name ?? d.destination)}{" "}
          ·{" "}
          {d.deadline === "keep" ? "same deadline" : clock(Number(d.deadline))}
        </p>
      )}
      {d.strategy && (
        <small>Standing approach: {strategyNames[d.strategy]}</small>
      )}
      {d.reason && (
        <p className="reported-reason">
          Jev’s reported reason:{" "}
          {reasonChoices[d.reason as keyof typeof reasonChoices]}
        </p>
      )}
      {d.source === "jev" && (
        <>
          <dl>
            <div>
              <dt>Choice confidence</dt>
              <dd>{d.confidence?.toFixed(2) ?? "—"}</dd>
            </div>
            <div>
              <dt>Clarification probability</dt>
              <dd>{d.clarification?.toFixed(2) ?? "—"}</dd>
            </div>
            <div>
              <dt>Browser request</dt>
              <dd>{Math.round(d.durationMs)} ms</dd>
            </div>
          </dl>
          {Object.entries(d.probabilities || {}).map(([k, v]) => (
            <div className="probability" key={k}>
              <span>{k.replaceAll("_", " ")}</span>
              <i>
                <b style={{ width: `${v * 100}%` }} />
              </i>
              <small>{v.toFixed(2)}</small>
            </div>
          ))}
          <small className="model-name">{d.model}</small>
        </>
      )}
      {d.error && <small className="error-text">{d.error}</small>}
    </article>
  );
}

function ReviewCard({
  decision: d,
  count,
  redraw,
}: {
  decision: Decision;
  count: number;
  redraw: () => void;
}) {
  const targetReview = d.needsSelection || d.choice === "ambiguous";
  const vanTarget = targetReview && /\bvan\b/i.test(d.input);
  const depotTarget = targetReview && /\bdepot\b/i.test(d.input);
  function accept(choice?: string) {
    approveDecision(d, choice);
    redraw();
  }
  return (
    <div className="review-panel panel">
      <div className="review-heading">
        <span>
          <Sparkles size={15} /> YOUR CALL
        </span>
        <b>{count} pending</b>
      </div>
      <h3>
        {vanTarget
          ? "Which van do you mean?"
          : depotTarget
            ? "Which depot do you mean?"
            : "Review dispatch interpretation"}
      </h3>
      <p>“{d.input}”</p>
      {game.paused && <p>Resume the shift to apply this review.</p>}
      {vanTarget ? (
        <div className="assign-grid">
          {game.vans.map((v) => (
            <button
              disabled={game.paused}
              key={v.id}
              className="secondary"
              onClick={() => accept(v.id)}
            >
              {v.name}
            </button>
          ))}
        </div>
      ) : depotTarget ? (
        <div className="button-row">
          <button
            disabled={game.paused}
            className="secondary"
            onClick={() => accept("focus_west")}
          >
            West Depot
          </button>
          <button
            disabled={game.paused}
            className="secondary"
            onClick={() => accept("focus_east")}
          >
            East Depot
          </button>
        </div>
      ) : d.kind === "order" ? (
        <div className="button-row">
          <button
            disabled={game.paused}
            className="secondary"
            onClick={() => accept("standard")}
          >
            Standard
          </button>
          <button
            disabled={game.paused}
            className="secondary"
            onClick={() => accept("chilled")}
          >
            Chilled
          </button>
        </div>
      ) : (
        <>
          <span className="proposal">
            Proposed:{" "}
            {policyNames[d.choice as Policy] || d.choice.replaceAll("_", " ")}
          </span>
          {!targetReview && (
            <button
              disabled={game.paused}
              className="primary full"
              onClick={() => accept()}
            >
              Apply proposal
            </button>
          )}
        </>
      )}
      <button
        className="text-button full"
        onClick={() => {
          d.status = "rejected";
          redraw();
        }}
      >
        Dismiss review
      </button>
    </div>
  );
}
