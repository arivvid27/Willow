"""
models.py — Pydantic request/response models for Willow API
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class LogEntry(BaseModel):
    """A single daily log entry sent to the AI for analysis."""
    mood: int = Field(..., ge=1, le=10, description="Mood score 1–10")
    sleep: float = Field(..., ge=0, le=24, description="Sleep hours")
    medications: list[str] = Field(default_factory=list, description="Medications taken")
    notes: Optional[str] = Field(None, description="Behavior or event notes")
    created_at: Optional[str] = Field(None, description="ISO timestamp of the log")


class AnalyzeRequest(BaseModel):
    """Request body for POST /analyze"""
    profile_name: str = Field(..., description="Name of the care recipient")
    logs: list[LogEntry] = Field(..., min_length=1, description="List of recent logs (up to 7 days)")


class InsightSection(BaseModel):
    """A single named section of the AI analysis."""
    title: str
    content: str


class AnalyzeResponse(BaseModel):
    """Response from POST /analyze"""
    pattern_analysis: str
    suggested_adjustments: str
    summary: str
    raw_markdown: str


# ── Chat models ───────────────────────────────────────────────

class ChatMessage(BaseModel):
    """A single message in the conversation history."""
    role: str = Field(..., description="'user' or 'assistant'")
    content: str = Field(..., description="Message text")


class ChatRequest(BaseModel):
    """Request body for POST /chat"""
    profile_name: str = Field(..., description="Name of the care recipient")
    message: str = Field(..., description="The user's latest message")
    history: list[ChatMessage] = Field(
        default_factory=list,
        description="Previous conversation messages for context"
    )
    logs: list[LogEntry] = Field(
        default_factory=list,
        description="Recent care logs to ground the conversation"
    )


class ChatResponse(BaseModel):
    """Response from POST /chat"""
    reply: str = Field(..., description="The AI assistant's response in markdown")

