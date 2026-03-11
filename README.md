# BevoFix

## 🎬 **DEMO VIDEO: [WATCH HERE](https://www.loom.com/share/1e8583a0a1184f0193b6c7fc426135ae)**

**BevoFix** is a local-first campus AI triage platform built for the UT Austin Codex Hackathon.

It turns student photos into structured campus action through two focused workflows:
- **Fix Mode**: convert physical campus issues into routed service tickets.
- **Signal Mode**: convert useful campus observations into time-bound campus updates.

## 👥 Team
- **Raghu**
- **Keenan**

We are members of the graduate program at **IROM, The University of Texas at Austin**.

## 🏫 Hackathon Context
Hosted by **OpenAI, Enterprise Technology, UT Libraries, and Career Success**.

Track selected:
- **Build What's Missing**: build solutions that close real student-experience gaps that do not fit into existing tools.

## 🧩 Problem We Are Solving
Students frequently notice issues (broken chargers, furniture damage, utility outages) and opportunities (open study space, free food, short-lived events), but there is no single low-friction workflow to convert those observations into action.

BevoFix addresses that gap by combining image-first reporting with AI-assisted triage, mandatory human review, and transparent confidence/location provenance.

## 📦 What The Repository Contains
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

## 🗺️ High-Level Execution Plan (Hackathon)
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

## 🏗️ Architecture Summary
- **Frontend**: Next.js 15 + React 19 + TypeScript + Tailwind/CSS.
- **Validation/Contracts**: Zod-backed normalization and type-safe parsing.
- **AI Strategy**: optional live model path, deterministic fallback path.
- **Persistence**: local JSON store (`storage/bevofix-store.json`) for hackathon-safe reproducibility.
- **Maps/Location**: EXIF-assisted hints + OpenStreetMap embeds to increase location specificity.

## 🧪 Rubric Mapping (25% each)
### 1) 🎥 Demo (25%)
- Implemented flow: image upload -> AI analysis -> review/edit -> submit.
- Both Fix and Signal pathways are present in the product flow.
- Dashboard/feed surfaces submitted records and status changes.

### 2) 🌍 Impact (25%)
- Targets a recurring campus reporting gap where observations are often unstructured.
- Converts photo + notes into structured, reviewable records.
- Adds routing metadata to make issues/signals easier to act on.

### 3) 🧠 Usage of Codex Application (25%)
- Codex-assisted architecture and implementation across route design, API scaffolding, and workflow composition.
- Codex terminal control + worktree workflows were used to parallelize feature work, hotfixes, and merge validation.
- BYOK, fallback AI orchestration, deterministic reference matching, and review UX were implemented with Codex iteration.
- Codex-driven verification was used via `npm test` and `npm run build`.

### 4) 🛠️ Creative Usage of Codex Skills (25%)
- **Yeet skill**: staged, committed, pushed, and prepared PR workflows with GitHub CLI automation.
- **Notion skills** (`notion-spec-to-implementation`, `notion-knowledge-capture`, `notion-meeting-intelligence`): converted specs/meeting notes into plans, decision logs, and progress docs.
- **Playwright skill**: browser automation for end-to-end checks (`/form -> /feed`, submit flows, regression checks).
- **Imagegen skill**: generated synthetic visuals for vision-style edge cases to test extraction behavior and fallback matching.
- **Frontend-design skill**: used for UI polish and consistency.
- **ChatGPT Canvas + UI templates**: early interaction and visual exploration using drawn layout ideas in ChatGPT Canvas plus external template references, then adapted into the shipped BevoFix flow.
- **Create-plan + gh-fix-ci workflows**: used for planning and debugging loops.
- Skills were used across planning, coding, validation, documentation, and release flow.

## 🚀 Replicate Locally
1. Install prerequisites:
```bash
node -v
npm -v
```
2. Clone the repository:
```bash
git clone https://github.com/RogueTex/UTCodexHackathon26.git
cd UTCodexHackathon26
```
3. Install dependencies:
```bash
npm install
```
4. (Optional) configure environment:
```bash
cp .env.example .env.local
```
If `.env.example` is not present, create `.env.local` manually.
5. Run the app:
```bash
npm run dev
```
6. Open in browser:
```text
http://localhost:3000
```

## 💻 Local Development
```bash
npm install
npm run dev
```

## 🔑 BYOK (Bring Your Own Key)
- The app supports runtime BYOK for image analysis.
- In `/form` or `/report/[mode]`, paste an OpenAI API key (`sk-...`) in the **Bring your own key** input.
- Click **Save key** to persist it in browser localStorage.
- Analyze requests then use your key via `x-openai-api-key`; if no key is provided, the app uses deterministic fallback behavior.

## ✅ Validation Commands
```bash
npm test
npm run build
```

## 📈 Why BevoFix Can Outlast The Event
BevoFix is designed as a practical foundation, not a one-off prototype:
- clear domain contracts,
- auditable AI behavior,
- modular route structure,
- and a workflow that can later connect to real campus systems.

In short: **BevoFix turns student observations into operational campus intelligence.**
