from datetime import date, timedelta
from typing import Any

from .common import agent_result


class PlannerAgent:
    def process(self, payload: dict[str, Any]) -> dict[str, Any]:
        missed_days = int(payload.get("missed_days", 0))
        shift = min(max(missed_days, 0), 7)
        start = date.today() + timedelta(days=shift)
        targets = payload.get("targets", ["variables", "conditionals", "loops"])
        schedule = [
            {"day": (start + timedelta(days=index)).isoformat(), "focus": target, "minutes": 15}
            for index, target in enumerate(targets)
        ]
        return agent_result(
            "planner_agent",
            {
                "schedule": schedule,
                "replanned_after_missed_days": missed_days > 0,
                "replan_note": f"Schedule shifted by {shift} day(s)." if shift else "Current schedule retained.",
            },
            list(payload.get("evidence_refs", [])),
            confidence=0.86,
            uncertainty=["Study time and availability are estimates; learner should adjust as needed."],
        )
