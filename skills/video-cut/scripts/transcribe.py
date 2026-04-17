"""Transcribe master.mp4 via whisper-timestamped, emitting word-level JSON."""
import argparse
import json
import sys
from pathlib import Path

from . import config


def _load_audio(path: str):
    import whisper_timestamped as whisper

    return whisper.load_audio(path)


def _load_model(name: str, device: str):
    import whisper_timestamped as whisper

    return whisper.load_model(name, device=device)


def _transcribe_call(model, audio) -> dict:
    import whisper_timestamped as whisper

    return whisper.transcribe(model, audio, vad="auto", language="pt")


def transcribe_audio(master_path: str) -> dict:
    audio = _load_audio(master_path)
    model = _load_model(config.WHISPER_MODEL, device=config.WHISPER_DEVICE)
    return _transcribe_call(model, audio)


def write_transcript(data: dict, out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="Transcribe master.mp4 via whisper-timestamped")
    p.add_argument("--slug", required=True)
    args = p.parse_args(argv)

    master = config.master_file(args.slug)
    if not master.exists():
        print(f"ERROR: master.mp4 not found at {master}", file=sys.stderr)
        print(
            "Debug command: ffmpeg -i <master.mp4> -ar 16000 /tmp/test.wav",
            file=sys.stderr,
        )
        return 1

    print(
        f"transcribe: running whisper {config.WHISPER_MODEL} on {master.name} (CPU). "
        f"Expect ~2x realtime.",
        file=sys.stderr,
    )

    try:
        result = transcribe_audio(str(master))
    except Exception as e:
        print(f"ERROR: whisper crashed: {e}", file=sys.stderr)
        print(
            "Debug command: ffmpeg -i <master.mp4> -ar 16000 /tmp/test.wav "
            "(check audio is valid, mono 16kHz)",
            file=sys.stderr,
        )
        return 1

    out = config.transcript_path(args.slug)
    write_transcript(result, out)

    word_count = sum(len(s.get("words", [])) for s in result.get("segments", []))
    confs = [w.get("confidence", 0.0) for s in result.get("segments", []) for w in s.get("words", [])]
    avg_conf = sum(confs) / len(confs) if confs else 0.0
    print(
        f"transcribe: {word_count} words, avg confidence {avg_conf:.2f} -> {out}",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
