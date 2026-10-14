# Jevtown handbook

The full player and systems guide. For a quick overview and setup, see the [README](../README.md).

## Start a term

Choose one of four mandates—balanced, people, green, or growth—then select **Let Jev run the city**, **I’ll be mayor**, or **Try the local advisor**. Jev requires a successful OpenRouter connection; manual and local play require no key.

A term lasts **30 city days**, with one day taking 20 simulation seconds. Live Jev governs at **1×**, so a term takes about ten minutes without pauses. Manual and Civic Advisor play also offer 2× and 4×. Space pauses or resumes when you are not typing. Hiding the tab pauses the city. Switching into Jev mode restores 1×.

The city has four neighborhoods—**Riverside, Old Town, Market Quarter, and Hillview**—with their own population and happiness. Eight meters track **happiness, public trust, health, safety, environment, mobility, economy, and education**. Treasury, population, daily budget, requests, construction, and the journal reveal how your decisions change the city.

## Ask Jev for something

Open **Ask Jev**, write a request, choose **Whole city** or a neighborhood, and select **Send request**. Enter sends; Shift + Enter inserts a new line. For example:

- “Could we build the reading room in Old Town?”
- “Please increase health services funding.”
- “Can we lower taxes while keeping services running?”

Your message appears in both the conversation and the inbox. Jev considers the text, current finances, upcoming upkeep, construction already in progress, urgent citizen cases, mandate, briefings, and recent responses. Urgent letters retain priority; other letters and your requests take turns on the mayor’s desk.

A reply clearly shows **Approved**, **Deferred**, or **Not approved**, with a reason. Approval carries out a real supported action: commissioning a listed project, changing services or taxes, inspecting or repairing infrastructure, allocating mobile teams, adjusting transport, proposing a council program, or recording an explicitly conditional project commitment. Project approvals show the price, build time, and future upkeep. Deferral may cite an unaffordable commitment, urgent competing work, or a project already underway. Other responses explain when something already exists, is practically impossible, falls outside the city’s available powers, or needs a clearer request.

These are decisions with concrete consequences. The engine validates the chosen action again before applying it. Budget decisions account for already committed upkeep and whether operating losses would exhaust the reserve within three city days. Existing projects cannot be purchased twice. Jev cannot invent a project, promise an unsupported result, or edit numeric outcomes through chat. Replies use checked city facts and the chosen action to explain the result; they are not unrestricted model-generated conversation.

Ordinary deferrals create a non-spending review reminder. A supported project can also receive an explicitly conditional commitment: only that separate authorization allows commissioning later, after its reserve and operating checks pass. Promises, reviews, and deadlines appear in City life. You can clarify your intent in a new message. Up to six requests can wait for review at once, each limited to 800 characters; the latest 100 requests and responses are retained. Requests persist through saved games and continuing terms.

Live Jev reviews free-form requests. Without a live connection, your requests remain on the desk until you connect and select Jev, or explicitly review them yourself. Manual responses are labeled **You**. The local advisor handles the authored citizen catalog and does not fabricate Jev replies. If the city is paused and Jev is ready, **Send & resume** clearly resumes review.

## A city full of stories

The catalog contains **116 authored requests: 88 regular stories, 16 connected follow-ups, and 12 construction complications**. Citizens, businesses, city departments, and regional authorities write about housing, health, transport, environment, education, safety, economy, community life, public administration, and emergencies. Seeded selection releases two eligible regular requests per day; decisions can release additional follow-ups. Construction cases arise from actual active projects, separately from the regular story pool.

Open **The inbox** or a letter on the overview to inspect its deadline and available responses. Every response publishes its cost and immediate effects; some show delayed consequences or open a related story. Only affordable responses can be chosen. Unanswered letters apply their published consequences at the deadline.

Some letters offer **Ask for details**. The requester’s authored reply arrives after four simulation seconds while the original deadline continues. It may reveal accessibility requirements, who is at risk, or what a report actually establishes. The letter remains open until someone selects a response, and Jev sees the clarification only after it arrives.

## How Jev governs

Jev compares up to four eligible citizen cases and a bounded agenda of living-city actions, choosing both which problem to address and a legal response using public city statistics, budgets, relevant history, the elected mandate, and recent player briefings. Urgent deadlines receive a protected review. Asset briefings expose inspection evidence and warnings, never the hidden current condition. It does not receive unreleased stories or unopened clarification answers.

