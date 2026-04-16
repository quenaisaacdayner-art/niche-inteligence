from pydantic import BaseModel
from typing import Optional


class Cut(BaseModel):
    id: str
    cut_type: str  # retake | gap | filler | manual
    time_in: float
    time_out: float
    reason: str
    confidence: float = 1.0
    status: str = "pending"  # pending | approved | rejected | adjusted
    adjusted_in: Optional[float] = None
    adjusted_out: Optional[float] = None
    dayner_note: Optional[str] = None
    source: Optional[str] = None  # legacy, unused in current UI (track is now derived from overlay)


class Overlay(BaseModel):
    """A secondary clip positioned on the master timeline in a track >= 2."""
    id: str
    file: str                   # basename relative to {slug}/overlays/
    track: int = 2              # track index (1 = master, 2+ = overlays)
    timeline_pos: float         # seconds on master timeline where this overlay starts
    time_in: float = 0.0        # trim start inside the overlay file
    time_out: float = 0.0       # trim end inside the overlay file
    position: str = "pip"       # pip | fullscreen | custom
    mute: bool = True
    volume: float = 1.0
    # Custom position overrides (percentages 0-100 of the master video area):
    x_pct: Optional[float] = None
    y_pct: Optional[float] = None
    width_pct: Optional[float] = None


class Correction(BaseModel):
    video_slug: str
    date: str
    cut_type: str
    time_in: float
    time_out: float
    claude_reason: str
    transcript_context: str = ""
    action: str  # approved | rejected | adjusted | manual | deleted
    adjusted_in: Optional[float] = None
    adjusted_out: Optional[float] = None
    dayner_note: Optional[str] = None


class SaveCutsRequest(BaseModel):
    cuts: list[Cut]


class SaveOverlaysRequest(BaseModel):
    overlays: list[Overlay]


class ComposeJob(BaseModel):
    job_id: str
    status: str = "running"  # running | done | error
    error: Optional[str] = None
    output_path: Optional[str] = None
