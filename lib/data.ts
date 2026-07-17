// Data-access layer. Every read/write in the app goes through here.
//
// When Supabase is configured it talks to Postgres. When it isn't, it serves a
// mutable in-memory copy of the seed dataset so the app is fully demoable with
// zero setup. API routes and server components should import ONLY from here
// (plus lib/strava for the OAuth flow), never the raw Supabase client.

import "server-only";
import { getServiceClient } from "./supabase";
import { SEED_SETTINGS } from "./seed-data";
import type {
  AppSettings,
  EventType,
  HRSamplePoint,
  HRStream,
  Modality,
  Session,
  SessionModalityDetail,
  SessionType,
  SessionWithDetail,
  StreamResolution,
  SummarySnapshot,
  VO2BuilderEvent,
} from "./types";

// --- in-memory fallback store (deep-cloned from seed) ---------------------
type Store = {
  sessions: Session[];
  details: SessionModalityDetail[];
  streams: HRStream[];
  events: VO2BuilderEvent[];
  settings: AppSettings;
};

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

// Persist the fallback store across hot reloads in dev via globalThis.
const g = globalThis as unknown as { __vo2Store?: Store; __wahooTokens?: import("./types").WahooTokens };
function store(): Store {
  if (!g.__vo2Store) {
    g.__vo2Store = {
      sessions: [],
      details: [],
      streams: [],
      events: [],
      settings: clone(SEED_SETTINGS),
    };
  }
  return g.__vo2Store;
}

const nowISO = () => new Date().toISOString();
const uuid = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

export type SessionFilters = {
  type?: SessionType;
  modality?: string;
};

export type NewSessionData = {
  name: string;
  session_date: string;
  modality: Modality;
  session_type: SessionType;
  duration_seconds: number;
  avg_heartrate: number | null;
  max_heartrate: number | null;
  notes?: string | null;
  wahoo_workout_id?: number | null;
};

export async function createSession(data: NewSessionData): Promise<Session> {
  const supabase = getServiceClient();
  const now = nowISO();
  if (supabase) {
    const { data: row, error } = await supabase
      .from("sessions")
      .insert({
        ...data,
        wahoo_workout_id: data.wahoo_workout_id ?? null,
        notes: data.notes ?? null,
        strava_activity_id: null,
        strava_synced_at: null,
        deleted_at: null,
        created_at: now,
        updated_at: now,
      })
      .select("*")
      .single();
    if (error) throw error;
    return row as Session;
  }
  const s: Session = {
    id: uuid(),
    strava_activity_id: null,
    wahoo_workout_id: data.wahoo_workout_id ?? null,
    name: data.name,
    session_date: data.session_date,
    modality: data.modality,
    session_type: data.session_type,
    duration_seconds: data.duration_seconds,
    avg_heartrate: data.avg_heartrate,
    max_heartrate: data.max_heartrate,
    notes: data.notes ?? null,
    strava_synced_at: null,
    deleted_at: null,
    created_at: now,
    updated_at: now,
  };
  store().sessions.push(s);
  return s;
}

export async function getSessionByWahooId(wahooId: number): Promise<Session | null> {
  const supabase = getServiceClient();
  if (supabase) {
    const { data } = await supabase
      .from("sessions")
      .select("*")
      .eq("wahoo_workout_id", wahooId)
      .is("deleted_at", null)
      .maybeSingle();
    return (data as Session) ?? null;
  }
  return store().sessions.find((s) => s.wahoo_workout_id === wahooId && !s.deleted_at) ?? null;
}

export async function upsertHRStream(
  sessionId: string,
  samples: HRSamplePoint[],
  resolution: StreamResolution
): Promise<HRStream> {
  const supabase = getServiceClient();
  const now = nowISO();
  if (supabase) {
    const { data, error } = await supabase
      .from("hr_streams")
      .upsert(
        {
          session_id: sessionId,
          data: samples,
          resolution,
          original_size: samples.length,
          created_at: now,
        },
        { onConflict: "session_id" }
      )
      .select("*")
      .single();
    if (error) throw error;
    return data as HRStream;
  }
  let stream = store().streams.find((h) => h.session_id === sessionId);
  if (stream) {
    stream.data = samples;
    stream.resolution = resolution;
    stream.original_size = samples.length;
  } else {
    stream = {
      id: uuid(),
      session_id: sessionId,
      data: samples,
      resolution,
      original_size: samples.length,
      created_at: now,
    };
    store().streams.push(stream);
  }
  return stream;
}

