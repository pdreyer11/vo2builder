import { NextResponse } from "next/server";
import { getSummary } from "@/lib/data";

export const dynamic = "force-dynamic";

// GET /api/vo2builder-summary — snapshot for future dashboard / Vitals consumers
export async function GET() {
  const summary = await getSummary();
  return NextResponse.json(summary);
}
