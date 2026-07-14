import { NextRequest, NextResponse } from "next/server";
import {
  getSessionWithDetail,
  insertEvent,
  softDeleteSession,
  updateSession,
} from "@/lib/data";

export const dynamic = "force-dynamic";

// GET /api/sessions/:id — session + joined detail + hr_stream
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionWithDetail(params.id);
  if (!session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(session);
}

// PATCH /api/sessions/:id — update name, session_type, notes
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string") patch.name = body.name;
  if (typeof body.session_type === "string")
    patch.session_type = body.session_type;
  if (typeof body.notes === "string") patch.notes = body.notes;

  const updated = await updateSession(params.id, patch);
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (body.session_type === "benchmark") {
    await insertEvent(params.id, "benchmark_logged", { name: updated.name });
  }
  return NextResponse.json(updated);
}

// DELETE /api/sessions/:id — soft delete
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  await softDeleteSession(params.id);
  return NextResponse.json({ ok: true });
}
