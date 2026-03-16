"""
main.py — Willow FastAPI Backend
Run with: uvicorn main:app --reload --port 8000
"""

import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()  # Load .env before anything else

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from models import AnalyzeRequest, AnalyzeResponse, ChatRequest, ChatResponse
from ai_service import analyze_logs
from chat_service import chat_with_ai


# ── App Lifespan ──────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Validate required env vars on startup
    required = ["GEMINI_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]
    missing = [k for k in required if not os.getenv(k)]
    if missing:
        raise RuntimeError(f"Missing required environment variables: {', '.join(missing)}")
    print("✅  Willow backend started — all env vars present.")
    yield
    print("👋  Willow backend shutting down.")


# ── App Init ──────────────────────────────────────────────────

app = FastAPI(
    title="Willow API",
    description="Care coordination backend with AI-powered log analysis.",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────
# FRONTEND_URL can be a comma-separated list of allowed origins.
# Supports Firebase Hosting, Vercel, and custom domains.
# e.g. "https://your-app.web.app,https://www.myapp.com"

def _get_allowed_origins() -> list[str]:
    base = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    extra = os.getenv("FRONTEND_URL", "")
    if extra:
        base.extend([u.strip() for u in extra.split(",") if u.strip()])
    return base

app.add_middleware(
    CORSMiddleware,
    allow_origins=_get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Routes ────────────────────────────────────────────────────

@app.get("/health", tags=["Meta"])
async def health_check():
    """Simple liveness probe."""
    return {"status": "ok", "service": "willow-api"}


@app.post(
    "/analyze",
    response_model=AnalyzeResponse,
    tags=["AI"],
    summary="Analyze a care recipient's recent logs with Gemini BCBA",
    status_code=status.HTTP_200_OK,
)
async def analyze(request: AnalyzeRequest) -> AnalyzeResponse:
    """
    Accepts up to 7 days of daily logs and returns AI-generated:
    - pattern_analysis: Markdown insights on mood/sleep/behavior trends
    - suggested_adjustments: Actionable caregiver recommendations
    - summary: Plain-language one-paragraph overview
    """
    if len(request.logs) == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least one log entry is required for analysis.",
        )

    if len(request.logs) > 30:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Maximum 30 log entries per analysis request.",
        )

    try:
        result = await analyze_logs(request)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI analysis failed: {str(e)}",
        )


@app.post(
    "/chat",
    response_model=ChatResponse,
    tags=["AI"],
    summary="Chat with Willow AI using log history as context",
    status_code=status.HTTP_200_OK,
)
async def chat(request: ChatRequest) -> ChatResponse:
    """
    Multi-turn chat with the Willow AI. Sends the full conversation history
    plus recent log context to Gemini and returns the assistant reply.
    """
    if not request.message.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Message cannot be empty.",
        )
    try:
        result = await chat_with_ai(request)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Chat failed: {str(e)}",
        )
