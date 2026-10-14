# Jevtown asset credits

All runtime 3D assets were authored procedurally for Jevtown in this repository. No external models or texture packs are used. The pixel illustrations are original SVG artwork defined in source. The interface, city signs, and canvas badges use native system sans-serif fonts. Earlier third-party pixel fonts remain archived locally with their licenses; the application no longer loads them.

| Assets | Creator | License / rights | Source files |
| --- | --- | --- | --- |
| Expanded 180 × 148 terrain miniature and mayor camera framing | Created for Jevtown | Original project assets; no third-party art license | `src/mayor/MayorWorld.tsx` |
| Outer avenues, new river bridges, terrace homes, garden apartments, City Hall, orchards, pocket parks, promenade | Created for Jevtown | Original project assets; no third-party art license | `src/mayor/ExpandedCity.tsx` |
| Central roundabout bridge plaza, planted island, supporting structure, bank connections, lamps, lane markings | Created for Jevtown | Original project assets; no third-party art license | `src/mayor/CentralRoundabout.tsx` |
| Original river, road grid, bridges, lane markings, scene lighting | Created for Jevtown | Original project assets; no third-party art license | `src/world/Scenery.tsx` |
| Depots, cafe, market stalls, clinic, homes, storefronts, warehouses | Created for Jevtown | Original project assets; no third-party art license | `src/world/Buildings.tsx` |
| Standard/refrigerated van models and cars | Created for Jevtown | Original project assets; no third-party art license | `src/world/Vehicles.tsx` |
| Mayor traffic choreography, ten continuous routes including two central roundabout routes, pedestrians | Created for Jevtown | Original project assets; no third-party art license | `src/mayor/CityTraffic.tsx`, `src/mayor/traffic.ts` |
| Shared geometry, trees, lamps, crates, benches, sign textures | Created for Jevtown | Original project assets; no third-party art license | `src/world/Primitives.tsx` |
| Clock tower, rooftop details, birds, fountain effects, evening lights | Created for Jevtown | Original project assets; no third-party art license | `src/world/Neighborhood.tsx`, `src/world/Atmosphere.tsx` |
| Civic landmarks, construction stages, cranes, parcels, district flags, canvas badges | Created for Jevtown | Original project assets; no third-party art license | `src/mayor/CivicLandmarks.tsx` |
| Construction workers, stacked materials, site equipment, cones, amber issue beacons | Created for Jevtown | Original project assets; no third-party art license | `src/mayor/ConstructionActivity.tsx` |
| Mayor interface, active-site desk, personal request conversation, pixel-game panels and controls | Created for Jevtown | Original project assets; no third-party art license | `src/mayor/MayorApp.tsx`, `src/mayor/ConstructionDesk.tsx`, `src/mayor/CitizenChat.tsx`, `src/mayor/mayor.css`, `src/mayor/pixel-theme.css`, `src/mayor/pixel-pages.css` |
| Pixel HUD and navigation sprites, civic project illustrations | Created for Jevtown | Original project assets; no third-party art license | `src/mayor/PixelArt.tsx` |
| Pixelify Sans, Latin variable font, weights 400–700 | The Pixelify Sans Project Authors | [SIL Open Font License 1.1](public/fonts/PixelifySans-OFL.txt); unmodified self-hosted WOFF2 subset | `public/fonts/pixelify-sans-latin.woff2`; [sources](public/fonts/README.md) |
| Silkscreen, Latin fonts, weights 400 and 700 | The Silkscreen Project Authors | [SIL Open Font License 1.1](public/fonts/Silkscreen-OFL.txt); unmodified self-hosted WOFF2 subsets | `public/fonts/silkscreen-latin-400.woff2`, `public/fonts/silkscreen-latin-700.woff2`; [sources](public/fonts/README.md) |
| Citizen correspondence, construction complications, authored clarification replies and choices | Created for Jevtown | Original project writing; fictional people and scenarios | `src/mayor/catalog.ts`, `src/mayor/constructionCatalog.ts` |
| Interface icons | Lucide contributors; portions by Cole Bemis / Feather | ISC, with MIT-licensed Feather portions; copyright and permissions in `node_modules/lucide-react/LICENSE` | `lucide-react` package |

The geometry and palette were authored for the miniature city art direction. The pixel UI uses a pale blue-gray palette with muted teal, sage, gold, and rose accents, with 16 × 16 icon grids and project sprites rendered as crisp SVG shapes. Typography uses native system sans-serif fonts for readability while retaining the pixel artwork and controls. Full font copyrights, licenses, and download provenance are retained in `public/fonts/`.

`src/world/Baked.tsx` combines static geometry for efficient rendering. React Three Fiber, Drei, and Three.js are software dependencies, not third-party art assets; their package licenses remain in the installed packages. No Kenney, Quaternius, Poly Haven, or other third-party model collections are included. Historical dispatch-only assets may remain in source but are not rendered by the mayor experience.
