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
    """Load cuts_retakes.json + gaps.json + cuts_approved.json, merge and sort."""
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
        # Inject status + adjustments
        for cut in cuts:
            if cut.id in status_map:
                s = status_map[cut.id]
                cut.status = s.get("status", "pending")
                cut.adjusted_in = s.get("adjusted_in")
                cut.adjusted_out = s.get("adjusted_out")
                cut.dayner_note = s.get("dayner_note")
        # Inject manual cuts (only present in approved file, not in retakes/gaps)
        for s in saved:
            if s.get("cut_type") == "manual" and not any(c.id == s["id"] for c in cuts):
                cuts.append(Cut(
                    id=s["id"],
                    cut_type="manual",
                    time_in=s.get("time_in", s.get("adjusted_in", 0)),
                    time_out=s.get("time_out", s.get("adjusted_out", 0)),
                    reason=s.get("reason", "corte manual"),
                    confidence=1.0,
                    status=s.get("status", "approved"),
                    adjusted_in=s.get("adjusted_in"),
                    adjusted_out=s.get("adjusted_out"),
                    dayner_note=s.get("dayner_note"),
                ))

    cuts.sort(key=lambda c: c.time_in)
    return cuts


def save_cuts(slug: str, cuts: list[Cut]) -> None:
    """Write cuts_approved.json with all non-pending cuts + all manual cuts."""
    slug_dir = get_slug_dir(slug)
    slug_dir.mkdir(parents=True, exist_ok=True)
    approved: list[dict] = []
    for c in cuts:
        if c.status == "pending" and c.cut_type != "manual":
            continue
        # Manual cuts need full data preserved (they don't exist in retakes/gaps)
        if c.cut_type == "manual":
            approved.append({
                "id": c.id,
                "cut_type": c.cut_type,
                "time_in": c.time_in,
                "time_out": c.time_out,
                "reason": c.reason,
                "status": c.status,
                "adjusted_in": c.adjusted_in,
                "adjusted_out": c.adjusted_out,
                "dayner_note": c.dayner_note,
            })
        else:
            approved.append({
                "id": c.id,
                "status": c.status,
                "adjusted_in": c.adjusted_in,
                "adjusted_out": c.adjusted_out,
                "dayner_note": c.dayner_note,
            })
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


# --- Compose helpers (FFmpeg) ---

def merge_ranges(ranges: list[tuple[float, float]]) -> list[tuple[float, float]]:
    """Merge overlapping/adjacent ranges. Input and output are sorted by start."""
    if not ranges:
        return []
    sorted_ranges = sorted(ranges, key=lambda r: r[0])
    merged: list[tuple[float, float]] = [sorted_ranges[0]]
    for start, end in sorted_ranges[1:]:
        last_start, last_end = merged[-1]
        if start <= last_end:
            merged[-1] = (last_start, max(last_end, end))
        else:
            merged.append((start, end))
    return merged


def compute_keep_segments(
    cuts: list[Cut], duration: float
) -> list[tuple[float, float]]:
    """Given approved cuts (regions to REMOVE) and total duration, compute segments to KEEP."""
    remove_ranges: list[tuple[float, float]] = []
    for c in cuts:
        if c.status not in ("approved", "adjusted"):
            continue
        in_t = c.adjusted_in if c.adjusted_in is not None else c.time_in
        out_t = c.adjusted_out if c.adjusted_out is not None else c.time_out
        if out_t > in_t:
            remove_ranges.append((in_t, out_t))
    remove_ranges = merge_ranges(remove_ranges)

    # Build keep segments as complement
    keep: list[tuple[float, float]] = []
    cursor = 0.0
    for r_start, r_end in remove_ranges:
        if r_start > cursor:
            keep.append((cursor, min(r_start, duration)))
        cursor = max(cursor, r_end)
    if cursor < duration:
        keep.append((cursor, duration))

    # Drop sub-millisecond slivers
    return [(s, e) for s, e in keep if e - s > 0.01]


def build_compose_ffmpeg_args(
    input_path: Path, output_path: Path, keep_segments: list[tuple[float, float]]
) -> list[str]:
    """Build FFmpeg command that trims and concats keep_segments into output.

    If there are no cuts (empty remove set), falls back to stream copy.
    """
    if not keep_segments:
        # No keep segments means the entire video was cut — produce empty is weird; just copy instead.
        return [
            "ffmpeg", "-y", "-i", str(input_path),
            "-c", "copy", str(output_path),
        ]

    # Build filter_complex: for each keep segment, trim video+audio, then concat all.
    parts: list[str] = []
    for i, (start, end) in enumerate(keep_segments):
        parts.append(
            f"[0:v]trim=start={start:.3f}:end={end:.3f},"
            f"setpts=PTS-STARTPTS[v{i}]"
        )
        parts.append(
            f"[0:a]atrim=start={start:.3f}:end={end:.3f},"
            f"asetpts=PTS-STARTPTS[a{i}]"
        )
    n = len(keep_segments)
    concat_inputs = "".join(f"[v{i}][a{i}]" for i in range(n))
    parts.append(f"{concat_inputs}concat=n={n}:v=1:a=1[outv][outa]")

    filter_complex = ";".join(parts)

    return [
        "ffmpeg", "-y",
        "-i", str(input_path),
        "-filter_complex", filter_complex,
        "-map", "[outv]",
        "-map", "[outa]",
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "20",
        "-c:a", "aac",
        "-b:a", "192k",
        str(output_path),
    ]


async def probe_duration(path: Path) -> float:
    """Return video duration in seconds via ffprobe."""
    import asyncio
    proc = await asyncio.create_subprocess_exec(
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        str(path),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.DEVNULL,
    )
    out, _ = await proc.communicate()
    try:
        return float(out.decode().strip())
    except (ValueError, AttributeError):
        return 0.0
