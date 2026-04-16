"""Tests for compose helpers: merge_ranges, compute_keep_segments, build_compose_ffmpeg_args, compute_overlay_placements."""
import pytest
from pathlib import Path

from services import (
    merge_ranges,
    compute_keep_segments,
    build_compose_ffmpeg_args,
    compute_overlay_placements,
    OverlayPlacement,
)
from models import Cut, Overlay


def make_cut(
    id: str,
    time_in: float,
    time_out: float,
    status: str = "pending",
    adjusted_in: float | None = None,
    adjusted_out: float | None = None,
    cut_type: str = "retake",
) -> Cut:
    return Cut(
        id=id,
        cut_type=cut_type,
        time_in=time_in,
        time_out=time_out,
        reason="test",
        confidence=1.0,
        status=status,
        adjusted_in=adjusted_in,
        adjusted_out=adjusted_out,
    )


def make_overlay(
    id: str,
    timeline_pos: float,
    duration: float,
    time_in: float = 0.0,
    track: int = 2,
    position: str = "pip",
) -> Overlay:
    return Overlay(
        id=id,
        file=f"{id}.mp4",
        track=track,
        timeline_pos=timeline_pos,
        time_in=time_in,
        time_out=time_in + duration,
        position=position,
    )


# --- merge_ranges ---

def test_merge_ranges_empty():
    assert merge_ranges([]) == []


def test_merge_ranges_non_overlapping():
    r = [(0, 2), (5, 8), (10, 12)]
    assert merge_ranges(r) == r


def test_merge_ranges_overlapping():
    r = [(0, 5), (3, 8), (6, 10)]
    assert merge_ranges(r) == [(0, 10)]


def test_merge_ranges_adjacent():
    r = [(0, 5), (5, 10)]
    assert merge_ranges(r) == [(0, 10)]


def test_merge_ranges_unsorted():
    r = [(10, 15), (0, 3), (5, 8)]
    assert merge_ranges(r) == [(0, 3), (5, 8), (10, 15)]


# --- compute_keep_segments ---

def test_compute_keep_segments_no_cuts():
    keep = compute_keep_segments([], 60.0)
    assert keep == [(0.0, 60.0)]


def test_compute_keep_segments_no_approved():
    cuts = [make_cut("a", 5, 10, status="pending")]
    keep = compute_keep_segments(cuts, 60.0)
    assert keep == [(0.0, 60.0)]


def test_compute_keep_segments_single_approved():
    cuts = [make_cut("a", 5, 10, status="approved")]
    keep = compute_keep_segments(cuts, 60.0)
    assert keep == [(0.0, 5.0), (10.0, 60.0)]


def test_compute_keep_segments_multiple_approved():
    cuts = [
        make_cut("a", 5, 10, status="approved"),
        make_cut("b", 20, 25, status="approved"),
    ]
    keep = compute_keep_segments(cuts, 60.0)
    assert keep == [(0.0, 5.0), (10.0, 20.0), (25.0, 60.0)]


def test_compute_keep_segments_uses_adjusted():
    cuts = [make_cut("a", 5, 10, status="adjusted", adjusted_in=6, adjusted_out=9)]
    keep = compute_keep_segments(cuts, 60.0)
    assert keep == [(0.0, 6.0), (9.0, 60.0)]


def test_compute_keep_segments_at_start():
    cuts = [make_cut("a", 0, 5, status="approved")]
    keep = compute_keep_segments(cuts, 60.0)
    assert keep == [(5.0, 60.0)]


def test_compute_keep_segments_at_end():
    cuts = [make_cut("a", 55, 60, status="approved")]
    keep = compute_keep_segments(cuts, 60.0)
    assert keep == [(0.0, 55.0)]


def test_compute_keep_segments_overlapping_cuts():
    cuts = [
        make_cut("a", 5, 10, status="approved"),
        make_cut("b", 8, 15, status="approved"),
    ]
    keep = compute_keep_segments(cuts, 60.0)
    assert keep == [(0.0, 5.0), (15.0, 60.0)]


