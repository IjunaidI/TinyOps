import { useState } from "react";
import {
  ArrowRight,
  Check,
  Clock3,
  Mail,
  MessageCircle,
  Send,
  X,
} from "lucide-react";
import { game } from "../sim/engine";
import { placeById } from "../data/map";
import { chaos, match, sendSharedBrief } from "./match";
import {
  deadlineChoices,
  destinationChoices,
  timeLabel,
  type Message,
} from "./chaos";

export function DispatchInbox({
  onClose,
  onInspect,
}: {
  onClose: () => void;
  onInspect: (id: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [brief, setBrief] = useState("");
  const [notice, setNotice] = useState("");
  const session = chaos.you;
  if (!session) return null;
  const pending = session.state.inbox.filter((m) => m.status !== "handled");
  const current =
    session.state.inbox.find((m) => m.id === selected) ??
    pending[0] ??
    session.state.inbox.at(-1);
  return (
    <aside className="inbox-panel panel" aria-label="Dispatch Inbox">
      <button className="close" title="Close inbox" onClick={onClose}>
        <X size={17} />
      </button>
      <span className="eyebrow">
        <Mail size={12} /> LIVE CUSTOMER MESSAGES
      </span>
      <h2>
        Dispatch Inbox <span className="inbox-count">{pending.length}</span>
      </h2>
      <p className="inbox-intro">
        Elapsed {timeLabel(game.time)} / 06:00 · Message deadlines use this
        elapsed clock. Update the plan or ask before guessing.
      </p>
      <div className="inbox-threads" aria-label="Customer conversations">
        {[...session.state.inbox].reverse().map((m) => (
          <button
            key={m.id}
            className={`${current?.id === m.id ? "selected" : ""} ${m.status}`}
            onClick={() => setSelected(m.id)}
          >
            <span>
              {m.status === "handled" ? (
                <Check size={11} />
              ) : m.status === "waiting" ? (
                <Clock3 size={11} />
              ) : (
                <i />
              )}
              {m.sender.split(" · ")[0]}
            </span>
            <small>
              {m.orderId ?? "Brief / unlinked"} · {timeLabel(m.at)}
            </small>
          </button>
        ))}
      </div>
      <div className="inbox-body">
        {current ? (
          <MessageEditor
            key={`${current.id}-${current.replies.length}`}
            message={current}
            onInspect={onInspect}
            onNext={() => setSelected(null)}
          />
        ) : (
          <p>No messages yet. The inbox will update during your shift.</p>
        )}
        <details className="shared-brief">
          <summary>
            <MessageCircle size={13} /> Brief both dispatchers{" "}
            <small>{3 - match.briefCount} left</small>
          </summary>
          <p>
            Give Jev feedback or change the shared priority in plain language.
            Both sides receive the same note; scoring rules stay fixed.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (sendSharedBrief(brief)) {
                setBrief("");
                setNotice("Shared briefing delivered to both inboxes.");
                setSelected(null);
              }
            }}
          >
            <textarea
              aria-label="Shared dispatcher briefing"
              placeholder="Save the refrigerated vans for cold orders. Prioritize the clinic when deadlines conflict…"
              maxLength={240}
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
            />
            <button
              className="secondary full"
              disabled={!brief.trim() || game.paused || match.briefCount >= 3}
            >
              Send shared briefing <Send size={13} />
            </button>
          </form>
          {notice && <small role="status">{notice}</small>}
        </details>
        <small className="inbox-scoring">
          On-time clinic consignments +75. Satisfying a revised request +25 on
          delivery. Wrong address or missed acceptance window: failed job, −50.
          Reading or acknowledging earns no points.
        </small>
      </div>
    </aside>
  );
}
function MessageEditor({
  message: m,
  onInspect,
  onNext,
}: {
  message: Message;
  onInspect: (id: string) => void;
  onNext: () => void;
}) {
  const [orderId, setOrderId] = useState(m.orderId ?? "none");
  const [destination, setDestination] = useState("keep");
  const [deadline, setDeadline] = useState("keep");
  const [error, setError] = useState("");
  const activeOrders = game.orders.filter(
    (o) => !["failed", "delivered"].includes(o.status),
  );
  const session = chaos.you!;
  const order = game.orders.find((o) => o.id === orderId);
  const disabled = game.paused || m.status !== "new";
  const act = (action: string, inspect = false) => {
    if (!session.apply(m.id, action, orderId, destination, deadline)) {
      setError(
        "That action is no longer available. Choose an active order and resume the shift.",
      );
      return;
    }
    setError("");
    if (inspect) onInspect(orderId);
    else if (action === "acknowledge") onNext();
  };
  return (
    <article className="inbox-message">
      <div className="message-meta">
        <b>{m.sender}</b>
        <span>{timeLabel(m.at)}</span>
      </div>
      <blockquote>{m.text}</blockquote>
      {m.replies.map((r, i) => (
        <div key={i} className="customer-reply">
          <MessageCircle size={13} />
          <span>
            <small>Customer reply · {timeLabel(Math.floor(r.at))}</small>
            {r.text}
          </span>
        </div>
      ))}
      {m.outcome && (
        <p className="inbox-outcome" role="status">
          {m.outcome}
        </p>
      )}
      {m.status === "waiting" && (
        <div className="reply-pending">
          <Clock3 size={14} />
          Reply in{" "}
          {Math.max(0, Math.ceil((m.responseAt ?? game.time) - game.time))}s
          {m.heldOrder ? ` · ${m.heldOrder} is held` : ""}
        </div>
      )}
      {m.status === "new" && (
        <>
          <div className="inbox-plan">
            <label>
              Order
              <select
                aria-label="Message order"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
              >
                <option value="none">Choose an order…</option>
                {activeOrders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.id} · {placeById[o.destination].name}
                    {o.held ? " · HELD" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Destination
              <select
                aria-label="Updated destination"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              >
                {Object.entries(destinationChoices).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Deadline · elapsed mm:ss
              <select
                aria-label="Updated deadline"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              >
                {Object.entries(deadlineChoices).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {order && (
            <small className="current-plan">
              Current plan: {placeById[order.destination].name}, due{" "}
              {timeLabel(order.due)} · {order.status}
              {order.held ? " · HELD" : ""}
            </small>
          )}
          <button
            className="primary full"
            disabled={disabled || !activeOrders.some((o) => o.id === orderId)}
            onClick={() => act("apply_update", true)}
          >
            Apply plan & inspect order <ArrowRight size={14} />
          </button>
          <div className="clarification-actions">
            <span>Ask the customer · reply takes 4s</span>
            {(
              [
                ["ask_order", "Which order?"],
                ["ask_destination", "Where to?"],
                ["ask_deadline", "What deadline?"],
              ] as const
            ).map(([action, label]) => (
              <button
                key={action}
                className="secondary"
                disabled={disabled || m.questions.includes(action)}
                onClick={() => act(action)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="inbox-secondary">
            <button
              className="text-button"
              disabled={disabled}
              onClick={() => act("acknowledge")}
            >
              <Check size={13} />
              Acknowledge / release hold
            </button>
            <button
              className="text-button"
              disabled={
                disabled ||
                !!m.heldOrder ||
                !activeOrders.some((o) => o.id === orderId)
              }
              onClick={() => act("hold")}
            >
              Hold order
            </button>
          </div>
        </>
      )}
      {m.status === "handled" && (
        <button className="text-button full" onClick={onNext}>
          Next open message <ArrowRight size={13} />
        </button>
      )}
      {game.paused && m.status !== "handled" && (
        <p className="inbox-pause">
          Resume both cities to send a question or apply a plan.
        </p>
      )}
      {error && (
        <small className="error-text" role="alert">
          {error}
        </small>
      )}
    </article>
  );
}
