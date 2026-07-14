-- VO2 Builder — initial schema
-- Single-user personal cardio training log. No auth (see engineering spec).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- sessions
-- ---------------------------------------------------------------------------
create table if not exists sessions (
  id                  uuid primary key default gen_random_uuid(),
  strava_activity_id  bigint unique,
  name                text not null,
  session_date        date not null,
  modality            text not null
                        check (modality in ('treadmill','rowing','cycling','outdoor_run')),
  session_type        text not null default 'zone2'
                        check (session_type in ('zone2','intervals','benchmark')),
  duration_seconds    integer not null default 0,
  avg_heartrate       numeric,
  max_heartrate       numeric,
  notes               text,
  strava_synced_at    timestamptz,
  deleted_at          timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists sessions_date_idx on sessions (session_date desc);
create index if not exists sessions_type_idx on sessions (session_type);

-- ---------------------------------------------------------------------------
-- session_modality_detail — one row per session, all fields nullable
-- ---------------------------------------------------------------------------
create table if not exists session_modality_detail (
  id                uuid primary key default gen_random_uuid(),
  session_id        uuid not null unique references sessions(id) on delete cascade,
  speed_mph         numeric,
  incline_pct       numeric,
  avg_split         text,
  avg_power_watts   integer,
  avg_cadence_rpm   integer,
  avg_pace          text,
  route_notes       text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- hr_streams — the raw HR data every session must carry
-- ---------------------------------------------------------------------------
create table if not exists hr_streams (
  id             uuid primary key default gen_random_uuid(),
  session_id     uuid not null unique references sessions(id) on delete cascade,
  data           jsonb not null,   -- [{ time: number, heartrate: number }, ...]
  resolution     text check (resolution in ('high','medium','low')),
  original_size  integer,
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- strava_tokens
-- ---------------------------------------------------------------------------
create table if not exists strava_tokens (
  id             uuid primary key default gen_random_uuid(),
  athlete_id     bigint not null unique,
  access_token   text not null,
  refresh_token  text not null,
  expires_at     timestamptz not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- vo2builder_events — event outbox (integration seam)
-- ---------------------------------------------------------------------------
create table if not exists vo2builder_events (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid references sessions(id) on delete cascade,
  event_type  text not null
                check (event_type in
                  ('session_created','session_annotated','hr_stream_attached','benchmark_logged')),
  payload     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists events_created_idx on vo2builder_events (created_at desc);

-- ---------------------------------------------------------------------------
-- app_settings — single-row user preferences
-- ---------------------------------------------------------------------------
create table if not exists app_settings (
  id             uuid primary key default gen_random_uuid(),
  max_heartrate  integer not null default 192,
  updated_at     timestamptz not null default now()
);
