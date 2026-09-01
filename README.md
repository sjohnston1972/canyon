# Canyon Expedition Planner

Planning hub for the Glasgow Kayak Club's self-supported 18-day kayaking expedition through the Grand Canyon, September 2027. Single source of truth for 16 crew members covering route, rapids, team, gear, finances, logistics, and emergency planning.

## Live Features

- **Landing Page** — Full-bleed Toroweap sunset hero with live countdown to launch day (21 Sept 2027)
- **Expedition Timeline** — Day-by-day itinerary with 28 timeline entries (camps, rapids, milestones). Tap to expand inline detail with descriptions, media uploads, and editable fields
- **Interactive Waypoint Map** — Google Maps with 345 waypoints from CalTopo GPX + Google My Maps KML data. River corridor polyline, color-coded markers (rapids/camps/evac/landmarks), filter chips, and full waypoint intel panel
- **Rapid Beta** — 110 rapids with real paddling advice sourced from experienced boaters and Wikipedia. Detailed scout, run, hazard, and history fields — all editable and persisted to database
- **Recon Media** — Photo uploads and YouTube video links attached to rapids and camps. Includes pre-loaded Wikimedia Commons NPS photos and curated YouTube rapid footage
- **Team Manifest** — Full CRUD for 16 crew members with medical info, certifications, emergency contacts, boat assignments
- **Gear & Kit** — Equipment tracking across 4 rafts. Kitchen, repair, comms, and first aid inventory with stowage locations
- **Finances** — Shared expense ledger with per-person balance sheet
- **Logistics** — Shuttle plan, launch schedule, permit info, comms plan
- **Emergency & Safety** — Emergency contacts, extraction points, contingency protocols, medical inventory. Exportable as plain text safety plan
- **Light/Dark Theme** — Toggle between subtle blue-toned light mode and tactical dark mode. Persists to localStorage
- **Mobile-First** — Bottom tab navigation, hamburger menu, slide-out panels on map, responsive card layouts, 44px minimum touch targets
- **Real-Time Sync** — PocketBase backend with SSE subscriptions. Edits sync live across all connected devices

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS with custom CSS variable theming (light/dark)
- **Maps**: Google Maps JavaScript API via `@vis.gl/react-google-maps`
- **Backend**: PocketBase (self-hosted, SQLite-backed)
- **Deployment**: Docker (nginx + PocketBase) on `net_core` network

## Quick Start

### Prerequisites
- Docker + Docker Compose
- Google Maps JavaScript API key
- A Docker network named `net_core` (`docker network create net_core`)

### Setup

1. Clone the repo:
```bash
git clone https://github.com/sjohnston1972/canyon.git
cd canyon
```

2. Create `.env` file:
```bash
cp .env.example .env
# Add your Google Maps API key:
# VITE_GOOGLE_MAPS_API_KEY=your_key_here
```

3. Build and run:
```bash
docker compose build
docker compose up -d
```

4. Create the superuser (one-time, no credentials are committed to this repo):
```bash
docker compose exec db /pb/pocketbase superuser upsert you@example.com 'a-strong-password'
```

5. Access:
   - **App**: http://localhost:8202

PocketBase itself has no published port — the app talks to it only through
the nginx proxy above. See "Admin access" below for reaching `/_/`.

### Admin access

`canyon-db` (PocketBase) is not published on the host, so its `/_/` admin UI
and raw API aren't reachable from the internet or your host browser by
default. To reach it for local development or maintenance, pick one:

- **`docker exec` into the container** and use the `pocketbase` CLI directly,
  e.g. `docker compose exec db /pb/pocketbase superuser upsert ...`.
- **A local compose override** — create `docker-compose.override.yml`
  (already gitignored-friendly; do not commit it with real secrets) with:
  ```yaml
  services:
    db:
      ports:
        - "127.0.0.1:8203:8090"
  ```
  then `docker compose up -d` to bind the admin UI to localhost only, and
  remove the override when you're done.
- **An SSH tunnel** to the host, e.g. `ssh -L 8203:localhost:8090 user@host`
  after using the override above (or connecting to the container network
  directly on the host).

### Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps JavaScript API key |

## Secrets

- Real secrets (API keys, the PocketBase superuser password) belong only in
  your local `.env` file, which is already listed in `.gitignore` and must
  never be committed. Start from `.env.example`.
- The PocketBase superuser account is created at runtime with
  `./pocketbase superuser upsert EMAIL PASSWORD` (see Quick Start above) —
  never hardcode it in a migration, compose file, or this README.
- Crew member login accounts live in PocketBase's `users` auth collection;
  create them from the admin UI (see "Admin access") rather than committing
  credentials anywhere.
- If you believe a secret has ever been committed to this repository, treat
  it as burned: rotate/replace it immediately. Git history keeps old commits
  even after a file is edited or deleted in a later commit, so removing a
  value from the working tree does not remove it from history.

## Project Structure

```
canyon/
├── src/
│   ├── components/layout/  # AppShell, navigation
│   ├── pages/              # Timeline, MapView, Team, Kit, Finances, Logistics, Emergency, Landing
│   ├── data/               # Waypoints (345), rapid beta (110), rapid media, map styles
│   ├── hooks/              # useCollection (PocketBase CRUD + realtime), useTheme
│   └── lib/                # PocketBase client
├── public/
│   └── media/rapids/       # Downloaded rapid photos + YouTube thumbnails
├── pocketbase/
│   ├── Dockerfile          # PocketBase container
│   └── pb_migrations/      # Schema migrations
├── Dockerfile              # Multi-stage build (Node + nginx)
├── docker-compose.yml      # canyon (frontend) + canyon-db (PocketBase)
└── nginx.conf              # SPA routing + PocketBase API proxy
```

## Data Sources

- **River corridor**: CalTopo GPX file (465 points, Lee's Ferry to Diamond Creek)
- **Waypoints**: Google My Maps KML (345 waypoints with paddling advice from experienced boaters)
- **Rapid ratings**: Grand Canyon 1-10 scale from Wikipedia "List of Colorado River rapids and features"
- **Rapid history**: Wikipedia (Crystal 1966/1983 floods, Powell 1869 expedition, Lava Falls volcanic origins)
- **Photos**: Wikimedia Commons (NPS/USGS, public domain)
- **Videos**: YouTube (curated rapid run footage, 2023-2026)

## Database Collections

| Collection | Records | Purpose |
|-----------|---------|---------|
| team_members | 6+ | Crew roster with medical info |
| equipment | 17+ | Gear across 4 rafts |
| finances | 6+ | Shared expenses |
| emergency_contacts | 4+ | Emergency phone numbers |
| extraction_points | 4+ | Evacuation locations |
| contingency_plans | 4+ | Emergency protocols |
| logistics_entries | 17+ | Shuttle, schedule, permits, comms |
| rafts | 4 | Raft configs and weights |
| rapid_media | 20+ | Photos and video links per rapid |
| rapid_edits | Variable | User edits to rapid descriptions |

## License

Private project for Glasgow Kayak Club expedition planning.
