# OpenStreetMap UI Fix Handoff Prompt

Use this prompt with a coding agent to implement the fix.

## Prompt
You are working in the BevoFix repo.

Objective: fix the OpenStreetMap section in the upload-first form UI so it renders a real OpenStreetMap map, not the current faux gradient mock.

Current issue:
- Route: `/form`
- File: `components/ui/triage-form-page.tsx`
- The "OpenStreetMap" card currently renders decorative divs plus a fake pin and attribution text, but no actual OSM tiles.

Implement the following:
1. Replace the fake map surface in `components/ui/triage-form-page.tsx` with a real OpenStreetMap embed (`iframe`) using a valid `openstreetmap.org/export/embed.html` URL.
2. Keep the existing visual layout language (rounded card, UT colors, spacing), but the map content must be real OSM tiles.
3. Add an "Open larger map" link in the map card that opens the corresponding OSM page in a new tab.
4. Drive the embed/link URLs from coordinates in code (not hardcoded long URL strings). Reuse existing helpers in `lib/location-hints.ts` where possible; if needed, extract/export a small reusable URL builder there.
5. Keep this lightweight: do not add heavy map dependencies (no Leaflet unless absolutely required). `iframe` embed is preferred.
6. Preserve mobile behavior and avoid layout shift.

Suggested coordinate behavior:
- Default to PCL-area coordinates (`30.28282, -97.73812`) when no better value is available.
- Optionally map known building names (PCL, Texas Union, Welch, Gregory, Main Mall, Jester) to coordinates for better preview accuracy.

Quality checks:
- `npm run build` passes.
- `npm test` passes.
- `/form` visibly renders real OpenStreetMap tiles in the map card.
- The "Open larger map" link opens the same location as the embedded map.
- No TypeScript or lint errors introduced.

Deliverables:
- Code changes only in necessary files.
- Short implementation summary with file-by-file notes.
- Any assumptions called out explicitly.
