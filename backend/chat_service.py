"""
chat_service.py — Multi-turn AI chat for Willow
Gemini acts as a compassionate BCBA care assistant with full log context.
"""

import os
import google.generativeai as genai
from models import ChatRequest, ChatResponse

genai.configure(api_key=os.environ["GEMINI_API_KEY"])

CHAT_SYSTEM_PROMPT = """You are Willow, a compassionate AI care assistant with expertise in 
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
Reference specific log entries when relevant (e.g. "I can see that on Tuesday, mood was 3/10...").
"""

def build_log_context(request: ChatRequest) -> str:
    """Build a compact log summary to prepend as context."""
    if not request.logs:
        return "No recent logs available for this care recipient."

    lines = [
        f"=== Recent Care Logs for {request.profile_name} ===",
        f"({len(request.logs)} entries available as context)\n"
    ]

    for log in request.logs:
        date_str = log.created_at or "Unknown date"
        meds = ", ".join(log.medications) if log.medications else "None"
        lines.append(
            f"• {date_str} | Mood: {log.mood}/10 | Sleep: {log.sleep}h | "
            f"Meds: {meds} | Notes: {log.notes or 'None'}"
        )

    lines.append("\n=== End of logs ===\n")
    return "\n".join(lines)


async def chat_with_ai(request: ChatRequest) -> ChatResponse:
    """
    Run a multi-turn chat with Gemini.
    Injects log context into the first user message so the model
    always has the care data grounded in conversation.
    """
    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        system_instruction=CHAT_SYSTEM_PROMPT,
        generation_config=genai.GenerationConfig(
            temperature=0.6,
            max_output_tokens=1024,
        ),
    )

    # Build the log context block (sent once as a system-style prefix)
    log_context = build_log_context(request)

    # Convert history into Gemini's expected format
    # Gemini uses alternating user/model roles
    gemini_history = []

    for i, msg in enumerate(request.history):
        role = "user" if msg.role == "user" else "model"

        # Inject log context before the very first user message
        if i == 0 and role == "user" and request.logs:
            content = f"{log_context}\n\nCaregiver: {msg.content}"
        else:
            content = msg.content

        gemini_history.append({"role": role, "parts": [content]})

    # Start the chat session with history
    chat_session = model.start_chat(history=gemini_history)

    # Build the current message — inject context if this is the first message
    if not request.history and request.logs:
        current_message = f"{log_context}\n\nCaregiver: {request.message}"
    else:
        current_message = request.message

    response = chat_session.send_message(current_message)

    return ChatResponse(reply=response.text)
