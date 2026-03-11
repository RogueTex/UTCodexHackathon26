# BevoFix

**BevoFix** is a local-first campus AI triage platform built for the UT Austin Codex Hackathon.

It turns student photos into structured campus action through two focused workflows:
- **Fix Mode**: convert physical campus issues into routed service tickets.
- **Signal Mode**: convert useful campus observations into time-bound campus updates.

## Team
- **Raghu**
- **Keenan**

We are members of the graduate program at **IROM, The University of Texas at Austin**.

## Hackathon Context
Hosted by **OpenAI, Enterprise Technology, UT Libraries, and Career Success**.

Track selected:
- **Build What's Missing**: build solutions that close real student-experience gaps that do not fit into existing tools.

## Problem We Are Solving
Students frequently notice issues (broken chargers, furniture damage, utility outages) and opportunities (open study space, free food, short-lived events), but there is no single low-friction workflow to convert those observations into action.

BevoFix addresses that gap by combining image-first reporting with AI-assisted triage, mandatory human review, and transparent confidence/location provenance.

## What The Repository Contains
This repository includes a complete hackathon MVP with:
- **Product UI** (Next.js App Router) for report, review, and dashboard workflows.
- **AI orchestration layer** with live/fallback analysis and strict normalization.
- **Submission APIs** for Fix tickets and Signal posts.
- **Local-first storage** for deterministic demo execution.
- **Metadata + location hint pipeline** with OpenStreetMap preview links.
- **Test suite** validating normalization, fallback behavior, location inference, and linked submissions.

Primary technical surfaces:
- App routes: `/`, `/report/[mode]`, `/review/[mode]`, `/dashboard`, `/feed`, `/form`, `/landing`, `/forum`
- API routes: `/api/analyze`, `/api/submit/fix`, `/api/submit/signal`, `/api/submit/assistant`, `/api/dashboard`
- Domain modules: `lib/ai.ts`, `lib/types.ts`, `lib/store.ts`, `lib/location-hints.ts`, `lib/routing.ts`, `lib/bevofix.ts`

## High-Level Execution Plan (Hackathon)
1. **Define two-mode scope**
Limit product surface to only high-value user flows: incident triage and community signal sharing.

2. **Ship end-to-end loop quickly**
Implement upload -> AI analysis -> user review -> submit -> dashboard visibility.

3. **Enforce human-in-the-loop reliability**
Require review before submission, keep outputs editable, display confidence and source labels.

4. **Engineer for demo robustness**
Keep local-first persistence, fallback AI behavior, and seeded fixtures so the demo always works.

5. **Harden with targeted tests**
Validate extraction normalization, location metadata behavior, and cross-route submission consistency.

## Architecture Summary
- **Frontend**: Next.js 15 + React 19 + TypeScript + Tailwind/CSS.
- **Validation/Contracts**: Zod-backed normalization and type-safe parsing.
- **AI Strategy**: optional live model path, deterministic fallback path.
- **Persistence**: local JSON store (`storage/bevofix-store.json`) for hackathon-safe reproducibility.
- **Maps/Location**: EXIF-assisted hints + OpenStreetMap embeds to increase location specificity.

## Judging Alignment (25% each)
### 1) Demo (25%)
- Complete scenario from image upload to actionable output in both Fix and Signal modes.
- Review gate clearly demonstrates AI-to-action with user control.
- Dashboard shows immediate system response and status updates.

### 2) Impact (25%)
- Solves a recurring student pain point: observations are currently lost or unstructured.
- Increases speed and quality of reporting while preserving student context.
- Improves campus responsiveness by standardizing triage-ready submissions.

### 3) Usage of Codex Application (25%)
- Codex-assisted architecture and implementation across route design, API scaffolding, and workflow composition.
- Codex-driven iteration for test coverage, normalization logic, and UI flow improvements.
- Codex used as an active engineering collaborator for rapid but controlled delivery.

### 4) Creative Usage of Codex Skills (25%)
- Structured use of skills-based workflows to accelerate feature handoff, UI refinement, and technical clarity.
- Applied Codex for both product-level decisions and code-level robustness (fallbacks, contracts, routing).
- Demonstrates creative use beyond autocomplete: system design, evaluation framing, and judge-ready communication.

## Local Development
```bash
npm install
npm run dev
```

## Validation Commands
```bash
npm test
npm run build
```

## Why BevoFix Can Outlast The Event
BevoFix is designed as a practical foundation, not a one-off prototype:
- clear domain contracts,
- auditable AI behavior,
- modular route structure,
- and a workflow that can later connect to real campus systems.

In short: **BevoFix turns student observations into operational campus intelligence.**