When the desk is clear, Jev reviews living-city conditions daily. Tax and department funding options enter the agenda every three days, even with ordinary letters still waiting, so Jev can revise earlier manual settings using current budget forecasts. Urgent cases take precedence, and capital investments remain part of quiet-desk cabinet reviews. Jev can choose a policy change, retain the current settings, or handle a more pressing agenda action; unchosen letters keep their original deadlines. At most two autonomous living-city decisions run per day; incoming letters and personal requests retain their own reviews. Jev can inspect, repair, assign staff, manage crews, make and revisit commitments, propose amendments, call council votes, or retain the current plan. **Set the direction** remains available for broad briefings such as “Protect clinic funding and keep $4,000 in reserve.” It is separate from the personal request conversation. Up to eight recent briefings of 500 characters guide later decisions without changing the rules or enforcing hard constraints.

The mayor’s activity panel and **City journal** show actual actions and public reason labels. Live records identify the returned model, choice confidence, and measured browser request duration. Confidence is model output, not a measured accuracy score. The local Civic Advisor uses explicitly labeled budget-aware rules without model requests or invented probabilities.

A failed live request pauses the city. Use **Retry Jev**, reconnect when needed, or select local/manual control. Jev is never silently replaced. Valid responses received while paused wait for resume; obsolete or manually superseded responses cannot change the city.

Each mayoral term allows **160 attempted live requests**, including transient retries and discarded stale responses. Switching controllers or restoring a save does not erase usage. A new term resets the allowance. At the limit, the city pauses and offers local or manual control.

## Build and budget

**Build & improve** contains **16 civic projects**, four in each neighborhood: clinics, learning spaces, safer streets, transit facilities, green spaces, housing, and facilities for local businesses. Construction is paid when commissioned. Benefits and daily upkeep begin on completion. Construction sites, cranes, and completed landmarks appear in the city.

New cities begin with two projects already under construction: the **Warm homes workshop** in Old Town and the **Hillview learning wing**. The previous council paid their contracts, so your starting **$18,000** reserve remains available. You inherit the delivery decisions and eventual upkeep. Existing saved cities retain their own projects rather than receiving extra contracts on reload.

The active-site desk shows construction progress, expected opening dates, accumulated delays, and outstanding problems. Select a site on the map or a case in **Build & improve** to open its letter. Crews, materials, cranes, changing structures, and amber issue beacons make the sites visible in the miniature city.

The **12 construction cases offer 36 responses and six clarification conversations**: noisy work, dust, rain during a concrete pour, late beams, blocked walkways, worker fatigue, an unmarked utility, inspection scheduling, delivery queues, muddy runoff, access layout, and supplier prices. Each project can release up to two relevant cases as work progresses. Every case names the affected site and offers a response with no extra spending, usually at the cost of time or neighborhood satisfaction. Building-specific cases do not appear for unrelated green-space or street projects.

Construction choices have real consequences. A response can spend money, change city and neighborhood meters, and add one or two days to that project's remaining schedule. Progress already made is retained; the delayed opening also postpones the project's benefits and upkeep. Ignoring a site letter applies its published city effects and a one-day delay. Jev, the local advisor, and manual play all use these same choices and rules.

**Budget & services** separates recurring revenue and operating costs from one-off spending. Taxes trade household breathing room against city revenue. Five departments—health, safety, transport, education, and environment—offer reduced, standard, or enhanced funding. Service quality changes gradually each day; population and the economy also affect the budget.

Strong services need continuing investment. Health, safety, environment, mobility, economy, and education face additional daily demand pressure of `max(0, current value - 70) × 0.012`. Funding, taxes, requests, and projects can offset it. Meters remain within 0–100. Deficits and neglected neighborhoods weaken public confidence.

The mandate determines election approval weighting. Reelection requires **at least 55% approval**, treasury **at least −$5,000**, and health, safety, environment, mobility, and education each **at least 25**. Unequal neighborhood outcomes and deficits reduce approval. Having no completed civic project costs two approval points.

Continue after the election to retain the same city, outstanding requests, personal petitions, projects, and promised consequences. Dates continue internally across terms so deadlines remain consistent. Journal and completion totals accumulate across the city’s history.

## Living City

The [Living City build spec](LIVING_CITY_SPEC.md) describes the connected expansion. The [map workspace guide](MAP_WORKSPACE.md) explains the persistent city view, contextual inspector, alert bell, map pins, and responsive navigation. Open **City life** (or **Life** on a narrow screen) to govern six focused views. The daily report highlights important current shortages, disruption, delivery pressure, and promises, with links explaining their causes.

