#!/usr/bin/env python3
"""Low-overhead task timing and observed Codex token deltas; stdlib only."""
import argparse
import datetime as dt
import json
import os
from pathlib import Path
import statistics
import sys

from usage import difference, snapshot

PROJECT = Path(__file__).resolve().parents[2]


def now():
    return dt.datetime.now(dt.timezone.utc).isoformat()


def load(path, default=None):
    return json.loads(path.read_text()) if path.exists() else default


def save(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    temporary.replace(path)


def report(records, target):
    development = [r for r in records if r["variant"] != "setup"]
    done = [r for r in development if r["status"] == "done"]
    lines = ["# 해커톤 관측 기록", "", f"개발 작업 {len(development)}건 · 완료 {len(done)}건 · 사용자 확인 {sum(r.get('accepted', False) for r in development)}건 · setup {len(records)-len(development)}건 별도",
             f"재작업 표시 {sum(r.get('rework', 0) for r in development)}회 · 완료 작업 경과시간 중앙값 " +
             (f"{statistics.median(r['seconds'] for r in done) / 60:.1f}분" if done else "측정 안 됨"),
             "", "| 작업 | 구분 | 상태 | 경과(분) | 관측 토큰 | 시스템 토큰 | 재작업 | 사용자 확인 |",
             "|---|---|---|---:|---:|---:|---:|---|"]
    for row in records:
        delta = row.get("delta", [])
        app = [r["usage"]["total_tokens"] for r in delta if r["role"] != "system"]
        system = [r["usage"]["total_tokens"] for r in delta if r["role"] == "system"]
        row["observed_tokens"] = sum(app) if app and all(v is not None for v in app) else None
        total = row["observed_tokens"]
        safe = row["title"].replace("|", "/").replace("\n", " ")
        system_total = sum(system) if all(v is not None for v in system) else None
        lines.append(f"| {safe} | {row['variant']} | {row['status']} | {row['seconds']/60:.1f} | {total if total is not None else '측정 안 됨'} | {system_total if system_total is not None else '측정 안 됨'} | {row['rework']} | {'확인' if row.get('accepted') else '미확인'} |")
    lines += ["", "## 비교", ""]
    groups = {}
    for row in done:
        if row.get("pair") and row.get("accepted"):
            groups.setdefault(row["pair"], []).append(row)
    comparisons = 0
    for pair, group in groups.items():
        baseline = [r for r in group if r["variant"] == "baseline"]
        harness = [r for r in group if r["variant"] == "harness"]
        if len(baseline) != 1 or len(harness) != 1:
            continue
        a, b = baseline[0], harness[0]
        if not a["spec"] or a["spec"] != b["spec"]:
            continue
        comparisons += 1
        time_change = (1 - b["seconds"] / a["seconds"]) * 100 if a["seconds"] else None
        token_change = (1 - b["observed_tokens"] / a["observed_tokens"]) * 100 if a["observed_tokens"] and b["observed_tokens"] is not None else None
        lines.append(f"- {pair}: 경과시간 감소율 {time_change:.1f}%" if time_change is not None else f"- {pair}: 시간 비교 불가")
        lines.append(f"  관측 토큰 감소율 {token_change:.1f}%" if token_change is not None else "  토큰 비교 불가")
    if not comparisons:
        lines.append("동일 완료 조건(spec)의 사용자 확인된 baseline/harness 쌍이 없어 절감률은 계산하지 않음.")
    lines += ["", "## 해석 범위", "",
              "- 토큰은 로컬 token_count.total_token_usage의 마크 간 차이. 캐시 입력은 입력의 부분집합, 추론 출력은 출력의 부분집합이며 다시 더하지 않는다.",
              "- 메인·일반 서브에이전트 합계를 관측 토큰으로 표시한다. Codex의 권한 심사(guardian)는 별도 시스템 열에 남기며 사용자가 요청하는 코드 리뷰와 다르다.",
              "- 이벤트가 늦게 기록되므로 시작/종료 경계와 마지막 응답 일부가 빠지거나 이전 구간 응답이 섞일 수 있다. 정확한 청구·계정 한도 지표가 아니다. 관측 시각·모델·원시 카운터는 tasks.json에 보존한다.",
              "- 경과시간은 사용자 대기·휴식·빌드 대기를 포함한다. 작업 시간이나 순수 추론 시간으로 부르지 않는다.",
              "- 비교는 사람이 같은 완료 조건·시작 상태·기기·네트워크·관측 범위인지 확인한 쌍만 사용한다. 모델/effort가 다르면 하네스 전체 운영 방식 비교이지 지시문만의 효과가 아니다.",
              "- baseline도 이 수집기로 기록하되 하네스 지침을 적용하지 않은 별도 작업이어야 한다. variant 라벨만 바꿔 비교군으로 만들지 않는다. 연습·순서 효과와 적은 표본은 발표 시 공개한다.",
              "- 기록 기능·하네스 제작 비용은 개발 작업과 별도로 보고한다. 토큰 절감률을 요금 또는 사용 가능 시간 증가율로 바꾸어 말하지 않는다."]
    target.write_text("\n".join(lines) + "\n")
    return f"작업 {len(records)} · 완료 {len(done)} · 비교쌍 {comparisons} → {target}"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", type=Path, default=PROJECT / "_workspace/metrics")
    parser.add_argument("--project", type=Path, default=PROJECT)
    sub = parser.add_subparsers(dest="command", required=True)
    start = sub.add_parser("start")
    start.add_argument("id")
    start.add_argument("title")
    start.add_argument("--variant", choices=("harness", "baseline", "setup"), default="harness")
    start.add_argument("--pair", default="")
    start.add_argument("--spec", default="")
    start.add_argument("--session", default=os.environ.get("CODEX_THREAD_ID") or os.environ.get("CODEX_SESSION_ID"))
    end = sub.add_parser("end")
    end.add_argument("id")
    end.add_argument("--status", choices=("done", "blocked", "cancelled"), default="done")
    end.add_argument("--rework", type=int, default=0)
    end.add_argument("--check", choices=("passed", "failed", "not-run"), default="not-run")
    accept = sub.add_parser("accept")
    accept.add_argument("id")
    sub.add_parser("report")
    sub.add_parser("probe")
    args = parser.parse_args()
    directory = args.data_dir.resolve()
    active_path, tasks_path = directory / "active.json", directory / "tasks.json"
    records = load(tasks_path, [])
    active = load(active_path)
    try:
        if args.command == "start":
            if active:
                raise ValueError(f"진행 중: {active['id']} (먼저 end)")
            if any(r["id"] == args.id for r in records):
                raise ValueError("이미 사용한 작업 id")
            if args.pair and (not args.spec or args.variant == "setup"):
                raise ValueError("비교쌍에는 완료 조건 --spec 및 harness/baseline 필요")
            initial = snapshot(args.project, args.session)
            save(active_path, {"id": args.id, "title": args.title, "variant": args.variant,
                               "pair": args.pair, "spec": args.spec, "started_at": now(),
                               "project": str(args.project.resolve()),
                               "before": initial})
            print(f"시작 {args.id}" + (f" · 토큰: {initial['warning']}" if initial["warning"] else ""))
        elif args.command == "end":
            if not active or active["id"] != args.id:
                raise ValueError("진행 중인 작업 id와 다름")
            if args.rework < 0:
                raise ValueError("재작업 횟수는 0 이상")
            if args.project.resolve() != Path(active["project"]):
                raise ValueError("시작한 프로젝트와 다름 (--project 확인)")
            final = snapshot(args.project, active["before"]["root"])
            ended = now()
            active.update(ended_at=ended, status=args.status, rework=args.rework,
                          check=args.check, accepted=False,
                          seconds=(dt.datetime.fromisoformat(ended) - dt.datetime.fromisoformat(active["started_at"])).total_seconds(),
                          after=final, delta=difference(active["before"], final))
            save(tasks_path, records + [active])
            active_path.unlink()
            print(f"종료 {args.id} · {active['seconds'] / 60:.1f}분 (관측 토큰 저장)")
        elif args.command == "accept":
            found = next((r for r in records if r["id"] == args.id), None)
            if not found or found["status"] != "done":
                raise ValueError("완료된 작업 id 필요")
            found.update(accepted=True, accepted_at=now())
            save(tasks_path, records)
            print(f"사용자 확인 기록: {args.id}")
        elif args.command == "report":
            directory.mkdir(parents=True, exist_ok=True)
            print(report(records, directory / "report.md"))
        else:
            snap = snapshot(args.project, os.environ.get("CODEX_THREAD_ID") or os.environ.get("CODEX_SESSION_ID"))
            print(json.dumps(snap, ensure_ascii=False, indent=2))
    except (ValueError, OSError) as exc:
        print(f"기록 실패: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
