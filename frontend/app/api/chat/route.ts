// app/api/chat/route.ts
// Replaces FastAPI POST /chat — multi-turn Gemini chat with log context

import { NextRequest, NextResponse } from "next/server";

// ── Types ─────────────────────────────────────────────────────────────────────

interface LogEntry {
  mood:        number;
  sleep?:      number | null;
  medications: string[];
  notes?:      string;
  created_at?: string;
}

interface ChatMessage {
  role:    "user" | "assistant";
  content: string;
}

interface ChatRequest {
  profile_name:     string;
  profile_context?: string;
  message:          string;
  history:          ChatMessage[];
  logs:             LogEntry[];
}

// ── Chat system prompt (identical to chat_service.py) ─────────────────────────

const CHAT_SYSTEM_PROMPT = `You are Willow, a compassionate AI care assistant with expertise in 
special needs care coordination, Applied Behavior Analysis (ABA), and family support.

You are speaking directly with a caregiver or care team member. Your role is to:
- Answer questions about the care recipient's recent logs and patterns
- Offer evidence-based guidance grounded in BCBA principles
- Help caregivers understand behavioral trends and possible triggers
- Suggest practical, realistic strategies for daily care
- Provide emotional support and validate the caregiver's experiences
- Help interpret mood, sleep, and medication data in plain language

Your tone is:
- Warm, empathetic, and never clinical or cold
- Direct and practical — caregivers are busy people
- Strength-based — always acknowledge what's going well
- Honest about uncertainty — never fabricate clinical conclusions

IMPORTANT RULES:
- You always ground your answers in the log data provided when relevant
- If asked something outside your expertise, say so clearly and suggest consulting a specialist
- Never diagnose, prescribe, or replace professional medical advice
- If a caregiver seems distressed, acknowledge their feelings before offering advice
- Keep responses concise unless depth is clearly needed
- Use markdown formatting: **bold** for emphasis, bullet lists for steps, ## for sections

When log data is provided, you have access to it as context for the entire conversation.
Reference specific log entries when relevant (e.g. "I can see that on Tuesday, mood was 3/10...").`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildLogContext(profileName: string, logs: LogEntry[], profileContext?: string): string {
  const lines = [
    `=== Care Recipient: ${profileName} ===`,
  ];
  if (profileContext) {
    lines.push("--- Care Profile ---");
    lines.push(profileContext);
    lines.push("--- End Care Profile ---\n");
  }
  if (!logs || logs.length === 0) {
    lines.push("No recent logs available.");
    return lines.join("\n");
  }
  lines.push(`=== Recent Care Logs (${logs.length} entries) ===`);
  for (const log of logs) {
    const date = log.created_at ?? "Unknown date";
    const meds = log.medications?.length ? log.medications.join(", ") : "None";
    lines.push(
      `• ${date} | Mood: ${log.mood}/10 | Sleep: ${log.sleep ?? "?"}h | Meds: ${meds} | Notes: ${log.notes ?? "None"}`
    );
  }
  lines.push("\n=== End of logs ===\n");
  return lines.join("\n");
}

// Convert our chat history to Gemini's contents format
function buildGeminiContents(
  history:    ChatMessage[],
  message:    string,
  logContext: string
): object[] {
  const contents: object[] = [];

  history.forEach((msg, i) => {
    const role = msg.role === "user" ? "user" : "model";
    // Inject log context before the very first user message
    const text =
      i === 0 && role === "user" && logContext
        ? `${logContext}\n\nCaregiver: ${msg.content}`
        : msg.content;
    contents.push({ role, parts: [{ text }] });
  });

  // Current message
  const currentText =
    history.length === 0 && logContext
      ? `${logContext}\n\nCaregiver: ${message}`
      : message;
  contents.push({ role: "user", parts: [{ text: currentText }] });

  return contents;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequest = await req.json();

    if (!body.message?.trim()) {
      return NextResponse.json(
        { detail: "Message cannot be empty." },
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

    const logContext = buildLogContext(body.profile_name, body.logs ?? [], body.profile_context);
    const contents   = buildGeminiContents(body.history ?? [], body.message, logContext);

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
      {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: CHAT_SYSTEM_PROMPT }] },
          contents,
          generationConfig: {
            temperature:     0.6,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      console.error("Gemini chat error:", err);
      return NextResponse.json(
        { detail: "AI chat failed. Check your Gemini API key." },
        { status: 502 }
      );
    }

    const geminiData = await geminiRes.json();
    const reply: string =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "Sorry, I couldn't generate a response.";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("/api/chat error:", err);
    return NextResponse.json(
      { detail: "Internal server error." },
      { status: 500 }
    );
  }
}
