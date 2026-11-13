from typing import Any

from .common import agent_result


MATERIALS = [
    {
        "id": "intro-programming",
        "title": "Introduction to Programming: Variables, Conditions and Loops",
        "text": "Variables store named values. A condition selects a path when a Boolean expression is true. A loop repeats a block while a condition holds or for each item. Recursion is a function calling itself and requires a base case.",
        "topics": ["variables", "conditionals", "loops", "recursion", "functions"],
    },
    {
        "id": "algebra-foundations",
        "title": "Algebra Foundations: Fractions, Ratios and Negative Numbers",
        "text": "Fractions represent parts of a whole. Ratios compare quantities. Negative numbers are less than zero. When solving an equation, preserve equality by performing the same operation on both sides.",
        "topics": ["fractions", "ratios", "negative numbers", "algebra"],
    },
]


class KnowledgeAgent:
    def process(self, payload: dict[str, Any]) -> dict[str, Any]:
        query = str(payload.get("query", "")).lower().replace("_", " ")
        matches = [
            item
            for item in MATERIALS
            if not query or any(topic in query for topic in item["topics"])
        ]
        if not matches:
            matches = MATERIALS
        return agent_result(
            "knowledge_agent",
            {
                "materials": [
                    {"id": item["id"], "title": item["title"], "text": item["text"]}
                    for item in matches
                ],
                "grounded": True,
            },
            [f"course:{item['id']}" for item in matches],
            confidence=0.93,
            uncertainty=["Seeded MVP materials are illustrative, not a complete syllabus."],
        )
