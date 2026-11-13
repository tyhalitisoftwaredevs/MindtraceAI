import sqlite3
import unittest

from app.agents import (
    AssessmentAgent,
    DiagnosticAgent,
    KnowledgeAgent,
    LearnerIntelligenceAgent,
    PedagogicalAgent,
    PlannerAgent,
    SupportAnalyticsAgent,
    TutorAgent,
)
from app.data.seed import seed_database
from app.orchestrator import LearningOrchestrator


class LearningCycleTests(unittest.TestCase):
    def setUp(self) -> None:
        self.connection = sqlite3.connect(":memory:")
        self.connection.row_factory = sqlite3.Row
        self.connection.execute("PRAGMA foreign_keys = ON")
        seed_database(self.connection)

    def tearDown(self) -> None:
        self.connection.close()

    def test_seeded_cohort_and_intervention_are_illustrative_and_pending(self) -> None:
        demo = LearningOrchestrator(self.connection).run_cohort_demo()

        self.assertEqual(demo["sample_data_label"], "Illustrative sample data")
        self.assertEqual(demo["assessment"]["students_completed"], 25)
        self.assertEqual(demo["detection"]["output"]["affected_learners"], 16)
        self.assertEqual(len(demo["individual_recommendations"]), 25)
        self.assertTrue(demo["approval"]["required"])
        self.assertFalse(demo["approval"]["approved"])
        status = self.connection.execute(
            "SELECT status FROM interventions WHERE id = ?",
            (demo["approval"]["intervention_id"],),
        ).fetchone()["status"]
        self.assertEqual(status, "pending")

    def test_cycle_emits_all_auditable_stages_but_does_not_skip_verification(self) -> None:
        result = LearningOrchestrator(self.connection).run(
            "learner-25", "A loop repeats while its condition is true, then stops."
        )

        self.assertEqual(
            list(result["cycle"]),
            ["OBSERVE", "DIAGNOSE", "PLAN", "TEACH", "ASSESS", "VERIFY", "UPDATE"],
        )
        for stage in result["cycle"].values():
            self.assertEqual(
                set(stage),
                {"output", "evidence_refs", "confidence", "uncertainty", "audit_event"},
            )
        verify = result["cycle"]["VERIFY"]["output"]
        self.assertFalse(verify["verified"])
        self.assertTrue(verify["delayed_retention_check_due"])
        self.assertTrue(result["course_sources"])

    def test_each_specialist_returns_the_shared_agent_envelope(self) -> None:
        agents = [
            KnowledgeAgent(),
            DiagnosticAgent(),
            LearnerIntelligenceAgent(),
            PlannerAgent(),
            TutorAgent(),
            AssessmentAgent(),
            PedagogicalAgent(),
            SupportAnalyticsAgent(),
        ]
        for specialist in agents:
            with self.subTest(agent=specialist.__class__.__name__):
                result = specialist.process({})
                self.assertEqual(
                    set(result),
                    {"output", "evidence_refs", "confidence", "uncertainty", "audit_event"},
                )
                self.assertGreaterEqual(result["confidence"], 0)
                self.assertLessEqual(result["confidence"], 1)

    def test_planner_replans_after_missed_days_and_application_is_distinct(self) -> None:
        plan = PlannerAgent().process({"targets": ["loops"], "missed_days": 2})
        self.assertTrue(plan["output"]["replanned_after_missed_days"])
        self.assertIn("2 day", plan["output"]["replan_note"])

        assessed = AssessmentAgent().process(
            {
                "concept": "loops",
                "assessment_type": "independent_application",
                "answer": "Repeat the sensor check until five openings, then stop.",
            }
        )
        self.assertTrue(assessed["output"]["correct"])
        self.assertEqual(assessed["output"]["assessment_type"], "independent_application")

    def test_algebra_diagnosis_tests_prerequisites_and_lists_root_cause_hypotheses(self) -> None:
        diagnosis = DiagnosticAgent().process(
            {
                "concept": "algebra",
                "prerequisite_mastery": {"fractions": 0.3, "ratios": 0.9},
            }
        )["output"]

        self.assertEqual(diagnosis["prerequisite_gaps_to_test"], ["fractions"])
        self.assertEqual(
            diagnosis["other_root_cause_hypotheses"],
            ["negative_numbers", "translate_word_problems_to_equations"],
        )


if __name__ == "__main__":
    unittest.main()
