from pydantic import BaseModel
from typing import Optional


class Cut(BaseModel):
    id: str
    cut_type: str  # retake | gap | filler
    time_in: float
    time_out: float
    reason: str
    confidence: float = 1.0
    status: str = "pending"  # pending | approved | rejected | adjusted
    adjusted_in: Optional[float] = None
    adjusted_out: Optional[float] = None
    dayner_note: Optional[str] = None


class Correction(BaseModel):
    video_slug: str
    date: str
    cut_type: str
    time_in: float
    time_out: float
    claude_reason: str
    transcript_context: str = ""
    action: str  # approved | rejected | adjusted
    adjusted_in: Optional[float] = None
    adjusted_out: Optional[float] = None
    dayner_note: Optional[str] = None


class SaveCutsRequest(BaseModel):
    cuts: list[Cut]


class ComposeJob(BaseModel):
    job_id: str
    status: str = "running"  # running | done | error
    error: Optional[str] = None
