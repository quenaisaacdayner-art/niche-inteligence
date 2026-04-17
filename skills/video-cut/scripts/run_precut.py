"""Orchestrate pre-edit pipeline: transcribe, load_learning, detect_gaps.

Step 3 (retake_detection) is a Claude inline prompt — the agent invokes it
between this script's completion and opening the MVP Editor.
"""
import argparse
import sys

from . import detect_gaps, load_learning, transcribe


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="video-cut pre-edit pipeline (Python steps)")
    p.add_argument("--slug", required=True)
    args = p.parse_args(argv)
    slug_arg = ["--slug", args.slug]

    code = transcribe.main(slug_arg)
    if code != 0:
        return code

    code = load_learning.main(slug_arg)
    if code != 0:
        return code

    code = detect_gaps.main(slug_arg)
    if code != 0:
        return code

    print("pre-edit pipeline complete. Next: run retake_detection.md (Claude inline).", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
