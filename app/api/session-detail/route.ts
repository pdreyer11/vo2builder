import { NextRequest, NextResponse } from "next/server";
import { insertEvent, upsertDetail } from "@/lib/data";

export const dynamic = "force-dynamic";

// POST /api/session-detail — create annotation for a session
export async function POST(req: NextRequest) {
  const body = await req.json();
  const sessionId = body.session_id;
  if (!sessionId) {
    return NextResponse.json({ error: "session_id required" }, { status: 400 });
  }
  const { session_id: _sid, ...fields } = body;
  void _sid;
  const detail = await upsertDetail(sessionId, fields);
  await insertEvent(sessionId, "session_annotated", { fields });
  return NextResponse.json(detail, { status: 201 });
}
