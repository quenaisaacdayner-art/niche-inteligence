"""Detect silences >= 3s in a video file via ffmpeg silencedetect."""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

from . import config


_START_RE = re.compile(r"silence_start:\s+(-?\d+(?:\.\d+)?)")
_END_RE = re.compile(
    r"silence_end:\s+(-?\d+(?:\.\d+)?)\s*\|\s*silence_duration:\s+(-?\d+(?:\.\d+)?)"
)


def build_ffmpeg_command(master_path: str) -> list[str]:
    af = f"silencedetect=n={int(config.SILENCE_THRESHOLD_DB)}dB:d={int(config.SILENCE_MIN_DURATION_SEC)}"
    return [
        "ffmpeg",
        "-nostdin",
        "-hide_banner",
        "-i",
        master_path,
        "-af",
        af,
        "-f",
        "null",
        "-",
    ]


def parse_silencedetect_output(stderr_text: str) -> list[dict]:
    pending_start: float | None = None
    gaps: list[dict] = []
    for line in stderr_text.splitlines():
        m_start = _START_RE.search(line)
        if m_start:
            pending_start = float(m_start.group(1))
            continue
        m_end = _END_RE.search(line)
        if m_end and pending_start is not None:
            end = float(m_end.group(1))
            duration = float(m_end.group(2))
            gaps.append(
                {
                    "in": pending_start,
                    "out": end,
                    "type": "silence",
                    "duration": duration,
                }
            )
            pending_start = None
    return gaps


def run_detect_gaps(master_path: str) -> list[dict]:
    cmd = build_ffmpeg_command(master_path)
    proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
    return parse_silencedetect_output(proc.stderr)


def write_gaps(gaps: list[dict], out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(gaps, indent=2), encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="Detect silences >=3s in master.mp4")
    p.add_argument("--slug", required=True)
    args = p.parse_args(argv)
    master = config.master_file(args.slug)
    if not master.exists():
        print(f"ERROR: master.mp4 not found at {master}", file=sys.stderr)
        return 1
    gaps = run_detect_gaps(str(master))
    out = config.processed_path(args.slug) / "gaps.json"
    write_gaps(gaps, out)
    print(f"detect_gaps: {len(gaps)} silences >= {config.SILENCE_MIN_DURATION_SEC}s -> {out}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
