# TinyOps: Living City expansion

Status: implemented, October 3, 2026. This spec records the expansion requested after the readable-font revision. The existing city, requests, construction, Jev connection, and saves remain the foundation.

## Experience

Every decision changes what the city needs next. Residents retain memories, public buildings serve finite demand, work competes for resources, and the mayor is accountable for commitments. The existing light palette, native sans-serif typography, pixel illustrations, and miniature 3D world remain.

The simulation owns costs, conditions, timing, outcomes, and randomness. Jev reads public evidence and chooses executable actions; it cannot invent outcomes or inspect undiscovered facts. Manual control and the explicitly labeled local advisor use the same rules.

## Connected systems

### 1. Service access and capacity

- Track healthcare and education demand by neighborhood, derived from population.
- Baseline facilities and completed civic projects provide capacity. Department funding, staffing, asset condition, and road access determine effective capacity.
- Show demand, effective capacity, coverage, and waiting residents. Sustained shortages affect health/education and resident satisfaction; additional housing increases demand.
- Offer actions such as temporary staffing or outreach with explicit duration and recurring costs. A facility's completion must cause a real capacity change.

### 2. Accountable commitments

- Track commitments with beneficiaries, conditions, creation date, deadline, status, actor, and an explanation of the latest change.
- Project approvals create delivery commitments. Conditions may include a reserve floor, crew availability, or prerequisite work.
- Review deferred supported requests when finances or prerequisites change. Review does not silently spend money without an executable approval.
- Permit explicit renegotiation. Broken promises and fulfilled promises have bounded, recorded trust and resident effects.
- The agenda distinguishes waiting, ready, active, delivered, and missed/renegotiated work.

### 3. Persistent residents

- Seed a small cast of named residents across all four neighborhoods, with roles and distinct needs.
- Residents react to their actual service access, local disruption, housing pressure, and delivered commitments.
- Maintain bounded dated memories and follow-up messages, including the causal event or decision.
- Resident cards are available in City life and through map selection. Mood is explained through concrete experiences.

### 4. Maintenance, investigation, and weather

- Roads, drains, and public facilities have condition and inspection information. Published estimates are distinct from undiscovered state.
- Inspections cost money/time and reveal useful evidence; repairs compete for available resources.
- Seeded weather forecasts provide notice. Poor drainage or condition makes an indicated hazard more damaging; precautions and repair can mitigate it.
- Outages and disruption reduce access/capacity and cause localized visual effects. Failures remain recoverable.
- Jev receives only the public condition estimate, inspection results, forecast, and stated risk—not hidden future outcomes.

### 5. Construction quality and finite crews

- Projects share a finite delivery workforce. Overcommitting changes expected completion without undoing completed work.
- Contract choices trade price, delivery speed, and quality. Completed assets retain condition/maintenance implications.
- Offer explicitly priced actions for temporary help, quality assurance, or contract changes when legal.
- Existing site-specific problems continue to affect their actual project. No duplicate commissioning or double charging.

### 6. Meaningful traffic

- Derive neighborhood congestion, journey delay, and accessibility from population demand, construction, disruptions, and transport policy.
- Feed these same values into service capacity and the visible fleet. The render loop does not drive the economy.
- Existing continuous road paths remain the geometry source. Vehicles brake smoothly and maintain tangent headings; detours use existing connected road geometry.
- Add identifiable service/transit traffic, roadwork markers, service queues, and toggleable city overlays. Pause and reduced-motion remain supported.

### 7. Neighborhood growth and affordability

- Neighborhoods track housing availability/pressure, local jobs/business activity, and rent pressure.
- Services, investment, access, and population changes interact. Successful development can increase demand and affordability pressure.
- Offer bounded housing/access/protection measures with actual costs and tradeoffs. Explain both gains and strain.
- Resident reactions and council interests reflect these local outcomes.

### 8. Council and public accountability

- Give council members named constituencies and public priorities.
- Major living-city programs require a visible vote. Support comes from actual local needs, finances, and commitments.
- The mayor can propose an amendment or smaller/phased program. Voting executes only legal funded outcomes; failed votes have visible reasons and a recovery path.
- Report decisions, consequences, fulfilled promises, and missed commitments in a factual civic timeline and election assessment.

## Jev and citizen requests

- Jev's agenda includes living-city actions alongside current requests and investment choices. It can choose which eligible problem to address, while imminent deadlines retain protection.
- Bound live decision frequency and preserve the 160-attempt term limit, pause/error behavior, stale-response rejection, and honest model attribution.
- Snapshot public service demand, capacity, local economy, resident memories, commitments, inspections, weather, and council evidence. Avoid leaking undiscovered condition/future events.
- Chat can request supported living-city actions. Responses quote actual costs and outcomes; unsupported requests remain honestly declined.
- The local advisor applies transparent priority rules; it never fabricates model responses to free-form requests.

## Interface

