import { NextResponse } from "next/server";
import { authorizeUrl } from "@/lib/strava";

export const dynamic = "force-dynamic";

// GET /api/strava/authorize — redirect to Strava's OAuth consent screen
export async function GET() {
  if (!process.env.STRAVA_CLIENT_ID) {
    return NextResponse.json(
      { error: "STRAVA_CLIENT_ID is not configured." },
      { status: 501 }
    );
  }
  return NextResponse.redirect(authorizeUrl());
}
