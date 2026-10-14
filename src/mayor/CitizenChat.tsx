import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Clock3,
  Coins,
  Mail,
  MapPin,
  MessageCircle,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { jev } from "../ai/jev";
import {
  city,
  estimateBudget,
  getPetitionActions,
  pauseCity,
  resolvePetition,
  submitPetition,
} from "./engine";
import { projectById } from "./catalog";
import { mayorAI } from "./controller";
import type { CitizenPetition, DistrictId } from "./types";

const cash = (n: number) =>
  `${n < 0 ? "−" : ""}$${Math.abs(Math.round(n)).toLocaleString()}`;
const day = (n: number) => Math.max(1, Math.floor(n + 1e-6));
const statusLabels = {
  pending: "On Jev’s desk",
  approved: "Approved",
  declined: "Not approved",
  deferred: "Deferred",
};
const districtName = (id: string) =>
  city.districts.find((d) => d.id === id)?.name ?? "Whole city";

export function PetitionStatus({ petition }: { petition: CitizenPetition }) {
  const Icon =
    petition.status === "approved"
      ? Check
      : petition.status === "declined"
        ? X
        : Clock3;
  const label =
    petition.response?.reason === "in_progress"
      ? "Already underway"
      : petition.response?.reason === "completed"
        ? "Already in place"
        : petition.response?.reason === "conditional"
          ? "Conditional approval"
          : statusLabels[petition.status];
  return (
    <span className={`citizen-status ${petition.status}`}>
      <Icon size={12} />
      {label}
    </span>
  );
}

export function PetitionRow({
  petition,
  onClick,
}: {
  petition: CitizenPetition;
  onClick: () => void;
}) {
  return (
    <button className="civic-request-row citizen-request-row" onClick={onClick}>
      <span className="civic-category-symbol">
        <MessageCircle size={16} />
      </span>
      <span>
        <small>YOUR REQUEST · {districtName(petition.district)}</small>
        <b>{petition.text}</b>
        <PetitionStatus petition={petition} />
      </span>
      <ChevronRight size={13} />
    </button>
  );
}

export function PetitionTile({
  petition,
  onClick,
}: {
  petition: CitizenPetition;
  onClick: () => void;
}) {
  return (
    <button
      className="civic-request-tile civic-paper citizen-request-tile"
      onClick={onClick}
    >
      <div>
        <span className="civic-category-symbol">
          <MessageCircle size={18} />
        </span>
        <PetitionStatus petition={petition} />
      </div>
      <span className="civic-eyebrow">YOUR LETTER TO THE MAYOR</span>
      <h3>{petition.text}</h3>
      <p>
        {petition.response?.text ??
          "Your request is in the inbox. Jev will consider its cost, feasibility, and the city’s current priorities."}
      </p>
      <footer>
        <span>
          <b>You · {districtName(petition.district)}</b>
          <small>Sent day {day(petition.createdDay)}</small>
        </span>
        <span>
          Read conversation <ChevronRight size={14} />
        </span>
      </footer>
    </button>
  );
}

