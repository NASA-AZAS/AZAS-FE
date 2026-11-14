"""Synthetic counter fixtures; never run extra LLM tasks for measurement tests."""
import copy
import datetime as dt
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts/hackathon"))
from usage import difference, read_session, snapshot
from bench import report


def event(total, cached=20, output=10):
    return {"type": "event_msg", "timestamp": "2026-11-13T10:00:00Z",
            "payload": {"type": "token_count", "info": {"total_token_usage": {
                "input_tokens": total-output, "cached_input_tokens": cached,
                "output_tokens": output, "reasoning_output_tokens": 3,
                "total_tokens": total}}}}


def write_log(path, sid="root", parent=None, project=ROOT, totals=(100,), source="vscode", created=None):
    rows = [{"type": "session_meta", "timestamp": created or "2026-11-13T09:00:00Z",
             "payload": {"id": sid, "cwd": str(project), "parent_thread_id": parent, "source": source}},
            {"type": "response_item", "payload": {"type": "message", "content": "PRIVATE_TRANSCRIPT"}},
            {"type": "turn_context", "payload": {"model": "test-model", "effort": "low"}}]
    rows += [event(total) for total in totals]
    path.write_text("\n".join(json.dumps(r) for r in rows) + "\n")


class MetricsTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.directory = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def test_latest_cumulative_not_sum_and_partial_line(self):
        path = self.directory / "root.jsonl"
        write_log(path, totals=(100, 100, 150))
        with path.open("a") as f:
            f.write('{"type":"event_msg", "payload":')
        record = read_session(path)
        self.assertEqual(record["usage"]["total_tokens"], 150)
        self.assertNotIn("PRIVATE_TRANSCRIPT", json.dumps(record))

    def test_delta_does_not_double_count_cache_or_reasoning(self):
        path = self.directory / "root.jsonl"
        write_log(path, totals=(100,))
        before = snapshot(ROOT, "root", self.directory)
        with path.open("a") as f:
            f.write(json.dumps(event(150, cached=40, output=20)) + "\n")
        after = snapshot(ROOT, "root", self.directory)
        values = difference(before, after)[0]["usage"]
        self.assertEqual(values["total_tokens"], 50)
        self.assertEqual(values["input_tokens"], 40)
        self.assertEqual(values["output_tokens"], 10)
        self.assertEqual(values["cached_input_tokens"], 20)
        self.assertEqual(values["reasoning_output_tokens"], 0)
        self.assertIsNone(values["cache_write_input_tokens"])

    def test_only_root_descendants_and_system_separation(self):
        write_log(self.directory / "a.jsonl")
        write_log(self.directory / "b.jsonl", sid="unrelated")
        write_log(self.directory / "c.jsonl", sid="other-project", project=self.directory)
        before = snapshot(ROOT, "root", self.directory)
        born = (dt.datetime.now(dt.timezone.utc) + dt.timedelta(seconds=1)).isoformat()
        write_log(self.directory / "d.jsonl", sid="worker", parent="root", created=born)
        write_log(self.directory / "e.jsonl", sid="system", parent="root", created=born,
                  source={"subagent": {"other": "guardian"}})
        rows = difference(before, snapshot(ROOT, "root", self.directory))
        self.assertEqual({r["id"] for r in rows}, {"root", "worker", "system"})
        self.assertEqual({r["role"] for r in rows}, {"main", "subagent", "system"})
        self.assertEqual(next(r for r in rows if r["id"] == "worker")["usage"]["total_tokens"], 100)

    def test_missing_root_baseline_never_assumes_zero(self):
        before = snapshot(ROOT, "root", self.directory)
        write_log(self.directory / "a.jsonl")
        rows = difference(before, snapshot(ROOT, "root", self.directory))
        self.assertIsNone(rows[0]["usage"]["total_tokens"])
        self.assertTrue(snapshot(ROOT, None, self.directory)["warning"])
        self.assertTrue(snapshot(self.directory, "root", self.directory)["warning"])

    def test_missing_usage_reset_and_deleted_log_are_unknown(self):
        path = self.directory / "root.jsonl"
        write_log(path, totals=())
        missing = snapshot(ROOT, "root", self.directory)
        write_log(path, totals=(100,))
        before = snapshot(ROOT, "root", self.directory)
        self.assertIsNone(difference(missing, before)[0]["usage"]["total_tokens"])
        with path.open("a") as f:
            f.write(json.dumps(event(5, cached=0, output=2)) + "\n" + json.dumps(event(150)) + "\n")
        after = snapshot(ROOT, "root", self.directory)
        self.assertIsNone(difference(before, after)[0]["usage"]["total_tokens"])
        path.unlink()
        self.assertIsNone(difference(before, snapshot(ROOT, "root", self.directory))[0]["usage"]["total_tokens"])

    def test_report_requires_accepted_matching_pair_and_preserves_negative(self):
        target = self.directory / "report.md"
        base = dict(id="b", title="task", variant="baseline", status="done", seconds=10,
                    rework=0, pair="case", spec="same", accepted=True,
                    delta=[{"role": "main", "usage": {"total_tokens": 100}}])
        changed = copy.deepcopy(base)
        changed.update(id="h", variant="harness", seconds=20, accepted=False)
        report([base, changed], target)
        self.assertNotIn("감소율", target.read_text())
        changed["accepted"] = True
        changed["delta"][0]["usage"]["total_tokens"] = 150
        report([base, changed], target)
        self.assertIn("-100.0%", target.read_text())
        self.assertIn("-50.0%", target.read_text())
        changed["spec"] = "different"
        report([base, changed], target)
        self.assertNotIn("감소율", target.read_text())

    def test_cli_lifecycle_duplicates_and_no_data_report(self):
        def cli(*args):
            return subprocess.run([sys.executable, str(ROOT / "scripts/hackathon/bench.py"),
                                   "--data-dir", str(self.directory), *args],
                                  capture_output=True, text=True)
        self.assertEqual(cli("report").returncode, 0)
        self.assertIn("측정 안 됨", (self.directory / "report.md").read_text())
        self.assertEqual(cli("start", "test", "fixture", "--session", "nonexistent-test-id").returncode, 0)
        self.assertNotEqual(cli("start", "test2", "overlap").returncode, 0)
        self.assertNotEqual(cli("end", "wrong-id").returncode, 0)
        self.assertNotEqual(cli("end", "test", "--rework", "-1").returncode, 0)
        self.assertEqual(cli("end", "test").returncode, 0)
        self.assertNotEqual(cli("end", "test").returncode, 0)
        self.assertNotEqual(cli("start", "test", "duplicate").returncode, 0)
        self.assertEqual(cli("accept", "test").returncode, 0)
        self.assertEqual(cli("report").returncode, 0)


if __name__ == "__main__":
    unittest.main()
