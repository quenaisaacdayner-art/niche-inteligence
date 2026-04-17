"""Pre-flight checks for video-cut skill dependencies."""
import importlib.util
import shutil
import sys


def check_ffmpeg() -> tuple[bool, str]:
    path = shutil.which("ffmpeg")
    if path:
        return True, f"ffmpeg found at {path}"
    return False, "ffmpeg not on PATH. Install from https://ffmpeg.org/download.html"


def check_whisper() -> tuple[bool, str]:
    spec = importlib.util.find_spec("whisper_timestamped")
    if spec is not None:
        return True, "whisper_timestamped importable"
    return False, "whisper_timestamped not installed. Run: pip install whisper-timestamped"


def check_levenshtein() -> tuple[bool, str]:
    spec = importlib.util.find_spec("Levenshtein")
    if spec is not None:
        return True, "python-Levenshtein importable"
    return False, "python-Levenshtein not installed. Run: pip install python-Levenshtein"


def main() -> int:
    checks = [
        ("ffmpeg", check_ffmpeg()),
        ("whisper-timestamped", check_whisper()),
        ("python-Levenshtein", check_levenshtein()),
    ]
    failed = 0
    for name, (ok, msg) in checks:
        status = "OK " if ok else "MISS"
        print(f"[{status}] {name}: {msg}", file=sys.stderr)
        if not ok:
            failed += 1
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
