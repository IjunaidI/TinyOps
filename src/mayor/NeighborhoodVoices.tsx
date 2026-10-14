import { useEffect, useRef, useState } from "react";
import { ChevronRight, MessageCircle, X } from "lucide-react";
import type { CityState } from "./types";
import type { LivingCitySelection } from "./LivingCityPanel";
import CitizenPortrait from "./CitizenPortrait";
import { citizenEmotion, citizenEmotionLabels } from "./citizenIdentity";
import { getCitizenReactions, type CitizenReaction } from "./citizenReactions";
import { updateReactionQueue } from "./citizenReactionQueue";
import "./neighborhood-voices.css";

const moodLabels = citizenEmotionLabels;

/** A small, paced view of real resident memories and city events. */
export default function NeighborhoodVoices({
  state,
  onSelect,
  inspectorOpen,
}: {
  state: CityState;
  onSelect: (selection: LivingCitySelection) => void;
  inspectorOpen: boolean;
}) {
  const reactions = getCitizenReactions(state);
  const [queue, setQueue] = useState<CitizenReaction[]>([]);
  const [review, setReview] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [cooling, setCooling] = useState(false);
  const [compact, setCompact] = useState(
    () => window.matchMedia("(max-width: 760px)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(max-width: 760px)");
    const update = () => setCompact(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const visible = !(compact && inspectorOpen);
  const seen = useRef(new Set<string>());
  const generation = useRef<number | null>(null);
  const signature = reactions.map((item) => item.id).join("|");
  useEffect(() => {
    if (generation.current !== state.generation) {
      generation.current = state.generation;
      seen.current = new Set(reactions.map((item) => item.id));
      setQueue([]);
      setReview(false);
      setCooling(false);
      setHovered(false);
      setFocused(false);
      return;
    }
    const fresh = reactions.filter((item) => !seen.current.has(item.id));
    for (const item of fresh) seen.current.add(item.id);
    if (seen.current.size > 500)
      seen.current = new Set(reactions.map((item) => item.id));
    setQueue((previous) =>
      updateReactionQueue(
        previous,
        fresh,
        reactions,
        !cooling && !review && visible,
      ),
    );
  }, [signature, state.generation]);
  const current = !cooling && !review && visible ? queue[0] : undefined;
  useEffect(() => {
    setHovered(false);
    setFocused(false);
  }, [current?.id]);
  function dismiss() {
    setQueue((previous) => previous.slice(1));
    setHovered(false);
    setFocused(false);
    setCooling(true);
  }
  useEffect(() => {
    if (!current || hovered || focused) return;
    const timer = setTimeout(dismiss, 9000);
    return () => clearTimeout(timer);
  }, [current?.id, hovered, focused]);
  useEffect(() => {
    if (!cooling) return;
    const timer = setTimeout(() => setCooling(false), 14000);
    return () => clearTimeout(timer);
  }, [cooling]);
  function visit(id: string) {
    const resident = state.living.citizens.find((person) => person.id === id);
    if (!resident) return;
    setReview(false);
    if (current) dismiss();
    onSelect({ section: "residents", id, districtId: resident.districtId });
  }
  const people = state.living.citizens;
  return (
    <section className="neighborhood-voices" aria-label="Neighborhood voices">
      {current && (
        <article
          key={current.id}
          className={`neighbor-reaction mood-${current.emotion}`}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocusCapture={() => setFocused(true)}
          onBlurCapture={(event) => {
            if (
              !event.currentTarget.contains(event.relatedTarget as Node | null)
            )
              setFocused(false);
          }}
        >
          <button
            className="neighbor-dismiss"
            onClick={dismiss}
            aria-label="Dismiss neighbor reaction"
          >
            <X size={13} />
          </button>
          <div className="neighbor-reaction-heading">
            <CitizenPortrait
              identity={current.citizenId}
              name={current.name}
              emotion={current.emotion}
              size={48}
            />
            <div>
              <small>
                {moodLabels[current.emotion]} ·{" "}
                {state.districts.find((d) => d.id === current.districtId)?.name}
              </small>
              <strong>{current.name}</strong>
              <span>{current.role}</span>
            </div>
          </div>
          <div role="status" aria-live="polite" aria-atomic="true">
            <h3>{current.title}</h3>
            <p>{current.text}</p>
          </div>
          <button
            className="neighbor-visit"
            onClick={() => visit(current.citizenId)}
          >
            Hear their story <ChevronRight size={12} />
          </button>
        </article>
      )}
      {review && (
        <div className="neighbor-review" aria-label="People around town">
          <header>
            <div>
              <small>LIFE BETWEEN THE BUILDINGS</small>
              <h3>People around town</h3>
            </div>
            <button
              aria-label="Close neighborhood voices"
              onClick={() => setReview(false)}
            >
              <X size={15} />
            </button>
          </header>
          <div className="neighbor-roster">
            {people.map((person) => (
              <button
                key={person.id}
                onClick={() => visit(person.id)}
                aria-label={`Meet ${person.name}, ${moodLabels[citizenEmotion(person, state.day + state.dayProgress)].toLowerCase()}`}
              >
                <CitizenPortrait
                  identity={person.id}
                  name={person.name}
                  emotion={citizenEmotion(
                    person,
                    state.day + state.dayProgress,
                  )}
                  size={44}
                  decorative
                />
                <span>
                  <b>{person.name.split(" ")[0]}</b>
                  <small>
                    {
                      moodLabels[
                        citizenEmotion(person, state.day + state.dayProgress)
                      ]
                    }
                  </small>
                </span>
              </button>
            ))}
          </div>
          {reactions.length > 0 && (
            <>
              <h4>Recent neighborhood voices</h4>
              <div className="neighbor-recent">
                {reactions.slice(0, 5).map((item) => (
                  <button key={item.id} onClick={() => visit(item.citizenId)}>
                    <CitizenPortrait
                      identity={item.citizenId}
                      name={item.name}
                      emotion={item.emotion}
                      size={32}
                      decorative
                    />
                    <span>
                      <strong>
                        {item.name.split(" ")[0]} · {item.title}
                      </strong>
                      <small>{item.text}</small>
                      <em>
                        Day {Math.floor(item.day)} · {item.sourceLabel}
                      </em>
                    </span>
                    <ChevronRight size={12} />
                  </button>
                ))}
              </div>
            </>
          )}
          {!reactions.length && (
            <p className="neighbor-review-note">
              Your neighbors remember what happens here. Their reactions will
              appear as the city lives.
            </p>
          )}
        </div>
      )}
      <button
        className="neighbor-launcher"
        aria-expanded={review}
        onClick={() => setReview(!review)}
        aria-label="Meet your neighbors"
      >
        <span className="neighbor-facepile" aria-hidden="true">
          {people.slice(0, 3).map((person) => (
            <CitizenPortrait
              key={person.id}
              identity={person.id}
              name={person.name}
              emotion={citizenEmotion(person, state.day + state.dayProgress)}
              size={30}
              decorative
            />
          ))}
        </span>
        <span>
          <b>Neighborhood voices</b>
          <small>{people.length} familiar faces around town</small>
        </span>
        <MessageCircle size={14} />
      </button>
    </section>
  );
}
