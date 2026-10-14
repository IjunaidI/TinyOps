/** Compatibility criteria for archived transport callers; no game module is loaded. */
export const strategyChoices = {
  efficient:
    "Minimize completion time while honoring the latest customer instructions.",
  medical:
    "Protect clinic consignments and their deadlines before ordinary shop stock when there is a conflict.",
  cold: "Preserve refrigerated capacity for chilled orders; prefer standard vans for ordinary parcels.",
  deadline:
    "Prioritize the earliest customer deadline, accepting longer trips when necessary.",
};
export const reasonChoices = {
  customer_update: "The customer's latest message changes the delivery plan.",
  clarify:
    "A required order, destination, or deadline is missing; ask before guessing.",
  deadline: "Protect a delivery deadline or avoid a late/failed job.",
  cold_capacity: "Preserve scarce refrigerated capacity.",
  efficient_route:
    "This choice makes efficient use of the current fleet and travel estimates.",
  shared_brief:
    "Follow the operations brief or a shared dispatcher instruction.",
  no_change:
    "The message confirms the existing plan or the job is already complete.",
};
