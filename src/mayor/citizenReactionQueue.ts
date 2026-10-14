import type { CitizenReaction } from "./citizenReactions";

/** Keep the visible story steady, then prefer the latest outcomes waiting to speak. */
export function updateReactionQueue(
  previous: CitizenReaction[],
  fresh: CitizenReaction[],
  available: CitizenReaction[],
  presenting: boolean,
): CitizenReaction[] {
  const validIds = new Set(available.map((reaction) => reaction.id));
  const active =
    presenting && validIds.has(previous[0]?.id) ? previous[0] : undefined;
  const candidates = [
    ...(active ? [active] : []),
    ...fresh,
    ...previous.filter((reaction) => validIds.has(reaction.id)),
  ];
  const included = new Set<string>();
  return candidates
    .filter((reaction) => {
      if (included.has(reaction.id)) return false;
      included.add(reaction.id);
      return true;
    })
    .slice(0, 3);
}
