import { NextRequest, NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/data";

export const dynamic = "force-dynamic";

// GET /api/settings
export async function GET() {
  const settings = await getSettings();
  return NextResponse.json(settings);
}

// PATCH /api/settings — update max_heartrate
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const maxHR = Number(body.max_heartrate);
  if (!maxHR || maxHR < 100 || maxHR > 240) {
    return NextResponse.json(
      { error: "max_heartrate must be between 100 and 240" },
      { status: 400 }
    );
  }
  const settings = await updateSettings(maxHR);
  return NextResponse.json(settings);
}
