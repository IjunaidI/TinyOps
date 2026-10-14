import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Check,
  ChevronRight,
  Clock3,
  HeartPulse,
  HardHat,
  Landmark,
  Mail,
  MapPin,
  MessageCircle,
  ShieldAlert,
  Wallet,
  X,
} from "lucide-react";
import type { CityAlert } from "./cityAlerts";

export const alertKinds = {
  request: { label: "Letters", Icon: Mail },
  petition: { label: "Your requests", Icon: MessageCircle },
  asset: { label: "Infrastructure", Icon: ShieldAlert },
  service: { label: "Services", Icon: HeartPulse },
  promise: { label: "Commitments", Icon: Clock3 },
  construction: { label: "Construction", Icon: HardHat },
  council: { label: "Council", Icon: Landmark },
  budget: { label: "Budget", Icon: Wallet },
};
export function AlertGlyph({
  kind,
  size = 17,
}: {
  kind: CityAlert["kind"];
  size?: number;
}) {
  const Icon = alertKinds[kind].Icon;
  return <Icon size={size} aria-hidden="true" />;
}

/** Transient announcements are a view of active alerts, never a second event log. */
export function AlertTray({
  alerts,
  generation,
  onOpen,
  onBrowse,
}: {
  alerts: CityAlert[];
  generation: number;
  onOpen: (alert: CityAlert) => void;
  onBrowse: () => void;
}) {
  const seen = useRef(new Set<string>());
  const previousGeneration = useRef<number | null>(null);
  const [queue, setQueue] = useState<string[]>([]);
  const [settling, setSettling] = useState(false);
  const keys = alerts.map((a) => `${a.id}:${a.severity}`).join("|");
  useEffect(() => {
    if (previousGeneration.current !== generation) {
      previousGeneration.current = generation;
      seen.current = new Set(alerts.map((a) => `${a.id}:${a.severity}`));
      setQueue([]);
      return;
    }
    const fresh = alerts.filter(
      (a) => !seen.current.has(`${a.id}:${a.severity}`),
    );
    for (const alert of fresh)
      seen.current.add(`${alert.id}:${alert.severity}`);
    if (seen.current.size > 500)
      seen.current = new Set(alerts.map((a) => `${a.id}:${a.severity}`));
    setQueue((current) =>
      [
        ...current.filter((id) => alerts.some((a) => a.id === id)),
        ...fresh.map((a) => a.id),
      ]
        .filter((id, index, all) => all.indexOf(id) === index)
        .slice(0, 4),
    );
  }, [keys, generation]);
  const current = alerts.find((a) => a.id === queue[0]);
  useEffect(() => {
    setSettling(false);
    if (!current) return;
    const fold = setTimeout(() => setSettling(true), 5200);
    const clear = setTimeout(() => setQueue((q) => q.slice(1)), 5800);
    return () => {
      clearTimeout(fold);
      clearTimeout(clear);
    };
  }, [current?.id]);
  const urgent = alerts.filter((a) => a.severity === "urgent").length;
  return (
    <div className="city-alert-tray">
      <button
        className={`city-alert-bell ${urgent ? "has-urgent" : ""} ${settling ? "is-receiving" : ""}`}
        onClick={onBrowse}
        aria-label={`Open city alerts: ${alerts.length} active`}
      >
        <Bell size={18} />
        <span>City alerts</span>
        <b>{alerts.length}</b>
        {urgent > 0 && <i aria-label={`${urgent} urgent alerts`} />}
      </button>
      {current && (
        <div
          className={`city-alert-arrival is-${current.severity} ${settling ? "is-settling" : ""}`}
          role="status"
          aria-live="polite"
        >
          <span className="city-alert-symbol">
            <AlertGlyph kind={current.kind} />
          </span>
          <button
            className="city-arrival-body"
            onClick={() => {
              onOpen(current);
              setQueue((q) => q.slice(1));
            }}
          >
            <small>NEW IN YOUR CITY</small>
            <strong>{current.title}</strong>
            <span>{current.detail}</span>
            <em>
              {current.position ? "Show on map" : "Review at City Hall"}{" "}
              <ChevronRight size={13} />
            </em>
          </button>
          <button
            className="city-arrival-close"
            aria-label="Dismiss alert popup"
            onClick={() => setQueue((q) => q.slice(1))}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

export function CityAlertCenter({
  alerts,
  onOpen,
  selectedId,
}: {
  alerts: CityAlert[];
  onOpen: (alert: CityAlert) => void;
  selectedId?: string | null;
}) {
  const [filter, setFilter] = useState<"all" | "urgent" | CityAlert["kind"]>(
    "all",
  );
  const filtered = alerts.filter(
    (a) =>
      filter === "all" ||
      (filter === "urgent" && a.severity === "urgent") ||
      a.kind === filter,
  );
  const kinds = (Object.keys(alertKinds) as CityAlert["kind"][]).filter(
    (kind) => alerts.some((a) => a.kind === kind),
  );
  return (
    <section className="city-alert-center">
      <div className="city-alert-center-intro">
        <span className="civic-eyebrow">YOUR CITY, AT A GLANCE</span>
        <h2>What needs attention.</h2>
        <p>Choose an alert to visit its location and see what you can do.</p>
      </div>
      <div className="city-alert-filters" aria-label="Filter city alerts">
        <button
          aria-pressed={filter === "all"}
          onClick={() => setFilter("all")}
        >
          All <b>{alerts.length}</b>
        </button>
        <button
          aria-pressed={filter === "urgent"}
          onClick={() => setFilter("urgent")}
        >
          Urgent <b>{alerts.filter((a) => a.severity === "urgent").length}</b>
        </button>
        {kinds.map((kind) => (
          <button
            key={kind}
            aria-pressed={filter === kind}
            onClick={() => setFilter(kind)}
          >
            <AlertGlyph kind={kind} size={13} />
            {alertKinds[kind].label}
          </button>
        ))}
      </div>
      <div className="city-alert-list">
        {filtered.map((alert) => (
          <button
            key={alert.id}
            className={`city-alert-row is-${alert.severity} ${selectedId === alert.id ? "is-selected" : ""}`}
            onClick={() => onOpen(alert)}
          >
            <span className="city-alert-symbol">
              <AlertGlyph kind={alert.kind} />
            </span>
            <span>
              <small>
                {alertKinds[alert.kind].label} ·{" "}
                {alert.severity === "urgent"
                  ? "Urgent"
                  : alert.severity === "warning"
                    ? "Needs attention"
                    : "For review"}
              </small>
              <strong>{alert.title}</strong>
              <p>{alert.detail}</p>
              <em>
                {alert.position ? (
                  <>
                    <MapPin size={12} /> Visit location
                  </>
                ) : (
                  <>Review at City Hall</>
                )}
              </em>
            </span>
            <ChevronRight size={15} />
          </button>
        ))}
        {!filtered.length && (
          <div className="city-alert-empty">
            <Check size={24} />
            <h3>
              {alerts.length
                ? "Nothing here right now."
                : "Your city is settled."}
            </h3>
            <p>New requests and changes will appear here as the city grows.</p>
          </div>
        )}
      </div>
      <p className="city-alert-footnote">
        Alerts clear when their underlying issue is resolved. Closing a popup
        keeps the issue in this list.
      </p>
    </section>
  );
}
