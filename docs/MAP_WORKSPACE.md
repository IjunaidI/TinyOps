# Map workspace

TinyOps keeps the city visible while you govern. The map stays mounted as you move between tools; opening a management panel does not replace it or restart the scene.

## Layout and navigation

- A compact resource bar shows the city’s essential numbers. The bottom dock opens correspondence, City life, construction, finance, the journal, and the mayor’s controls. A map-side bell opens active alerts.
- One closable inspector holds the selected tool or request. It overlays the right side on desktop and becomes an overlay bottom sheet on narrow screens. Opening or closing it keeps the map’s dimensions, zoom, and camera position unchanged. Floating controls move clear of the panel; the inspector has one main scroll region.
- City life preserves its section and neighborhood filter. Its **Show on map** buttons navigate to the selected resident, service district, asset, project, or council neighborhood.
- Map controls offer whole-city and central-roundabout views, neighborhood selection, day/evening lighting, and **Traffic**, **Services**, and **Infrastructure** layers. Drag pans, right-drag orbits, and the wheel zooms.
- Location lookup follows fixed project and asset coordinates, including references attached to commitments or works. Healthy assets and completed projects remain locatable without an active alert. Residents, council proposals, and other neighborhood-level items use their actual district; citywide items remain reviewable without inventing a physical address.

## Alerts that reflect the city

Alerts are derived from current city state. They cover open letters and personal requests, service shortages, infrastructure warnings and outages, commitments needing review, construction waiting for crews, draft council motions, and a low cash reserve. Severity and priority reflect the underlying condition, deadline, and available public evidence; uninspected asset condition is not exposed.

An alert clears when its underlying issue clears. Dismissing an announcement only closes the popup: the active issue remains in the bell and alert list. New alerts and severity changes can announce themselves, then the popup settles into the persistent bell. Restoring or opening a city does not replay every existing issue as a new arrival.

At city scale, map alerts cluster into at most one marker per neighborhood. A focused neighborhood shows at most six individual pins, keeping the scene readable. Clicking a pin or list entry opens the relevant inspector and location. Alerts without a meaningful map position remain available in the alert center.

## Accessibility and scope

Controls retain accessible names and visible keyboard focus. Escape closes the inspector; Space controls pause when focus is outside typing and button controls. Reduced-motion preferences remove the panel, popup, bell, and pin movement while preserving the information and actions.

This workspace revision changes presentation and navigation, not simulation rules or the saved-city schema. Decisions still pass through the authoritative city actions. Alert announcements and selection are interface state, not a second simulation event log.

Automated regression checks cover [alert lifecycle and severity](../tests/city-alerts.test.ts), [district clustering and focused pin limits](../tests/world-alerts.test.ts), and [location lookup](../tests/city-locations.test.ts). Run `npm test` and `npm run build` for the scenario suite and production checks.

Implementation: [MayorApp](../src/mayor/MayorApp.tsx), [alert derivation](../src/mayor/cityAlerts.ts), [alert interface](../src/mayor/CityAlertPanel.tsx), [location lookup](../src/mayor/cityLocations.ts), [workspace styles](../src/mayor/world-ui.css), and [inspector styles](../src/mayor/world-inspector.css).
