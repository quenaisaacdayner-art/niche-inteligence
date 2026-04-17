from unittest.mock import patch

from scripts import run_precut


def test_run_precut_invokes_steps_in_order():
    calls: list[str] = []

    def fake_transcribe(argv):
        calls.append(f"transcribe:{argv}")
        return 0

    def fake_load_learning(argv):
        calls.append(f"load_learning:{argv}")
        return 0

    def fake_detect_gaps(argv):
        calls.append(f"detect_gaps:{argv}")
        return 0

    with (
        patch("scripts.transcribe.main", side_effect=fake_transcribe),
        patch("scripts.load_learning.main", side_effect=fake_load_learning),
        patch("scripts.detect_gaps.main", side_effect=fake_detect_gaps),
    ):
        code = run_precut.main(["--slug", "anti-notebook"])

    assert code == 0
    assert calls == [
        "transcribe:['--slug', 'anti-notebook']",
        "load_learning:['--slug', 'anti-notebook']",
        "detect_gaps:['--slug', 'anti-notebook']",
    ]


def test_run_precut_aborts_if_transcribe_fails():
    calls: list[str] = []

    with (
        patch("scripts.transcribe.main", return_value=1),
        patch(
            "scripts.load_learning.main",
            side_effect=lambda _argv: calls.append("learning") or 0,
        ),
        patch(
            "scripts.detect_gaps.main",
            side_effect=lambda _argv: calls.append("gaps") or 0,
        ),
    ):
        code = run_precut.main(["--slug", "x"])

    assert code == 1
    assert calls == []
