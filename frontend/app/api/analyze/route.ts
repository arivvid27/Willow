// app/api/analyze/route.ts
// Replaces FastAPI POST /analyze — runs as a Vercel serverless function
// Calls Google Gemini directly with the BCBA system prompt

import { NextRequest, NextResponse } from "next/server";

// ── Types ─────────────────────────────────────────────────────────────────────

interface LogEntry {
  mood:        number;
  sleep:       number;
  medications: string[];
  notes?:      string;
  created_at?: string;
}

interface AnalyzeRequest {
  profile_name:    string;
  profile_context?: string;  // diagnoses, allergies, notes etc from care profile
  logs:            LogEntry[];
}

// ── BCBA system prompt (identical to ai_service.py) ───────────────────────────

const SYSTEM_PROMPT = `You are a compassionate, experienced Board Certified Behavior Analyst (BCBA) 
and special needs care coordinator named Willow. Your role is to analyze daily care logs submitted 
by a care team and provide warm, evidence-based insights.

Your tone is:
- Empathetic and supportive — you understand caregiving is emotionally demanding work
- Professional but accessible — avoid clinical jargon when simpler language works
- Solution-focused — every observation should come with actionable, realistic suggestions
- Strength-based — highlight what is going well, not just what needs adjustment

When analyzing logs, you look for:
1. Mood and sleep correlations (e.g., poor sleep consistently precedes low mood days)
2. Medication adherence patterns and their relationship to behavior
3. Emerging behavioral trends (escalation, de-escalation, new triggers)
4. Environmental or scheduling factors mentioned in notes
5. Caregiver wellbeing signals embedded in the notes

IMPORTANT SAFETY NOTE: You are a supportive analytical tool, not a licensed medical provider.
Always note when patterns warrant consultation with a physician, therapist, or specialist.

You MUST respond in the following JSON format exactly:
{
  "summary": "2-3 sentence plain-language summary of the week",
  "pattern_analysis": "Detailed markdown analysis of observed patterns (use ## headers, bullet lists)",
  "suggested_adjustments": "Markdown list of 3-6 actionable, specific suggestions"
}`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildLogText(profileName: string, logs: LogEntry[], profileContext?: string): string {
  const lines = [`Care Recipient: ${profileName}`, ""];
  if (profileContext) {
    lines.push("--- Care Profile Context ---");
    lines.push(profileContext);
    lines.push("");
  }
  logs.forEach((log, i) => {
    const date = log.created_at ?? `Day ${i + 1}`;
    const meds = log.medications?.length ? log.medications.join(", ") : "None recorded";
    lines.push(
      `--- Log ${i + 1} | ${date} ---`,
      `  Mood: ${log.mood}/10`,
      `  Sleep: ${log.sleep} hours`,
      `  Medications: ${meds}`,
      `  Notes: ${log.notes ?? "No notes"}`,
      ""
    );
  });
  return lines.join("\n");
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body: AnalyzeRequest = await req.json();

    if (!body.logs || body.logs.length === 0) {
      return NextResponse.json(
        { detail: "At least one log entry is required." },
        { status: 422 }
      );
    }
    if (body.logs.length > 30) {
      return NextResponse.json(
        { detail: "Maximum 30 log entries per request." },
        { status: 422 }
      );
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json(
        { detail: "GEMINI_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const logText = buildLogText(body.profile_name, body.logs, body.profile_context);
    const userMessage = `Please analyze the following ${body.logs.length} care logs and provide your BCBA insights:\n\n${logText}`;

    // Call Gemini REST API directly — no SDK needed, no extra npm packages
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ text: userMessage }] }],
          generationConfig: {
            temperature:      0.4,
            maxOutputTokens:  2048,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      console.error("Gemini API error:", err);
      return NextResponse.json(
        { detail: "AI analysis failed. Check your Gemini API key." },
        { status: 502 }
      );
    }

    const geminiData = await geminiRes.json();
    const rawText: string =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    try {
      const parsed = JSON.parse(rawText);
      return NextResponse.json({
        summary:               parsed.summary               ?? "",
        pattern_analysis:      parsed.pattern_analysis      ?? "",
        suggested_adjustments: parsed.suggested_adjustments ?? "",
        raw_markdown:          rawText,
      });
    } catch {
      // Fallback if Gemini didn't return valid JSON
      return NextResponse.json({
        summary:               "Analysis complete — see full response below.",
        pattern_analysis:      rawText,
        suggested_adjustments: "Review the pattern analysis above for suggestions.",
        raw_markdown:          rawText,
      });
    }
  } catch (err) {
    console.error("/api/analyze error:", err);
    return NextResponse.json(
      { detail: "Internal server error." },
      { status: 500 }
    );
  }
}
