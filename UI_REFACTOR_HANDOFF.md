# BevoFix UI Refactor Handoff

Use this file together with [AGENTS.md](/Users/shruthisubramanian/Documents/BevoFix/UTCodexHackathon26/AGENTS.md) as the source of truth for any UI refactor work.

## Product Definition
BevoFix is a campus AI triage platform that turns student photos into action.

The app has exactly two modes:
- Fix Mode: a student uploads a photo of a campus issue, AI extracts a structured issue report, and the app creates a local mock service ticket.
- Signal Mode: a student uploads a photo of a useful campus update, AI extracts a structured announcement, and the app publishes it to a local campus feed.

## Non-Negotiable Constraints
- Do not expand scope beyond the two-mode framing.
- Do not add auth, deployment work, real campus integrations, social features, admin systems, or exact indoor positioning.
- Keep the app local-first and demo-safe.
- The review step is required before final submission.
- AI outputs must remain editable.
- Confidence and uncertainty must remain visible.
- The UI must stay stable even when AI output is incomplete or fallback data is used.

## Current App Shape
- Stack: Next.js App Router + TypeScript + CSS in a single global stylesheet.
- Primary routes:
  - `/` landing page
  - `/report/[mode]` upload + analyze
  - `/review/[mode]` review + confirm
  - `/dashboard` queue + feed
- API routes:
  - `/api/analyze`
  - `/api/submit/fix`
  - `/api/submit/signal`
  - `/api/dashboard`
- Current persistence is local mock JSON storage.
- Live AI is optional; fallback behavior is always available.

## Current Key Files
- Product/constants: [lib/bevofix.ts](/Users/shruthisubramanian/Documents/BevoFix/UTCodexHackathon26/lib/bevofix.ts)
- Landing page: [app/page.tsx](/Users/shruthisubramanian/Documents/BevoFix/UTCodexHackathon26/app/page.tsx)
- Upload/analyze UI: [components/report-page-client.tsx](/Users/shruthisubramanian/Documents/BevoFix/UTCodexHackathon26/components/report-page-client.tsx)
- Review/edit UI: [components/review-page-client.tsx](/Users/shruthisubramanian/Documents/BevoFix/UTCodexHackathon26/components/review-page-client.tsx)
- Dashboard UI: [app/dashboard/page.tsx](/Users/shruthisubramanian/Documents/BevoFix/UTCodexHackathon26/app/dashboard/page.tsx)
- Global visual system: [app/globals.css](/Users/shruthisubramanian/Documents/BevoFix/UTCodexHackathon26/app/globals.css)
- Data contracts: [lib/types.ts](/Users/shruthisubramanian/Documents/BevoFix/UTCodexHackathon26/lib/types.ts)
- AI workflow: [lib/ai.ts](/Users/shruthisubramanian/Documents/BevoFix/UTCodexHackathon26/lib/ai.ts)
- Location hints / OSM pin view: [lib/location-hints.ts](/Users/shruthisubramanian/Documents/BevoFix/UTCodexHackathon26/lib/location-hints.ts)

## What Exists Today
- A UT-inspired visual direction with burnt orange, cream, charcoal, serif display type, and rounded card layouts.
- Distinct Fix and Signal styling through accents and copy.
- Seeded demo examples for one strong Fix case and one strong Signal case.
- Metadata-based location hint flow with OpenStreetMap embed on the review screen.
- Logging around metadata extraction and analyze flow.

## UI Problems Worth Refactoring
- The current UI is functional but still feels like one large stylesheet rather than a deliberate screen system.
- The visual difference between Fix Mode and Signal Mode can be pushed further.
- The information density on the upload and review screens can be structured more clearly.
- The dashboard can feel more like a real campus operations console.
- The current pages use working components, but the design language can be made more intentional, memorable, and demo-ready.

