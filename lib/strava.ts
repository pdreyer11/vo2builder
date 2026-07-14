// Strava API helpers: OAuth token exchange/refresh, activity listing, and HR
// stream fetching. All functions are server-only.

import type { HRSamplePoint, StravaTokens } from "./types";
import { getServiceClient } from "./supabase";

const STRAVA_API = "https://www.strava.com/api/v3";
const STRAVA_OAUTH = "https://www.strava.com/oauth/token";

export type StravaActivity = {
  id: number;
  name: string;
  type: string; // "Run", "Rowing", "Ride", "Workout", ...
  sport_type?: string;
  start_date_local: string;
  elapsed_time: number; // seconds
  moving_time: number;
  average_heartrate?: number;
  max_heartrate?: number;
  has_heartrate?: boolean;
};

export type StravaTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_at: number; // unix seconds
  athlete?: { id: number; firstname?: string; lastname?: string };
};

// --- OAuth ----------------------------------------------------------------

export function authorizeUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID ?? "",
    redirect_uri:
      process.env.STRAVA_REDIRECT_URI ??
      "http://localhost:3000/api/strava/callback",
    response_type: "code",
    approval_prompt: "auto",
    scope: "activity:read_all",
  });
  return `https://www.strava.com/oauth/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string
): Promise<StravaTokenResponse> {
  const res = await fetch(STRAVA_OAUTH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    throw new Error(`Strava token exchange failed: ${res.status}`);
  }
  return res.json();
}

async function refreshTokens(
  refreshToken: string
): Promise<StravaTokenResponse> {
  const res = await fetch(STRAVA_OAUTH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    throw new Error(`Strava token refresh failed: ${res.status}`);
  }
  return res.json();
}

// --- token persistence ----------------------------------------------------

export async function saveTokens(t: StravaTokenResponse): Promise<void> {
  const supabase = getServiceClient();
  if (!supabase || !t.athlete) return;
  await supabase.from("strava_tokens").upsert(
    {
      athlete_id: t.athlete.id,
      access_token: t.access_token,
      refresh_token: t.refresh_token,
      expires_at: new Date(t.expires_at * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "athlete_id" }
  );
}

export async function getStoredTokens(): Promise<StravaTokens | null> {
  const supabase = getServiceClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("strava_tokens")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as StravaTokens) ?? null;
}

/**
 * Returns a valid access token, refreshing (and persisting) it first if the
 * stored one is expired or within a 60s skew window. Throws if not connected.
 */
export async function getValidAccessToken(): Promise<{
  accessToken: string;
  athleteId: number;
}> {
  const tokens = await getStoredTokens();
  if (!tokens) throw new Error("Strava is not connected.");

  const expiresAt = new Date(tokens.expires_at).getTime();
  if (expiresAt - Date.now() > 60_000) {
    return { accessToken: tokens.access_token, athleteId: tokens.athlete_id };
  }

  const refreshed = await refreshTokens(tokens.refresh_token);
  const supabase = getServiceClient();
  if (supabase) {
    await supabase
      .from("strava_tokens")
      .update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        expires_at: new Date(refreshed.expires_at * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("athlete_id", tokens.athlete_id);
  }
  return { accessToken: refreshed.access_token, athleteId: tokens.athlete_id };
}

// --- API calls ------------------------------------------------------------

export async function getActivities(
  accessToken: string,
  after?: number,
  perPage = 30
): Promise<StravaActivity[]> {
  const params = new URLSearchParams({ per_page: String(perPage) });
  if (after) params.set("after", String(after));
  const res = await fetch(
    `${STRAVA_API}/athlete/activities?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(`Strava activities fetch failed: ${res.status}`);
  return res.json();
}

type StravaStreamResponse = {
  heartrate?: {
    data: number[];
    original_size: number;
    resolution: "high" | "medium" | "low";
  };
  time?: { data: number[] };
};

/**
 * Fetch the HR + time streams for an activity and normalize to
 * `{ time, heartrate }[]`. Returns null if the activity has no HR data.
 */
export async function getHRStream(
  accessToken: string,
  activityId: number
): Promise<{
  data: HRSamplePoint[];
  resolution: "high" | "medium" | "low";
  original_size: number;
} | null> {
  const res = await fetch(
    `${STRAVA_API}/activities/${activityId}/streams?keys=time,heartrate&key_by_type=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(`Strava streams fetch failed: ${res.status}`);
  const body: StravaStreamResponse = await res.json();
  const hr = body.heartrate?.data;
  const time = body.time?.data;
  if (!hr || !time) return null;

  const data: HRSamplePoint[] = hr.map((heartrate, i) => ({
    time: time[i] ?? i,
    heartrate,
  }));
  return {
    data,
    resolution: body.heartrate?.resolution ?? "high",
    original_size: body.heartrate?.original_size ?? data.length,
  };
}

// Map Strava activity type → our modality enum.
export function mapModality(a: StravaActivity): string {
  const t = (a.sport_type || a.type || "").toLowerCase();
  if (t.includes("row")) return "rowing";
  if (t.includes("ride") || t.includes("cycl") || t.includes("bike"))
    return "cycling";
  if (t.includes("run")) return "outdoor_run";
  return "treadmill";
}

// Heuristic: classify session type from HR relative to max.
export function inferSessionType(
  a: StravaActivity,
  maxHR: number
): "zone2" | "intervals" | "benchmark" {
  const avg = a.average_heartrate ?? 0;
  if (avg && avg <= maxHR * 0.72) return "zone2";
  return "intervals";
}
