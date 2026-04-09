#!/usr/bin/env python3
"""
StudyHub Analytics — Export and analyse study session data.

Connects to Supabase, pulls study session and assignment data for a user,
and generates summary statistics with visualisations.

Usage:
    export SUPABASE_URL="https://your-project.supabase.co"
    export SUPABASE_KEY="your-anon-key"
    python scripts/analytics.py --user-id <uuid> [--days 30] [--output report.json]
"""

import argparse
import json
import os
import sys
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any


def connect_supabase(url: str, key: str):
    """Initialise Supabase client."""
    try:
        from supabase import create_client

        return create_client(url, key)
    except ImportError:
        print("Install supabase-py: pip install supabase", file=sys.stderr)
        sys.exit(1)


def fetch_study_sessions(client, user_id: str, days: int) -> list[dict]:
    """Fetch study sessions for a user within the last N days."""
    cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()
    response = (
        client.table("study_sessions")
        .select("*")
        .eq("user_id", user_id)
        .gte("recorded_at", cutoff)
        .order("recorded_at", desc=True)
        .execute()
    )
    return response.data


def fetch_assignments(client, user_id: str) -> list[dict]:
    """Fetch all assignments for a user."""
    response = (
        client.table("assignments")
        .select("*")
        .eq("user_id", user_id)
        .order("due", desc=False)
        .execute()
    )
    return response.data


def analyse_sessions(sessions: list[dict]) -> dict[str, Any]:
    """Compute study analytics from raw session data."""
    if not sessions:
        return {"total_hours": 0, "session_count": 0, "by_module": {}}

    total_minutes = sum(s["minutes"] for s in sessions)
    by_module: dict[str, dict] = defaultdict(lambda: {"minutes": 0, "sessions": 0})

    for s in sessions:
        module = s.get("module", "General")
        by_module[module]["minutes"] += s["minutes"]
        by_module[module]["sessions"] += 1

    # Daily breakdown
    daily: dict[str, int] = defaultdict(int)
    for s in sessions:
        day = s["recorded_at"][:10]
        daily[day] += s["minutes"]

    # Streak calculation
    today = datetime.utcnow().date()
    streak = 0
    check_date = today
    session_dates = {s["recorded_at"][:10] for s in sessions}
    while check_date.isoformat() in session_dates:
        streak += 1
        check_date -= timedelta(days=1)

    return {
        "total_hours": round(total_minutes / 60, 1),
        "total_minutes": total_minutes,
        "session_count": len(sessions),
        "avg_session_minutes": round(total_minutes / len(sessions), 1),
        "current_streak_days": streak,
        "by_module": {
            k: {
                "hours": round(v["minutes"] / 60, 1),
                "sessions": v["sessions"],
                "avg_minutes": round(v["minutes"] / v["sessions"], 1),
            }
            for k, v in sorted(
                by_module.items(), key=lambda x: x[1]["minutes"], reverse=True
            )
        },
        "daily_minutes": dict(sorted(daily.items())),
    }


def analyse_assignments(assignments: list[dict]) -> dict[str, Any]:
    """Compute assignment analytics."""
    if not assignments:
        return {"total": 0, "completed": 0, "completion_rate": 0}

    completed = sum(1 for a in assignments if a.get("done"))
    overdue = sum(
        1
        for a in assignments
        if not a.get("done") and a.get("due", "9999") < datetime.utcnow().strftime("%Y-%m-%d")
    )

    by_priority: dict[str, dict] = defaultdict(lambda: {"total": 0, "done": 0})
    for a in assignments:
        p = a.get("priority", "Medium")
        by_priority[p]["total"] += 1
        if a.get("done"):
            by_priority[p]["done"] += 1

    return {
        "total": len(assignments),
        "completed": completed,
        "overdue": overdue,
        "completion_rate": round(100 * completed / len(assignments), 1),
        "by_priority": {
            k: {**v, "rate": round(100 * v["done"] / v["total"], 1) if v["total"] else 0}
            for k, v in by_priority.items()
        },
    }


def print_report(study: dict, assignments: dict) -> None:
    """Print a formatted analytics report to stdout."""
    print("\n" + "=" * 50)
    print("  STUDYHUB ANALYTICS REPORT")
    print("=" * 50)

    print(f"\n  Study Time:     {study['total_hours']} hours across {study['session_count']} sessions")
    print(f"  Avg Session:    {study.get('avg_session_minutes', 0)} minutes")
    print(f"  Current Streak: {study.get('current_streak_days', 0)} days")

    if study["by_module"]:
        print("\n  Hours by Module:")
        for module, data in study["by_module"].items():
            bar = "#" * int(data["hours"])
            print(f"    {module:20s} {data['hours']:6.1f}h  ({data['sessions']} sessions)  {bar}")

    print(f"\n  Assignments:    {assignments['completed']}/{assignments['total']} completed ({assignments['completion_rate']}%)")
    print(f"  Overdue:        {assignments.get('overdue', 0)}")

    if assignments.get("by_priority"):
        print("\n  By Priority:")
        for priority, data in assignments["by_priority"].items():
            print(f"    {priority:10s} {data['done']}/{data['total']} ({data['rate']}%)")

    print("\n" + "=" * 50 + "\n")


def main():
    parser = argparse.ArgumentParser(description="StudyHub analytics report")
    parser.add_argument("--user-id", required=True, help="Supabase user UUID")
    parser.add_argument("--days", type=int, default=30, help="Lookback period in days (default: 30)")
    parser.add_argument("--output", help="Save JSON report to file")
    args = parser.parse_args()

    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if not url or not key:
        print("Set SUPABASE_URL and SUPABASE_KEY environment variables.", file=sys.stderr)
        sys.exit(1)

    client = connect_supabase(url, key)
    sessions = fetch_study_sessions(client, args.user_id, args.days)
    assignments = fetch_assignments(client, args.user_id)

    study_stats = analyse_sessions(sessions)
    assignment_stats = analyse_assignments(assignments)

    print_report(study_stats, assignment_stats)

    if args.output:
        report = {
            "generated_at": datetime.utcnow().isoformat(),
            "user_id": args.user_id,
            "period_days": args.days,
            "study": study_stats,
            "assignments": assignment_stats,
        }
        with open(args.output, "w") as f:
            json.dump(report, f, indent=2)
        print(f"Report saved to {args.output}")


if __name__ == "__main__":
    main()
