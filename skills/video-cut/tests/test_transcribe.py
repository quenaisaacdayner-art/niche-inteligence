import json
from unittest.mock import MagicMock, patch

from scripts import transcribe


def test_transcribe_uses_configured_model_and_device():
    fake_model = MagicMock()
    fake_result = {
        "text": "ola mundo",
        "segments": [
            {
                "start": 0.0,
                "end": 1.0,
                "text": "ola mundo",
                "words": [
                    {"word": "ola", "start": 0.0, "end": 0.5, "confidence": 0.9},
                    {"word": "mundo", "start": 0.5, "end": 1.0, "confidence": 0.95},
                ],
            }
        ],
    }
    with (
        patch.object(transcribe, "_load_audio", return_value="AUDIO"),
        patch.object(transcribe, "_load_model", return_value=fake_model) as load_model,
        patch.object(transcribe, "_transcribe_call", return_value=fake_result) as run_call,
    ):
        out = transcribe.transcribe_audio("/tmp/master.mp4")

    load_model.assert_called_once_with("medium", device="cpu")
    run_call.assert_called_once_with(fake_model, "AUDIO")
    assert out == fake_result


def test_transcribe_writes_json(tmp_path):
    out_path = tmp_path / "transcripts" / "master.words.json"
    data = {"text": "ola", "segments": []}
    transcribe.write_transcript(data, out_path)
    loaded = json.loads(out_path.read_text(encoding="utf-8"))
    assert loaded == data


def test_main_exits_1_when_master_missing(tmp_path, monkeypatch):
    from scripts import config as cfg

    monkeypatch.setattr(cfg, "PROJECT_ROOT", tmp_path)
    code = transcribe.main(["--slug", "missing-video"])
    assert code == 1
