# Neighborhood character

The city now has distinct architectural silhouettes and recurring faces. These additions present the existing city simulation without changing its rules, save format, or Jev protocol.

## Buildings with local identity

Fourteen architectural models replace repeated generic shapes: veranda cottages, garden villas, brick terraces, gabled townhouses, bay-window shops, roof-garden grocers, market arcades, sawtooth workshops, water-tower works, corner cafés, solar terraces, split-level duplexes, courtyard homes, and balcony apartments.

Models vary their roofline, height, setbacks, balconies, shopfronts, courtyards, and planted details. Inner parcels receive stable named designs; outer parcels follow their neighborhood's character:

| Neighborhood | Typical silhouettes |
| --- | --- |
| Riverside | Verandas, garden villas, courtyard homes |
| Old Town | Brick terraces, gables, bay windows |
| Hillview | Solar terraces, split levels, balcony apartments |
| Market Quarter | Arcades, workshops, shopfronts |

Parcel assignments remain consistent when the city reloads. The muted palette, roads, project sites, and established neighborhood layout remain recognizable.

## Eight familiar faces

Mira Shah, Ben Ortiz, Amina Yusuf, Leo Chen, Rosa Silva, Elliot Reed, Sana Iqbal, and Oscar Bell each have a pixel portrait and a matching map figure. Hair, headwear, clothing, and accessories stay consistent across the map, People profiles, request context, and neighborhood voices. Hovering over a named map character reveals a compact face and mood badge; selecting the character opens their story.

Expressions show **Content**, **Grateful**, **Concerned**, **Frustrated**, or **Steady**. Profile moods use actual satisfaction, waiting days, displacement, and recent memories. Current hardship takes precedence over earlier help, and dated memory cues expire. Request reactions use the recorded choice and its effects rather than assuming every approval is good news.

Letters retain their actual author. When a recurring resident offers context for another citizen or business letter, the interface explicitly labels that person as a neighborhood perspective. Department and authority letters are not silently reassigned to residents.

## Small reactions, with room for the world

The corner **Neighborhood voices** control opens a roster and recent recorded reactions. Select a face or **Hear their story** to review the resident's needs and memory in the inspector.

Fresh reactions come from recorded decisions, resident memories, and city events. A reaction closes after nine seconds, with a fourteen-second cooldown before the next. Hovering or focusing the card holds it open; dismissal and review remain available. At most three reactions wait in the queue, with recent outcomes taking priority behind the visible story. The same resident can express a concern and later offer thanks. Small-screen inspectors pause presentation while they cover the corner control. Restored history is available for review but does not replay as a burst of popups.

All portraits and architecture use native SVG and Three.js code. There are no external image, texture, or model downloads. Detailed character geometry is batched, and this presentation layer does not advance the simulation or make extra Jev calls.

## Implementation and checks

- `src/world/buildingStyles.ts` and `NeighborhoodBuildings.tsx`: stable architectural designs and models.
- `src/mayor/citizenIdentity.ts` and `CitizenPortrait.tsx`: shared appearances and expressions.
- `src/mayor/LivingCityWorld.tsx` and `LivingCityPanel.tsx`: map figures and resident profiles.
- `src/mayor/citizenReactions.ts`, `citizenReactionQueue.ts`, and `NeighborhoodVoices.tsx`: factual reactions, bounded queue, roster, and paced popups.
- `src/world/WorldHtml.tsx`: projected, accessible labels with safe cleanup when residents or alert pins appear and disappear.

The integrated release passes 64 automated tests and the production TypeScript/Vite build. Tests cover consistent resident identities, hardship taking priority over older positive memories, factual request attribution, reactions drawn from recorded city history, and a resident's later appreciation surviving the notification queue. Building geometry was separately checked against parcel bounds. Browser checks covered the roster, resident selection, neighborhood focus, and frustrated and grateful reactions from real test-city events. Repeated neighborhood changes and request resolution also verified label cleanup without new browser errors.