def test_compute_keep_segments_rejects_ignored():
    cuts = [
        make_cut("a", 5, 10, status="approved"),
        make_cut("b", 20, 25, status="rejected"),
    ]
    keep = compute_keep_segments(cuts, 60.0)
    # rejected cut should not be removed
    assert keep == [(0.0, 5.0), (10.0, 60.0)]


# --- build_compose_ffmpeg_args ---

def test_build_compose_no_cuts_uses_copy(tmp_path: Path):
    input_path = tmp_path / "in.mp4"
    output_path = tmp_path / "out.mp4"
    args = build_compose_ffmpeg_args(input_path, output_path, [])
    assert args[0] == "ffmpeg"
    assert "-c" in args and "copy" in args
    assert str(input_path) in args
    assert str(output_path) in args


def test_build_compose_with_cuts_uses_filter_complex(tmp_path: Path):
    input_path = tmp_path / "in.mp4"
    output_path = tmp_path / "out.mp4"
    keep = [(0.0, 5.0), (10.0, 20.0)]
    args = build_compose_ffmpeg_args(input_path, output_path, keep)
    assert args[0] == "ffmpeg"
    assert "-filter_complex" in args
    idx = args.index("-filter_complex")
    fc = args[idx + 1]
    assert "trim=start=0.000:end=5.000" in fc
    assert "trim=start=10.000:end=20.000" in fc
    assert "concat=n=2:v=1:a=1" in fc
    assert "-map" in args
    assert "[outv]" in args
    assert "[outa]" in args


def test_build_compose_single_segment(tmp_path: Path):
    input_path = tmp_path / "in.mp4"
    output_path = tmp_path / "out.mp4"
    args = build_compose_ffmpeg_args(input_path, output_path, [(0.0, 10.0)])
    idx = args.index("-filter_complex")
    fc = args[idx + 1]
    assert "concat=n=1:v=1:a=1" in fc


# --- compute_overlay_placements ---

def test_placements_no_cuts_single_overlay(tmp_path: Path):
    overlays = [make_overlay("a", timeline_pos=5.0, duration=3.0)]
    keep = [(0.0, 60.0)]
    placements = compute_overlay_placements(overlays, keep, tmp_path / "overlays")
    assert len(placements) == 1
    assert placements[0].compose_pos == pytest.approx(5.0)
    assert placements[0].overlay.id == "a"


def test_placements_cuts_shift_overlays(tmp_path: Path):
    """Cut [2, 4] → keep=[(0,2),(4,60)]. Overlay at 10s original → compose_pos = 2 + (10 - 4) = 8s."""
    overlays = [make_overlay("a", timeline_pos=10.0, duration=3.0)]
    keep = [(0.0, 2.0), (4.0, 60.0)]
    placements = compute_overlay_placements(overlays, keep, tmp_path / "overlays")
    assert len(placements) == 1
    assert placements[0].compose_pos == pytest.approx(8.0)


def test_placements_overlay_inside_cut_dropped(tmp_path: Path):
    """Overlay fully inside a cut region → dropped."""
    overlays = [make_overlay("a", timeline_pos=3.0, duration=1.0)]  # 3-4
    keep = [(0.0, 2.0), (5.0, 60.0)]  # cut is 2-5
    placements = compute_overlay_placements(overlays, keep, tmp_path / "overlays")
    assert placements == []


def test_placements_overlay_straddle_boundary_dropped(tmp_path: Path):
    """Overlay straddling a cut boundary → dropped (MVP limitation)."""
    overlays = [make_overlay("a", timeline_pos=1.0, duration=3.0)]  # 1-4
    keep = [(0.0, 2.0), (5.0, 60.0)]  # cut 2-5
    placements = compute_overlay_placements(overlays, keep, tmp_path / "overlays")
    assert placements == []


