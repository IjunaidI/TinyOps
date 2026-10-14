import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowRight,
  Check,
  Clock3,
  Cloud,
  Construction,
  HeartPulse,
  Landmark,
  MapPin,
  Pause,
  Play,
  ShieldCheck,
  Users,
} from "lucide-react";
import { city, getCivicActions, performCivicAction } from "./engine";
import type { ActionResult, DistrictId } from "./types";
import type {
  CivicActionCategory,
  CivicActionOption,
  LivingEvent,
} from "./livingTypes";
import { projectById } from "./catalog";
import { PixelIcon } from "./PixelArt";
import CitizenPortrait from "./CitizenPortrait";
import { citizenEmotion, citizenEmotionLabels } from "./citizenIdentity";

type LifeSection =
  | "services"
  | "residents"
  | "promises"
  | "infrastructure"
  | "projects"
  | "economy";
export type LivingCitySelection = {
  section: LifeSection | CivicActionCategory;
  id?: string;
  districtId?: DistrictId;
};
type ActionHandler = (result: ActionResult, success: string) => boolean;
const money = (value: number) => `$${Math.round(value).toLocaleString()}`;
const round = (value: number) => Math.round(value).toLocaleString();
const day = (value: number) => Math.max(1, Math.floor(value));
const label = (value: string) =>
  value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
const districtName = (id?: DistrictId) =>
  city.districts.find((d) => d.id === id)?.name ?? "Citywide";
const sectionFor = (section: LivingCitySelection["section"]): LifeSection =>
  section === "construction"
    ? "projects"
    : section === "transport"
      ? "services"
      : section === "housing" || section === "council"
        ? "economy"
        : section;
const sectionItems = [
  { id: "services", label: "Services", icon: HeartPulse },
  { id: "residents", label: "People", icon: Users },
  { id: "promises", label: "Promises", icon: Check },
  { id: "infrastructure", label: "Infrastructure", icon: ShieldCheck },
  { id: "projects", label: "Delivery", icon: Construction },
  { id: "economy", label: "Council & growth", icon: Landmark },
] as const;
const actionCategories: Record<LifeSection, CivicActionCategory[]> = {
  services: ["services", "transport"],
  residents: ["residents", "services", "transport", "housing"],
  promises: ["promises"],
  infrastructure: ["infrastructure"],
  projects: ["construction"],
  economy: ["housing", "council"],
};

