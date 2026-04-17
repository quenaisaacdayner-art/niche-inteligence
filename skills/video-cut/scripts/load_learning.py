"""Aggregate memory/video-cut-corrections.jsonl into a learning context JSON."""
import json
import re
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path

from . import config


_NORMALIZE_RE = re.compile(r"[^a-z0-9]+")


def _normalize_reason(reason: str) -> str:
    """Extract first ~4 words and normalize to lowercase underscore-slug."""
    words = reason.strip().lower().split()[:4]
    slug = "_".join(words)
    return _NORMALIZE_RE.sub("_", slug).strip("_")


def rule_key(cut_type: str, reason: str) -> str:
    """Generate rule_key as 'cut_type::normalized_reason'."""
    return f"{cut_type}::{_normalize_reason(reason)}"


def read_jsonl(path: Path) -> list[dict]:
    """Read JSONL file, skip missing/empty/malformed lines."""
    if not path.exists():
        return []
    out: list[dict] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            out.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return out


def group_by_rule(entries: list[dict]) -> dict[str, dict]:
    """Aggregate entries by rule_key, compute samples and approved_rate."""
    agg: dict[str, dict] = defaultdict(lambda: {"samples": 0, "approved": 0, "description": ""})
    for e in entries:
        key = rule_key(e.get("cut_type", ""), e.get("claude_reason", ""))
        agg[key]["samples"] += 1
        if e.get("action") == "approved":
            agg[key]["approved"] += 1
        if not agg[key]["description"]:
            agg[key]["description"] = e.get("claude_reason", "")
    for key, v in agg.items():
        v["approved_rate"] = round(v["approved"] / v["samples"], 4) if v["samples"] else 0.0
    return dict(agg)


def build_context(jsonl_path: Path) -> dict:
    """Build learning context: classify rules as applied/disabled/neutral."""
    entries = read_jsonl(jsonl_path)
    groups = group_by_rule(entries)
    applied: list[dict] = []
    disabled: list[dict] = []
    neutral: list[dict] = []
    for key, v in groups.items():
        if v["samples"] < config.LEARNING_MIN_SAMPLES:
            continue
        rule = {
            "rule_key": key,
            "samples": v["samples"],
            "approved_rate": v["approved_rate"],
            "description": v["description"],
        }
        if v["approved_rate"] >= config.LEARNING_APPROVED_THRESHOLD:
            applied.append(rule)
        elif v["approved_rate"] <= config.LEARNING_DISABLED_THRESHOLD:
            disabled.append(rule)
        else:
            neutral.append(rule)
    return {
        "applied_rules": applied,
        "disabled_rules": disabled,
        "neutral_rules": neutral,
        "total_samples": len(entries),
        "min_samples_for_rule": config.LEARNING_MIN_SAMPLES,
        "generated_at": datetime.now().isoformat(timespec="seconds"),
    }


def write_context(jsonl_path: Path, out_path: Path) -> None:
    """Write learning context JSON to disk."""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    ctx = build_context(jsonl_path)
    out_path.write_text(json.dumps(ctx, indent=2, ensure_ascii=False), encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    """CLI: build learning_context.json from corrections jsonl."""
    import argparse

    p = argparse.ArgumentParser(description="Build learning_context.json from corrections jsonl")
    p.add_argument("--slug", required=True, help="Video slug")
    args = p.parse_args(argv)
    out = config.processed_path(args.slug) / "learning_context.json"
    write_context(config.corrections_jsonl_path(), out)
    ctx = json.loads(out.read_text())
    print(
        f"learning: {len(ctx['applied_rules'])} applied, "
        f"{len(ctx['disabled_rules'])} disabled, "
        f"{len(ctx['neutral_rules'])} neutral "
        f"(total samples: {ctx['total_samples']})",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
