from unittest.mock import patch

from scripts import validate_setup


def test_check_ffmpeg_found_when_on_path():
    with patch("shutil.which", return_value="/usr/bin/ffmpeg"):
        ok, msg = validate_setup.check_ffmpeg()
    assert ok is True
    assert "/usr/bin/ffmpeg" in msg


def test_check_ffmpeg_missing_returns_install_hint():
    with patch("shutil.which", return_value=None):
        ok, msg = validate_setup.check_ffmpeg()
    assert ok is False
    assert "ffmpeg" in msg.lower()
    assert "PATH" in msg


def test_check_whisper_installed():
    with patch(
        "importlib.util.find_spec",
        return_value=type("Spec", (), {"name": "whisper_timestamped"})(),
    ):
        ok, msg = validate_setup.check_whisper()
    assert ok is True
    assert "whisper_timestamped" in msg


def test_check_whisper_missing_returns_pip_hint():
    with patch("importlib.util.find_spec", return_value=None):
        ok, msg = validate_setup.check_whisper()
    assert ok is False
    assert "pip install whisper-timestamped" in msg


def test_check_levenshtein_missing_returns_pip_hint():
    with patch("importlib.util.find_spec", return_value=None):
        ok, msg = validate_setup.check_levenshtein()
    assert ok is False
    assert "pip install python-Levenshtein" in msg


def test_main_returns_zero_when_all_ok():
    with (
        patch.object(validate_setup, "check_ffmpeg", return_value=(True, "ok")),
        patch.object(validate_setup, "check_whisper", return_value=(True, "ok")),
        patch.object(validate_setup, "check_levenshtein", return_value=(True, "ok")),
    ):
        code = validate_setup.main()
    assert code == 0


def test_main_returns_one_when_any_missing():
    with (
        patch.object(validate_setup, "check_ffmpeg", return_value=(True, "ok")),
        patch.object(
            validate_setup,
            "check_whisper",
            return_value=(False, "pip install whisper-timestamped"),
        ),
        patch.object(validate_setup, "check_levenshtein", return_value=(True, "ok")),
    ):
        code = validate_setup.main()
    assert code == 1
