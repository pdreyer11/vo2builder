// Shared domain types for VO2 Builder.

export type Modality = "treadmill" | "rowing" | "cycling" | "outdoor_run";
export type SessionType = "zone2" | "intervals" | "benchmark";
export type StreamResolution = "high" | "medium" | "low";

export type EventType =
  | "session_created"
  | "session_annotated"
  | "hr_stream_attached"
  | "benchmark_logged";

export type HRSamplePoint = { time: number; heartrate: number };

export type Session = {
  id: string;
  strava_activity_id: number | null;
  name: string;
  session_date: string; // ISO date (YYYY-MM-DD)
  modality: Modality;
  session_type: SessionType;
  duration_seconds: number;
  avg_heartrate: number | null;
  max_heartrate: number | null;
  notes: string | null;
  strava_synced_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SessionModalityDetail = {
  id: string;
  session_id: string;
  speed_mph: number | null;
  incline_pct: number | null;
  avg_split: string | null;
  avg_power_watts: number | null;
  avg_cadence_rpm: number | null;
  avg_pace: string | null;
  route_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type HRStream = {
  id: string;
  session_id: string;
  data: HRSamplePoint[];
  resolution: StreamResolution;
  original_size: number;
  created_at: string;
};

export type StravaTokens = {
  id: string;
  athlete_id: number;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
};

export type VO2BuilderEvent = {
  id: string;
  session_id: string | null;
  event_type: EventType;
  payload: Record<string, unknown>;
  created_at: string;
};

export type AppSettings = {
  id: string;
  max_heartrate: number;
  updated_at: string;
};

// Composite shape returned by GET /api/sessions/:id
export type SessionWithDetail = Session & {
  detail: SessionModalityDetail | null;
  hr_stream: HRStream | null;
};

// Integration-seam summary snapshot
export type SummarySnapshot = {
  total_sessions: number;
  zone2_sessions_last_30_days: number;
  avg_zone2_hr_last_30_days: number | null;
  zone2_hr_trend: "improving" | "stable" | "insufficient_data";
  last_sync_at: string | null;
  max_heartrate_setting: number;
  as_of: string;
};
