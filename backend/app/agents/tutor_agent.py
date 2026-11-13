from typing import Any

from .common import agent_result


class TutorAgent:
    def process(self, payload: dict[str, Any]) -> dict[str, Any]:
        concept = str(payload.get("concept", "loops"))
        materials = payload.get("materials", [])
        explanations = {
            "variables": "A variable is a named place to store a value. Trace how its value changes as the program runs.",
            "fractions": "A fraction names part of a whole. Its numerator counts parts and its denominator names the equal-sized parts.",
            "negative_numbers": "Negative numbers lie below zero. On a number line, moving left makes values smaller.",
            "ratios": "A ratio compares quantities. Keep the units and order clear when comparing the two amounts.",
            "conditionals": "A conditional checks a true-or-false condition and chooses which branch of code to run.",
            "loops": "A loop repeats a block while a condition holds or for each item. Trace one iteration at a time and identify its stopping condition.",
            "functions": "A function is a reusable named block. Follow its inputs, work and returned result.",
            "recursion": "Recursion happens when a function calls itself. Each call needs progress toward a base case that stops further calls.",
            "algebra": "An equation stays balanced when the same operation is applied to both sides. Check prerequisite fraction and ratio skills first.",
        }
        explanation = explanations.get(concept, "Use the supplied course material to work through this concept step by step.")
        return agent_result(
            "tutor_agent",
            {
                "explanation": explanation,
                "guided_prompt": "What changes on each repetition, and what condition ends it?",
                "sources": [{"id": item.get("id"), "title": item.get("title")} for item in materials],
            },
            [f"course:{item.get('id')}" for item in materials],
            confidence=0.82 if materials else 0.55,
            uncertainty=[] if materials else ["No approved course material was supplied."],
        )
