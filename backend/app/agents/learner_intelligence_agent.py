from typing import Any

from .common import agent_result


class LearnerIntelligenceAgent:
    def process(self, payload: dict[str, Any]) -> dict[str, Any]:
        correct = bool(payload.get("correct", False))
        prior = float(payload.get("prior_mastery", 0.5))
        evidence_strength = 0.8 if payload.get("independent", False) else 0.35
        likelihood = 0.85 if correct else 0.2
        posterior = (prior * likelihood) / (
            prior * likelihood + (1 - prior) * (1 - likelihood)
        )
        mastery = round(prior * (1 - evidence_strength) + posterior * evidence_strength, 3)
        return agent_result(
            "learner_intelligence_agent",
            {
                "concept": payload.get("concept", "loops"),
                "mastery_estimate": mastery,
                "evidence_strength": evidence_strength,
                "knowledge_graph": {
                    "concepts": payload.get("concepts", []),
                    "skills": payload.get("skills", []),
                    "prerequisites": payload.get("prerequisites", {}),
                    "misconceptions": payload.get("misconceptions", []),
                },
                "next_action": "verify_independent_application" if mastery < 0.8 else "schedule_delayed_recall",
            },
            list(payload.get("evidence_refs", [])),
            confidence=0.7 if payload.get("independent") else 0.52,
            uncertainty=["MVP mastery uses a simple Bayesian-style estimate; it is not a high-stakes score."],
        )
