"""Paths, thresholds, and constants for the video-cut skill."""
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[3]


def raw_path(slug: str) -> Path:
    return PROJECT_ROOT / "data" / "video-raw" / slug


def processed_path(slug: str) -> Path:
    return PROJECT_ROOT / "data" / "video-processed" / slug


def master_file(slug: str) -> Path:
    return raw_path(slug) / "master.mp4"


def transcript_path(slug: str) -> Path:
    return processed_path(slug) / "transcripts" / "master.words.json"


def corrections_jsonl_path() -> Path:
    return PROJECT_ROOT / "memory" / "video-cut-corrections.jsonl"


def script_path(slug: str) -> Path:
    return PROJECT_ROOT / "output" / "scripts" / f"{slug}.md"


SILENCE_THRESHOLD_DB = -30.0
SILENCE_MIN_DURATION_SEC = 3.0

LEARNING_MIN_SAMPLES = 5
LEARNING_APPROVED_THRESHOLD = 0.80
LEARNING_DISABLED_THRESHOLD = 0.30

FUZZY_MATCH_MIN_RATIO = 0.80
FUZZY_ANCHOR_WORDS = 5

WHISPER_MODEL = "medium"
WHISPER_DEVICE = "cpu"
WHISPER_MIN_WORD_CONFIDENCE = 0.3

FILLER_MIN_CONFIDENCE = 0.85

DURATION_INVARIANT_TOLERANCE_SEC = 0.1
