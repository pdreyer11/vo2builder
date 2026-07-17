import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, saveWahooTokens } from "@/lib/wahoo";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/sync?wahoo_error=${error ?? "no_code"}`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    await saveWahooTokens(tokens);
    return NextResponse.redirect(`${appUrl}/sync?wahoo_connected=1`);
  } catch (err) {
    console.error("Wahoo callback error:", err);
    return NextResponse.redirect(`${appUrl}/sync?wahoo_error=callback_failed`);
  }
}
