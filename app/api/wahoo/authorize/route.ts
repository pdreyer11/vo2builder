import { NextResponse } from "next/server";
import { generatePkce, wahooAuthorizeUrl } from "@/lib/wahoo";

export const dynamic = "force-dynamic";

export function GET() {
  const { verifier, challenge } = generatePkce();
  const res = NextResponse.redirect(wahooAuthorizeUrl(challenge));
  res.cookies.set("wahoo_pkce_verifier", verifier, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
