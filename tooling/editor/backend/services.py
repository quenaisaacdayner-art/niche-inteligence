import json
import os
from dataclasses import dataclass
from pathlib import Path
from models import Cut, Overlay, Correction


@dataclass
class OverlayPlacement:
    """Result of mapping an Overlay from master-original timeline to compose-output timeline."""
    overlay: Overlay
    compose_pos: float       # when the overlay starts in the composed output
    file_path: Path          # absolute path to the overlay's mp4


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


def get_overlays_dir(slug: str) -> Path:
    """Return the directory where overlay mp4s live for a slug."""
    return get_slug_dir(slug) / "overlays"


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
        for cut in cuts:
            if cut.id in status_map:
                s = status_map[cut.id]
                cut.status = s.get("status", "pending")
                cut.adjusted_in = s.get("adjusted_in")
                cut.adjusted_out = s.get("adjusted_out")
                cut.dayner_note = s.get("dayner_note")
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


# --- Overlays ---

def load_overlays(slug: str) -> list[Overlay]:
    """Load overlays.json if present. Missing file = empty list."""
    slug_dir = get_slug_dir(slug)
    path = slug_dir / "overlays.json"
    if not path.exists():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []
    return [Overlay(**item) for item in data]


def save_overlays(slug: str, overlays: list[Overlay]) -> None:
    """Write the full overlays list to overlays.json (replaces existing)."""
    slug_dir = get_slug_dir(slug)
    slug_dir.mkdir(parents=True, exist_ok=True)
    path = slug_dir / "overlays.json"
    path.write_text(
        json.dumps([o.model_dump() for o in overlays], indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


def get_project_info(slug: str) -> dict:
    """Return metadata about what files exist for a slug."""
    slug_dir = get_slug_dir(slug)
    master_path = slug_dir / "master.mp4"
    master = {"file": "master.mp4"} if master_path.exists() else None
    overlays = [o.model_dump() for o in load_overlays(slug)]
    return {
        "slug": slug,
        "master": master,
        "overlays": overlays,
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

    keep: list[tuple[float, float]] = []
    cursor = 0.0
    for r_start, r_end in remove_ranges:
        if r_start > cursor:
            keep.append((cursor, min(r_start, duration)))
        cursor = max(cursor, r_end)
    if cursor < duration:
        keep.append((cursor, duration))

    return [(s, e) for s, e in keep if e - s > 0.01]


def compute_overlay_placements(
    overlays: list[Overlay],
    keep_segments: list[tuple[float, float]],
    overlays_dir: Path,
) -> list[OverlayPlacement]:
    """Map each overlay's timeline_pos (master-original) to compose-output time.

    Rules:
    - Overlay fully inside a kept segment → place at compose_pos = compose_cursor + (ov_start - seg_start)
    - Overlay fully outside all kept segments → skipped
    - Overlay straddling a cut boundary → skipped (MVP limitation)
    """
    placements: list[OverlayPlacement] = []
    compose_cursor = 0.0
    for seg_start, seg_end in keep_segments:
        for ov in overlays:
            ov_dur = ov.time_out - ov.time_in
            if ov_dur <= 0:
                continue
            ov_start = ov.timeline_pos
            ov_end = ov.timeline_pos + ov_dur
            # Must lie entirely within [seg_start, seg_end]
            if ov_start >= seg_start and ov_end <= seg_end:
                compose_pos = compose_cursor + (ov_start - seg_start)
                placements.append(OverlayPlacement(
                    overlay=ov,
                    compose_pos=compose_pos,
                    file_path=overlays_dir / ov.file,
                ))
        compose_cursor += (seg_end - seg_start)
    return placements


def _overlay_position_expr(
    overlay: Overlay, master_w: int, master_h: int
) -> tuple[str, str, str]:
    """Return (scale_expr, x_expr, y_expr) for an overlay given master dimensions.

    Returns filter-graph expressions sized against the master resolution.
    """
    if overlay.position == "fullscreen":
        return (f"scale={master_w}:{master_h}", "0", "0")
    if overlay.position == "custom":
        width_pct = overlay.width_pct if overlay.width_pct is not None else 22.0
        x_pct = overlay.x_pct if overlay.x_pct is not None else 4.0
        y_pct = overlay.y_pct if overlay.y_pct is not None else 4.0
        w_px = max(1, int(master_w * width_pct / 100.0))
        x_px = int(master_w * x_pct / 100.0)
        y_px = int(master_h * y_pct / 100.0)
        return (f"scale={w_px}:-1", str(x_px), str(y_px))
    # default pip: bottom-right 22% wide with 2% margin
    w_px = max(1, int(master_w * 0.22))
    margin = int(master_w * 0.02)
    x_px = master_w - w_px - margin
    y_expr = f"main_h-h-{int(master_h * 0.02)}"
    return (f"scale={w_px}:-1", str(x_px), y_expr)


def build_compose_ffmpeg_args(
    input_path: Path,
    output_path: Path,
    keep_segments: list[tuple[float, float]],
    overlay_placements: list[OverlayPlacement] | None = None,
    master_size: tuple[int, int] = (1920, 1080),
) -> list[str]:
    """Build FFmpeg command that trims master keep_segments, concats them, and overlays any
    provided overlay placements on top of the result.

    - If no cuts AND no overlays: fall back to stream copy (fastest path).
    - Cuts only: filter_complex with trim + concat.
    - Cuts + overlays: filter_complex with trim + concat + N overlay layers.
    """
    overlay_placements = overlay_placements or []

    if not keep_segments and not overlay_placements:
        return [
            "ffmpeg", "-y", "-i", str(input_path),
            "-c", "copy", str(output_path),
        ]

    master_w, master_h = master_size

    # --- Build trim+concat graph for master ---
    parts: list[str] = []
    if keep_segments:
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
        # Master result goes into [mv]/[ma]. If there are no overlays, we'll rename at end.
        parts.append(f"{concat_inputs}concat=n={n}:v=1:a=1[mv][ma]")
    else:
        # No cuts: master untouched, but filter_complex requires a labelled stream.
        parts.append(f"[0:v]copy[mv]")
        parts.append(f"[0:a]anull[ma]")

    # --- Overlay layers ---
    current_video_label = "mv"
    input_args: list[str] = ["-i", str(input_path)]
    for idx, pl in enumerate(overlay_placements):
        input_args += ["-i", str(pl.file_path)]
        ov_idx = idx + 1  # 0 is master
        scale_expr, x_expr, y_expr = _overlay_position_expr(pl.overlay, master_w, master_h)
        ov_dur = pl.overlay.time_out - pl.overlay.time_in
        parts.append(
            f"[{ov_idx}:v]trim=start={pl.overlay.time_in:.3f}:end={pl.overlay.time_out:.3f},"
            f"setpts=PTS-STARTPTS,{scale_expr}[ov{idx}]"
        )
        next_label = f"v_after_ov{idx}"
        parts.append(
            f"[{current_video_label}][ov{idx}]overlay="
            f"x={x_expr}:y={y_expr}:"
            f"enable='between(t,{pl.compose_pos:.3f},{pl.compose_pos + ov_dur:.3f})'"
            f"[{next_label}]"
        )
        current_video_label = next_label

    # Final video label becomes [outv]; audio passes through as [ma]→[outa]
    # Add a no-op rename so the -map labels are always [outv] and [outa]
    parts.append(f"[{current_video_label}]null[outv]")
    parts.append(f"[ma]anull[outa]")

    filter_complex = ";".join(parts)

    return [
        "ffmpeg", "-y",
        *input_args,
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


async def probe_dimensions(path: Path) -> tuple[int, int]:
    """Return (width, height) of the first video stream via ffprobe. (1920, 1080) on failure."""
    import asyncio
    proc = await asyncio.create_subprocess_exec(
        "ffprobe", "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height",
        "-of", "csv=p=0:s=x",
        str(path),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.DEVNULL,
    )
    out, _ = await proc.communicate()
    try:
        w_s, h_s = out.decode().strip().split("x")
        return int(w_s), int(h_s)
    except (ValueError, AttributeError):
        return 1920, 1080


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
