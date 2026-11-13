import json
import sqlite3
import uuid
from datetime import datetime, timezone
from typing import Any

from .agents import (
    AssessmentAgent,
    DiagnosticAgent,
    KnowledgeAgent,
    LearnerIntelligenceAgent,
    PedagogicalAgent,
    PlannerAgent,
    SupportAnalyticsAgent,
    TutorAgent,
)


class LearningOrchestrator:
    STAGES = ("OBSERVE", "DIAGNOSE", "PLAN", "TEACH", "ASSESS", "VERIFY", "UPDATE")

    def __init__(self, connection: sqlite3.Connection):
        self.connection = connection
        self.agents = {
            "knowledge": KnowledgeAgent(),
            "diagnostic": DiagnosticAgent(),
            "learner_intelligence": LearnerIntelligenceAgent(),
            "planner": PlannerAgent(),
            "tutor": TutorAgent(),
            "assessment": AssessmentAgent(),
            "pedagogical": PedagogicalAgent(),
            "support_analytics": SupportAnalyticsAgent(),
        }

    def _stage(
        self, name: str, output: Any, evidence_refs: list[str], confidence: float, uncertainty: list[str]
    ) -> dict[str, Any]:
        result = {
            "output": output,
            "evidence_refs": evidence_refs,
            "confidence": confidence,
            "uncertainty": uncertainty,
            "audit_event": {
                "event_type": "learning_cycle_stage",
                "stage": name,
                "occurred_at": datetime.now(timezone.utc).isoformat(),
            },
        }
        return result

    def _prerequisite_mastery(self, learner_id: str, prerequisites: list[str]) -> dict[str, float]:
        mastery: dict[str, float] = {}
        for concept in prerequisites:
            rows = self.connection.execute(
                "SELECT correct, independent FROM evidence WHERE learner_id = ? AND concept_id = ? ORDER BY id",
                (learner_id, concept),
            ).fetchall()
            estimate = 0.5
            for row in rows:
                strength = 0.8 if row["independent"] else 0.35
                likelihood = 0.85 if row["correct"] else 0.2
                posterior = (estimate * likelihood) / (
                    estimate * likelihood + (1 - estimate) * (1 - likelihood)
                )
                estimate = estimate * (1 - strength) + posterior * strength
            mastery[concept] = estimate
        return mastery

    def run(
        self, learner_id: str, answer: str, actor_role: str = "learner", concept: str = "loops"
    ) -> dict[str, Any]:
        evidence_refs = [f"learner:{learner_id}:response"]
        outputs: dict[str, dict[str, Any]] = {}
        prerequisites = DiagnosticAgent.PREREQUISITES.get(concept, [])
        outputs["OBSERVE"] = self._stage(
            "OBSERVE",
            {"answer": answer, "activity": "short_response", "learner_id": learner_id},
            evidence_refs,
            1.0,
            [],
        )

        diagnostic = self.agents["diagnostic"].process(
            {
                "answer": answer,
                "concept": concept,
                "confuses_loops_recursion": concept == "loops" and "recurs" in answer.lower(),
                "prerequisite_mastery": self._prerequisite_mastery(learner_id, prerequisites),
                "evidence_refs": evidence_refs,
            }
        )
        outputs["DIAGNOSE"] = self._stage(
            "DIAGNOSE", diagnostic["output"], diagnostic["evidence_refs"],
            diagnostic["confidence"], diagnostic["uncertainty"],
        )
        plan = self.agents["planner"].process(
            {"targets": [concept], "missed_days": 0, "evidence_refs": evidence_refs}
        )
        outputs["PLAN"] = self._stage("PLAN", plan["output"], plan["evidence_refs"], plan["confidence"], plan["uncertainty"])

        course = self.agents["knowledge"].process({"query": concept})
        teaching = self.agents["tutor"].process(
            {"concept": concept, "materials": course["output"]["materials"]}
        )
        outputs["TEACH"] = self._stage(
            "TEACH", teaching["output"], teaching["evidence_refs"], teaching["confidence"], teaching["uncertainty"]
        )

        assessed = self.agents["assessment"].process(
            {"concept": concept, "answer": answer, "evidence_refs": evidence_refs}
        )
        outputs["ASSESS"] = self._stage(
            "ASSESS", assessed["output"], assessed["evidence_refs"], assessed["confidence"], assessed["uncertainty"]
        )

        # Verification deliberately demands a later, independent application; the current answer alone cannot establish mastery.
        verify = {
            "required": True,
            "independent_application_completed": False,
            "delayed_retention_check_due": True,
            "verified": False,
            "independent_application_prompt": "A door sensor should count each time it opens until it has counted five openings. Explain what repeats and when the process stops.",
            "delayed_retention_prompt": "Without looking back, describe how to check a temperature every minute for ten minutes. Explain the stopping rule.",
            "next_step": "Complete a fresh application task, then a delayed recall check at least 24 hours later.",
        }
        outputs["VERIFY"] = self._stage(
            "VERIFY", verify, evidence_refs, 0.95,
            ["No independent follow-up application or delayed retention evidence has been submitted."],
        )

        mastery = self.agents["learner_intelligence"].process(
            {
                "concept": concept,
                "correct": assessed["output"]["correct"],
                "prior_mastery": 0.5,
                "independent": False,
                "concepts": [concept],
                "skills": [f"apply_{concept}"],
                "prerequisites": {concept: prerequisites},
                "misconceptions": [diagnostic["output"]["misconception"]] if diagnostic["output"]["misconception"] else [],
                "evidence_refs": evidence_refs,
            }
        )
        outputs["UPDATE"] = self._stage(
            "UPDATE", mastery["output"], mastery["evidence_refs"], mastery["confidence"], mastery["uncertainty"]
        )

        for stage, record in outputs.items():
            self.connection.execute(
                "INSERT INTO audit_log (event_type, actor_role, learner_id, stage, payload) VALUES (?, ?, ?, ?, ?)",
                ("learning_cycle_stage", actor_role, learner_id, stage, json.dumps(record)),
            )
        self.connection.execute(
            "INSERT INTO evidence (learner_id, concept_id, evidence_type, correct, independent, details) VALUES (?, ?, 'cycle_response', ?, 0, ?)",
            (learner_id, concept, int(assessed["output"]["correct"]), answer[:1000]),
        )
        self.connection.commit()
        return {
            "learner_id": learner_id,
            "cycle": outputs,
            "next_action": mastery["output"]["next_action"],
            "course_sources": course["output"]["materials"],
        }

    def run_cohort_demo(self) -> dict[str, Any]:
        rows = self.connection.execute(
            """
            SELECT l.id, e.id AS evidence_id, e.correct, e.details
            FROM learners l JOIN evidence e ON e.id = (
                SELECT e2.id FROM evidence e2
                WHERE e2.learner_id = l.id AND e2.concept_id = 'loops'
                ORDER BY e2.id DESC LIMIT 1
            )
            ORDER BY l.id
            """
        ).fetchall()
        affected = sum(
            not row["correct"]
            and ("conflates loops" in row["details"].lower() or "recurs" in row["details"].lower())
            for row in rows
        )
        evidence_refs = [f"evidence:{row['evidence_id']}" for row in rows]
        analytics = self.agents["support_analytics"].process(
            {"total": len(rows), "loop_recursion_confusion": affected, "evidence_refs": evidence_refs}
        )
        lesson = self.agents["pedagogical"].process(
            {"misconception": "loop_recursion_confusion", "evidence_refs": evidence_refs}
        )
        intervention_id = str(uuid.uuid4())
        # Each learner receives a separate planned action tied to cohort evidence.
        recommendations = [
            {
                "learner_id": row["id"],
                "action": "focused_prerequisite_check_then_loops_practice" if row["correct"] == 0 else "independent_transfer_task",
                "evidence_ref": f"evidence:{row['evidence_id']}",
            }
            for row in rows
        ]
        self.connection.execute(
            "INSERT INTO interventions (id, status, content) VALUES (?, 'pending', ?)",
            (intervention_id, json.dumps(lesson)),
        )
        self.connection.execute(
            "INSERT INTO audit_log (event_type, actor_role, learner_id, stage, payload) VALUES (?, 'educator', NULL, 'DEMO', ?)",
            ("cohort_intervention_draft", json.dumps({"intervention_id": intervention_id, "analytics": analytics, "lesson": lesson, "recommendations_count": len(recommendations)})),
        )
        self.connection.commit()
        return {
            "sample_data_label": "Illustrative sample data",
            "assessment": {"students_completed": len(rows), "quiz": "Loops versus recursion"},
            "detection": analytics,
            "diagnosis": {
                "prerequisite_hypotheses": ["variables", "conditionals"],
                "method": "test each prerequisite with a focused item before assuming the root cause",
            },
            "individual_recommendations": recommendations,
            "educator_intervention_draft": lesson,
            "approval": {"required": True, "approved": False, "intervention_id": intervention_id},
            "verification": {
                "follow_up_assessment": "fresh loop/recursion transfer task",
                "delayed_retention_check": "schedule a later independent recall check",
            },
        }
