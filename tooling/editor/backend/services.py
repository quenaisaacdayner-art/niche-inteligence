import json
import os
from pathlib import Path
from models import Cut, Correction


def get_project_root() -> Path:
    """Resolve project root from env var or relative path."""
    env = os.environ.get("PROJECT_ROOT")
    if env:
        return Path(env)
    return Path(__file__).resolve().parent.parent.parent.parent


def get_fixture_dir() -> Path | None:
    """Return fixture directory if FIXTURE_DIR env var is set."""
    env = os.environ.get("FIXTURE_DIR")
    return Path(env) if env else None


def get_slug_dir(slug: str) -> Path:
    """Return the data directory for a given slug."""
    fixture = get_fixture_dir()
    if fixture and fixture.exists():
        return fixture
    return get_project_root() / "data" / "video-processed" / slug


def load_cuts(slug: str) -> list[Cut]:
    """Load cuts_retakes.json + gaps.json, merge, assign IDs, sort by time."""
    slug_dir = get_slug_dir(slug)
    cuts: list[Cut] = []

    retakes_path = slug_dir / "cuts_retakes.json"
    if retakes_path.exists():
        data = json.loads(retakes_path.read_text(encoding="utf-8"))
        for i, item in enumerate(data):
            cut_type = "filler" if "filler" in item.get("reason", "") else "retake"
            cuts.append(Cut(
                id=f"{cut_type}_{i}",
                cut_type=cut_type,
                time_in=item["in"],
                time_out=item["out"],
                reason=item.get("reason", ""),
                confidence=item.get("confidence", 1.0),
            ))

    gaps_path = slug_dir / "gaps.json"
    if gaps_path.exists():
        data = json.loads(gaps_path.read_text(encoding="utf-8"))
        for i, item in enumerate(data):
            duration = item["out"] - item["in"]
            cuts.append(Cut(
                id=f"gap_{i}",
                cut_type="gap",
                time_in=item["in"],
                time_out=item["out"],
                reason=item.get("reason", f"silence {duration:.1f}s"),
            ))

    approved_path = slug_dir / "cuts_approved.json"
    if approved_path.exists():
        saved = json.loads(approved_path.read_text(encoding="utf-8"))
        status_map = {s["id"]: s for s in saved}
        for cut in cuts:
            if cut.id in status_map:
                s = status_map[cut.id]
                cut.status = s.get("status", "pending")
                cut.adjusted_in = s.get("adjusted_in")
                cut.adjusted_out = s.get("adjusted_out")
                cut.dayner_note = s.get("dayner_note")

    cuts.sort(key=lambda c: c.time_in)
    return cuts


def save_cuts(slug: str, cuts: list[Cut]) -> None:
    """Write cuts_approved.json with all non-pending cuts."""
    slug_dir = get_slug_dir(slug)
    approved = [
        {
            "id": c.id,
            "status": c.status,
            "adjusted_in": c.adjusted_in,
            "adjusted_out": c.adjusted_out,
            "dayner_note": c.dayner_note,
        }
        for c in cuts
        if c.status != "pending"
    ]
    path = slug_dir / "cuts_approved.json"
    path.write_text(json.dumps(approved, indent=2, ensure_ascii=False), encoding="utf-8")


def get_project_info(slug: str) -> dict:
    """Return metadata about what files exist for a slug."""
    slug_dir = get_slug_dir(slug)
    return {
        "slug": slug,
        "has_face_clean": (slug_dir / "face_clean.mp4").exists(),
        "has_screen_clean": (slug_dir / "screen_clean.mp4").exists(),
        "has_body": (slug_dir / "body.mp4").exists(),
        "data_dir": str(slug_dir),
    }


def append_correction(correction: Correction) -> None:
    """Append one correction entry to memory/video-cut-corrections.jsonl."""
    root = get_project_root()
    path = root / "memory" / "video-cut-corrections.jsonl"
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(correction.model_dump(), ensure_ascii=False) + "\n")
