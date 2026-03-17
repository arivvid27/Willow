"""
ai_service.py — Google Gemini integration for Willow
Acts as a compassionate BCBA to analyze care logs.
"""

import os
import json
import google.generativeai as genai
from models import AnalyzeRequest, AnalyzeResponse

# Configure the Gemini client once at import time
genai.configure(api_key=os.environ["GEMINI_API_KEY"])

SYSTEM_PROMPT = """You are a compassionate, experienced Board Certified Behavior Analyst (BCBA) 
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
}
"""


def build_log_text(request: AnalyzeRequest) -> str:
    """Convert structured log data into a readable text block for the prompt."""
    lines = [f"Care Recipient: {request.profile_name}", ""]
    for i, log in enumerate(request.logs, 1):
        date_str = log.created_at or f"Day {i}"
        meds = ", ".join(log.medications) if log.medications else "None recorded"
        lines.append(f"--- Log {i} | {date_str} ---")
        lines.append(f"  Mood: {log.mood}/10")
        lines.append(f"  Sleep: {log.sleep} hours")
        lines.append(f"  Medications: {meds}")
        lines.append(f"  Notes: {log.notes or 'No notes'}")
        lines.append("")
    return "\n".join(lines)


async def analyze_logs(request: AnalyzeRequest) -> AnalyzeResponse:
    """Send logs to Gemini and parse the structured response."""
    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        system_instruction=SYSTEM_PROMPT,
        generation_config=genai.GenerationConfig(
            response_mime_type="application/json",
            temperature=0.4,
            max_output_tokens=2048,
        ),
    )

    log_text = build_log_text(request)
    user_message = (
        f"Please analyze the following {len(request.logs)} care logs "
        f"and provide your BCBA insights:\n\n{log_text}"
    )

    response = model.generate_content(user_message)
    raw_text = response.text

    try:
        data = json.loads(raw_text)
        return AnalyzeResponse(
            summary=data.get("summary", ""),
            pattern_analysis=data.get("pattern_analysis", ""),
            suggested_adjustments=data.get("suggested_adjustments", ""),
            raw_markdown=raw_text,
        )
    except json.JSONDecodeError:
        # Fallback: return the raw text in all fields
        return AnalyzeResponse(
            summary="Analysis complete — see full response below.",
            pattern_analysis=raw_text,
            suggested_adjustments="Please review the pattern analysis above for suggestions.",
            raw_markdown=raw_text,
        )
