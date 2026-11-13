from typing import Any

from .common import agent_result


class AssessmentAgent:
    def process(self, payload: dict[str, Any]) -> dict[str, Any]:
        answer = str(payload.get("answer", "")).strip().lower()
        concept = str(payload.get("concept", "loops")).lower()
        assessment_type = payload.get("assessment_type", "short_response")
        if assessment_type == "independent_application":
            repeat_idea = any(term in answer for term in ("repeat", "loop", "again", "each time"))
            stopping_rule = any(term in answer for term in ("until", "stop", "five", "5", "condition"))
            correct = repeat_idea and stopping_rule
            return agent_result(
                "assessment_agent",
                {
                    "concept": concept,
                    "correct": correct,
                    "feedback": "You applied repetition and a stopping rule to a new scenario." if correct else "Describe what repeats in the new scenario and how the process stops.",
                    "assessment_type": assessment_type,
                },
                list(payload.get("evidence_refs", [])),
                confidence=0.68,
                uncertainty=["Automated rubric is a simple signal; it cannot establish understanding on its own."],
            )
        if assessment_type == "delayed_retention":
            repeat_idea = any(term in answer for term in ("repeat", "loop", "again", "each minute"))
            stopping_rule = any(term in answer for term in ("until", "stop", "ten", "10", "condition"))
            correct = repeat_idea and stopping_rule
            return agent_result(
                "assessment_agent",
                {
                    "concept": concept,
                    "correct": correct,
                    "feedback": "You recalled a repetition strategy and its stopping rule." if correct else "Recall what repeats and state a clear stopping rule.",
                    "assessment_type": assessment_type,
                },
                list(payload.get("evidence_refs", [])),
                confidence=0.68,
                uncertainty=["Automated rubric is a simple signal; it cannot establish understanding on its own."],
            )
        expected = {
            "variables": ("variable", "value"),
            "negative_numbers": ("negative", "zero"),
            "ratios": ("ratio", "compare"),
            "conditionals": ("condition", "branch"),
            "loops": ("repeat", "condition"),
            "functions": ("function", "input"),
            "recursion": ("function", "base case"),
            "fractions": ("numerator", "denominator"),
            "algebra": ("fraction", "ratio"),
        }.get(concept, ())
        correct = bool(expected) and all(term in answer for term in expected)
        return agent_result(
            "assessment_agent",
            {
                "concept": concept,
                "correct": correct,
                "feedback": "Good explanation." if correct else "Explain the key idea in your own words, including what makes it stop or balance.",
                "assessment_type": assessment_type,
            },
            list(payload.get("evidence_refs", [])),
            confidence=0.72,
            uncertainty=["Keyword-based MVP response scoring requires educator review."],
        )
