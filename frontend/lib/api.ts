// lib/api.ts — Fetch helpers for the Willow FastAPI backend

import type { AnalyzeRequest, AnalyzeResponse } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "API request failed");
  }

  return res.json() as Promise<T>;
}

/**
 * POST /analyze — Send recent logs to Gemini for BCBA analysis
 */
export async function analyzeLogs(
  payload: AnalyzeRequest
): Promise<AnalyzeResponse> {
  return apiFetch<AnalyzeResponse>("/analyze", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * GET /health — Liveness check
 */
export async function checkHealth(): Promise<{ status: string }> {
  return apiFetch<{ status: string }>("/health");
}

/**
 * POST /chat — Multi-turn chat with log context
 */
export async function sendChatMessage(payload: {
  profile_name: string;
  message: string;
  history: { role: string; content: string }[];
  logs: {
    mood: number;
    sleep: number;
    medications: string[];
    notes?: string;
    created_at?: string;
  }[];
}): Promise<{ reply: string }> {
  return apiFetch<{ reply: string }>("/chat", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
