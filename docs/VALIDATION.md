# Validation log

A historical record of the checks run against each release of Jevtown. Test counts reflect the release they were written for; run `npm test` for the current state.

The current release passes **79 automated tests** and the production TypeScript/Vite build. Its tests include portrait identity consistency, factual request attribution, real-event reactions, mood precedence, reaction queue transitions, compact petition briefings, safe transport-error handling, and tax/funding reviews during a busy inbox with urgent-case precedence. Status-card spacing is checked at desktop and 390px mobile widths. The [neighborhood character guide](NEIGHBORHOOD_CHARACTER.md) describes the neighborhood features.

The Living City expansion passes **33 scenario tests** with `npm test` and the production TypeScript/Vite build. Browser checks cover staffing, inspections, council amendments and spending, resident memories, promises, budgets, and mobile layouts. A live Jev citizen request successfully assigned and paid for a care team. The detailed release validation record is maintained in the [build spec](LIVING_CITY_SPEC.md). Earlier release checks below are historical.

The readable-font revision replaced pixel typography with native system sans-serif fonts while preserving the muted palette and sprites. Desktop/mobile browser checks and the production build passed.

The softer palette revision retains the pixel fonts, sprites, and layouts, with light surfaces and muted accents throughout the city, chat, project desk, and dialogues. It passed the production build and browser contrast review.

The pixel-theme update passed `npm run build` and browser review at 1440×900, 838×720, and 390×844. Checks covered the new-game screen, day/evening map, pixel font loading, navigation, construction desk, project sprites, request dialogue, budget, chat, and handbook. Mobile navigation uses short visual labels while retaining full accessible names; the city map comes first on small screens. No horizontal document overflow or browser console errors were observed. The fonts load from local assets. Earlier dark-theme captures: [pixel city](https://github.com/IjunaidI/TinyOps/blob/89dc495/captures/19-pixel-city.png) and [project sprites](https://github.com/IjunaidI/TinyOps/blob/89dc495/captures/20-pixel-projects.png); these predate the softer palette.

The construction and roundabout expansion passed its production build and desktop/mobile browser checks on October 3, 2026. The browser test confirmed that a two-day inspection delay changes the opening date without losing completed work; the delayed project survived restoration. Construction cards, site selection, linked letters, and schedule consequences were checked, including a 390-pixel layout without document overflow. No browser console errors or warnings were observed. The build retains Vite's large Three.js bundle advisory.

Live `typesafe/jev-1.13-20260917` resolved three construction cases in a fresh test city: a protected temporary passage ($650), concrete weather protection ($700), and replacement delivery of delayed beams ($850). Each real charge and city effect applied, with opening dates unchanged for those choices. The returned model attribution was verified in the decision ledger. This was a short live construction check, not a full-term live benchmark.

The construction catalog integrity check covers all 12 cases, 36 choices, and six clarifications: IDs are unique, project restrictions are valid, every project has at least two eligible cases, each case offers a zero-cost response, and schedule delays stay within zero to two days. Engine checks covered construction milestones, paid/free choices, expiry delays, monotonic progress, completion, legacy imports, and seven invalid-save variants. An additional 1,000 save round trips spanned 25 seeds and all 16 project definitions.

Twenty-four full-term Local Advisor runs covered three seeds, all four mandates, and 1×/4× playback. Both inherited sites completed in every run, all construction cases were resolved, no requests expired, and the city stayed solvent ($2,462–$4,643 final reserve). Save/import preserved the resulting projects and decisions. These are controlled simulations, not claims about every live Jev run.

All ten traffic routes passed continuous position/tangent and swept van-footprint road checks. The 24-vehicle fleet ran for 600 simulated seconds at each of 60 and 10 FPS without oriented footprint collisions or gridlock; every vehicle continued completing routes. The browser review confirmed traffic entering and leaving the central crossing.

Expansion captures: [central roundabout](screenshots/central-roundabout.png), [active construction desk](screenshots/construction-desk.png), and [live Jev construction decision](screenshots/jev-construction-decision.png).

The preceding request-chat release was checked in the browser with live `typesafe/jev-1.13-20260917`: a reading-room request commissioned the $4,500 Old Town project; a duplicate was recognized without another charge; a Moon bridge was declined as impractical; an unsupported neighborhood was declined after correcting scope matching; and a $1,000-budget scenario deferred the $4,500 project with its actual cost and funds. Inbox linking, restored conversations, mobile layout, and day/evening city framing were checked in that release. No browser console errors were observed, and its production build passed (with Vite's large Three.js bundle advisory).

Petition checks covered real action effects, duplicate/stale spending prevention, recurring budget sustainability, pause behavior, bounded queues and history, credential redaction, and save round trips, including 11 invalid imports rejected without changing the city. Controller mocks covered scheduling, errors, pause/stale responses, deadline preemption, and six additional scope cases. These checks use controlled scenarios; free-text model decisions can still vary.

Request-chat release captures: [expanded evening city](screenshots/expanded-mayor-evening.png) and [live budget response](screenshots/jev-budget-response.png). These predate the central roundabout and inherited construction sites.

The preceding expanded-city checks sampled **22,404 path poses**, including all line/arc joins and loop seams. Position and tangent headings remained continuous, and every corner of the van footprint stayed on road surfaces. Its sixteen vehicles were simulated for **650 seconds at each of 60, 30, and 10 FPS**, exercising 477 stops without teleports, invalid coordinates, or excess speed. These results describe the eight-route layout before the new roundabout routes.

Earlier mayor validation covered forty full local-advisor terms across four mandates, five seeds, and 1×/4× playback; all finished solvent with no expired requests. Save/import checks covered strict validation, exact state restoration, paused reloads, delayed outcomes, construction, and credential exclusion. Controller checks covered stale responses, pause/retry, model schema validation, and scoped usage limits.

An authenticated **pre-chat expansion** browser playthrough on October 3, 2026 ran a full balanced term with `typesafe/jev-1.13-20260917`: **66 requests resolved, zero unanswered, 93% happiness, 95% election approval, and $1,234 treasury**. A player briefing led to a reading room. This is one observed run of the earlier mayor version, not a benchmark or a test of the new personal-request feature.

Earlier captures: [mayor welcome](screenshots/mayor-welcome.png), [live mayor election](screenshots/mayor-live-election.png), [citizen letter](screenshots/mayor-citizen-letter.png), [civic landmarks](screenshots/mayor-civic-landmarks.png). These show the previous city layout.
