// app/api/health/route.ts
// Simple liveness probe — confirms the API routes are working

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ status: "ok", service: "willow-api" });
}
