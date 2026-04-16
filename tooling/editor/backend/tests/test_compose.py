"""Tests for compose helpers: merge_ranges, compute_keep_segments, build_compose_ffmpeg_args."""
import pytest
from pathlib import Path

from services import merge_ranges, compute_keep_segments, build_compose_ffmpeg_args
from models import Cut


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
