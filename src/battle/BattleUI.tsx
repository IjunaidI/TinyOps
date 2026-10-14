import { useState } from "react";
import {
  Flag,
  Radio,
  Sparkles,
  Swords,
  Trophy,
  ArrowRight,
  RotateCcw,
  X,
  Truck,
} from "lucide-react";
import { game } from "../sim/engine";
import { edges, nodeById, placeById } from "../data/map";
import { jev } from "../ai/jev";
import {
  match,
  rival,
  baseline,
  chaos,
  matchResult,
  type Opponent,
} from "./match";
import { strategyNames, type MatchVariant } from "./chaos";

export function BattleLobby({
  onClose,
  onConnect,
  onStart,
}: {
  onClose: () => void;
  onConnect: () => void;
  onStart: (o: Opponent, variant: MatchVariant) => void;
}) {
  const [variant, setVariant] = useState<MatchVariant>(
    match.active ? match.variant : "chaos",
  );
  const connected = jev.connected && !jev.error;
  return (
    <div className="modal-scrim">
      <section
        className="modal battle-lobby"
        role="dialog"
        aria-modal="true"
        aria-labelledby="battle-title"
      >
        <button className="close" title="Close challenge" onClick={onClose}>
          <X size={19} />
        </button>
        <div className="battle-emblem">
          <Swords size={30} />
        </div>
        <span className="eyebrow">THE DISPATCH DUEL</span>
        <h2 id="battle-title">I will beat Jev.</h2>
        <p>
          One district. Two separate fleets. Six minutes to prove who runs the
          better shift.
        </p>
        <div className="match-variants" aria-label="Match scenario">
          <button
            aria-pressed={variant === "chaos"}
            className={variant === "chaos" ? "selected" : ""}
            onClick={() => setVariant("chaos")}
          >
            <b>Chaos Shift</b>
            <small>Read. Clarify. Adapt.</small>
          </button>
          <button
            aria-pressed={variant === "classic"}
            className={variant === "classic" ? "selected" : ""}
            onClick={() => setVariant("classic")}
          >
            <b>Classic</b>
            <small>Pure fleet dispatch.</small>
          </button>
        </div>
        {variant === "chaos" && (
          <p className="chaos-lobby-description">
            Customers change addresses, deadlines, and priorities. Read your
            Dispatch Inbox and ask for missing details. Jev interprets the same
            messages live, remembers corrections, and reports its chosen
            approach.
          </p>
        )}
        <div className="battle-rules">
          <span>
            <b>YOU</b>
            {variant === "chaos"
              ? "Read the inbox, revise plans, then choose your vans."
              : "Choose each order’s van. Use three Rush boosts."}
          </span>
          <span>
            <b>JEV</b>
            {variant === "chaos"
              ? "Interprets messages, asks questions, and dispatches."
              : "Chooses its own assignments and boosts live."}
          </span>
        </div>
        <p className="battle-fairness">
          Same 24 orders, deadlines, eight vans and scheduled disruptions.
          Highest final score wins; equal scores draw. Pause stops both cities.
          Match speed is fixed at 1×.
          {variant === "chaos" &&
            " On-time clinic jobs +75; correct revised deliveries +25. Wrong destinations fail. An original-manifest Autopilot supplies a reference score."}
        </p>
        <div className={`battle-connection ${connected ? "ready" : ""}`}>
          <Radio size={14} />
          {connected
            ? "Live Jev is connected."
            : "Connect Jev to play the live opponent."}
        </div>
        {connected ? (
          <button
            className="primary full"
            onClick={() => onStart("jev", variant)}
          >
            {variant === "chaos"
              ? "Start live Chaos Shift"
              : "Start live match"}{" "}
            <Swords size={16} />
          </button>
        ) : (
          <button className="primary full" onClick={onConnect}>
            Connect Jev <ArrowRight size={16} />
          </button>
        )}
        <button
          className="secondary full"
          onClick={() => onStart("local", variant)}
        >
          Practice against Local Autopilot
        </button>
        <small className="battle-footnote">
          Live requests use your OpenRouter account. A connection failure pauses
          both cities; a local bot never replaces Jev in a live result.
        </small>
      </section>
    </div>
  );
}
function OpponentMap() {
  const g = rival.game;
  return (
    <svg
      className="opponent-map"
      viewBox="-66 -56 132 112"
      role="img"
      aria-label="Live map of the opponent's separate fleet"
    >
      <rect x="-65" y="-54" width="130" height="108" rx="5" fill="#dce6d7" />
      <rect x="-6" y="-54" width="12" height="108" fill="#80bcb5" />
      {edges.map((e) => {
        const a = nodeById[e.a],
          b = nodeById[e.b];
        const closed =
          e.kind === "bridge" && g.incidents.some((i) => i.kind === "bridge");
        return (
          <line
            key={e.id}
            x1={a.x}
            y1={a.z}
            x2={b.x}
            y2={b.z}
            stroke={closed ? "#ce7955" : "#a4b6a9"}
            strokeWidth={closed ? 2.6 : 2}
            strokeDasharray={closed ? "2 2" : undefined}
          />
        );
      })}
      {g.vans.map((v) => {
        const points = [
          [v.x, v.z],
          ...(v.edgeTo ? [v.edgeTo, ...v.route] : v.route).map((id) => [
            nodeById[id].x,
            nodeById[id].z,
          ]),
        ];
        return (
          <polyline
            key={`route-${v.id}`}
            points={points.map((p) => p.join(",")).join(" ")}
            fill="none"
            stroke="#558e83"
            strokeWidth=".65"
            opacity=".6"
          />
        );
      })}
      {["west-depot", "east-depot"].map((id) => {
        const p = placeById[id];
        return (
          <rect
            key={id}
            x={p.x - 3}
            y={p.z - 3}
            width="6"
            height="6"
            rx="1"
            fill={
              id === "west-depot" && g.incidents.some((i) => i.kind === "power")
                ? "#806d65"
                : "#597f72"
            }
          />
        );
      })}
      {g.vans.map((v) => (
        <g key={v.id} transform={`translate(${v.x},${v.z})`}>
          <circle
            r="2.7"
            fill={v.chilled ? "#6b999c" : "#ecae6c"}
            stroke="#fff7df"
            strokeWidth=".8"
          />
          <text
            y=".9"
            textAnchor="middle"
            fontSize="2.4"
            fill="#243e38"
            fontWeight="bold"
          >
            {v.id.slice(4)}
          </text>
        </g>
      ))}
    </svg>
  );
}
export function BattleBoard({
  showOpponent,
  onShowOpponent,
  onConnect,
  onRetry,
  onDecisions,
}: {
  showOpponent: boolean;
  onShowOpponent: () => void;
  onConnect: () => void;
  onRetry: () => void;
  onDecisions: () => void;
}) {
  const other = rival.game,
    name = match.opponent === "jev" ? "Jev" : "Local Autopilot",
    delta = game.score - other.score;
  return (
    <>
      <section className="battle-scoreboard" aria-label="Live match scores">
        <div className="battle-side yours">
          <span>YOU</span>
          <strong>{game.score.toLocaleString()}</strong>
          <small>
            {game.delivered} delivered · {game.onTime} on time
          </small>
        </div>
        <div className="battle-versus">
          <Swords size={18} />
          <b>
            {delta === 0
              ? "LEVEL"
              : delta > 0
                ? `YOU +${delta}`
                : `${match.opponent === "jev" ? "JEV" : "BOT"} +${-delta}`}
          </b>
          <small>
            {match.opponent === "jev"
              ? match.variant === "chaos"
                ? "CHAOS · LIVE"
                : "LIVE MATCH"
              : "LOCAL PRACTICE"}
          </small>
        </div>
        <button
          className="battle-side theirs"
          onClick={onShowOpponent}
          title="Show opponent fleet"
        >
          <span>{name.toUpperCase()}</span>
          <strong>{other.score.toLocaleString()}</strong>
          <small>
            {other.delivered} delivered · {other.onTime} on time
          </small>
        </button>
      </section>
      {match.variant === "chaos" && match.opponent === "jev" && (
        <div
          className="baseline-score"
          title="Same city and scoring. This unchanged Autopilot follows the original manifest and does not interpret inbox messages."
        >
          MANIFEST AUTOPILOT <b>{baseline.game.score.toLocaleString()}</b>
          <span>{baseline.game.delivered} delivered · reference</span>
        </div>
      )}
      {showOpponent && (
        <aside className="opponent-panel panel">
          <div className="opponent-heading">
            <span className="eyebrow">{name.toUpperCase()}’S CITY</span>
            <span
              className={`opponent-status ${match.pending ? "thinking" : ""}`}
            >
              <Radio size={11} />
              {match.issue || game.paused
                ? "Paused"
                : match.pending
                  ? "Thinking"
                  : match.opponent === "jev"
                    ? "Live"
                    : "Practice"}
            </span>
          </div>
          <OpponentMap />
          <div className="opponent-fleet">
            <span>
              <Truck size={12} />
              {other.vans.filter((v) => v.orderId).length} busy / 8 vans
            </span>
            <span>{other.boosts} Rush left</span>
          </div>
          <p className="opponent-action">
            {match.opponent === "local"
              ? (other.feed.find((f) => f.text.includes("assigned"))?.text ??
                match.lastAction)
              : match.lastAction}
          </p>
          {chaos.rival && match.opponent === "jev" && (
            <details className="jev-explanation">
              <summary>Why this choice?</summary>
              <b>{strategyNames[chaos.rival.state.strategy]}</b>
              <p>
                {chaos.rival.state.reportedReason ||
                  "Waiting for Jev’s first reported reason."}
              </p>
              <small>
                Jev’s returned decision summary. Shared briefings in the inbox
                can revise its approach.
              </small>
            </details>
          )}
          {chaos.rival && match.opponent === "local" && (
            <small className="baseline-explanation">
              Original-manifest dispatcher. It does not read customer updates or
              ask questions.
            </small>
          )}
          {match.lastModel && (
            <small className="opponent-model">
              {match.lastModel} · {match.lastLatency} ms
            </small>
          )}
          <button className="text-button full" onClick={onDecisions}>
            <Sparkles size={12} />{" "}
            {match.opponent === "jev"
              ? `${match.liveDecisions} live decisions · inspect`
              : "Local practice · no model requests"}
          </button>
        </aside>
      )}
      {match.issue && (
        <section className="match-interruption panel" role="alert">
          <Flag size={20} />
          <h3>Both cities are paused.</h3>
          <p>{match.issue}</p>
          <small>
            Your match is preserved. No fallback moves or winner were recorded.
          </small>
          <div className="button-row">
            <button className="primary" onClick={onConnect}>
              Reconnect Jev
            </button>
            <button
              className="secondary"
              disabled={
                !jev.connected ||
                jev.attempts >= jev.requestCap ||
                match.pending
              }
              onClick={onRetry}
            >
              Retry decision
            </button>
          </div>
        </section>
      )}
    </>
  );
}
export function BattleResults({
  onRematch,
  onExit,
}: {
  onRematch: () => void;
  onExit: () => void;
}) {
  const result = matchResult(),
    other = rival.game,
    name = match.opponent === "jev" ? "Jev" : "Local Autopilot";
  const reference = match.variant === "chaos" && match.opponent === "jev";
  const rows = [
    ["Delivered", game.delivered, other.delivered, baseline.game.delivered],
    ["On time", game.onTime, other.onTime, baseline.game.onTime],
    ["Failed / unfinished", game.failed, other.failed, baseline.game.failed],
    [
      "Unused Rush bonus",
      `+${game.boosts * 25}`,
      `+${other.boosts * 25}`,
      `+${baseline.game.boosts * 25}`,
    ],
    ...(match.variant === "chaos"
      ? [
          [
            "Customer-service bonus",
            `+${chaos.you?.state.bonus ?? 0}`,
            `+${chaos.rival?.state.bonus ?? 0}`,
            `+${chaos.baseline?.state.bonus ?? 0}`,
          ],
          [
            "Service failures",
            chaos.you?.state.serviceFailures ?? 0,
            chaos.rival?.state.serviceFailures ?? 0,
            chaos.baseline?.state.serviceFailures ?? 0,
          ],
        ]
      : []),
  ];
  const title =
    result === "win"
      ? `You beat ${name}!`
      : result === "loss"
        ? `${name} wins this round.`
        : result === "tie"
          ? "A perfect draw."
          : "Match not verified.";
  const max = Math.max(
    100,
    ...match.history.flatMap((p) => [
      Math.abs(p.you),
      Math.abs(p.rival),
      ...(reference ? [Math.abs(p.baseline)] : []),
    ]),
  );
  const line = (side: "you" | "rival" | "baseline") =>
    match.history
      .map((p) => `${8 + (p.time / 360) * 284},${64 - (p[side] / max) * 48}`)
      .join(" ");
  return (
    <div className="modal-scrim end-scrim">
      <section
        className="modal battle-results"
        role="dialog"
        aria-modal="true"
        aria-label="Match results"
      >
        <div className="battle-emblem">
          <Trophy size={30} />
        </div>
        <span className="eyebrow">
          {match.opponent === "jev"
            ? match.variant === "chaos"
              ? "CHAOS SHIFT · LIVE JEV"
              : "LIVE JEV MATCH"
            : "LOCAL PRACTICE RESULT"}
        </span>
        <h2>{title}</h2>
        <div className="battle-final-scores">
          <div>
            <small>YOU</small>
            <strong>{game.score.toLocaleString()}</strong>
          </div>
          <span>vs</span>
          <div>
            <small>{name.toUpperCase()}</small>
            <strong>{other.score.toLocaleString()}</strong>
          </div>
        </div>
        {reference && (
          <p className="result-baseline">
            Manifest Autopilot: <b>{baseline.game.score.toLocaleString()}</b>{" "}
            points. Same rules, original manifest; no inbox interpretation.
          </p>
        )}
        <svg
          className="battle-history"
          viewBox="0 0 300 120"
          role="img"
          aria-label={
            reference
              ? "Score history: you in orange, Jev in teal, manifest Autopilot dashed in purple"
              : "Score history: you in orange, opponent in teal"
          }
        >
          <line x1="8" y1="64" x2="292" y2="64" stroke="#d1dbce" />
          <polyline
            points={line("you")}
            fill="none"
            stroke="#df8953"
            strokeWidth="2.5"
          />
          {reference && (
            <polyline
              points={line("baseline")}
              fill="none"
              stroke="#9f90b4"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
          )}
          <polyline
            points={line("rival")}
            fill="none"
            stroke="#62978f"
            strokeWidth="2.5"
          />
          <text x="8" y="115" fontSize="9" fill="#798b7f">
            YOU · ORANGE
          </text>
          {reference && (
            <text
              x="150"
              y="115"
              fontSize="8"
              fill="#9f90b4"
              textAnchor="middle"
            >
              AUTOPILOT · DASHED
            </text>
          )}
          <text x="292" y="115" fontSize="9" fill="#798b7f" textAnchor="end">
            OPPONENT · TEAL
          </text>
        </svg>
        <table className="battle-totals">
          <thead>
            <tr>
              <th>Same shift. Final totals.</th>
              <th>You</th>
              <th>{name}</th>
              {reference && <th>Autopilot</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row[0]}>
                {row.slice(0, reference ? 4 : 3).map((value, i) => (
                  <td key={i}>{value}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          {match.opponent === "jev"
            ? `${match.liveDecisions} verified live choices. Model: ${match.lastModel ?? "unavailable"}.`
            : "Practice opponent used local dispatch rules. This was not a live Jev match."}
        </p>
        <button className="primary full" onClick={onRematch}>
          Rematch <RotateCcw size={15} />
        </button>
        <button className="secondary full" onClick={onExit}>
          Back to a normal shift <ArrowRight size={15} />
        </button>
      </section>
    </div>
  );
}
