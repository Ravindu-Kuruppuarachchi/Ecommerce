import { NextResponse } from "next/server";
import { googleConfigured } from "@/lib/customer-server";
export const dynamic = "force-dynamic";
export function GET() {
  return NextResponse.json({ configured: googleConfigured() }, { headers: { "Cache-Control": "no-store" } });
}
