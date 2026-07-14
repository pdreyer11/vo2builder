import { NextRequest, NextResponse } from "next/server";
import { getEvents } from "@/lib/data";

export const dynamic = "force-dynamic";

// GET /api/events?since=<ISO>&limit=<n> — event outbox
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const since = searchParams.get("since") ?? undefined;
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Math.min(Number(limitParam), 500) : 50;
  const events = await getEvents(since, limit);
  return NextResponse.json({ events });
}
