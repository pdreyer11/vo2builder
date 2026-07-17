import { NextResponse } from "next/server";
import {
  getValidWahooAccessToken,
  getWorkout,
  getWorkouts,
  downloadFitFile,
  workoutToSessionBase,
} from "@/lib/wahoo";
import { createSession, getSessionByWahooId, insertEvent, upsertHRStream } from "@/lib/data";
import { parseFit } from "@/lib/parsers";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const accessToken = await getValidWahooAccessToken();
    const workouts = await getWorkouts(accessToken, 30);

    let synced = 0;
    const errors: string[] = [];

    for (const w of workouts) {
      try {
        const existing = await getSessionByWahooId(w.id);
        if (existing) continue;

        let workout = w;
        if (!w.workout_summary) {
          workout = await getWorkout(accessToken, w.id);
        }

        const base = workoutToSessionBase(workout);
        const session = await createSession({
          ...base,
          session_type: "zone2",
          max_heartrate: base.peak_heartrate,
        });

        await insertEvent(session.id, "session_created", {
          name: session.name,
          wahoo_workout_id: w.id,
          source: "wahoo_sync",
        });

        const fitUrl = workout.workout_summary?.file?.url;
        if (fitUrl) {
          try {
            const buf = await downloadFitFile(fitUrl);
            const parsed = await parseFit(buf);
            if (parsed.hrStream.length > 0) {
              await upsertHRStream(session.id, parsed.hrStream, parsed.resolution);
              await insertEvent(session.id, "hr_stream_attached", {
                data_points: parsed.hrStream.length,
                resolution: parsed.resolution,
              });
            }
          } catch (fitErr) {
            errors.push(`FIT parse for workout ${w.id}: ${fitErr}`);
          }
        }

        synced++;
      } catch (err) {
        errors.push(`Workout ${w.id}: ${err}`);
      }
    }

    return NextResponse.json({ synced, errors });
  } catch (err) {
    console.error("Wahoo sync error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}