def test_placements_multiple_overlays_multiple_keeps(tmp_path: Path):
    overlays = [
        make_overlay("a", timeline_pos=1.0, duration=0.5),   # in keep 1
        make_overlay("b", timeline_pos=30.0, duration=2.0),  # in keep 2
        make_overlay("c", timeline_pos=3.5, duration=1.0),   # in cut region (dropped)
    ]
    keep = [(0.0, 2.0), (5.0, 60.0)]
    placements = compute_overlay_placements(overlays, keep, tmp_path / "overlays")
    ids = [p.overlay.id for p in placements]
    assert sorted(ids) == ["a", "b"]


def test_placements_file_path_uses_overlays_dir(tmp_path: Path):
    overlays = [make_overlay("broll", timeline_pos=0.0, duration=1.0)]
    overlays_dir = tmp_path / "custom_dir"
    placements = compute_overlay_placements(overlays, [(0.0, 60.0)], overlays_dir)
    assert placements[0].file_path == overlays_dir / "broll.mp4"


# --- build_compose with overlays ---

def test_build_compose_with_overlays_adds_inputs(tmp_path: Path):
    master = tmp_path / "master.mp4"
    out = tmp_path / "out.mp4"
    ov_path = tmp_path / "overlays" / "broll.mp4"
    overlay = make_overlay("a", timeline_pos=5.0, duration=3.0)
    placement = OverlayPlacement(overlay=overlay, compose_pos=5.0, file_path=ov_path)

    args = build_compose_ffmpeg_args(
        master, out, [(0.0, 60.0)], overlay_placements=[placement], master_size=(1920, 1080)
    )

    # Two -i inputs: master + overlay
    input_count = sum(1 for a in args if a == "-i")
    assert input_count == 2
    assert str(ov_path) in args

    idx = args.index("-filter_complex")
    fc = args[idx + 1]
    assert "overlay=" in fc
    assert "enable='between(t,5.000,8.000)'" in fc
    # Overlay trim+setpts
    assert "[1:v]trim=start=0.000:end=3.000" in fc


def test_build_compose_with_overlays_no_cuts(tmp_path: Path):
    """No cuts but has overlays — should still use filter_complex, not copy."""
    master = tmp_path / "master.mp4"
    out = tmp_path / "out.mp4"
    overlay = make_overlay("a", timeline_pos=2.0, duration=1.0)
    placement = OverlayPlacement(
        overlay=overlay, compose_pos=2.0, file_path=tmp_path / "a.mp4"
    )
    args = build_compose_ffmpeg_args(
        master, out, [], overlay_placements=[placement]
    )
    assert "-filter_complex" in args
    # Should NOT use stream copy
    assert not (args[-3:-2] == ["-c"] and args[-2:-1] == ["copy"])


def test_build_compose_pip_position_uses_bottom_right(tmp_path: Path):
    master = tmp_path / "master.mp4"
    out = tmp_path / "out.mp4"
    overlay = make_overlay("a", timeline_pos=0.0, duration=1.0, position="pip")
    placement = OverlayPlacement(overlay=overlay, compose_pos=0.0, file_path=tmp_path / "a.mp4")
    args = build_compose_ffmpeg_args(
        master, out, [(0.0, 10.0)], overlay_placements=[placement], master_size=(1920, 1080)
    )
    idx = args.index("-filter_complex")
    fc = args[idx + 1]
    # pip = 22% wide scale, bottom-right position
    assert "scale=422:-1" in fc  # 1920 * 0.22 = 422
    # x_px = 1920 - 422 - 38 = 1460
    assert "x=1460" in fc


def test_build_compose_fullscreen_position(tmp_path: Path):
    master = tmp_path / "master.mp4"
    out = tmp_path / "out.mp4"
    overlay = make_overlay("a", timeline_pos=0.0, duration=1.0, position="fullscreen")
    placement = OverlayPlacement(overlay=overlay, compose_pos=0.0, file_path=tmp_path / "a.mp4")
    args = build_compose_ffmpeg_args(
        master, out, [(0.0, 10.0)], overlay_placements=[placement], master_size=(1920, 1080)
    )
    idx = args.index("-filter_complex")
    fc = args[idx + 1]
    assert "scale=1920:1080" in fc
    assert "x=0:y=0" in fc
