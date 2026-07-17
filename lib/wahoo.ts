import "server-only";
import crypto from "node:crypto";
import { getServiceClient } from "./supabase";
import type { Modality, WahooTokens } from "./types";

const BASE = "https://api.wahooligan.com";
const TOKEN_URL = `${BASE}/oauth/token`;

const g = globalThis as unknown as { __wahooTokens?: WahooTokens };

// --- PKCE -----------------------------------------------------------------
function base64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function generatePkce(): { verifier: string; challenge: string } {
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(
    crypto.createHash("sha256").update(verifier).digest()
  );
  return { verifier, challenge };
}

export function wahooAuthorizeUrl(codeChallenge: string): string {
  const clientId = process.env.WAHOO_CLIENT_ID!;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/wahoo/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "user_read workouts_read offline_data",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  return `${BASE}/oauth/authorize?${params}`;
}

export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string
): Promise<WahooTokens> {
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/wahoo/callback`;
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.WAHOO_CLIENT_ID!,
      client_secret: process.env.WAHOO_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      code,
      code_verifier: codeVerifier,
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
  const tok = await res.json();

  const userRes = await fetch(`${BASE}/v1/user`, {
    headers: { Authorization: `Bearer ${tok.access_token}` },
  });
  if (!userRes.ok) throw new Error(`User fetch failed: ${userRes.status}`);
  const user = await userRes.json();

  const now = new Date();
  const expiresAt = new Date(now.getTime() + tok.expires_in * 1000).toISOString();

  return {
    id: "",
    user_id: user.id,
    access_token: tok.access_token,
    refresh_token: tok.refresh_token,
    expires_at: expiresAt,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
}

export async function saveWahooTokens(payload: Omit<WahooTokens, "id">): Promise<void> {
  const supabase = getServiceClient();
  if (supabase) {
    await supabase.from("wahoo_tokens").upsert(
      { ...payload, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
    return;
  }
  g.__wahooTokens = { id: g.__wahooTokens?.id ?? "mem-wahoo", ...payload };
}

export async function getStoredWahooTokens(): Promise<WahooTokens | null> {
  const supabase = getServiceClient();
  if (supabase) {
    const { data } = await supabase
      .from("wahoo_tokens")
      .select("*")
      .limit(1)
      .maybeSingle();
    return (data as WahooTokens) ?? null;
  }
  return g.__wahooTokens ?? null;
}

async function doRefresh(tokens: WahooTokens): Promise<Omit<WahooTokens, "id">> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.WAHOO_CLIENT_ID!,
      client_secret: process.env.WAHOO_CLIENT_SECRET!,
      refresh_token: tokens.refresh_token,
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  const tok = await res.json();
  const expiresAt = new Date(Date.now() + tok.expires_in * 1000).toISOString();
  return {
    user_id: tokens.user_id,
    access_token: tok.access_token,
    refresh_token: tok.refresh_token,
    expires_at: expiresAt,
    created_at: tokens.created_at,
    updated_at: new Date().toISOString(),
  };
}

export async function getValidWahooAccessToken(): Promise<string> {
  const tokens = await getStoredWahooTokens();
  if (!tokens) throw new Error("Wahoo not connected");

  const expiresAt = new Date(tokens.expires_at).getTime();
  if (expiresAt - Date.now() > 60_000) return tokens.access_token;

  const refreshed = await doRefresh(tokens);
  await saveWahooTokens(refreshed);
  return refreshed.access_token;
}

export async function getWorkouts(
  accessToken: string,
  perPage = 30
): Promise<WahooWorkout[]> {
  const res = await fetch(
    `${BASE}/v1/workouts?page=1&per_page=${perPage}&order=desc`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(`getWorkouts failed: ${res.status}`);
  const json = await res.json();
  return json.workouts ?? [];
}

export async function getWorkout(
  accessToken: string,
  id: number
): Promise<WahooWorkout> {
  const res = await fetch(`${BASE}/v1/workouts/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`getWorkout ${id} failed: ${res.status}`);
  return res.json();
}

export async function downloadFitFile(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FIT download failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export type WahooWorkout = {
  id: number;
  name: string;
  workout_type_id: number;
  created_at: string;
  updated_at: string;
  workout_summary?: {
    heart_rate_avg: string | number | null;
    duration_seconds?: number;
    file?: { url: string } | null;
  } | null;
};

const TYPE_TO_MODALITY: Record<number, Modality> = {
  0: "cycling",
  1: "outdoor_run",
  4: "rowing",
  12: "cycling",
  44: "rowing",
  91: "outdoor_run",
};

export function workoutToSessionBase(w: WahooWorkout): {
  name: string;
  session_date: string;
  modality: Modality;
  duration_seconds: number;
  avg_heartrate: number | null;
  peak_heartrate: null;
  wahoo_workout_id: number;
} {
  const summary = w.workout_summary;
  const hrRaw = summary?.heart_rate_avg;
  const avg_heartrate =
    hrRaw != null ? Math.round(Number(hrRaw)) || null : null;
  const duration_seconds = summary?.duration_seconds ?? 0;
  const modality = TYPE_TO_MODALITY[w.workout_type_id] ?? "cycling";
  const session_date = w.created_at.slice(0, 10);

  return {
    name: w.name || `Wahoo ${modality} ${session_date}`,
    session_date,
    modality,
    duration_seconds,
    avg_heartrate,
    peak_heartrate: null,
    wahoo_workout_id: w.id,
  };
}