## Desired UI Outcome
- Keep the product instantly understandable in under 5 seconds.
- Make the landing page feel bold and pitch-ready.
- Make Fix Mode feel operational, structured, and urgent.
- Make Signal Mode feel warmer, more social, and time-sensitive.
- Make the review screen feel like the strongest “AI to action” moment.
- Make the dashboard feel like a credible campus operations tool without becoming enterprise clutter.

## Recommended Refactor Goals
1. Introduce a clearer screen system and component hierarchy.
2. Improve typography scale, spacing rhythm, and section hierarchy.
3. Strengthen mode-specific color language, badges, and surfaces.
4. Improve upload and review layouts so there is one obvious primary action per step.
5. Make the metadata/location hint and map preview feel intentional, not bolted on.
6. Polish the dashboard cards, status badges, and queue/feed balance.
7. Preserve every existing product behavior while improving the UI language.

## What Must Not Break
- Landing page mode entry points.
- Analyze flow in both modes.
- Review/edit form behavior.
- Required confirmation before submit.
- Dashboard update after submission.
- Metadata hint display and OSM preview when coordinates exist.
- Fallback AI behavior.
- Local-first storage flow.

## Preferred Refactor Strategy
- Preserve the current route structure.
- Refactor the UI in-place rather than changing the entire application architecture.
- Split global styling into clearer sections or move to component-level organization if helpful, but do not overengineer.
- Prefer a small number of reusable UI primitives over a large design system.
- Keep copy concise and student-centered.
- Use comments sparingly and only where the UI logic is non-obvious.

## Acceptance Criteria
- The app still presents exactly four primary screens.
- Fix and Signal feel visually distinct at a glance.
- The review step remains the clearest moment in the demo.
- The dashboard feels more polished and more operational.
- Mobile and desktop layouts both work.
- `npm test` passes.
- `npm run build` passes.

## Commands
- Install deps: `npm install`
- Run tests: `npm test`
- Run build: `npm run build`
- Run local app: `npm start`

## Ready-to-Use Prompt For A Fresh Window
Copy this into a new Codex window:

```text
Read [AGENTS.md](/Users/shruthisubramanian/Documents/BevoFix/UTCodexHackathon26/AGENTS.md) and [UI_REFACTOR_HANDOFF.md](/Users/shruthisubramanian/Documents/BevoFix/UTCodexHackathon26/UI_REFACTOR_HANDOFF.md) first and treat them as the source of truth.

You are refactoring the UI for BevoFix, a campus AI triage platform that turns student photos into action.

This is a local-first hackathon MVP with exactly two modes:
- Fix Mode
- Signal Mode

Do not change the product scope, route structure, or core workflow:
1. landing
2. upload/analyze
3. review/edit
4. dashboard

Do not add auth, deployment work, real integrations, social features, or unrelated product ideas.

Your job is to materially improve the UI and interaction polish while preserving behavior:
- make the landing page bolder and more memorable
- make Fix Mode feel operational and urgent
- make Signal Mode feel warmer and more social
- make the review step the strongest “AI to action” moment
- make the dashboard feel like a credible campus operations tool
- preserve the metadata location hint and OpenStreetMap preview

Important implementation constraints:
- keep AI outputs editable
- keep the review step required
- keep confidence and uncertainty visible
- keep the app stable when AI falls back
- preserve the current API/data flow unless a small UI-driven change is necessary

Start by reading these files:
- /Users/shruthisubramanian/Documents/BevoFix/UTCodexHackathon26/app/page.tsx
- /Users/shruthisubramanian/Documents/BevoFix/UTCodexHackathon26/components/report-page-client.tsx
- /Users/shruthisubramanian/Documents/BevoFix/UTCodexHackathon26/components/review-page-client.tsx
- /Users/shruthisubramanian/Documents/BevoFix/UTCodexHackathon26/app/dashboard/page.tsx
- /Users/shruthisubramanian/Documents/BevoFix/UTCodexHackathon26/app/globals.css

Then implement the UI refactor directly. Preserve behavior, run `npm test` and `npm run build`, and summarize the UI changes and any risks.
```