function ManualPetitionReview({
  petition,
  onChange,
}: {
  petition: CitizenPetition;
  onChange: () => void;
}) {
  const [choice, setChoice] = useState("");
  const [error, setError] = useState("");
  const actions = getPetitionActions(petition.id).filter((a) => a.available);
  return (
    <details className="citizen-manual-review">
      <summary>Review this request yourself</summary>
      <p>This records your decision. It will be labeled “You”.</p>
      <label>
        City action
        <select
          value={choice}
          onChange={(e) => setChoice(e.target.value)}
          aria-label="Manual request decision"
        >
          <option value="">Choose a response…</option>
          {actions.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
      </label>
      {city.paused ? (
        <button
          onClick={() => {
            pauseCity(false);
            onChange();
          }}
        >
          Resume to decide <ArrowRight size={13} />
        </button>
      ) : (
        <button
          disabled={!choice || city.phase !== "playing" || !!city.issue}
          onClick={() => {
            const result = resolvePetition(petition.id, choice, {
              actor: "you",
            });
            setError(
              result.ok
                ? ""
                : (result.error ??
                    "The city changed. Choose another response."),
            );
            onChange();
          }}
        >
          Record my decision <Check size={13} />
        </button>
      )}
      {error && (
        <p role="alert" className="citizen-error">
          {error}
        </p>
      )}
    </details>
  );
}

export default function CitizenChat({
  selectedId,
  onChange,
  onConnect,
  onInbox,
}: {
  selectedId?: string | null;
  onChange: () => void;
  onConnect: () => void;
  onInbox: () => void;
}) {
  const [text, setText] = useState("");
  const [district, setDistrict] = useState<DistrictId | "city">("city");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState("");
  const scroll = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  const input = useRef<HTMLTextAreaElement>(null);
  const pending = city.petitions.filter((p) => p.status === "pending");
  const budget = estimateBudget();
  const building = city.projects.filter((p) => p.status === "building");
  const live = city.mode === "jev" && jev.connected && !jev.error;
  const lastChange = city.petitions.map((p) => `${p.id}:${p.status}`).join("|");
  useEffect(() => {
    const el = scroll.current;
    if (!el) return;
    const selected = selectedId
      ? Array.from(el.querySelectorAll<HTMLElement>("[data-petition-id]")).find(
          (node) => node.dataset.petitionId === selectedId,
        )
      : null;
    if (selected) {
      follow.current = false;
      el.scrollTop +=
        selected.getBoundingClientRect().top -
        el.getBoundingClientRect().top -
        18;
    } else el.scrollTop = city.petitions.length ? el.scrollHeight : 0;
  }, [selectedId]);
  useEffect(() => {
    if (city.petitions.length && follow.current && scroll.current)
      scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [lastChange]);
  function send(e?: FormEvent) {
    e?.preventDefault();
    const result = submitPetition(text, district);
    if (!result.ok) {
      setError(result.error ?? "Your request could not be sent.");
      return;
    }
    if (live && city.paused && !city.issue) pauseCity(false);
    setText("");
    setError("");
    setSubmitted("Your request has been added to the inbox.");
    follow.current = true;
    onChange();
    input.current?.focus();
  }
  const examples = [
    "Could we build the reading room in Old Town?",
    "Please send a learning team to Hillview.",
    "Can we inspect the Riverbank drains before the next storm?",
  ];
  return (
    <section className="citizen-chat-page">
      <header className="civic-page-heading">
        <div>
          <span className="civic-eyebrow">A DIRECT LINE TO CITY HALL</span>
          <h1>What would make your city better?</h1>
          <p>
            Write to Mayor Jev. Get a decision, a reason, and real
            follow-through.
          </p>
        </div>
        <button className="civic-secondary" onClick={onInbox}>
          <Mail size={15} /> View the inbox
        </button>
      </header>
      <div className="citizen-chat-layout">
        <section
          className="citizen-conversation civic-paper"
          aria-label="Conversation with the mayor"
        >
          <header>
            <span className="citizen-mayor-avatar">
              <Sparkles size={21} />
            </span>
            <div>
              <h2>The mayor’s mailbox</h2>
              <p>
                {live
                  ? "Jev is listening to the city"
                  : "Your requests stay on the mayor’s desk"}
              </p>
            </div>
            <span className={`citizen-presence ${live ? "live" : ""}`}>
              {live ? "LIVE JEV" : "CITY MAILBOX"}
            </span>
          </header>
          <div
            className="citizen-messages"
            ref={scroll}
            onScroll={(e) => {
              const el = e.currentTarget;
              follow.current =
                el.scrollHeight - el.scrollTop - el.clientHeight < 90;
            }}
          >
            <div className="citizen-introduction">
              <span>
                <Sparkles size={17} />
              </span>
              <div>
                <b>A good city starts with a conversation.</b>
                <p>
                  Ask for a civic project, staffing, an inspection, a repair,
                  transport changes, or a conditional plan. Jev weighs your idea against available funds, work
                  already underway, and other city needs. A request can be
                  approved, deferred, or declined.
                </p>
              </div>
            </div>
            {city.petitions.length === 0 && (
              <div className="citizen-suggestions">
                <small>A FEW IDEAS TO GET STARTED</small>
                {examples.map((example) => (
                  <button
                    key={example}
                    onClick={() => {
                      setText(example);
                      input.current?.focus();
                    }}
                  >
                    {example}
                    <ArrowRight size={14} />
                  </button>
                ))}
              </div>
            )}
            {city.petitions.map((p) => (
              <article
                key={p.id}
                className={`citizen-exchange ${selectedId === p.id ? "is-selected" : ""}`}
                data-petition-id={p.id}
              >
                <div className="citizen-message-meta">
                  <span>You · {districtName(p.district)}</span>
                  <time>Day {day(p.createdDay)}</time>
                </div>
                <p className="citizen-user-bubble">{p.text}</p>
                <div className={`citizen-reply ${p.status}`}>
                  <div className="citizen-reply-heading">
                    <span>
                      <Sparkles size={15} />
                      {p.response
                        ? p.response.actor === "jev"
                          ? "Mayor Jev"
                          : p.response.actor === "local"
                            ? "Local civic advisor"
                            : "Your decision"
                        : "City Hall"}
                    </span>
                    <PetitionStatus petition={p} />
                  </div>
                  {p.response ? (
                    <>
                      <p>{p.response.text}</p>
                      <small>
                        Day {day(p.response.day)}
                        {p.response.actor === "jev"
                          ? " · Live Jev decision"
                          : " · Manual city decision"}
                      </small>
                      {p.response.model && (
                        <details className="citizen-model-details">
                          <summary>Decision details</summary>
                          <p>
                            {p.response.model}
                            {p.response.durationMs != null
                              ? ` · ${(p.response.durationMs / 1000).toFixed(2)}s`
                              : ""}
                            {p.response.confidence != null
                              ? ` · ${Math.round(p.response.confidence * 100)}% model confidence`
                              : ""}
                          </p>
                        </details>
                      )}
                    </>
                  ) : (
                    <>
                      <p>
                        {city.phase === "ended"
                          ? "This request carries into the next term. Keep governing to review it."
                          : city.issue
                            ? "Your letter is safe in the inbox. Reconnect Jev to continue the review."
                            : !live
                              ? "Connect Jev to have your request reviewed, or record your own decision below."
                              : city.paused
                                ? "Your letter is in the inbox. Resume the city so Jev can review it."
                                : "Your letter is in the inbox. Jev will review it alongside the city’s other priorities."}
                      </p>
                      {city.mode !== "jev" && (
                        <ManualPetitionReview
                          petition={p}
                          onChange={onChange}
                        />
                      )}
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
          {!live && (
            <div className="citizen-connection-note">
              <Sparkles size={16} />
              <p>
                The local advisor handles scheduled city requests.{" "}
                <b>Jev reviews your written requests.</b>
              </p>
              <button onClick={onConnect}>
                {jev.connected && !jev.error ? "Let Jev review" : "Connect Jev"}
                <ArrowRight size={13} />
              </button>
            </div>
          )}
          {live && city.paused && pending.length > 0 && (
            <div className="citizen-connection-note">
              <Clock3 size={16} />
              <p>The city is paused. Your request is waiting.</p>
              <button
                disabled={!!city.issue}
                onClick={() => {
                  pauseCity(false);
                  onChange();
                }}
              >
                Resume review
                <ArrowRight size={13} />
              </button>
            </div>
          )}
          <form className="citizen-composer" onSubmit={send}>
            <label htmlFor="citizen-message">YOUR REQUEST</label>
            <textarea
              id="citizen-message"
              ref={input}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setSubmitted("");
              }}
              maxLength={800}
              placeholder="Mayor Jev, could we…"
              rows={3}
              disabled={city.phase !== "playing"}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                ) {
                  e.preventDefault();
                  if (text.trim() && pending.length < 6) send();
                }
              }}
            />
            <div className="citizen-composer-controls">
              <label>
                <MapPin size={13} />
                <select
                  aria-label="Request neighborhood"
                  value={district}
                  onChange={(e) =>
                    setDistrict(e.target.value as DistrictId | "city")
                  }
                >
                  <option value="city">Whole city</option>
                  {city.districts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </label>
              <small>{text.length}/800</small>
              <button
                className="civic-primary"
                type="submit"
                disabled={
                  !text.trim() ||
                  pending.length >= 6 ||
                  city.phase !== "playing"
                }
              >
                <Send size={14} />
                {live && city.paused && !city.issue
                  ? "Send & resume"
                  : "Send request"}
              </button>
            </div>
            <p className="citizen-composer-help">
              {city.phase === "ended"
                ? "Continue into the next term to send a request."
                : pending.length >= 6
                  ? "Six requests are waiting. Let the mayor review them before sending more."
                  : "Enter to send · Shift + Enter for a new line. Your request also appears in the inbox."}
            </p>
            {error && (
              <p role="alert" className="citizen-error">
                {error}
              </p>
            )}
            <span className="citizen-submit-status" role="status">
              {submitted}
            </span>
          </form>
        </section>
        <aside className="citizen-context">
          <section className="civic-paper">
            <span className="civic-eyebrow">WHAT JEV CONSIDERS</span>
            <h2>A city has a lot to balance.</h2>
            <div className="citizen-budget">
              <Coins size={20} />
              <div>
                <strong>{cash(city.treasury)}</strong>
                <small>Available city funds</small>
              </div>
            </div>
            <p className="citizen-budget-flow">
              {budget.net >= 0 ? "+" : ""}
              {cash(budget.net)} daily operating balance
            </p>
            <div className="citizen-context-rule">
              <b>Current direction</b>
              <p>{mayorAI.priority}</p>
            </div>
            <div className="citizen-context-rule">
              <b>Already in progress · {building.length + city.living.works.length}</b>
              {building.map((p) => (
                  <p key={p.definitionId}>
                    {projectById[p.definitionId]?.name}
                    <small>Expected day {day(p.completesDay)}</small>
                  </p>
                ))}
              {city.living.works.map(work => (
                <p key={work.id}>
                  {work.kind === 'repair'
                    ? `Repair ${city.living.assets.find(asset => asset.id === work.targetId)?.name ?? 'local infrastructure'}`
                    : city.living.council.motions.find(motion => motion.id === work.targetId)?.title ?? `${districtName(work.districtId)} ${work.kind} works`}
                  <small>{Math.round(work.progress * 100)}% complete · Expected day {Math.ceil(work.dueDay)}</small>
                </p>
              ))}
              {!building.length && !city.living.works.length && <p>No construction or repairs underway.</p>}
            </div>
            <div className="citizen-context-rule">
              <b>Your requests</b>
              <p>
                {pending.length} awaiting a decision ·{" "}
                {city.petitions.filter((p) => p.status !== "pending").length}{" "}
                answered
              </p>
            </div>
          </section>
          <section className="citizen-outcomes">
            <h3>Every answer means something.</h3>
            <p>
              <Check size={14} />
              <span>
                <b>Approved</b> The city carries out the stated action.
                Conditional plans retain their funding and council checks.
              </span>
            </p>
            <p>
              <Clock3 size={14} />
              <span>
                <b>Deferred</b> Funds, timing, or existing work take precedence.
                A review reminder keeps the request visible without authorizing spending.
              </span>
            </p>
            <p>
              <X size={14} />
              <span>
                <b>Not approved</b> Jev explains why the proposal cannot go
                ahead as requested.
              </span>
            </p>
          </section>
        </aside>
      </div>
    </section>
  );
}
