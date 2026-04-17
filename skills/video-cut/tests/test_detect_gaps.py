from unittest.mock import MagicMock, patch

from scripts import detect_gaps


SAMPLE_STDERR = """
[silencedetect @ 0x7f8a] silence_start: 8.04
[silencedetect @ 0x7f8a] silence_end: 11.56 | silence_duration: 3.52
[silencedetect @ 0x7f8a] silence_start: 18.0
[silencedetect @ 0x7f8a] silence_end: 22.1 | silence_duration: 4.1
[silencedetect @ 0x7f8a] silence_start: 100.2
"""


def test_parse_silencedetect_extracts_completed_ranges():
    gaps = detect_gaps.parse_silencedetect_output(SAMPLE_STDERR)
    assert len(gaps) == 2
    assert gaps[0] == {"in": 8.04, "out": 11.56, "type": "silence", "duration": 3.52}
    assert gaps[1] == {"in": 18.0, "out": 22.1, "type": "silence", "duration": 4.1}


def test_parse_silencedetect_ignores_unclosed_silence():
    text = """
[silencedetect @ 0x1] silence_start: 5.0
"""
    assert detect_gaps.parse_silencedetect_output(text) == []


def test_parse_silencedetect_empty_input():
    assert detect_gaps.parse_silencedetect_output("") == []


def test_build_ffmpeg_command_includes_threshold_and_duration():
    cmd = detect_gaps.build_ffmpeg_command("/tmp/master.mp4")
    assert "ffmpeg" in cmd[0]
    assert "-i" in cmd
    assert "/tmp/master.mp4" in cmd
    af_index = cmd.index("-af")
    af_value = cmd[af_index + 1]
    assert "silencedetect" in af_value
    assert "n=-30dB" in af_value
    assert "d=3" in af_value


def test_run_detect_gaps_invokes_ffmpeg_and_returns_parsed():
    mock_proc = MagicMock()
    mock_proc.stderr = SAMPLE_STDERR
    mock_proc.returncode = 0
    with patch("subprocess.run", return_value=mock_proc):
        gaps = detect_gaps.run_detect_gaps("/tmp/master.mp4")
    assert len(gaps) == 2
    assert gaps[0]["type"] == "silence"


def test_write_gaps_emits_json_array(tmp_path):
    gaps = [{"in": 1.0, "out": 4.5, "type": "silence", "duration": 3.5}]
    out = tmp_path / "gaps.json"
    detect_gaps.write_gaps(gaps, out)
    import json
    assert json.loads(out.read_text()) == gaps