- **Services:** community care, learning places, and waste collection have neighborhood demand, usable capacity, coverage, and backlogs. Funding, completed projects, mobile teams, and road/power access affect how many residents can be served. Four mobile teams are shared citywide; a team costs $180 to allocate and $45/day until recalled. District shuttles cost $300 to start and $65/day.
- **People:** eight recurring residents have distinct needs, satisfaction, and dated memories. They react to actual access, service shortages, housing pressure, and mayoral commitments. Click their map markers to open a profile.
- **Promises:** funded projects, service pledges, repairs, council development, and conditional plans have beneficiaries, deadlines, and progress. Keeping or missing a promise affects trust and election approval. A single four-day renegotiation costs public trust. Ordinary request reminders carry no spending authority.
- **Infrastructure:** five key crossing, drainage, and power assets wear over time. Inspections cost $120 and reveal a condition reading in the first daily report after one full city day; they do not repair anything. Forecast maintenance costs $450 for six days of reduced wear. A $1,600 repair needs three working days and a shared crew. Three-day weather forecasts warn of rain, storms, and heat; weak assets can interrupt access and services.
- **Delivery:** two crews are shared by repairs, council development, and civic construction; urgent repairs receive crews first. A relief crew lasts eight days ($350 mobilization plus $160/day). Crew availability, weather, and delivery standards affect actual progress. Economy contracts save $15/site/day but work at 82% speed and deliver 80% service capacity; quality contracts cost $35/site/day and deliver 112% capacity. Standards lock when a contract is commissioned, so later changes apply to future contracts. Site progress never runs backward.
- **Council & growth:** five named councillors vote according to residents, employment, environment, service capacity, and reserves. Housing, workshop, and protection proposals can be amended; a majority vote authorizes spending. Housing and workshops require limited neighborhood sites and crews. Homes, jobs, rent pressure, displacement, and protections interact with resident experience.

The map's **Services**, **Traffic**, and **Infrastructure** overlays show operational conditions. Visible people, queues, and bus passengers are representative of neighborhood totals, not individually simulated households or trip counts. Daily consequences run on the authoritative city clock; reduced-motion and paused views retain readable static indicators.

## Explore the larger city

The city’s base now measures **180 × 148 world units**, compared with the previous 126 × 106: **approximately twice the land area**. New outer avenues, two additional river crossings, terraces, garden apartments, City Hall, orchards, pocket parks, and a waterfront promenade extend the established four neighborhoods. Civic projects sit alongside the new avenues and garden streets.

A new **central roundabout** spans the river on a supported bridge plaza, connecting both bank streets and creating the city's fifth crossing. Its planted island, lane markings, lamps, and bridge approaches make a focal point for moving traffic. Use the **Central roundabout** map control to focus the camera there.

Twenty-four vehicles, including seven vans and two city buses, follow ten continuous base routes and a connected crossing detour. Eight vehicles use the new central routes, circulating around the island and connecting through the existing north and south bridges. Position and heading come from the same path tangent. Vehicles ease into turns, brake, stop briefly, and accelerate again. There are no delivery-bay slides or timed simulation restarts. Neighborhood congestion and weather determine their pace; the same traffic conditions affect service access and commutes. A closed Riverside crossing activates a continuous detour. Buses dwell at marked stops, and the service overlay shows representative waiting passengers. Animation remains independent of live model calls and does not advance city finances. City pause freezes traffic; reduced-motion preferences also stop it. Local game speed does not turn traffic into a fast-forward effect.

Drag to pan, right-drag to orbit, and scroll to zoom. District cards focus the camera; the city view restores full framing. The camera fits the complete expanded base across viewport sizes. Switch to evening for warm windows, lamps, headlights, river reflections, and fireflies. Select a civic landmark to inspect its construction or upkeep.

## Save and return

The city auto-saves every two seconds in this browser, with additional saves when the tab is hidden or the mayor view unmounts. Reloading the same address restores it **paused**. Browser storage is specific to the browser and site address; another browser, port, or device does not share it automatically.

**Save & restore** offers **Download this city** and **Import a city file**. Import replaces the current city, so download it first to keep both. Unsupported, malformed, or oversized files are rejected before replacement; the limit is 1 MB. If local storage is unavailable, the interface reports it and still offers downloads.

Saves retain city statistics, budget, requests, personal petitions and replies, construction progress and delays, linked site problems, promised outcomes, briefings, event-sequence state, and bounded advisor counters. Living City adds service allocations, residents and memories, asset inspections, work queues, council votes, neighborhood growth, and accountable commitments. Earlier saves receive a baseline migration while retaining their existing city. API keys are excluded; credential-shaped strings in user-written save text are redacted. Refresh clears the key, so a restored Jev city waits for reconnection or an explicit controller change. Pending network responses never replay into a restored city. Starting a new city replaces the browser autosave; downloaded files remain independent.

## Connect Jev

