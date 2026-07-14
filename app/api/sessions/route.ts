import { NextRequest, NextResponse } from "next/server";
import { getSessions, insertEvent } from "@/lib/data";
import { getServiceClient } from "@/lib/supabase";
import type { Modality, SessionType } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/sessions?type=&modality=
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") as SessionType | null;
  const modality = searchParams.get("modality") as Modality | null;
  const sessions = await getSessions({
    type: type ?? undefined,
    modality: modality ?? undefined,
  });
  return NextResponse.json(sessions);
}

// POST /api/sessions — manual create (rare; Strava is the primary path)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Manual session creation requires a configured database." },
      { status: 501 }
    );
  }
  const { data, error } = await supabase
    .from("sessions")
    .insert({
      name: body.name ?? "Untitled session",
      session_date: body.session_date,
      modality: body.modality,
      session_type: body.session_type ?? "zone2",
      duration_seconds: body.duration_seconds ?? 0,
      avg_heartrate: body.avg_heartrate ?? null,
      max_heartrate: body.max_heartrate ?? null,
      notes: body.notes ?? null,
    })
    .select("*")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  await insertEvent(data.id, "session_created", { name: data.name, manual: true });
  return NextResponse.json(data, { status: 201 });
}
