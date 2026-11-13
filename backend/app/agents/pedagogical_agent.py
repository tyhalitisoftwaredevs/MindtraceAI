from typing import Any

from .common import agent_result


class PedagogicalAgent:
    def process(self, payload: dict[str, Any]) -> dict[str, Any]:
        misconception = payload.get("misconception", "loop_recursion_confusion")
        return agent_result(
            "pedagogical_agent",
            {
                "lesson_title": "Loops are not recursion",
                "duration_minutes": 10,
                "misconception": misconception,
                "lesson": [
                    "Trace a loop with a counter and a visible stopping condition.",
                    "Trace a function calling itself and identify its base case.",
                    "Compare the two traces: repetition mechanism, state and stopping rule.",
                ],
                "practice": [
                    {"prompt": "Predict the output after three loop iterations.", "skill": "trace_loop"},
                    {"prompt": "Identify the base case in a small recursive function.", "skill": "trace_recursion"},
                    {"prompt": "Choose whether a repeated task is clearer as a loop or recursion and explain why.", "skill": "transfer"},
                ],
                "requires_educator_approval": True,
            },
            list(payload.get("evidence_refs", [])) + ["course:intro-programming"],
            confidence=0.84,
            uncertainty=["Draft intervention should be checked against the local course plan before use."],
        )
