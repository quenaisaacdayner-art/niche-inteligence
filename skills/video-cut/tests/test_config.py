from pathlib import Path

from scripts import config


def test_project_root_resolves_to_niche_intelligence():
    root = config.PROJECT_ROOT
    assert root.is_dir()
    assert (root / "CLAUDE.md").is_file()
    assert (root / "skills").is_dir()


def test_raw_path_for_slug():
    p = config.raw_path("anti-notebook")
    assert p == config.PROJECT_ROOT / "data" / "video-raw" / "anti-notebook"


def test_processed_path_for_slug():
    p = config.processed_path("anti-notebook")
    assert p == config.PROJECT_ROOT / "data" / "video-processed" / "anti-notebook"


def test_master_file_path():
    p = config.master_file("anti-notebook")
    assert p == config.PROJECT_ROOT / "data" / "video-raw" / "anti-notebook" / "master.mp4"


def test_transcript_path():
    p = config.transcript_path("anti-notebook")
    assert p.name == "master.words.json"
    assert p.parent.name == "transcripts"


def test_corrections_jsonl_path():
    p = config.corrections_jsonl_path()
    assert p == config.PROJECT_ROOT / "memory" / "video-cut-corrections.jsonl"


def test_script_path_uses_output_dir():
    p = config.script_path("anti-notebook")
    assert p == config.PROJECT_ROOT / "output" / "scripts" / "anti-notebook.md"


def test_silence_threshold_constants():
    assert config.SILENCE_THRESHOLD_DB == -30.0
    assert config.SILENCE_MIN_DURATION_SEC == 3.0


def test_learning_constants():
    assert config.LEARNING_MIN_SAMPLES == 5
    assert config.LEARNING_APPROVED_THRESHOLD == 0.80
    assert config.LEARNING_DISABLED_THRESHOLD == 0.30


def test_fuzzy_constants():
    assert config.FUZZY_MATCH_MIN_RATIO == 0.80
    assert config.FUZZY_ANCHOR_WORDS == 5


def test_whisper_constants():
    assert config.WHISPER_MODEL == "medium"
    assert config.WHISPER_DEVICE == "cpu"
    assert config.WHISPER_MIN_WORD_CONFIDENCE == 0.3


def test_filler_threshold():
    assert config.FILLER_MIN_CONFIDENCE == 0.85


def test_invariant_tolerance():
    assert config.DURATION_INVARIANT_TOLERANCE_SEC == 0.1
