// lib/api.ts — FastAPI backend calls for Willow mobile

import type { Log } from "./types";

const BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";

export async function analyzeLogs(profileName: string, logs: Log[]): Promise<{
  summary: string;
  pattern_analysis: string;
  suggested_adjustments: string;
}> {
  const res = await fetch(`${BASE}/analyze`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({
      profile_name: profileName,
      logs: logs.slice(0, 7).map((l) => ({
        mood:        l.mood,
        sleep:       l.sleep,
        medications: l.medications ?? [],
        notes:       l.notes ?? undefined,
        created_at:  l.created_at,
      })),
    }),
  });
  if (!res.ok) throw new Error("Analysis failed");
  return res.json();
}

export async function chatWithAI(payload: {
  profile_name: string;
  message:      string;
  history:      { role: string; content: string }[];
  logs:         Partial<Log>[];
}): Promise<{ reply: string }> {
  const res = await fetch(`${BASE}/chat`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Chat failed");
  return res.json();
}
