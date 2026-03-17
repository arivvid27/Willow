// app/api/health/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status:     "ok",
    service:    "willow-api",
    gemini_key: process.env.GEMINI_API_KEY ? "set" : "MISSING ← this is your problem",
    supabase:   process.env.NEXT_PUBLIC_SUPABASE_URL ? "set" : "MISSING",
  });
}