- Add a City life destination with a focused set of subviews: services/neighborhoods, people, promises, infrastructure/work, and council.
- Add a daily briefing to the overview with the three most consequential current developments and links to details.
- Include a “Why did this happen?” causal history with dated causes and outcomes.
- Actions show one-off and recurring costs, expected timing, and unavailable reasons. Paused cities offer a clear resume control.
- Preserve usable layouts at 390px mobile and the existing compact desktop preview, keyboard focus, readable text, and bounded scrolling.

## Data and persistence

- New state is deterministic from the city seed and advances on simulation time, not wall-clock or animation frames.
- Existing saves receive a documented baseline migration without losing projects, requests, treasury, or history.
- Validate new enums, identifiers, ranges, finite numbers, references, and history bounds before committing an import. Invalid saves cannot partially replace the current city.
- Round trips preserve active work, discoveries, forecasts, commitments, memories, and random progression. Credential-shaped text remains excluded/redacted.
- Keep event histories bounded and the portable save within the existing 1 MB limit.

## Acceptance and validation

1. A facility opening or staffing decision changes capacity, waiting demand, costs, and subsequent resident outcomes.
2. Access loss changes both service effectiveness and traffic; resolving the disruption restores them.
3. At least one deferred commitment becomes actionable after its condition changes, and a missed/renegotiated/delivered commitment produces the correct recorded outcome exactly once.
4. Inspections reveal evidence, repairs improve condition, and seeded weather damage responds to preparedness.
5. Concurrent construction respects resource constraints and progress remains monotonic.
6. Housing/job changes influence affordability and resident satisfaction.
7. Council support and amendments can change a vote; only a passing, still-affordable program spends funds.
8. Jev and manual actions execute through the same authoritative API. Stale, unaffordable, duplicate, and unknown actions are rejected without mutation.
9. Save migration, round-trip, invalid import, multi-term, and deterministic replay tests pass.
10. Production TypeScript/build and browser checks pass; the visible city agrees with the simulation.

## Deliberate simulation scale

This release uses representative residents, aggregate neighborhood demand, and a finite visible vehicle fleet. It does not simulate thousands of independent household agents or traffic microsimulation. Each displayed consequence must still be derived from the same authoritative city state. The existing authored catalog remains useful alongside the new systemic events.

## Implementation details and validation record

The main state and rules are in `src/mayor/livingTypes.ts` and `livingCity.ts`, connected through `engine.ts`. `LivingCityPanel.tsx` supplies the six management views and the daily briefing; `LivingCityWorld.tsx` and `traffic.ts` reflect the same operational conditions in the map. Jev's expanded agenda lives in `controller.ts`; written requests use `petitions.ts` and `CitizenChat.tsx`.

Delivery uses two shared crews, with repairs first, council development next, then prioritized civic construction. Relief crews are temporary and priced. Contractor quality is locked per commissioned civic contract, preventing a free upgrade immediately before opening. Promises, inspections, and operational completion estimates publish daily boundaries; inspections report at the first boundary after one full day of investigation. Ordinary deferrals carry no spending authority; conditional project commitments explicitly do.

Validation completed:

- **33 automated scenarios passed** with `npm test`: legal-action rejection, public information boundaries, deterministic replay, service staffing and costs, inspections, weather wear, outage recovery, conditional approvals, renegotiation, exact-deadline delivery, council amendments and rejection tallies, crew priority, contract quality, save migration, invalid imports, history bounds, multi-term continuation, Jev scope/stale-response guards, and independent daily/capital reviews.
- Traffic scenarios cover continuous route positions and tangents, congestion, bus stops, zero-time pause behavior, and closure/reopening at both 60 and 10 FPS, including swept vehicle footprints remaining on roads.
- **Production TypeScript and Vite build passed.** The existing large Three.js bundle advisory remains; the app is a client-side simulation.
- Browser checks confirmed manual staffing raised Hillview learning capacity from 46 to 67 with an exact $180 charge and $45/day cost; a purchased inspection returned evidence after time passed; a housing amendment raised council support from 2/5 to 4/5, charged $4,600 on approval, reserved a site, queued work, and created a resident memory and delivery commitment.
- Live `typesafe/jev-1.13-20260917` approved a written request for one Old Town care team. The $180 action executed, ongoing wages appeared, the district showed the assigned team, and the reply's model attribution and 1.03-second request duration were verified. This is a live integration check, not a full-term benchmark of Jev's strategy.
- Desktop and 390 × 844 mobile checks covered City life navigation, service cards, resident memories, commitments, infrastructure, construction, council, budgets, and chat. Document width remained 390 pixels on mobile. The existing user's city was preserved; gameplay verification used a separate local test origin.
- Map overlays were checked after reducing label density: services and traffic use four district labels; infrastructure uses asset warnings; the everyday view keeps individual labels on hover. Clicking an infrastructure warning opened the correct Old Town substation detail. No browser console errors or warnings were observed.
- Five accelerated 30-day Local Advisor terms covered all four mandates and a consecutive second term. All finished without runtime errors or nonfinite state; 20 save/restore checks passed. Every started catalog project completed, no authored requests expired, and final treasuries were $2,684–$4,161 with 84–86% election approval. Longer-term pressure still emerged: the second balanced term had 17 displaced households. These are local-rule checks; difficulty remains forgiving and the results do not predict live Jev strategy.
