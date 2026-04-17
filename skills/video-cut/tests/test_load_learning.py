import json
from pathlib import Path

from scripts import load_learning

FIXTURE = Path(__file__).parent / "fixtures" / "sample_corrections.jsonl"


def test_rule_key_normalizes_reason_to_first_words():
    assert load_learning.rule_key("filler", "filler 'tipo' meio-frase") == "filler::filler_tipo_meio_frase"
    assert load_learning.rule_key("gap", "silence 3.0s") == "gap::silence_3_0s"


def test_aggregate_counts_samples_per_rule():
    entries = load_learning.read_jsonl(FIXTURE)
    groups = load_learning.group_by_rule(entries)
    assert groups["filler::filler_tipo_meio_frase"]["samples"] == 5
    assert groups["gap::silence_3_0s"]["samples"] == 5


def test_aggregate_computes_approved_rate():
    entries = load_learning.read_jsonl(FIXTURE)
    groups = load_learning.group_by_rule(entries)
    assert groups["filler::filler_tipo_meio_frase"]["approved"] == 4
    assert groups["filler::filler_tipo_meio_frase"]["approved_rate"] == 0.8
    assert groups["gap::silence_3_0s"]["approved"] == 1
    assert groups["gap::silence_3_0s"]["approved_rate"] == 0.2


def test_build_context_classifies_applied_vs_disabled():
    ctx = load_learning.build_context(FIXTURE)
    applied_keys = [r["rule_key"] for r in ctx["applied_rules"]]
    disabled_keys = [r["rule_key"] for r in ctx["disabled_rules"]]
    assert "filler::filler_tipo_meio_frase" in applied_keys
    assert "gap::silence_3_0s" in disabled_keys


def test_build_context_min_samples_gate():
    ctx = load_learning.build_context(FIXTURE)
    total = len(ctx["applied_rules"]) + len(ctx["disabled_rules"]) + len(ctx["neutral_rules"])
    assert total == 2


def test_build_context_handles_missing_file(tmp_path):
    ghost = tmp_path / "nope.jsonl"
    ctx = load_learning.build_context(ghost)
    assert ctx["total_samples"] == 0
    assert ctx["applied_rules"] == []
    assert ctx["disabled_rules"] == []
    assert ctx["neutral_rules"] == []


def test_build_context_handles_empty_file(tmp_path):
    empty = tmp_path / "empty.jsonl"
    empty.write_text("")
    ctx = load_learning.build_context(empty)
    assert ctx["total_samples"] == 0


def test_neutral_when_rate_between_disabled_and_applied(tmp_path):
    jsonl = tmp_path / "neutral.jsonl"
    rows = [
        {"cut_type": "retake", "claude_reason": "repeated bem", "action": "approved"},
        {"cut_type": "retake", "claude_reason": "repeated bem", "action": "approved"},
        {"cut_type": "retake", "claude_reason": "repeated bem", "action": "approved"},
        {"cut_type": "retake", "claude_reason": "repeated bem", "action": "rejected"},
        {"cut_type": "retake", "claude_reason": "repeated bem", "action": "rejected"},
    ]
    jsonl.write_text("\n".join(json.dumps(r) for r in rows))
    ctx = load_learning.build_context(jsonl)
    assert len(ctx["applied_rules"]) == 0
    assert len(ctx["disabled_rules"]) == 0
    assert len(ctx["neutral_rules"]) == 1
    assert ctx["neutral_rules"][0]["approved_rate"] == 0.6


def test_rules_below_min_samples_excluded(tmp_path):
    jsonl = tmp_path / "few.jsonl"
    rows = [
        {"cut_type": "retake", "claude_reason": "repeated x", "action": "approved"}
        for _ in range(4)
    ]
    jsonl.write_text("\n".join(json.dumps(r) for r in rows))
    ctx = load_learning.build_context(jsonl)
    assert len(ctx["applied_rules"]) == 0
    assert len(ctx["disabled_rules"]) == 0
    assert len(ctx["neutral_rules"]) == 0
    assert ctx["total_samples"] == 4


def test_write_context_emits_valid_json(tmp_path):
    out = tmp_path / "learning_context.json"
    load_learning.write_context(FIXTURE, out)
    data = json.loads(out.read_text())
    assert "applied_rules" in data
    assert "disabled_rules" in data
    assert "neutral_rules" in data
    assert "total_samples" in data
    assert "min_samples_for_rule" in data
    assert "generated_at" in data
