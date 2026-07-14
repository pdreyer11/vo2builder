import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, saveTokens } from "@/lib/strava";

export const dynamic = "force-dynamic";

// GET /api/strava/callback — OAuth redirect target
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/sync?strava=denied`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    await saveTokens(tokens);
    return NextResponse.redirect(`${appUrl}/sync?strava=connected`);
  } catch (e) {
    console.error("Strava callback error:", e);
    return NextResponse.redirect(`${appUrl}/sync?strava=error`);
  }
}
