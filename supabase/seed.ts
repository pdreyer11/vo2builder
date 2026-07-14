/**
 * Seed the Supabase database with the 8 mockup sessions, their modality detail,
 * synthetic HR streams, and creation events.
 *
 * Run:  npm run seed
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. These are
 * read from .env.local (parsed below) or the ambient environment.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  SEED_DETAILS,
  SEED_EVENTS,
  SEED_SESSIONS,
  SEED_SETTINGS,
  SEED_STREAMS,
} from "../lib/seed-data";

// --- lightweight .env.local loader (no dependency) ------------------------
function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const key = m[1];
      let val = m[2];
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {
    // no .env.local — rely on ambient env
  }
}

async function main() {
  loadEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
        "Set them in .env.local before seeding."
    );
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false },
  });

  console.log("Seeding app_settings…");
  await supabase.from("app_settings").upsert(SEED_SETTINGS, { onConflict: "id" });

  console.log(`Seeding ${SEED_SESSIONS.length} sessions…`);
  const { error: sErr } = await supabase
    .from("sessions")
    .upsert(SEED_SESSIONS, { onConflict: "id" });
  if (sErr) throw sErr;

  console.log(`Seeding ${SEED_DETAILS.length} modality detail rows…`);
  const { error: dErr } = await supabase
    .from("session_modality_detail")
    .upsert(SEED_DETAILS, { onConflict: "id" });
  if (dErr) throw dErr;

  console.log(`Seeding ${SEED_STREAMS.length} HR streams…`);
  const { error: hErr } = await supabase
    .from("hr_streams")
    .upsert(SEED_STREAMS, { onConflict: "id" });
  if (hErr) throw hErr;

  console.log(`Seeding ${SEED_EVENTS.length} events…`);
  const { error: eErr } = await supabase
    .from("vo2builder_events")
    .upsert(SEED_EVENTS, { onConflict: "id" });
  if (eErr) throw eErr;

  console.log("Seed complete ✔");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