Choose **Let Jev run the city**, or use **Jev connection settings** in the handbook. A real browser request verifies the key before connection succeeds. Requests go directly to `https://openrouter.ai/api/alpha/decisions`, using `typesafe/jev-1.13`; the inspector shows the actual returned model ID. There is no application backend, proxy, account system, or telemetry.

Citizen-petition briefings retain every legal action and its public facts, while sharing scope rules once and summarizing unavailable targets by location, cost, and blocking reason. This avoids the duplicated catalog text that caused Jev's `max_tokens_exceeded` HTTP 400 after a successful connection. Known input-limit failures now show a specific message; arbitrary provider error text is never displayed. The affected day-52 briefing fell from about 139 KB to 75 KB with all 95 choices retained, and its live request succeeded.

Keys remain in page memory and are never written to source, environment variables, browser storage, URLs, or logs. Clearing the key removes it from memory. A same-page city restart preserves a verified connection and aborts obsolete requests.

The transport runs one request at a time, starts at most two per second, and uses a four-second attempt timeout with at most one transient retry. Authentication, timeout, schema, rate-limit, and connection failures are visible. The engine owns affordability, supported actions, effects, deadlines, and election scoring.

## Code map

| Path                                                           | Responsibility                                                                                   |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `src/Experience.tsx`                                           | Mayor-only application entry                                                                     |
| `src/mayor/MayorApp.tsx`, `mayor.css`                          | Mayor interface, inbox, budgets, projects, journal, and save controls                            |
| `src/mayor/pixel-theme.css`, `pixel-pages.css`, `PixelArt.tsx` | Pixel-game interface theme, responsive dialogue and management screens, original SVG sprites     |
| `public/fonts/`                                                | Archived pixel fonts from the earlier theme, source references, and SIL Open Font License copies |
| `src/mayor/CitizenChat.tsx`, `petitions.ts`                    | Personal request conversation, legal actions, and factual response text                          |
| `src/mayor/engine.ts`, `catalog.ts`, `types.ts`                | City economy, story catalog, projects, election rules, and authoritative state                   |
| `src/mayor/constructionCatalog.ts`, `ConstructionDesk.tsx`     | Site-specific stories, costs and schedule choices, active-site dashboard                         |
| `src/mayor/livingTypes.ts`, `livingCity.ts`                    | Connected service, resident, asset, promise, work, housing, weather, and council simulation      |
| `src/mayor/LivingCityPanel.tsx`, `living-city.css`             | City life views, action cards, daily briefing, causal history                                    |
| `src/mayor/LivingCityWorld.tsx`                                | Residents, service queues, infrastructure effects, and operational map overlays                  |
| `src/mayor/citizenIdentity.ts`, `CitizenPortrait.tsx`          | Shared resident appearance, pixel portraits, and factual mood expressions                        |
| `src/mayor/citizenReactions.ts`, `NeighborhoodVoices.tsx`      | Recorded neighborhood reactions, paced corner popups, and resident roster                        |
| `tests/`, `scripts/test-living.mjs`                            | Repeatable engine, advisor, and traffic scenario checks (`npm test`)                             |
| `src/mayor/controller.ts`                                      | Guarded live Jev and local advisor decisions                                                     |
| `src/mayor/storage.ts`                                         | Validated local save/import/export                                                               |
| `src/mayor/MayorWorld.tsx`, `ExpandedCity.tsx`                 | Expanded terrain, streets, scenery, responsive camera                                            |
| `src/mayor/CityTraffic.tsx`, `traffic.ts`                      | Independent ambient traffic and continuous lane paths                                            |
| `src/mayor/CentralRoundabout.tsx`                              | Central bridge plaza, island, approaches, and road markings                                      |
| `src/mayor/CivicLandmarks.tsx`, `ConstructionActivity.tsx`     | Project stages, work crews, issue beacons, and completed landmarks                               |
| `src/world/`                                                   | Shared procedural models, materials, lighting, and geometry batching                             |
| `src/world/buildingStyles.ts`, `NeighborhoodBuildings.tsx`   | Fourteen architectural models and stable neighborhood parcel identities                         |
| `src/ai/jev.ts`                                                | Typed Decisions API transport, queue, and parsing                                                |

All models, props, signs, effects, and pixel illustrations are original assets created for Jevtown. No external model or texture download is required. The interface and city signs use native system sans-serif fonts with no font-service request. Earlier Pixelify Sans and Silkscreen assets remain archived locally under the SIL Open Font License 1.1. See [font sources and licenses](../public/fonts/README.md), [ASSET_CREDITS.md](../ASSET_CREDITS.md), and the mayor-focused [recording guide](SHOWCASE.md).
