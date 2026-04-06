# CLAUDE.md — Grand Canyon Expedition Planner

## Project Overview

A minimal, high-performance planning hub for a self-supported 18-day kayaking expedition through the Grand Canyon. Built for a 16-person team operating across kayaks and support rafts. This is a precision tool — not a photo gallery.

Single source of truth for the entire trip: route, people, kit, finances, logistics, and emergency planning.

## Design Philosophy

- Minimal interface, maximum clarity
- Zero noise — only what's needed to run the expedition
- Offline-first: fast load, minimal overhead, works in low/no connectivity
- Built for teams who need to think, not scroll
- Mobile-first — this will be used on phones in the field

## Tech Stack

- **Frontend**: React (Vite) with TypeScript
- **Styling**: Tailwind CSS — utility-first, matches the minimal design ethos
- **Maps**: Google Maps JavaScript API via `@vis.gl/react-google-maps` (Google's official React wrapper)
- **Backend**: Supabase (PostgreSQL database, real-time subscriptions, Row Level Security)
- **Auth**: Supabase Auth — email/password + Google OAuth sign-in. All team members get accounts. Role-based access (admin vs member) controlled via a `role` column on the `profiles` table.
- **Data sync**: Supabase is the primary data store. IndexedDB (via Dexie.js) caches locally for offline use. Writes go to Supabase first when online; queue locally and sync when connectivity returns.
- **Real-time**: Supabase Realtime subscriptions for shared editing — when one person updates a waypoint or kit item, others see it live.
- **PWA**: Service worker for offline caching of app shell, assets, and Google Maps tiles (where permitted by Google's ToS)
- **Hosting**: Self-hosted by Steven (deployment method TBD — likely behind Cloudflare Tunnel or similar)
- **Design source**: Google Stitch mockups — the frontend design comes from Stitch exports. Respect the layout and visual language from those designs precisely.

### Environment Variables

The following must be set in `.env.local` (never committed to git):

```
VITE_GOOGLE_MAPS_API_KEY=       # Google Maps JavaScript API key
VITE_SUPABASE_URL=               # Supabase project URL
VITE_SUPABASE_ANON_KEY=          # Supabase anonymous/public key
```

### Google Maps API Setup

Enable these APIs in the Google Cloud Console:
- Maps JavaScript API
- (Optional) Places API — if we add place search later

Restrict the API key to your domain(s) via HTTP referrer restrictions.

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── map/             # Google Maps wrapper, markers, waypoint overlays
│   ├── panels/          # Control panel sections
│   ├── media/           # Media grid, lightbox, video player, upload widget
│   ├── common/          # Buttons, cards, modals, inputs
│   ├── auth/            # Login, signup, protected route wrapper
│   ├── export/          # Field Mode export button and progress
│   └── layout/          # Shell, nav, sidebar
├── pages/               # Top-level views
│   ├── Login.tsx         # Auth page (email + Google sign-in)
│   ├── MapView.tsx       # Primary map + waypoint interface
│   ├── People.tsx        # Team profiles and roles
│   ├── Kit.tsx           # Equipment lists
│   ├── Finances.tsx      # Shared costs and tracking
│   ├── Logistics.tsx     # Shuttles, permits, comms
│   └── Emergency.tsx     # Emergency contacts and extraction
├── data/                # Static data, seed files, type definitions
│   ├── types.ts          # All TypeScript interfaces
│   ├── river-miles.ts    # Grand Canyon river mile reference data
│   └── seed/             # Default waypoints, rapids, camps
├── hooks/               # Custom React hooks
│   ├── useAuth.ts        # Auth state hook (wraps Supabase session)
│   ├── useRealtime.ts    # Supabase real-time subscription hook
│   ├── useOfflineQueue.ts # Queued writes for offline sync
│   └── useMediaUpload.ts # Upload handling, progress, offline queue for media
├── lib/                 # Utilities, DB helpers, sync logic
│   ├── supabase.ts       # Supabase client initialisation
│   ├── storage.ts        # Supabase Storage helpers (upload, delete, get URL, thumbnail)
│   ├── db.ts             # Dexie.js IndexedDB setup (offline cache)
│   ├── sync.ts           # Online/offline sync logic and queue
│   ├── field-export.ts   # Field Mode export logic
│   └── utils.ts          # Formatting, calculations, helpers
├── templates/           # HTML templates for Field Mode export
├── assets/              # Icons, static images (minimal)
└── sw.ts                # Service worker for offline/PWA
```

## Core Features — Implementation Notes

### 1. Interactive River Map (`MapView`)
- Google Maps centred on the Grand Canyon corridor (Lee's Ferry to Diamond Creek, ~226 river miles)
- Use `@vis.gl/react-google-maps` for the map component — do not use deprecated `@react-google-maps/api`
- Clean, uncluttered — use custom map styling to reduce visual noise (mute labels, simplify terrain colours)
- Custom waypoint markers colour-coded by type: camp (green), rapid (orange), hazard (red), resupply (blue), evacuation (purple)
- Use Google Maps AdvancedMarker for custom marker styling
- Click-to-add waypoints with lat/lng auto-populated
- River mile markers displayed along the route polyline
- Map state persists between sessions via Supabase (cached locally in IndexedDB)

### 2. Waypoint Intelligence
- Each waypoint is a data node with structured fields:
  - Name, type, river mile, GPS coordinates
  - Notes (freeform text — conditions, beta, decisions)
  - Timing (estimated arrival, duration)
  - Risk level (1-5 scale)
  - Media attachments (see Waypoint Media below)
- Waypoint detail opens in a slide-out panel, not a new page
- Waypoints are filterable and searchable

### 2a. Waypoint Media

This is NOT a photo gallery. Media attached to waypoints is functional reconnaissance — videos of rapids and their lines, photos of hazards, reference shots of camp access points, water level markers, portage routes, etc. Every attachment must earn its place.

#### Upload & Storage
- **Storage backend**: Supabase Storage. Create a `waypoint-media` bucket with folders per waypoint ID (e.g. `waypoint-media/{waypoint_id}/{filename}`).
- **Accepted formats**: Images (JPEG, PNG, WebP), Video (MP4, MOV). No other formats.
- **File size limits**: Images max 10MB each. Videos max 500MB each. Enforce client-side before upload and server-side via Supabase Storage policies.
- **Upload flow**: From the waypoint detail slide-out panel, an "Add Media" button opens a file picker (or camera capture on mobile). Upload goes directly to Supabase Storage via the JS client. Show upload progress — videos can take a while on slow connections.
- **Metadata**: Each upload creates a row in a `waypoint_media` table linking the file to its waypoint, with fields: id, waypointId, fileName, fileType (image|video), fileSize, storageUrl, caption, uploadedBy, uploadedAt.
- **Captions**: Required. A short text field describing what the media shows (e.g. "Crystal Rapid — scout from river left, showing the main hole at medium flow"). This is what makes the media useful rather than just noise.

#### Display
- In the waypoint detail panel, media shows below the notes section.
- Images display as a compact grid of thumbnails. Tap to view full-size in a lightbox overlay.
- Videos display as thumbnails with a play icon. Tap to play inline using the native HTML5 `<video>` element — no external video player libraries.
- Sort media by upload date (newest first). No drag-to-reorder — keep it simple.
- Show caption, uploader name, and upload date below each item.

#### Video Handling
- **Thumbnails**: Generate a thumbnail on upload. Options in priority order:
  1. Use Supabase Edge Function to extract a frame server-side (preferred — keeps client lightweight)
  2. Fall back to client-side extraction using `<canvas>` + `<video>` element if Edge Functions aren't set up
- **Streaming**: Serve videos directly from Supabase Storage URLs. Supabase Storage supports range requests, so seeking works out of the box.
- **No transcoding**: Store videos as uploaded. Don't attempt server-side transcoding — it's complex and unnecessary for a 16-person team.

#### Access Control
- All authenticated team members can upload media to any waypoint.
- Only the uploader or an admin can delete media.
- RLS on `waypoint_media` table: SELECT for all authenticated, INSERT for all authenticated, DELETE for uploader or admin.

#### Offline Considerations
- **Viewing**: Thumbnails and images that have been viewed are cached in the service worker cache. Videos are NOT cached offline (too large).
- **Uploading offline**: If offline, queue the upload in IndexedDB (store the file blob + metadata). Sync to Supabase Storage when connectivity returns. Show a clear "pending upload" indicator on queued items.
- **Field Mode Export**: Include photo thumbnails in the Field Pack with captions. Do NOT include videos — instead, include a text note per video: "[Video: {caption}] — available in the full app when online." This keeps the Field Pack under the 20MB target.

### 3. Expedition Control Panels

#### People
- 16 team member profiles
- Fields: name, role (lead, paddler, raft crew, safety), medical notes, allergies, emergency contact (name, phone, relationship), dietary requirements
- Medical notes are sensitive — flag visually but consider access control later

#### Kit
- Group equipment list (shared gear: rafts, repair kits, first aid, comms)
- Personal equipment list per person
- Status tracking: packed / on-river / consumed / lost
- Ownership assignment (who carries what)

#### Finances
- Total expedition budget with line items
- Per-person contribution tracking
- Shared cost splitting (equal or weighted)
- Running balance showing who owes what
- Simple — not an accounting system

#### Logistics
- Shuttle plan: vehicles, drivers, pickup/dropoff points and times
- Launch schedule: day-by-day itinerary with river miles and camp targets
- Permit information: permit number, dates, conditions, ranger contacts
- Comms plan: satellite phone numbers, check-in schedule, emergency frequencies

### 4. Emergency Readiness
- Centralised emergency contacts: local SAR, NPS rangers, hospitals, air evac
- Extraction points marked on map with access notes
- Contingency plans: what to do if someone is injured, if weather turns, if the group splits
- This page must load FAST and work OFFLINE — no lazy loading here

## Data Model (TypeScript Interfaces + Supabase Tables)

All data types go in `src/data/types.ts`. Each entity maps to a Supabase table. Key entities:

- `Profile` — id (references auth.users), displayName, email, role (admin|member), avatarUrl
- `Waypoint` — id, name, type, lat, lng, riverMile, notes, riskLevel, timing, createdBy, updatedAt
- `WaypointMedia` — id, waypointId (FK), fileName, fileType (image|video), fileSize, storagePath, thumbnailPath, caption, uploadedBy (FK to Profile), uploadedAt
- `TeamMember` — id, name, role, medicalNotes, allergies, dietaryReqs, emergencyContact
- `EquipmentItem` — id, name, category, owner, status, isGroupGear
- `FinanceEntry` — id, description, amount, paidBy, splitBetween, date
- `LogisticsEntry` — id, type (shuttle|permit|comms|schedule), data (flexible JSONB)
- `EmergencyContact` — id, name, role, phone, notes, isExtraction (boolean)

Use discriminated unions where type varies (e.g. logistics entries). Keep it flat and simple — no deep nesting.

### Supabase Row Level Security (RLS)

- All tables have RLS enabled
- Authenticated users can SELECT all expedition data
- Only admins can INSERT/UPDATE/DELETE on People, Emergency, and Logistics tables
- All authenticated users can INSERT/UPDATE on Waypoints, Kit, and Finances
- `waypoint_media`: SELECT for all authenticated. INSERT for all authenticated. DELETE for the uploader (matched via `uploaded_by = auth.uid()`) or admins.
- Medical notes on TeamMember: consider a separate `medical_notes` table with tighter RLS (admin + the person themselves) — flag this for discussion

### Supabase Storage Policies

- Bucket `waypoint-media`: authenticated users can upload (INSERT) and read (SELECT). DELETE restricted to the file uploader or admins. Files organised as `{waypoint_id}/{filename}`.
- Bucket `waypoint-media-thumbnails`: same read policy. Thumbnails are generated server-side (Edge Function) or client-side and uploaded alongside the original.

### Real-time Subscriptions

Subscribe to changes on: `waypoints`, `equipment_items`, `finance_entries`. When a row changes in Supabase, all connected clients see the update via `supabase.channel()`. The `useRealtime` hook handles this per-table.

## Code Standards

- **TypeScript**: Strict mode. No `any` types. Define interfaces for everything.
- **Components**: Functional components with hooks. No class components.
- **State**: React state for UI. Supabase is the source of truth for all persistent data. IndexedDB caches for offline. No Redux.
- **Naming**: PascalCase for components, camelCase for functions/variables, kebab-case for files.
- **Imports**: Absolute imports from `src/` using path aliases.
- **Comments**: Explain *why*, not *what*. The code should be readable on its own.
- **Error handling**: Every data operation (DB read/write, sync) must have error handling. Show user-friendly messages, log details to console.
- **No dead code**: If it's not used, delete it.

## Styling Rules

- Tailwind CSS only — no custom CSS files unless absolutely necessary
- Colour palette: muted earth tones reflecting the canyon environment. Define in `tailwind.config.ts`:
  - Primary: canyon sandstone warmth
  - Accent: Colorado River teal
  - Danger: alert red
  - Neutral: stone greys
- Dark mode support from the start (will be used at camp)
- All interactive elements must have clear tap targets (min 44x44px) — this is a field tool used with wet hands
- Typography: clean sans-serif, high contrast, generous sizing
- No animations unless they serve a functional purpose (e.g. panel transitions)
- Responsive: mobile-first, but usable on tablets and laptops during planning phase

## Stitch Integration

- Frontend designs are created in Google Stitch and exported
- When Stitch exports are provided, match the layout and visual structure precisely
- Use Stitch designs as the source of truth for UI layout, spacing, and component arrangement
- Implement the Stitch design using Tailwind utility classes — do not copy raw CSS from exports
- If a Stitch design conflicts with accessibility or usability standards, flag it and suggest an alternative

## Authentication & Access Control

- **Provider**: Supabase Auth
- **Methods**: Email/password + Google OAuth (team members choose either)
- **Flow**: Unauthenticated users see only the login page. All other routes are protected via a `<ProtectedRoute>` wrapper component.
- **Roles**: Two roles stored in `profiles.role`:
  - `admin` — Steven + expedition leads. Can manage people, emergency info, logistics, and invite new members.
  - `member` — All other team members. Can view everything, edit waypoints, kit, and finances.
- **Session**: Supabase handles JWT sessions. The `useAuth` hook provides current user + role to the app.
- **Invite flow**: Admins create accounts or send invite links via Supabase Auth. No self-registration — this is a closed team.
- **Logout**: Clear Supabase session + local IndexedDB user cache.

## Offline Strategy

- **Service worker**: Cache the app shell, JS bundles, and essential assets on first load
- **Map tiles**: Google Maps handles its own caching but has limited true offline support. For in-canyon use without signal, the **Field Mode Export** (see below) provides pre-rendered static map images that work without any connectivity.
- **Data**: Supabase is the source of truth. IndexedDB mirrors all expedition data locally via Dexie.js. On load: fetch from Supabase, update local cache. If offline: serve from IndexedDB.
- **Offline writes**: When offline, writes queue in IndexedDB with a `pendingSync` flag. When connectivity returns, flush the queue to Supabase. Handle conflicts with last-write-wins (acceptable for this team size).
- **No spinners on cached data**: If data is in IndexedDB, show it instantly. Only show loading/sync indicators for remote operations.
- **Connectivity detection**: Use `navigator.onLine` + periodic Supabase ping to detect state. Show a clear offline/online indicator in the UI.

## Field Mode Export

The main app relies on Google Maps and Supabase — neither of which are available in a canyon with no signal. Field Mode solves this by generating a self-contained, downloadable offline package that any team member can open on their phone's browser without connectivity.

### What It Is

A single-page HTML file (or small bundle of HTML + assets) that contains:

- **Static map image**: A pre-rendered map of the full route, generated from the Google Maps Static API at export time. High resolution, showing the river corridor with all waypoints plotted. Optionally split into zoomable sections (per-day or per-segment).
- **All waypoint data**: Every waypoint with its full detail — name, type, river mile, coordinates, notes, risk level, timing. Rendered as an interactive list that cross-references the map sections.
- **Day-by-day itinerary**: The launch schedule with camp targets, mileage, and key rapids for each day.
- **Emergency information**: All emergency contacts, extraction points, contingency plans — the full Emergency page content.
- **Team summary**: Names, roles, and emergency contacts (exclude medical notes from the export for privacy unless admin opts in).
- **Key logistics**: Comms plan, permit details, satellite phone numbers.

### What It Is NOT

- Not the full app — no editing, no real-time sync, no auth
- Not a Google Maps experience — static images only
- No JavaScript dependency on external services — it works as a plain HTML file

### How It Works

1. **Export trigger**: An admin clicks "Generate Field Pack" from the Logistics or Settings page.
2. **Static map generation**: The app calls the Google Maps Static API to render high-res map images of the route with waypoint markers overlaid. These are embedded as base64 images in the export.
3. **Data snapshot**: All current waypoint, itinerary, emergency, and team data is pulled from Supabase and serialised into the HTML.
4. **Build**: A client-side export function assembles a single HTML file (or a small zip containing HTML + images) with inline CSS for styling. No external dependencies.
5. **Download**: The file is offered as a download. Team members save it to their phone before launch.

### Technical Notes

- Use the [Google Maps Static API](https://developers.google.com/maps/documentation/maps-static/overview) for map image generation. This requires the Static Maps API enabled on the same Google Cloud project. Images are requested at export time, not stored long-term.
- The exported HTML should use the same colour palette and typography as the main app (embed a minimal subset of Tailwind or use inline styles).
- Map images should be high-res but optimised — target under 20MB total for the full export so it's practical to store on a phone.
- Include a simple client-side search/filter in the HTML (vanilla JS, no frameworks) so team members can find waypoints by name or river mile.
- Include a "last exported" timestamp so the team knows how fresh the data is.
- Consider splitting the map into clickable sections (e.g. Day 1-3, Day 4-6) rather than one enormous image — better for mobile viewing and pinch-to-zoom.

### Project Structure Addition

```
src/
├── lib/
│   └── field-export.ts    # Export logic: fetch data, call Static API, build HTML
├── components/
│   └── export/
│       └── FieldExportButton.tsx  # Admin-only export trigger with progress indicator
└── templates/
    └── field-mode.html     # HTML template for the exported file
```

## What NOT to Build

- No custom auth system — use Supabase Auth exclusively
- No social features, comments, or likes
- No photo gallery or media browser — media is attached to waypoints as functional reconnaissance, not browsable as a standalone collection
- No complex client-side routing — simple tab/page navigation is fine (React Router for auth gates + pages)
- No server-side rendering — this is a static PWA with a Supabase backend
- No fine-grained permissions editor — just admin vs member roles for now

## Testing

- Component tests with Vitest + React Testing Library
- Test data operations (IndexedDB read/write) thoroughly
- Test offline behaviour: service worker registration, cached responses
- No need for E2E tests yet — focus on unit and integration

## Grand Canyon Reference Data

Seed the app with known data for the Lees Ferry to Diamond Creek corridor:
- Named rapids with difficulty ratings (Crystal, Lava Falls, Hermit, Horn Creek, etc.)
- Established camp sites with river mile markers
- Known evacuation routes (Bright Angel Trail, Phantom Ranch, Whitmore Wash, etc.)
- River mile markers at regular intervals
- NPS emergency contacts and ranger station locations

This data should live in `src/data/seed/` as typed JSON. On first Supabase setup, run a seed script (`supabase/seed.sql` or a TypeScript seeder) to populate the database. The local IndexedDB cache picks it up from there.

## Development Workflow

1. Steven provides Stitch mockups for each view
2. Claude Code implements the design using this spec
3. Iterate: refine data model, add features, polish UI
4. Test offline behaviour throughout — don't bolt it on at the end
5. Populate with real expedition data as planning progresses

## Remember

This tool exists so 16 people can execute an 18-day expedition through one of the most demanding river corridors on Earth with confidence. Every feature must earn its place. If it doesn't help the team plan, navigate, or respond to emergencies — it doesn't belong here.
