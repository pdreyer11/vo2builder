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

  const verifier = req.cookies.get("wahoo_pkce_verifier")?.value;
  if (!verifier) {
    return NextResponse.redirect(`${appUrl}/sync?wahoo_error=missing_verifier`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code, verifier);
    await saveWahooTokens(tokens);
    const res = NextResponse.redirect(`${appUrl}/sync?wahoo_connected=1`);
    res.cookies.delete("wahoo_pkce_verifier");
    return res;
  } catch (err) {
    console.error("Wahoo callback error:", err);
    return NextResponse.redirect(`${appUrl}/sync?wahoo_error=callback_failed`);
  }
}
