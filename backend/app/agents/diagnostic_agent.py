from typing import Any

from .common import agent_result


class DiagnosticAgent:
    PREREQUISITES = {
        "loops": ["variables", "conditionals"],
        "recursion": ["functions", "loops"],
        "algebra": ["fractions", "ratios"],
    }
    ROOT_CAUSE_SKILLS = {
        "algebra": ["negative_numbers", "translate_word_problems_to_equations"],
    }

    def process(self, payload: dict[str, Any]) -> dict[str, Any]:
        answer = str(payload.get("answer", "")).lower()
        target = str(payload.get("concept", "loops")).lower()
        misconception = "loop_recursion_confusion" if (
            "recurs" in answer or payload.get("confuses_loops_recursion")
        ) else None
        prereqs = self.PREREQUISITES.get(target, [])
        gaps = [
            prerequisite
            for prerequisite in prereqs
            if float(payload.get("prerequisite_mastery", {}).get(prerequisite, 0.5)) < 0.6
        ]
        return agent_result(
            "diagnostic_agent",
            {
                "target_concept": target,
                "misconception": misconception,
                "prerequisite_hypotheses": prereqs,
                "prerequisite_gaps_to_test": gaps,
                "other_root_cause_hypotheses": self.ROOT_CAUSE_SKILLS.get(target, []),
                "next_diagnostic": (
                    f"Test {', '.join(gaps)} before reteaching {target}."
                    if gaps
                    else f"Use an independent {target} application task."
                ),
            },
            list(payload.get("evidence_refs", [])),
            confidence=0.78 if misconception else 0.62,
            uncertainty=["Prerequisite gaps are hypotheses until checked with a focused task."],
        )