// --- sessions -------------------------------------------------------------

export async function getSessions(
  filters: SessionFilters = {}
): Promise<Session[]> {
  const supabase = getServiceClient();
  if (supabase) {
    let q = supabase
      .from("sessions")
      .select("*")
      .is("deleted_at", null)
      .order("session_date", { ascending: false });
    if (filters.type) q = q.eq("session_type", filters.type);
    if (filters.modality) q = q.eq("modality", filters.modality);
    const { data, error } = await q;
    if (error) throw error;
    return data as Session[];
  }
  return store()
    .sessions.filter((s) => !s.deleted_at)
    .filter((s) => (filters.type ? s.session_type === filters.type : true))
    .filter((s) => (filters.modality ? s.modality === filters.modality : true))
    .sort((a, b) => b.session_date.localeCompare(a.session_date));
}

export async function getSessionWithDetail(
  id: string
): Promise<SessionWithDetail | null> {
  const supabase = getServiceClient();
  if (supabase) {
    const { data: session } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (!session) return null;
    const { data: detail } = await supabase
      .from("session_modality_detail")
      .select("*")
      .eq("session_id", id)
      .maybeSingle();
    const { data: stream } = await supabase
      .from("hr_streams")
      .select("*")
      .eq("session_id", id)
      .maybeSingle();
    return {
      ...(session as Session),
      detail: (detail as SessionModalityDetail) ?? null,
      hr_stream: (stream as HRStream) ?? null,
    };
  }
  const s = store().sessions.find((x) => x.id === id && !x.deleted_at);
  if (!s) return null;
  return {
    ...s,
    detail: store().details.find((d) => d.session_id === id) ?? null,
    hr_stream: store().streams.find((h) => h.session_id === id) ?? null,
  };
}

export async function updateSession(
  id: string,
  patch: Partial<Pick<Session, "name" | "session_type" | "notes">>
): Promise<Session | null> {
  const supabase = getServiceClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("sessions")
      .update({ ...patch, updated_at: nowISO() })
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return (data as Session) ?? null;
  }
  const s = store().sessions.find((x) => x.id === id);
  if (!s) return null;
  Object.assign(s, patch, { updated_at: nowISO() });
  return s;
}

export async function softDeleteSession(id: string): Promise<void> {
  const supabase = getServiceClient();
  if (supabase) {
    await supabase
      .from("sessions")
      .update({ deleted_at: nowISO() })
      .eq("id", id);
    return;
  }
  const s = store().sessions.find((x) => x.id === id);
  if (s) s.deleted_at = nowISO();
}

// --- modality detail ------------------------------------------------------

export async function upsertDetail(
  sessionId: string,
  patch: Partial<
    Omit<SessionModalityDetail, "id" | "session_id" | "created_at" | "updated_at">
  >
): Promise<SessionModalityDetail | null> {
  const supabase = getServiceClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("session_modality_detail")
      .upsert(
        { session_id: sessionId, ...patch, updated_at: nowISO() },
        { onConflict: "session_id" }
      )
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return (data as SessionModalityDetail) ?? null;
  }
  let d = store().details.find((x) => x.session_id === sessionId);
  if (!d) {
    d = {
      id: uuid(),
      session_id: sessionId,
      speed_mph: null,
      incline_pct: null,
      avg_split: null,
      avg_power_watts: null,
      avg_cadence_rpm: null,
      avg_pace: null,
      route_notes: null,
      created_at: nowISO(),
      updated_at: nowISO(),
    };
    store().details.push(d);
  }
  Object.assign(d, patch, { updated_at: nowISO() });
  return d;
}

export async function updateDetailById(
  detailId: string,
  patch: Partial<
    Omit<SessionModalityDetail, "id" | "session_id" | "created_at" | "updated_at">
  >
): Promise<SessionModalityDetail | null> {
  const supabase = getServiceClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("session_modality_detail")
      .update({ ...patch, updated_at: nowISO() })
      .eq("id", detailId)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return (data as SessionModalityDetail) ?? null;
  }
  const d = store().details.find((x) => x.id === detailId);
  if (!d) return null;
  Object.assign(d, patch, { updated_at: nowISO() });
  return d;
}

// --- settings -------------------------------------------------------------

