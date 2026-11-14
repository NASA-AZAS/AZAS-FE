"""Read local Codex numeric metadata only. No network or transcript export.

Rollout JSONL is an internal format: unknown/missing counters remain unavailable.
Cumulative snapshots are differenced, never summed over token_count events.
"""
import json
import os
import datetime as dt
from pathlib import Path

FIELDS = ("input_tokens", "cached_input_tokens", "cache_write_input_tokens",
          "output_tokens", "reasoning_output_tokens", "total_tokens")


def sessions_dir():
    return Path(os.environ.get("CODEX_HOME", str(Path.home() / ".codex"))) / "sessions"


def read_session(path):
    meta = None
    usage = None
    observed_at = None
    models = set()
    calls = set()
    resets = 0
    with Path(path).open(encoding="utf-8") as stream:
        for line in stream:
            # Avoid parsing message text or tool arguments. A partial final line
            # is normal while Codex is appending to the file.
            if not any(tag in line for tag in ('"session_meta"', '"turn_context"',
                                               '"token_count"', '"function_call"',
                                               '"custom_tool_call"')):
                continue
            try:
                row = json.loads(line)
            except ValueError:
                continue
            payload = row.get("payload") or {}
            kind = row.get("type")
            if kind == "session_meta":
                meta = {key: payload.get(key) for key in
                        ("id", "cwd", "parent_thread_id", "source", "forked_from_id")}
                meta["created_at"] = row.get("timestamp")
            elif kind == "turn_context":
                models.add((str(payload.get("model", "unknown")),
                            str(payload.get("effort", "unknown"))))
            elif kind == "response_item" and payload.get("type") in (
                    "function_call", "custom_tool_call"):
                calls.add(payload.get("call_id") or str(len(calls)))
            elif kind == "event_msg" and payload.get("type") == "token_count":
                info = payload.get("info") or {}
                value = info.get("total_token_usage")
                if not isinstance(value, dict):
                    continue
                # Accept only complete core counters; absent optional counters
                # stay null. Never turn an unmeasured field into zero.
                if not all(type(value.get(k)) is int and value[k] >= 0
                           for k in ("input_tokens", "output_tokens", "total_tokens")):
                    continue
                if usage and value["total_tokens"] < usage["total_tokens"]:
                    resets += 1
                usage = {key: value.get(key) if type(value.get(key)) is int
                         and value[key] >= 0 else None for key in FIELDS}
                observed_at = row.get("timestamp")
    if not meta or not meta.get("id"):
        return None
    source = meta.get("source")
    system = isinstance(source, dict) and "guardian" in str(source)
    return {"id": meta["id"], "parent": meta["parent_thread_id"],
            "cwd": meta["cwd"], "system": system, "usage": usage,
            "created_at": meta["created_at"], "forked_from_id": meta["forked_from_id"],
            "resets": resets, "observed_at": observed_at,
            "models": sorted(models), "tool_calls": len(calls)}


def snapshot(project, root_id, directory=None):
    """Only the selected root + its descendants; other chats are excluded."""
    captured_at = dt.datetime.now(dt.timezone.utc).isoformat()
    empty = {"root": root_id, "sessions": {}, "captured_at": captured_at}
    if not root_id:
        return {**empty, "warning": "CODEX_THREAD_ID 없음"}
    records = {}
    project = Path(project).resolve()
    for path in (directory or sessions_dir()).rglob("*.jsonl"):
        # Read only metadata first, so unrelated transcripts aren't scanned.
        try:
            with path.open(encoding="utf-8") as f:
                first = json.loads(f.readline())
            meta = first.get("payload") or {}
            if first.get("type") != "session_meta":
                continue
            records[meta.get("id")] = path, meta.get("parent_thread_id"), meta.get("cwd")
        except (OSError, ValueError, TypeError):
            continue
    if root_id not in records:
        return {**empty, "warning": "대상 세션의 기록 없음"}
    if Path(records[root_id][2] or "/").resolve() != project:
        return {**empty, "warning": "세션을 연 프로젝트가 다름"}
    ids = {root_id}
    while True:
        children = {sid for sid, (_, parent, _) in records.items() if parent in ids}
        if children <= ids:
            break
        ids |= children
    result = {}
    for sid in ids:
        try:
            record = read_session(records[sid][0])
            if record:
                result[sid] = record
        except OSError:
            pass
    return {**empty, "sessions": result, "warning": None}


def difference(before, after):
    """Return per-thread observed deltas. Reset/missing counters stay null."""
    rows = []
    for sid in before["sessions"].keys() | after["sessions"].keys():
        old = before["sessions"].get(sid)
        new = after["sessions"].get(sid)
        record = new or old
        values = {}
        for key in FIELDS:
            # A new child begins at zero; an existing log without counters
            # has an unknown baseline and must not be assumed to be zero.
            born_after = (not old and sid != after["root"] and record.get("created_at")
                          and not record.get("forked_from_id") and
                          dt.datetime.fromisoformat(record["created_at"].replace("Z", "+00:00")) >=
                          dt.datetime.fromisoformat(before["captured_at"]))
            initial = old["usage"].get(key) if old and old["usage"] else (0 if born_after else None)
            final = new["usage"].get(key) if new and new["usage"] else None
            reset = new and new.get("resets", 0) != (old.get("resets", 0) if old else 0)
            values[key] = final - initial if not reset and initial is not None and final is not None and final >= initial else None
        rows.append({"id": sid, "role": "system" if record["system"] else
                     ("main" if sid == after["root"] else "subagent"),
                     "usage": values, "models": record["models"],
                     "observed_at": new["observed_at"] if new else None,
                     "tool_calls": max(0, new["tool_calls"] - (old["tool_calls"] if old else 0)) if new else None})
    return rows
