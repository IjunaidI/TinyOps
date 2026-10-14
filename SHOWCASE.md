# Jevtown mayor recording guide

Open [http://127.0.0.1:5173](http://127.0.0.1:5173), preferably in a 1440×900 or 1920×1080 viewport at 100% browser zoom. Jevtown is a dedicated mayor simulator; dispatch and head-to-head game controls are no longer available.

## Establish the expanded city

1. Start with the whole city visible. Its land area is approximately twice the original, with outer avenues, five river crossings, terraces, apartments, gardens, a promenade, and City Hall. The new central crossing carries a roundabout on a supported bridge plaza.
2. Select **Central roundabout** to focus on the planted island and connecting bank streets. Eight vehicles use its two central routes; the city has 24 vehicles across ten continuous routes. Let the cars and vans enter, curve around the island, and leave toward the existing bridges.
3. Right-drag for a gentle orbit, left-drag to pan, or scroll to zoom. Focus a district to show its streets, homes, and civic parcels; select **Whole city** for the full composition. Traffic reflects the living-city simulation, including congestion, weather, public transport, and crossing restrictions.
4. Show the four mandate choices and the catalog’s 116 citizen and authority stories before starting a term, including 12 marked **On site**.

## Put the construction sites on the mayor's desk

1. Start a new city to show two inherited sites: the **Warm homes workshop** and **Hillview learning wing**. The previous council funded their contracts; the new mayor still starts with $18,000. Existing saves preserve their original projects.
2. Focus Old Town or Hillview and select a building site. Capture its crew, crane, materials, construction stage, progress, opening date, and any amber site-issue indicator. Site selection opens project details and links to active letters.
3. Open **Build & improve** to show the active-site desk. Pick a real site problem and capture the linked project, decision deadline, spending, city effects, and schedule consequences. The catalog includes noise, dust, rain, late materials, blocked access, fatigue, utility surprises, inspections, delivery queues, runoff, accessibility, and supplier costs.
4. In manual play, select an available response and show its actual effect. A one-day delay should move that project's expected opening by one day while preserving work already completed. During live governing, wait for Jev's returned choice and retain the Jev attribution; do not stage an anticipated choice as an observed one.
5. Some cases allow clarification before a decision. Show the available question and eventual reply when relevant. Six construction cases have clarification conversations, and every case has a response requiring no extra spending.
6. Keep following the site through its next milestone and opening. Each project can release up to two relevant complications. Benefits and daily upkeep begin when it actually opens; unanswered site letters apply their stated effects and add a day of delay.

## Show a real conversation with the mayor

1. Connect OpenRouter before recording and close the key dialog. Retain the **Jev is mayor** attribution. Live governing runs at 1×. A local take must retain its local advisor label and cannot be presented as Jev.
2. Open **Ask Jev**. Write a specific request, such as “Could we build the reading room in Old Town?” Choose a neighborhood, then use **Send request**. If paused, the **Send & resume** label makes the state change explicit.
3. Show the message on the mayor’s desk, then open **The inbox** to show that the same request has joined the civic workload. Jev handles urgent letters first and alternates personal requests with the rest of the inbox.
4. Wait for the actual decision. Capture its status and reason: approval, deferral, existing construction, unaffordable work, impracticality, unsupported powers, or a need for details. Do not stage a promised answer; live choices can differ with the city’s finances and commitments.
5. For an approval, show the real consequence in **Build & improve** or **Budget & services**, such as a commissioned project, changed department funding, or a new tax policy. Show its cost and upkeep. The same project cannot be commissioned twice.
6. An optional second request can illustrate a boundary: request the same project while it is being built, or ask for something physically impossible. Record Jev’s actual returned decision without presenting an anticipated outcome as observed.
7. A deferred request is not automatically approved later. To demonstrate reassessment, wait for the city to change and send a fresh request. Manual reviews are available but must retain their **You** attribution.

The conversation supports up to six waiting requests of 800 characters each. Enter submits; Shift + Enter adds a new line. Free-form requests wait for live Jev or explicit manual review when another controller is active. A failed live request pauses the city instead of substituting a local reply.

## Follow the city’s decisions

1. Show happiness, treasury, population, public trust, incoming letters, and service meters on the overview. Open a real current authored letter to show its trade-offs and deadline.
2. When clarification is available, capture the question, waiting state, and reply. In manual mode choose **Ask for details**; during live governing, wait for Jev’s real choice. The authored reply arrives after four simulation seconds and does not resolve the case by itself.
3. Open **City journal → Live decision details** to inspect an actual returned model, confidence, and request duration. Confidence is model output, not verified accuracy or hidden reasoning.
4. Use **Set the direction** for a broad briefing such as “Protect clinic funding and keep $4,000 for emergencies.” This influences future decisions and remains separate from the personal-request chatbox.
5. Capture a building site progressing through groundwork, structure, and finishing, then its completed civic landmark and daily upkeep. Match the progress and date to the active-site desk rather than implying that a visual crane movement advances the simulation.
6. Switch to evening for warm windows, streetlights, headlights, river reflections, and fireflies. A district focus reveals details; the full view shows the expanded city silhouette.

## Finish a term and return later

A term lasts 30 city days—about ten minutes at 1× without pauses. Let the election finish and capture approval, finances, service health, completed projects, and the actual result. The next term carries the same city, outstanding letters, personal petitions, construction, and history forward.

After a decision or construction milestone, open **Save & restore → Download this city**. Import the file or reload the same address to show a paused restoration, including construction progress, delays, and linked site cases. Reconnect Jev after refresh, or explicitly choose local/manual control, before resuming. The autosave updates every two seconds. Imported files are validated before replacing the city, and no API key is stored in a city file.

Hiding the tab pauses the simulation. Keep connection dialogs and credentials out of every recording. For a screenshot handoff, capture the central roundabout in motion, the active-site desk, a real site decision with its schedule effect, a personal request and response, and the evening city or election result. The guide above remains a reusable recording workflow. The Jevtown LinkedIn cut below uses the actual footage captured on 8 October 2026 (Asia/Karachi).


## Jevtown LinkedIn showcase

The 56-second edit is defined in `exports/jevtown/source/edit.json`. It follows an actual live Jev decision: a citizen asks for The reading room in Old Town, Jev approves the $4,500 contract with $85/day upkeep, and the project progresses through a one-day delay to opening. The remaining shots show budget and tax choices, recurring residents, and the evening city. Accelerated sequences are labeled 2× or 8× playback; live governing was recorded at the game’s normal 1× speed.

Deliverables are `exports/jevtown/jevtown-linkedin-landscape.mp4` (1920×1080) and `exports/jevtown/jevtown-linkedin-portrait.mp4` (1080×1350), with matching poster PNGs. Both use burned-in explanatory captions and an original instrumental score, with no voiceover or captured browser audio. No connection dialogs appear in the cut.

To reproduce the edit, run `scripts/create-showcase-music.py` with Python and NumPy, then `scripts/render-showcase.py` with Python and Pillow. The renderer uses FFmpeg from PATH or `JEVTOWN_FFMPEG`; `--preview` renders the first shot only. The manifest preserves source times, playback speeds, crops, and captions. Source footage and generated media are ignored by Git.

For a new take, run the Vite server and open `?capture=1`. The development-only controls record a selected game tab, can be hidden during the take, and stop with Alt+Shift+S. Saved WebM files go to `exports/jevtown/source/`, with a browser download fallback. Start the server after the capture Vite configuration exists. Recording controls and the local upload endpoint are excluded from production.
