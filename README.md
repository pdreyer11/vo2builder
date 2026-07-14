# VO2 Builder

**Train the engine. Watch it respond.**

VO2 Builder is a personal cardio training log for a single athlete. It ingests
raw heart-rate data from Strava (synced automatically from a Wahoo device),
lets you annotate each session with modality-specific detail, and tracks your
**Zone 2 HR trend over time** — the core signal of aerobic base adaptation.

Every session carries a raw HR stream. The manual annotation fields (modality,
speed, incline, split, …) exist to give that raw data context, not to replace
it.

---

## Stack

- **Next.js 14** (App Router) · **TypeScript**
- **Tailwind CSS** — all components built from scratch, no UI library
- **Supabase** (PostgreSQL) · **Recharts** · **Vercel**-ready

---

## Local setup

```bash
npm install
cp .env.local.example .env.local   # fill in values (optional — see Demo mode)
npm run dev                        # http://localhost:3000
```

### Demo mode (zero config)

If Supabase env vars are absent, the app boots on an **in-memory seed dataset**
(the same 8 sessions used by `npm run seed`). Every page renders and the HR
Trace / Trends charts work out of the box — mutations persist for the life of
the dev server. This is the fastest way to explore the UI. Configure Supabase
(below) to make data durable and enable live Strava sync.

### Environment variables

| Var | Purpose |
|-----|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser (anon) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server key — used by API routes & seed |
| `STRAVA_CLIENT_ID` / `STRAVA_CLIENT_SECRET` | Strava API app credentials |
| `STRAVA_REDIRECT_URI` | `http://localhost:3000/api/strava/callback` |
| `NEXT_PUBLIC_APP_URL` | Base URL for OAuth redirects |

### Database + seed

1. Create a Supabase project.
2. Run `supabase/migrations/001_initial.sql` in the SQL editor (or via the
   Supabase CLI) to create all tables.
3. Put your Supabase URL + service-role key in `.env.local`.
4. Seed the 8 mockup sessions with synthetic HR streams:

   ```bash
   npm run seed
   ```

---

## Strava OAuth setup

1. Create an API application at <https://www.strava.com/settings/api>.
2. Set the **Authorization Callback Domain** to `localhost` (dev) or your
   deployed domain.
3. Copy the **Client ID** and **Client Secret** into `.env.local`.
4. Request scope **`activity:read_all`** (the app requests this automatically).
5. Visit **Sync → Connect Strava**, approve, and you'll be redirected back to
   `/sync`.

### Wahoo → Strava → VO2 Builder flow

You record a workout on a **Wahoo** device (with a HR strap). Wahoo uploads the
activity to **Strava**, where visibility is controlled in the Wahoo app — VO2
Builder never uploads activities. VO2 Builder then pulls from Strava:

1. `GET /athlete/activities` — lists recent activities.
2. For each activity with HR, `GET /activities/:id/streams?keys=time,heartrate`
   fetches the second-by-second stream.
3. The stream is normalized to `{ time, heartrate }[]` and stored in
   `hr_streams.data`; the session row is upserted into `sessions`.

Trigger a pull manually with **Sync now** on the Sync page
(`POST /api/strava/sync`). Access tokens are refreshed automatically using the
stored refresh token when expired.

---

## Integration seams

Two read-only routes are exposed from day one for a future dashboard / Vitals
consumer (no consumer exists yet):

### `GET /api/vo2builder-summary`

A snapshot of aerobic progress:

```json
{
  "total_sessions": 8,
  "zone2_sessions_last_30_days": 4,
  "avg_zone2_hr_last_30_days": 120,
  "zone2_hr_trend": "improving",
  "last_sync_at": "2026-07-10T09:30:00.000Z",
  "max_heartrate_setting": 192,
  "as_of": "2026-07-13T12:00:00.000Z"
}
```

### `GET /api/events?since=<ISO>&limit=<n>`

The event outbox — every `session_created`, `session_annotated`,
`hr_stream_attached`, and `benchmark_logged` event, newest first:

```json
{ "events": [ { "id": "...", "event_type": "session_created", "payload": {}, "created_at": "..." } ] }
```

---

## HR streams & the HR Trace chart

Each session has one `hr_streams` row holding
`data: { time: number, heartrate: number }[]` (time in seconds from session
start, sampled from Strava). `components/HRTraceChart.tsx` renders this on a
dark card: five zone bands behind the trace (Z1 green → Z5 red at 15% opacity),
a white HR line, and dashed Zone 2 floor/ceiling reference lines derived from
your max HR. Its job is to reveal **HR drift** — a line that climbs over the
session means undertrained; a flat line means the aerobic base is adapting.

---

## Pages

- **Log** (`/`) — session list + split-view detail panel with the HR Trace.
- **Trends** (`/trends`) — Zone 2 avg HR over time (with benchmark diamonds) +
  weekly volume bars.
- **Zones** (`/zones`) — max-HR calibration and the 5-zone table.
- **Sync** (`/sync`) — Strava connection status, manual sync, and sync log.
