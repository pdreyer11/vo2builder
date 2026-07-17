import { NextResponse } from "next/server";
import { wahooAuthorizeUrl } from "@/lib/wahoo";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.redirect(wahooAuthorizeUrl());
}
