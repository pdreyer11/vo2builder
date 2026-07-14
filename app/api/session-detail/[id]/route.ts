import { NextRequest, NextResponse } from "next/server";
import { insertEvent, updateDetailById } from "@/lib/data";

export const dynamic = "force-dynamic";

// PATCH /api/session-detail/:id — update annotation
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const detail = await updateDetailById(params.id, body);
  if (!detail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await insertEvent(detail.session_id, "session_annotated", { fields: body });
  return NextResponse.json(detail);
}
