// lib/api.ts — API helpers for Willow
// Calls Next.js API routes (/api/analyze, /api/chat)
// No external backend needed — everything runs on Vercel

import type { AnalyzeRequest, AnalyzeResponse } from "./types";

// Always call our own Next.js API routes
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  // Relative paths work in the browser; server components need absolute URL
  const base =
    typeof window === "undefined"
      ? process.env.NEXT_PUBLIC_SITE_URL
        ? `https://${process.env.NEXT_PUBLIC_SITE_URL}`
        : "http://localhost:3000"
      : "";

  const res = await fetch(`${base}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "API request failed");
  }

  return res.json() as Promise<T>;
}

/** POST /api/analyze — BCBA log analysis */
export async function analyzeLogs(payload: AnalyzeRequest & { profile_context?: string }): Promise<AnalyzeResponse> {
  return apiFetch<AnalyzeResponse>("/api/analyze", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** POST /api/chat — Multi-turn chat with log context */
export async function sendChatMessage(payload: {
  profile_name: string;
  message:      string;
  history:      { role: string; content: string }[];
  logs: {
    mood:        number;
    sleep:       number;
    medications: string[];
    notes?:      string;
    created_at?: string;
  }[];
}): Promise<{ reply: string }> {
  return apiFetch<{ reply: string }>("/api/chat", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** GET /api/health — Liveness check */
export async function checkHealth(): Promise<{ status: string }> {
  return apiFetch<{ status: string }>("/api/health");
}