export async function getSettings(): Promise<AppSettings> {
  const supabase = getServiceClient();
  if (supabase) {
    const { data } = await supabase
      .from("app_settings")
      .select("*")
      .limit(1)
      .maybeSingle();
    if (data) return data as AppSettings;
  }
  return store().settings;
}

export async function updateSettings(maxHR: number): Promise<AppSettings> {
  const supabase = getServiceClient();
  if (supabase) {
    const current = await getSettings();
    const { data, error } = await supabase
      .from("app_settings")
      .update({ max_heartrate: maxHR, updated_at: nowISO() })
      .eq("id", current.id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data as AppSettings;
  }
  store().settings.max_heartrate = maxHR;
  store().settings.updated_at = nowISO();
  return store().settings;
}

// --- events ---------------------------------------------------------------

export async function insertEvent(
  sessionId: string | null,
  eventType: EventType,
  payload: Record<string, unknown>
): Promise<void> {
  const supabase = getServiceClient();
  if (supabase) {
    await supabase.from("vo2builder_events").insert({
      session_id: sessionId,
      event_type: eventType,
      payload,
    });
    return;
  }
  store().events.unshift({
    id: uuid(),
    session_id: sessionId,
    event_type: eventType,
    payload,
    created_at: nowISO(),
  });
}

export async function getEvents(
  since?: string,
  limit = 50
): Promise<VO2BuilderEvent[]> {
  const supabase = getServiceClient();
  if (supabase) {
    let q = supabase
      .from("vo2builder_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (since) q = q.gte("created_at", since);
    const { data, error } = await q;
    if (error) throw error;
    return data as VO2BuilderEvent[];
  }
  return store()
    .events.filter((e) => (since ? e.created_at >= since : true))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit);
}

/** Sync-log rows: import + stream-attach events, newest first. */
export async function getSyncEvents(limit = 25): Promise<VO2BuilderEvent[]> {
  const events = await getEvents(undefined, 200);
  return events
    .filter(
      (e) =>
        e.event_type === "session_created" ||
        e.event_type === "hr_stream_attached"
    )
    .slice(0, limit);
}

// --- summary snapshot (integration seam) ----------------------------------

export async function getSummary(): Promise<SummarySnapshot> {
  const [sessions, settings] = await Promise.all([getSessions(), getSettings()]);
  const asOf = new Date();
  const cutoff = new Date(asOf.getTime() - 30 * 24 * 60 * 60 * 1000);

  const zone2 = sessions
    .filter((s) => s.session_type === "zone2")
    .sort((a, b) => a.session_date.localeCompare(b.session_date));

  const zone2Recent = zone2.filter((s) => new Date(s.session_date) >= cutoff);
  const avgZone2 =
    zone2Recent.length > 0
      ? Math.round(
          zone2Recent.reduce((a, s) => a + (s.avg_heartrate ?? 0), 0) /
            zone2Recent.length
        )
      : null;

  let trend: SummarySnapshot["zone2_hr_trend"] = "insufficient_data";
  if (zone2.length >= 3) {
    const last3 = zone2.slice(-3).map((s) => s.avg_heartrate ?? 0);
    trend = last3[2] < last3[0] ? "improving" : "stable";
  }

  const lastSync = sessions
    .map((s) => s.strava_synced_at)
    .filter(Boolean)
    .sort()
    .pop();

  return {
    total_sessions: sessions.length,
    zone2_sessions_last_30_days: zone2Recent.length,
    avg_zone2_hr_last_30_days: avgZone2,
    zone2_hr_trend: trend,
    last_sync_at: lastSync ?? null,
    max_heartrate_setting: settings.max_heartrate,
    as_of: asOf.toISOString(),
  };
}

// Convenience for the Trends page: zone2 sessions ascending by date.
export async function getZone2Trend(): Promise<Session[]> {
  const sessions = await getSessions();
  return sessions
    .filter((s) => s.session_type === "zone2")
    .sort((a, b) => a.session_date.localeCompare(b.session_date));
}

export async function getBenchmarks(): Promise<
  { session: Session; detail: SessionModalityDetail | null }[]
> {
  const sessions = await getSessions({ type: "benchmark" });
  const out = [];
  for (const s of sessions) {
    const full = await getSessionWithDetail(s.id);
    out.push({ session: s, detail: full?.detail ?? null });
  }
  return out;
}
