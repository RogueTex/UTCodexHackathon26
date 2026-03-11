# agents.md

## Project Name
BevoFix

## Product Definition
BevoFix is a campus AI triage platform that turns student photos into action.

The app has exactly two modes:

1. Fix Mode
   - A student uploads a photo of a campus issue
   - AI extracts a structured issue report
   - The app creates a local mock service ticket

2. Signal Mode
   - A student uploads a photo of a useful campus update
   - AI extracts a structured announcement
   - The app publishes it to a local campus feed

## Hackathon Goal
Build a polished, local-first MVP for a live 3-minute demo.

The project should feel real, useful, and deployable later, but must remain simple enough to finish tonight.

## Product Framing
Do not describe this as an app that does everything.

Always describe it as:

"BevoFix is a campus AI triage platform that turns student photos into action."

Use the two-mode framing consistently:
- Fix Mode
- Signal Mode

## Core Demo Flow
1. User chooses Fix Mode or Signal Mode
2. User uploads a photo
3. AI analyzes the image and returns structured information
4. User reviews and edits the extracted fields
5. User confirms submission
6. App creates either:
   - a local issue ticket
   - a local signal post
7. Dashboard/feed updates immediately

## Non-Goals
Do not build:
- authentication
- real campus system integrations
- real facilities APIs
- full social networking
- advanced moderation
- exact indoor positioning
- production deployment
- complicated admin roles

## UX Priorities
- The app must feel clear in under 5 seconds
- One primary action per screen
- Large buttons and obvious flows
- Fix Mode and Signal Mode should feel visually distinct
- AI outputs must always be editable
- Show confidence or uncertainty clearly
- Review step is required before final submission

## Technical Priorities
- Local-first implementation
- Use mocked local persistence
- Use schema validation for AI outputs
- Keep API routes clean and small
- Prefer reliability over technical ambition
- Use fallback mock outputs if AI fails
- Never let malformed AI output break the UI

## Visual Direction
Use a UT-inspired but clean and modern visual style.

Keywords:
- burnt orange
- cream
- charcoal
- campus-tech
- confident
- warm
- action-oriented

## UI Direction
Landing page:
- bold hero
- two large mode cards
- strong product statement

Fix Mode:
- utility-oriented
- structured layout
- urgency badges
- operational feel

Signal Mode:
- slightly warmer and more social
- card-based feed style
- time-sensitive chips

Dashboard:
- clear status badges
- queue + feed layout
- feels like a real campus operations tool

## AI Extraction Requirements

### Fix Mode output
Return structured JSON with:
- mode
- issue_type
- summary
- likely_location
- urgency
- suggested_team
- confidence
- needs_user_confirmation

### Signal Mode output
Return structured JSON with:
- mode
- title
- summary
- likely_location
- expiration_time
- confidence
- needs_user_confirmation

## Validation Rules
- Never trust raw model output directly
- Validate required fields
- Clamp confidence to 0..1
- Invalid urgency defaults safely
- Uncertain location becomes "Needs confirmation"
- Missing fields should use safe fallback values
- Frontend must remain stable even if AI output is incomplete

## Routing Rules for Fix Mode
Map issue types into simple mock teams:
- broken furniture -> Facilities
- lighting / electrical -> Electrical Services
- water dispenser -> Facilities
- charger station / computer issue -> IT Support
- wifi / internet -> Network Services
- cleanliness -> Custodial
- unknown -> Campus Operations

## Demo Priorities
Build in this order:
1. landing page
2. upload flow
3. AI analysis route
4. review/edit page
5. submission flow
6. success states
7. dashboard/feed
8. visual polish

## Demo Philosophy
The app should win on:
- clear story
- visible AI value
- strong demo flow
- obvious campus impact

## Copy Style
Use concise, practical, student-centered language.

Preferred tone:
- helpful
- direct
- polished
- confident

## Product Tagline
Turn student photos into campus action.

## Demo Closing Line
BevoFix helps students leave campus better than they found it.
