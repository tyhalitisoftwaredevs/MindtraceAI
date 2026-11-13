from typing import Any

from .common import agent_result


class SupportAnalyticsAgent:
    def process(self, payload: dict[str, Any]) -> dict[str, Any]:
        total = int(payload.get("total", 0))
        confused = int(payload.get("loop_recursion_confusion", 0))
        return agent_result(
            "support_analytics_agent",
            {
                "cohort_size": total,
                "misconception": "loop_recursion_confusion",
                "affected_learners": confused,
                "rate": round(confused / total, 3) if total else 0,
                "teaching_signal": "Prioritise a contrastive loops-versus-recursion lesson." if confused else "No cohort-level signal detected.",
                "human_review_required": True,
            },
            list(payload.get("evidence_refs", [])),
            confidence=0.9 if total else 0.4,
            uncertainty=["Cohort counts are descriptive and must not be used as automatic academic decisions."],
        )