function Tag({ children, tone = "" }: { children: ReactNode; tone?: string }) {
  return <span className={`living-tag ${tone}`}>{children}</span>;
}
function LocateButton({
  selection,
  onLocate,
  name,
}: {
  selection: LivingCitySelection;
  onLocate?: (selection: LivingCitySelection) => void;
  name: string;
}) {
  if (!onLocate) return null;
  return (
    <button
      className="living-text-button living-locate"
      onClick={() => onLocate(selection)}
      aria-label={`Show ${name} on map`}
    >
      <MapPin size={12} /> Show on map
    </button>
  );
}
function Stats({ items }: { items: [string, string | number][] }) {
  return (
    <dl className="living-stats">
      {items.map(([name, value]) => (
        <div key={name}>
          <dt>{name}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
function Facts({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="living-facts">
      {items.map(([name, value]) => (
        <div key={name}>
          <dt>{name}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
function Meter({ value, name }: { value: number; name: string }) {
  const safe = Math.max(0, Math.min(100, value));
  return (
    <div
      className={`living-meter ${safe < 40 ? "bad" : safe < 70 ? "warn" : ""}`}
      role="meter"
      aria-label={name}
      aria-valuenow={Math.round(safe)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${safe}%` }} />
    </div>
  );
}
function SectionHeading({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children?: ReactNode;
}) {
  return (
    <header className="living-section-heading">
      <div>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
      {children}
    </header>
  );
}
function CausalHistory({
  events,
  sourceId,
  districtId,
}: {
  events: LivingEvent[];
  sourceId?: string;
  districtId?: DistrictId;
}) {
  const relevant = events
    .filter((event) =>
      sourceId
        ? event.sourceId === sourceId
        : districtId
          ? event.districtId === districtId
          : true,
    )
    .slice(0, 5);
  return (
    <details className="living-details">
      <summary>Why did this happen?</summary>
      {relevant.length ? (
        <ol className="living-memory">
          {relevant.map((event) => (
            <li key={event.id}>
              <span>
                DAY {day(event.day)} · {label(event.kind)}
              </span>
              <strong>{event.title}</strong>
              <br />
              {event.text}
            </li>
          ))}
        </ol>
      ) : (
        <p>
          No specific event is recorded for this item yet. Its current report is
          shown above; future changes will appear here.
        </p>
      )}
    </details>
  );
}
function CivicActions({
  actions,
  onAction,
  title = "Decisions you can make",
  compact = false,
}: {
  actions: CivicActionOption[];
  onAction: ActionHandler;
  title?: string;
  compact?: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  const [showUnavailable, setShowUnavailable] = useState(true);
  const matching = actions.filter(
    (action) => showUnavailable || action.available,
  );
  const limit = compact ? 3 : 6;
  const visible = showAll ? matching : matching.slice(0, limit);
  if (!actions.length)
    return (
      <div className="living-actions">
        <p className="living-empty">
          No new decisions are available in this view right now. The city will
          offer more as conditions change.
        </p>
      </div>
    );
  return (
    <section className="living-actions" aria-label={title}>
      <SectionHeading
        title={title}
        text="Choose what to fund next. Each decision shows its cost, timing, and trade-offs."
      >
        <label className="living-unavailable-toggle">
          <input
            type="checkbox"
            checked={showUnavailable}
            onChange={(event) => setShowUnavailable(event.target.checked)}
          />{" "}
          Show unavailable decisions
        </label>
      </SectionHeading>
      <div className="living-action-grid">
        {visible.map((action) => (
          <article className="living-action" key={action.id}>
            <div className="living-card-top">
              <span>{districtName(action.districtId)}</span>
              <Tag tone={action.available ? "neutral" : "warn"}>
                {label(action.category)}
              </Tag>
            </div>
            <h4>{action.title}</h4>
            <p>{action.description}</p>
            {action.effectsHint &&
              (compact ? (
                <details className="living-action-tradeoffs">
                  <summary>Trade-offs</summary>
                  <p>{action.effectsHint}</p>
                </details>
              ) : (
                <p className="living-action-hint">{action.effectsHint}</p>
              ))}
            <footer>
              <span>
                {action.cost > 0 ? money(action.cost) : "No upfront cost"}
                <small>
                  {action.dayCost
                    ? action.dayCost > 0
                      ? `+${money(action.dayCost)} per day`
                      : `Saves ${money(Math.abs(action.dayCost))} per day`
                    : action.cost > 0
                      ? "Paid from the city treasury"
                      : "See the terms above"}
                </small>
              </span>
              <button
                disabled={
                  !action.available ||
                  city.paused ||
                  !!city.issue ||
                  city.phase !== "playing"
                }
                onClick={() =>
                  onAction(
                    performCivicAction(action.id, { actor: "you" }),
                    action.title,
                  )
                }
                aria-label={action.title}
              >
                Choose <ArrowRight size={12} />
              </button>
            </footer>
            {!action.available && (
              <p className="living-action-reason">
                {action.unavailableReason ||
                  "This action is not available at the moment."}
              </p>
            )}
          </article>
        ))}
      </div>
      {visible.length === 0 && (
        <p className="living-empty">
          No decisions can be made right now. Select “Show unavailable
          decisions” to see what is needed.
        </p>
      )}
      {matching.length > limit && (
        <button
          className="living-text-button"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll
            ? "Show fewer decisions"
            : `Show all ${matching.length} decisions`}{" "}
          <ArrowRight size={12} />
        </button>
      )}
    </section>
  );
}

export function DailyLivingBriefing({
  onOpen,
}: {
  onOpen: (selection: LivingCitySelection) => void;
}) {
  const living = city.living;
  if (!living) return null;
  const time = city.day + city.dayProgress;
  const worst = living.districts
    .flatMap((district) =>
      district.services.map((service) => ({ district, service })),
    )
    .sort((a, b) => a.service.coverage - b.service.coverage)[0];
  const due = living.promises
    .filter(
      (promise) =>
        promise.status === "active" || promise.status === "renegotiated",
    )
    .sort((a, b) => a.dueDay - b.dueDay)[0];
  const asset = living.assets
    .slice()
    .sort(
      (a, b) =>
        Number(b.outageUntil > time) - Number(a.outageUntil > time) ||
        Number(b.risk === "high") - Number(a.risk === "high"),
    )[0];
  const waiting = living.construction.assignments.filter(
    (assignment) => !assignment.crew,
  ).length;
  const developments: {
    id: string;
    title: string;
    text: string;
    cause: string;
    score: number;
    selection: LivingCitySelection;
  }[] = [];
  if (worst)
    developments.push({
      id: "service",
      title: `${worst.district.name}: ${worst.service.name.toLowerCase()}`,
      text: `${round(worst.service.served)} of ${round(worst.service.demand)} residents served. ${round(worst.service.backlog)} waiting.`,
      cause: `Usable capacity is ${round(worst.service.capacity)}, with ${worst.service.staff} additional staff and ${round(worst.district.access * 100)}% street access. Funding, completed facilities, and access all affect how many people can be served.`,
      score: 35 + (1 - worst.service.coverage) * 70,
      selection: {
        section: "services",
        id: worst.district.id,
        districtId: worst.district.id,
      },
    });
  if (due)
    developments.push({
      id: due.id,
      title: `A promise due on day ${day(due.dueDay)}`,
      text: due.title,
      cause: `${due.condition} Latest review: ${due.progress}`,
      score: due.dueDay - time < 2 ? 90 : 38,
      selection: {
        section: "promises",
        id: due.id,
        districtId: due.districtId,
      },
    });
  if (asset && (asset.outageUntil > time || asset.risk === "high"))
    developments.push({
      id: asset.id,
      title:
        asset.outageUntil > time
          ? `${asset.name} is disrupted`
          : `${asset.name} needs attention`,
      text: asset.repairDue
        ? `Repair expected on day ${day(asset.repairDue)}.`
        : "No repair has been commissioned.",
      cause: `${label(asset.risk)} reported engineering risk. ${asset.observedCondition === null ? "Its exact condition has not been inspected." : `Last inspected condition: ${round(asset.observedCondition)} / 100.`} Inspect the asset report and forecast before choosing a response.`,
      score: asset.outageUntil > time ? 100 : 65,
      selection: {
        section: "infrastructure",
        id: asset.id,
        districtId: asset.districtId,
      },
    });
  developments.push({
    id: "crews",
    title: waiting
      ? `${waiting} ${waiting === 1 ? "site is" : "sites are"} waiting for a crew`
      : "Building the next chapter",
    text: `${living.construction.assignments.length + living.works.length} jobs share ${living.construction.crews} crews.`,
    cause: `Repairs and district works share crews with new buildings. Current delivery standard: ${label(living.construction.contractor)}. ${label(living.weather.today)} weather and contractor standards affect the pace of site work.`,
    score: waiting ? 75 : 26,
    selection: { section: "projects" },
  });
  developments.push({
    id: "traffic",
    title: `${round(living.traffic.commuteMinutes)} minutes to get around`,
    text: `${round(living.traffic.congestion * 100)}% average congestion · ${living.traffic.closures.length} crossing restrictions.`,
    cause: `Current street priority is ${living.traffic.policy}. Construction, housing pressure, and road disruptions affect traffic; district shuttles improve access.`,
    score: living.traffic.closures.length
      ? 80
      : 20 + living.traffic.congestion * 35,
    selection: { section: "services" },
  });
  const entries = developments.sort((a, b) => b.score - a.score).slice(0, 3);
  return (
    <section className="living-briefing" aria-label="Daily city briefing">
      <header>
        <div className="living-briefing-title">
          <PixelIcon kind="journal" size={24} />
          <div>
            <h2>Your daily city briefing</h2>
            <small>
              Day {city.day} · {label(living.weather.today)} · What needs your
              attention
            </small>
          </div>
        </div>
        <button
          className="living-text-button"
          onClick={() => onOpen({ section: "services" })}
        >
          Explore city life <ArrowRight size={13} />
        </button>
      </header>
      <div className="living-briefing-grid">
        {entries.map((entry) => (
          <article className="living-briefing-item" key={entry.id}>
            <h3>{entry.title}</h3>
            <p>{entry.text}</p>
            <details>
              <summary>Why did this happen?</summary>
              <p>{entry.cause}</p>
              <button
                className="living-text-button"
                onClick={() => onOpen(entry.selection)}
              >
                Open related report <ArrowRight size={12} />
              </button>
            </details>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function LivingCity({
  selection,
  onAction,
  onResume,
  onSelectionChange,
  compact = false,
  onLocate,
}: {
  selection?: LivingCitySelection;
  onAction: ActionHandler;
  onResume: () => void;
  onSelectionChange: (selection: LivingCitySelection) => void;
  compact?: boolean;
  onLocate?: (selection: LivingCitySelection) => void;
}) {
  const [section, setSection] = useState<LifeSection>(
    selection ? sectionFor(selection.section) : "services",
  );
  const [district, setDistrict] = useState<DistrictId | "all">(
    selection?.districtId ?? "all",
  );
  const [search, setSearch] = useState("");
  const [promiseFilter, setPromiseFilter] = useState<"active" | "all">(
    "active",
  );
  useEffect(() => {
    if (selection) {
      setSection(sectionFor(selection.section));
      setDistrict(selection.districtId ?? "all");
      if (selection.id) setSearch("");
    }
  }, [selection]);
  useEffect(() => {
    if (!selection?.id) return;
    document
      .getElementById(`life-${selection.id}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selection, section, district]);
  function navigate(nextSection: LifeSection, nextDistrict = district) {
    setSection(nextSection);
    setDistrict(nextDistrict);
    onSelectionChange({
      section: nextSection,
      districtId: nextDistrict === "all" ? undefined : nextDistrict,
    });
  }
  const living = city.living;
  if (!living)
    return (
      <section
        className={`civic-page living-city${compact ? " is-compact" : ""}`}
      >
        <p className="living-empty">
          Start a city to meet its residents and manage its everyday life.
        </p>
      </section>
    );
  const matches = (id?: DistrictId) =>
    district === "all" || !id || id === district;
  const districts = living.districts.filter((item) => matches(item.id));
  const actions = getCivicActions()
    .filter(
      (action) =>
        actionCategories[section].includes(action.category) &&
        matches(action.districtId),
    )
    .sort(
      (a, b) =>
        Number(b.available) - Number(a.available) || b.priority - a.priority,
    );
  const focused = (id: string) =>
    selection?.id === id ? "living-card is-focused" : "living-card";
  const citizens = living.citizens.filter(
    (person) =>
      matches(person.districtId) &&
      `${person.name} ${person.role} ${person.story}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const promises = living.promises.filter(
    (promise) =>
      matches(promise.districtId) &&
      (promiseFilter === "all" ||
        promise.status === "active" ||
        promise.status === "renegotiated"),
  );
  const assets = living.assets.filter((asset) => matches(asset.districtId));
  const events = living.events
    .slice()
    .sort((a, b) => b.day - a.day || b.id - a.id);
  return (
    <section
      className={`civic-page living-city${compact ? " is-compact" : ""}`}
    >
      <header className="living-heading">
        <div>
          {!compact && (
            <span className="civic-eyebrow">THE PEOPLE BEHIND THE NUMBERS</span>
          )}
          <h1>{compact ? "City life" : "A city that remembers."}</h1>
          <p>
            {compact
              ? "People, services, and the promises you keep."
              : "Meet your residents, see what they need, and follow the consequences of every promise and investment."}
          </p>
        </div>
        <label>
          Neighborhood
          <select
            aria-label="City life neighborhood"
            value={district}
            onChange={(event) =>
              navigate(section, event.target.value as DistrictId | "all")
            }
          >
            <option value="all">Whole city</option>
            {city.districts.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </header>
      <nav className="living-nav" aria-label="City life sections">
        {sectionItems.map((item) => (
          <button
            key={item.id}
            aria-current={section === item.id ? "page" : undefined}
            aria-label={item.label}
            onClick={() => navigate(item.id)}
          >
            <item.icon size={15} />
            {compact && item.id === "infrastructure"
              ? "Assets"
              : compact && item.id === "economy"
                ? "Council"
                : item.label}
          </button>
        ))}
      </nav>
      {city.paused && city.phase === "playing" && (
        <div className="living-pause">
          <Pause size={14} />
          <span>
            {city.issue
              ? "Reconnect Jev or choose another mayor above to resume decisions."
              : "You can inspect everything while paused. Resume the city to make a decision."}
          </span>
          <button onClick={onResume} disabled={!!city.issue}>
            <Play size={12} /> Resume to act
          </button>
        </div>
      )}
      {section === "services" && (
        <>
          <SectionHeading
            title={
              compact
                ? "Services & access"
                : "Can people reach the help they need?"
            }
            text="Buildings provide capacity. Staff, street access, and demand determine how many residents are actually served."
          />
          <div className="living-grid">
            {districts.map((item) => (
              <article
                className={focused(item.id)}
                id={`life-${item.id}`}
                key={item.id}
              >
                <div className="living-card-top">
                  <span>
                    <MapPin size={10} /> {item.name}
                  </span>
                  <Tag tone={item.access < 0.65 ? "warn" : ""}>
                    {round(item.access * 100)}% access
                  </Tag>
                </div>
                <h3>{round(item.population)} residents</h3>
                <Stats
                  items={[
                    ["Commute", `${round(item.commuteMinutes)} min`],
                    ["Congestion", `${round(item.congestion * 100)}%`],
                    ["Shuttle", item.shuttle ? "Running" : "None"],
                  ]}
                />
                {item.services.map((service) => (
                  <div className="living-service" key={service.kind}>
                    <div className="living-card-meta">
                      <strong>{service.name}</strong>
                      <Tag
                        tone={
                          service.backlog > 20
                            ? "bad"
                            : service.backlog > 0 ||
                                service.served < service.demand
                              ? "warn"
                              : ""
                        }
                      >
                        {service.backlog > 0
                          ? `${round(service.backlog)} waiting`
                          : service.served < service.demand
                            ? `${round(service.demand - service.served)} unmet today`
                            : "Demand met"}
                      </Tag>
                    </div>
                    <Meter
                      value={service.coverage * 100}
                      name={`${item.name} ${service.name} coverage`}
                    />
                    <div className="living-meter-label">
                      <span>
                        {round(service.served)} served / {round(service.demand)}{" "}
                        need help
                      </span>
                      <b>{round(service.coverage * 100)}%</b>
                    </div>
                    <small>
                      {service.staff} additional staff ·{" "}
                      {round(service.capacity)} usable capacity after funding
                      and access
                    </small>
                  </div>
                ))}
                <CausalHistory events={events} districtId={item.id} />
                <LocateButton
                  selection={{
                    section: "services",
                    id: item.id,
                    districtId: item.id,
                  }}
                  onLocate={onLocate}
                  name={item.name}
                />
              </article>
            ))}
          </div>
          <div className="living-citywide-note">
            <Cloud size={16} />
            <span>
              <strong>{label(living.weather.today)} today.</strong> Traffic
              policy: {label(living.traffic.policy)}.{" "}
              {living.traffic.closures.length
                ? `${living.traffic.closures.length} active road restriction${living.traffic.closures.length === 1 ? "" : "s"}.`
                : "No active road closures."}{" "}
              Mobile teams available:{" "}
              {living.staffPool -
                living.districts.reduce(
                  (sum, item) =>
                    sum +
                    item.services.reduce(
                      (count, service) => count + service.staff,
                      0,
                    ),
                  0,
                )}{" "}
              of {living.staffPool}.
            </span>
          </div>
        </>
      )}
      {section === "residents" && (
        <>
          <SectionHeading
            title={
              compact ? "People & memory" : "People, not just a population."
            }
            text="A few named residents represent the needs of their neighborhoods. They remember help, delays, and the promises made to them."
          >
            <label className="living-filter">
              Find a resident
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name, work, or story"
              />
            </label>
          </SectionHeading>
          <div className="living-grid">
            {citizens.map((person) => (
              <article
                className={focused(person.id)}
                id={`life-${person.id}`}
                key={person.id}
              >
                <div className="living-card-top">
                  <span>{districtName(person.districtId)}</span>
                  <Tag
                    tone={
                      person.displaced
                        ? "bad"
                        : person.unmetDays > 1
                          ? "warn"
                          : ""
                    }
                  >
                    {person.displaced
                      ? "Displaced"
                      : person.unmetDays
                        ? `${person.unmetDays} days waiting`
                        : "Settled"}
                  </Tag>
                </div>
                <div className="living-person-head">
                  <CitizenPortrait identity={person.id} name={person.name} emotion={citizenEmotion(person, city.day)} size={56} decorative />
                  <div>
                    <h3>{person.name}</h3>
                    <small>{person.role}</small>
                    <span className={`citizen-mood is-${citizenEmotion(person, city.day)}`}>{citizenEmotionLabels[citizenEmotion(person, city.day)]}</span>
                  </div>
                </div>
                <p>{person.story}</p>
                <div className="living-meter-label">
                  <span>Satisfaction</span>
                  <b>{round(person.satisfaction)} / 100</b>
                </div>
                <Meter
                  value={person.satisfaction}
                  name={`${person.name} satisfaction`}
                />
                <Facts
                  items={[
                    ["Current need", label(person.need)],
                    ["Neighborhood", districtName(person.districtId)],
                  ]}
                />
                <details
                  className="living-details"
                  open={selection?.id === person.id || undefined}
                >
                  <summary>{person.memories.length} remembered moments</summary>
                  {person.memories.length ? (
                    <ol className="living-memory">
                      {person.memories
                        .slice()
                        .slice(0, 6)
                        .map((memory, index) => (
                          <li key={`${memory.day}-${index}`}>
                            <span>
                              DAY {day(memory.day)} · {label(memory.outcome)}
                            </span>
                            {memory.text}
                          </li>
                        ))}
                    </ol>
                  ) : (
                    <p>
                      Their story has just begun. City events and decisions will
                      become memories here.
                    </p>
                  )}
                </details>
                <CausalHistory events={events} sourceId={person.id} />
                <LocateButton
                  selection={{
                    section: "residents",
                    id: person.id,
                    districtId: person.districtId,
                  }}
                  onLocate={onLocate}
                  name={person.name}
                />
                <button
                  className="living-text-button"
                  onClick={() =>
                    navigate(
                      person.need === "housing" ? "economy" : "services",
                      person.districtId,
                    )
                  }
                >
                  {person.need === "housing"
                    ? "Review neighborhood homes & rents"
                    : "Open neighborhood services"}{" "}
                  <ArrowRight size={12} />
                </button>
              </article>
            ))}
          </div>
          {citizens.length === 0 && (
            <p className="living-empty">
              No residents match this search and neighborhood.
            </p>
          )}
        </>
      )}
      {section === "promises" && (
        <>
          <SectionHeading
            title={compact ? "Public commitments" : "Your word has a deadline."}
            text="A promise is kept when its stated condition is met. Review progress, address a delay, or renegotiate before trust is lost."
          >
            <label className="living-filter">
              Show commitments
              <select
                value={promiseFilter}
                onChange={(event) =>
                  setPromiseFilter(event.target.value as "active" | "all")
                }
              >
                <option value="active">Active commitments</option>
                <option value="all">All commitments</option>
              </select>
            </label>
          </SectionHeading>
          <div className="living-grid">
            {promises.map((promise) => (
              <article
                className={focused(promise.id)}
                id={`life-${promise.id}`}
                key={promise.id}
              >
                <div className="living-card-top">
                  <span>{districtName(promise.districtId)}</span>
                  <Tag
                    tone={
                      promise.status === "broken"
                        ? "bad"
                        : promise.status === "kept"
                          ? ""
                          : "warn"
                    }
                  >
                    {label(promise.status)}
                  </Tag>
                </div>
                <h3>{promise.title}</h3>
                <p>{promise.condition}</p>
                <div className="living-cause">
                  <strong>Progress:</strong> {promise.progress}
                </div>
                <Facts
                  items={[
                    [
                      "Promised by",
                      promise.actor === "jev"
                        ? "Jev"
                        : promise.actor === "local"
                          ? "Local advisor"
                          : "You",
                    ],
                    ["Due", `Day ${day(promise.dueDay)}`],
                    ["Next review", `Day ${day(promise.nextReviewDay)}`],
                    ["Revisions", promise.renegotiations],
                  ]}
                />
                <CausalHistory events={events} sourceId={promise.id} />
              </article>
            ))}
          </div>
          {promises.length === 0 && (
            <p className="living-empty">
              No {promiseFilter === "active" ? "active " : ""}commitments in
              this view. Decisions and projects can create promises with
              measurable conditions.
            </p>
          )}
        </>
      )}
      {section === "infrastructure" && (
        <>
          <SectionHeading
            title={
              compact ? "Infrastructure" : "Know what holds your city together."
            }
            text="Inspections reveal condition. Maintenance can prevent disruption; repairs restore assets after damage. Uninspected condition stays unknown."
          />
          <div className="living-forecast" aria-label="Weather forecast">
            {living.weather.forecast.slice(0, 4).map((forecast) => (
              <div key={forecast.day}>
                <Cloud size={17} />
                <span>
                  <b>
                    Day {day(forecast.day)} · {label(forecast.kind)}
                  </b>
                  <small>{forecast.warning || "No special warning."}</small>
                </span>
              </div>
            ))}
          </div>
          <div className="living-grid">
            {assets.map((asset) => (
              <article
                className={focused(asset.id)}
                id={`life-${asset.id}`}
                key={asset.id}
              >
                <div className="living-card-top">
                  <span>{districtName(asset.districtId)}</span>
                  <Tag
                    tone={
                      asset.outageUntil > city.day
                        ? "bad"
                        : asset.risk === "high"
                          ? "bad"
                          : asset.risk === "watch"
                            ? "warn"
                            : ""
                    }
                  >
                    {asset.outageUntil > city.day
                      ? "Service disrupted"
                      : `${label(asset.risk)} reported risk`}
                  </Tag>
                </div>
                <div className="living-card-title">
                  <ShieldCheck size={20} />
                  <h3>{asset.name}</h3>
                </div>
                <p>{label(asset.kind)} infrastructure</p>
                {asset.observedCondition !== null ? (
                  <>
                    <div className="living-meter-label">
                      <span>Last observed condition</span>
                      <b>{round(asset.observedCondition)} / 100</b>
                    </div>
                    <Meter
                      value={asset.observedCondition}
                      name={`${asset.name} last observed condition`}
                    />
                  </>
                ) : (
                  <div className="living-cause">
                    Condition unknown. An inspection is required to make an
                    informed maintenance decision.
                  </div>
                )}
                <Facts
                  items={[
                    [
                      "Last inspected",
                      asset.lastInspectedDay === null
                        ? "Not yet inspected"
                        : `Day ${day(asset.lastInspectedDay)}`,
                    ],
                    [
                      "Inspection",
                      asset.inspectionDue === null
                        ? "Not scheduled"
                        : `Result due day ${day(asset.inspectionDue)}`,
                    ],
                    [
                      "Repair",
                      asset.repairDue === null
                        ? "No repair scheduled"
                        : `Due day ${day(asset.repairDue)}`,
                    ],
                    [
                      "Preventive care",
                      asset.maintenanceUntil > city.day
                        ? `Covered through day ${day(asset.maintenanceUntil)}`
                        : "No active cover",
                    ],
                  ]}
                />
                <CausalHistory events={events} sourceId={asset.id} />
                <LocateButton
                  selection={{
                    section: "infrastructure",
                    id: asset.id,
                    districtId: asset.districtId,
                  }}
                  onLocate={onLocate}
                  name={asset.name}
                />
              </article>
            ))}
          </div>
        </>
      )}
      {section === "projects" && (
        <>
          <SectionHeading
            title={
              compact
                ? "Delivery & crews"
                : "Promises need people to deliver them."
            }
            text="Crews, contractor quality, and site conditions determine the pace of construction. Review who is working and what is waiting."
          />
          <div className="living-summary-row">
            <Stats
              items={[
                ["City crews", living.construction.crews],
                ["Contractor", label(living.construction.contractor)],
                ["Active sites", living.construction.assignments.length],
              ]}
            />
            <p>
              {living.construction.extraCrewUntil > city.day
                ? `Additional crew contracted through day ${day(living.construction.extraCrewUntil)}.`
                : "No temporary crew contract is active."}
            </p>
          </div>
          <div className="living-grid">
            {living.construction.assignments
              .filter((assignment) =>
                matches(projectById[assignment.projectId]?.district),
              )
              .map((assignment) => (
                <article
                  className={focused(assignment.projectId)}
                  id={`life-${assignment.projectId}`}
                  key={assignment.projectId}
                >
                  <div className="living-card-top">
                    <span>
                      {districtName(
                        projectById[assignment.projectId]?.district,
                      )}
                    </span>
                    <Tag tone={assignment.crew ? "" : "warn"}>
                      {assignment.crew ? "Crew assigned" : "Waiting for a crew"}
                    </Tag>
                  </div>
                  <h3>{assignment.name}</h3>
                  <p>
                    {assignment.quality === "quality"
                      ? "A quality contractor prioritizes lasting work."
                      : assignment.quality === "economy"
                        ? "An economy contract lowers expense, with quality trade-offs."
                        : "A standard city contract balances cost and workmanship."}
                  </p>
                  <Stats
                    items={[
                      ["Work rate", `${round(assignment.workRate * 100)}%`],
                      ["Delay", `${assignment.delayDays.toFixed(1)} days`],
                      [
                        "Priority",
                        living.construction.priorityProjectId ===
                        assignment.projectId
                          ? "First"
                          : "Normal",
                      ],
                    ]}
                  />
                  <CausalHistory
                    events={events}
                    sourceId={assignment.projectId}
                  />
                  <LocateButton
                    selection={{
                      section: "projects",
                      id: assignment.projectId,
                      districtId: projectById[assignment.projectId]?.district,
                    }}
                    onLocate={onLocate}
                    name={assignment.name}
                  />
                </article>
              ))}
          </div>
          {living.construction.assignments.length === 0 && (
            <p className="living-empty">
              No active building sites. Start a project in Build & improve to
              put crews to work.
            </p>
          )}
          {living.works.filter((work) => matches(work.districtId)).length >
            0 && (
            <div className="living-subsection">
              <SectionHeading
                title="Other work in progress"
                text="Repairs and district improvements continue alongside building construction."
              />
              <div className="living-grid">
                {living.works
                  .filter((work) => matches(work.districtId))
                  .map((work) => (
                    <article
                      className={focused(work.id)}
                      id={`life-${work.id}`}
                      key={work.id}
                    >
                      <div className="living-card-top">
                        <span>{districtName(work.districtId)}</span>
                        <Tag>
                          {work.affordable
                            ? "Affordable homes"
                            : label(work.kind)}
                        </Tag>
                      </div>
                      <h3>{label(work.kind)} works</h3>
                      <Meter
                        value={work.progress * 100}
                        name={`${work.kind} works progress`}
                      />
                      <div className="living-meter-label">
                        <span>{round(work.progress * 100)}% complete</span>
                        <b>Expected day {day(work.dueDay)}</b>
                      </div>
                      <LocateButton
                        selection={{
                          section: "projects",
                          id: work.id,
                          districtId: work.districtId,
                        }}
                        onLocate={onLocate}
                        name={`${districtName(work.districtId)} ${work.kind} works`}
                      />
                    </article>
                  ))}
              </div>
            </div>
          )}
        </>
      )}
      {section === "economy" && (
        <>
          <SectionHeading
            title={
              compact
                ? "Council & growth"
                : "Growth that makes room for people."
            }
            text="Homes, employment, land, and rent shape each neighborhood. Major proposals need a council majority; councillors explain what would earn their support."
          />
          <div className="living-grid">
            {districts.map((item) => (
              <article
                className={focused(item.id)}
                id={`life-${item.id}`}
                key={item.id}
              >
                <div className="living-card-top">
                  <span>{item.name}</span>
                  <Tag tone={item.rentBurden > 0.4 ? "warn" : ""}>
                    {round(item.rentBurden * 100)}% rent burden
                  </Tag>
                </div>
                <h3>
                  {round(item.homes)} homes · {round(item.jobs)} jobs
                </h3>
                <Stats
                  items={[
                    ["Typical rent", money(item.rent)],
                    ["Displaced", item.displaced],
                    ["Sites used", `${item.landUsed} / 2`],
                  ]}
                />
                <p>
                  {item.protectionsUntil > city.day
                    ? `Tenant protections active through day ${day(item.protectionsUntil)}.`
                    : "No temporary tenant protection is active."}
                </p>
                <CausalHistory events={events} districtId={item.id} />
                <LocateButton
                  selection={{
                    section: "economy",
                    id: item.id,
                    districtId: item.id,
                  }}
                  onLocate={onLocate}
                  name={item.name}
                />
              </article>
            ))}
          </div>
          <div className="living-subsection">
            <SectionHeading
              title="At the council table"
              text="Read each member’s stated priorities and the votes on current proposals."
            />
            <div className="living-council-members">
              {living.council.members.map((member) => (
                <div key={member.id}>
                  <Landmark size={16} />
                  <span>
                    <b>{member.name}</b>
                    <small>
                      {districtName(member.districtId)} ·{" "}
                      {label(member.priority)}
                    </small>
                  </span>
                </div>
              ))}
            </div>
            <div className="living-grid">
              {living.council.motions
                .filter((motion) => matches(motion.districtId))
                .slice()
                .reverse()
                .slice(0, 8)
                .map((motion) => (
                  <article
                    className={focused(motion.id)}
                    id={`life-${motion.id}`}
                    key={motion.id}
                  >
                    <div className="living-card-top">
                      <span>{districtName(motion.districtId)}</span>
                      <Tag
                        tone={
                          motion.status === "rejected"
                            ? "bad"
                            : motion.status === "draft"
                              ? "neutral"
                              : ""
                        }
                      >
                        {label(motion.status)}
                      </Tag>
                    </div>
                    <h3>{motion.title}</h3>
                    <Stats
                      items={[
                        ["Investment", money(motion.cost)],
                        [
                          "Support",
                          `${motion.votes.filter((vote) => vote.supports).length}/${motion.votes.length}`,
                        ],
                        ["Amendment", label(motion.amendment)],
                      ]}
                    />
                    <details
                      className="living-details"
                      open={motion.status === "draft" || undefined}
                    >
                      <summary>Member positions and conditions</summary>
                      <ul className="living-memory">
                        {motion.votes.map((vote) => (
                          <li key={vote.memberId}>
                            <span>
                              {vote.supports
                                ? "SUPPORTS"
                                : "NOT YET SUPPORTING"}
                            </span>
                            <strong>{vote.name}</strong>
                            <br />
                            {vote.reason}
                          </li>
                        ))}
                      </ul>
                    </details>
                    <CausalHistory events={events} sourceId={motion.id} />
                    <LocateButton
                      selection={{
                        section: "council",
                        id: motion.id,
                        districtId: motion.districtId,
                      }}
                      onLocate={onLocate}
                      name={motion.title}
                    />
                  </article>
                ))}
            </div>
            {living.council.motions.length === 0 && (
              <p className="living-empty">
                No motions have been introduced yet. Propose a neighborhood
                investment using the decisions below.
              </p>
            )}
          </div>
        </>
      )}
      <CivicActions
        key={`${section}-${district}`}
        actions={actions}
        onAction={onAction}
        compact={compact}
      />
      <details className="living-details living-recent-history">
        <summary>
          <Clock3 size={13} /> Recent city history
        </summary>
        <div className="living-timeline">
          {events
            .filter((event) => matches(event.districtId))
            .slice(0, 12)
            .map((event) => (
              <article className="living-cause" key={event.id}>
                <small>
                  DAY {day(event.day)} · {districtName(event.districtId)}
                </small>
                <br />
                <strong>{event.title}</strong>
                <br />
                {event.text}
              </article>
            ))}
          {events.length === 0 && <p>No city events recorded yet.</p>}
        </div>
      </details>
    </section>
  );
}
