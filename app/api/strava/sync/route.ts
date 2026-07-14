import { NextResponse } from "next/server";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase";
import { getSettings, insertEvent } from "@/lib/data";
import {
  getActivities,
  getHRStream,
  getValidAccessToken,
  inferSessionType,
  mapModality,
} from "@/lib/strava";

export const dynamic = "force-dynamic";

// POST /api/strava/sync — fetch recent activities and upsert them + HR streams.
export async function POST() {
  const supabase = getServiceClient();

  // Demo / unconfigured mode: nothing to pull from Strava, seed data stands in.
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json({
      synced: 0,
      demo: true,
      message:
        "Running with seed data — configure Supabase + Strava to enable live sync.",
    });
  }

  try {
    const { accessToken } = await getValidAccessToken();
    const settings = await getSettings();

    // Look back 30 days.
    const after = Math.floor(
      (Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000
    );
    const activities = await getActivities(accessToken, after);

    let created = 0;
    let streamsAttached = 0;

    for (const a of activities) {
      if (a.has_heartrate === false) continue;

      const session_date = a.start_date_local.slice(0, 10);
      const modality = mapModality(a);
      const session_type = inferSessionType(a, settings.max_heartrate);

      // Upsert session by strava_activity_id
      const { data: session, error } = await supabase
        .from("sessions")
        .upsert(
          {
            strava_activity_id: a.id,
            name: a.name,
            session_date,
            modality,
            session_type,
            duration_seconds: a.elapsed_time,
            avg_heartrate: a.average_heartrate ?? null,
            max_heartrate: a.max_heartrate ?? null,
            strava_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "strava_activity_id" }
        )
        .select("*")
        .single();

      if (error || !session) continue;
      created++;
      await insertEvent(session.id, "session_created", {
        name: a.name,
        strava_activity_id: a.id,
      });

      // Fetch + store HR stream
      const stream = await getHRStream(accessToken, a.id);
      if (stream) {
        await supabase.from("hr_streams").upsert(
          {
            session_id: session.id,
            data: stream.data,
            resolution: stream.resolution,
            original_size: stream.original_size,
          },
          { onConflict: "session_id" }
        );
        streamsAttached++;
        await insertEvent(session.id, "hr_stream_attached", {
          data_points: stream.original_size,
          resolution: stream.resolution,
        });
      }
    }

    return NextResponse.json({
      synced: created,
      streams_attached: streamsAttached,
    });
  } catch (e) {
    console.error("Strava sync error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Sync failed" },
      { status: 500 }
    );
  }
}
