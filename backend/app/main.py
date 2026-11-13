import json
import os
import sqlite3
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .agents import AssessmentAgent, LearnerIntelligenceAgent
from .data.seed import seed_database
from .orchestrator import LearningOrchestrator
from .services.voice import synthesize


DATABASE_PATH = Path(
    os.getenv("MINDTRACE_DB", str(Path(__file__).resolve().parents[1] / "mindtrace.db"))
)
DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
API_TOKENS = json.loads(os.getenv("MINDTRACE_API_TOKENS", "{}"))
if not isinstance(API_TOKENS, dict) or any(
    not isinstance(claims, dict) for claims in API_TOKENS.values()
):
    raise ValueError("MINDTRACE_API_TOKENS must be a JSON object mapping tokens to role claims.")


def connect() -> sqlite3.Connection:
    class ClosingConnection(sqlite3.Connection):
        def __exit__(self, exception_type, exception, traceback):
            try:
                return super().__exit__(exception_type, exception, traceback)
            finally:
                self.close()

    connection = sqlite3.connect(DATABASE_PATH, factory=ClosingConnection)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def initialize_database() -> None:
    with connect() as connection:
        seed_database(connection)


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize_database()
    yield


app = FastAPI(
    title="MindTrace AI",
    description="Autonomous Learning Intelligence System — hackathon MVP",
    version="0.1.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv(
        "MINDTRACE_CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
    ).split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AssessmentSubmission(BaseModel):
    learner_id: str | None = None
    concept: Literal[
        "variables", "fractions", "negative_numbers", "ratios", "conditionals",
        "loops", "functions", "recursion", "algebra"
    ] = "loops"
    answer: str = Field(min_length=1, max_length=4000)


class VerificationSubmission(BaseModel):
    kind: Literal["independent_application", "delayed_retention"]
    answer: str = Field(min_length=1, max_length=4000)


class StudyPlanRequest(BaseModel):
    targets: list[str] = Field(default_factory=lambda: ["variables", "conditionals", "loops"])
    missed_days: int = Field(default=0, ge=0, le=365)


class VoiceRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4000)
    personalized: bool = False


class ConsentRequest(BaseModel):
    consent: bool


class InterventionDecision(BaseModel):
    approved: bool


class DemoFollowupResponse(BaseModel):
    learner_id: str
    answer: str = Field(min_length=1, max_length=4000)


class DemoFollowupSubmission(BaseModel):
    intervention_id: str
    responses: list[DemoFollowupResponse] = Field(min_length=1, max_length=25)


def actor(
    authorization: str | None = Header(default=None),
    x_role: str = Header(default="learner"),
    x_learner_id: str = Header(default="learner-01"),
) -> dict[str, str]:
    if authorization:
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() != "bearer" or not token or token not in API_TOKENS:
            raise HTTPException(status_code=401, detail="Invalid bearer token.")
        claims = API_TOKENS[token]
        role = str(claims.get("role", "")).lower()
        learner_id = str(claims.get("learner_id", ""))
    elif os.getenv("MINDTRACE_DEMO_MODE", "true").lower() == "true":
        role = x_role.lower()
        learner_id = x_learner_id
    else:
        raise HTTPException(status_code=401, detail="Bearer authentication is required.")
    if role not in {"learner", "educator", "admin"}:
        raise HTTPException(status_code=401, detail="A valid learner, educator, or admin role is required.")
    if role == "learner" and not learner_id:
        raise HTTPException(status_code=401, detail="Learner identity is required.")
    return {"role": role, "learner_id": learner_id}


def require_staff(user: dict[str, str]) -> None:
    if user["role"] not in {"educator", "admin"}:
        raise HTTPException(status_code=403, detail="Educator or admin role required.")


def require_learner_access(learner_id: str, user: dict[str, str]) -> None:
    if user["role"] == "learner" and user["learner_id"] != learner_id:
        raise HTTPException(status_code=403, detail="Learners can access only their own record.")


def write_audit(
    connection: sqlite3.Connection,
    event_type: str,
    user: dict[str, str],
    learner_id: str | None,
    payload: dict,
    stage: str | None = None,
) -> None:
    connection.execute(
        "INSERT INTO audit_log (event_type, actor_role, learner_id, stage, payload) VALUES (?, ?, ?, ?, ?)",
        (event_type, user["role"], learner_id, stage, json.dumps(payload)),
    )
    connection.commit()


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "service": "MindTrace AI", "database": "sqlite"}


@app.get("/api/auth/me")
def identity(user: dict[str, str] = Depends(actor)) -> dict[str, str]:
    return user


@app.get("/api/overview")
def overview(user: dict[str, str] = Depends(actor)) -> dict:
    require_staff(user)
    with connect() as connection:
        all_latest = connection.execute(
            """
            SELECT l.id, e.id AS evidence_id, e.correct, e.details
            FROM learners l LEFT JOIN evidence e ON e.id = (
                SELECT e2.id FROM evidence e2
                WHERE e2.learner_id = l.id AND e2.concept_id = 'loops'
                ORDER BY e2.id DESC LIMIT 1
            )
            """
        ).fetchall()
        recent = connection.execute("SELECT COUNT(*) FROM audit_log").fetchone()[0]
    confused = sum(
        row["evidence_id"] is not None
        and not row["correct"]
        and ("conflates loops" in row["details"].lower() or "recurs" in row["details"].lower())
        for row in all_latest
    )
    return {
        "sample_data_label": "Illustrative sample data",
        "cohort": {
            "name": "First-year programming",
            "students": len(all_latest),
            "loop_recursion_confusion": confused,
        },
        "audit_events": recent,
        "experiences": ["learn", "teach", "campus", "skills", "voice"],
    }


@app.get("/api/learners")
def learners(user: dict[str, str] = Depends(actor)) -> list[dict]:
    require_staff(user)
    with connect() as connection:
        rows = connection.execute(
            """
            SELECT l.id, l.display_name, l.cohort,
                   COUNT(e.id) AS evidence_count,
                   AVG(e.correct) AS observed_accuracy
            FROM learners l LEFT JOIN evidence e ON e.learner_id = l.id
            GROUP BY l.id ORDER BY l.id
            """
        ).fetchall()
    return [
        {
            "id": row["id"],
            "display_name": row["display_name"],
            "cohort": row["cohort"],
            "evidence_count": row["evidence_count"],
            "observed_accuracy": round(row["observed_accuracy"], 3)
            if row["observed_accuracy"] is not None
            else None,
        }
        for row in rows
    ]


@app.get("/api/learners/{learner_id}")
def learner_detail(learner_id: str, user: dict[str, str] = Depends(actor)) -> dict:
    require_learner_access(learner_id, user)
    with connect() as connection:
        learner = connection.execute(
            "SELECT id, display_name, cohort FROM learners WHERE id = ?", (learner_id,)
        ).fetchone()
        if learner is None:
            raise HTTPException(status_code=404, detail="Learner not found.")
        evidence = connection.execute(
            "SELECT id, concept_id, evidence_type, correct, independent, details, created_at FROM evidence WHERE learner_id = ? ORDER BY id DESC LIMIT 50",
            (learner_id,),
        ).fetchall()
        concepts = [
            dict(row)
            for row in connection.execute(
                "SELECT id, subject, description FROM concepts ORDER BY subject, id"
            ).fetchall()
        ]
        edges = connection.execute(
            "SELECT concept_id, prerequisite_id FROM prerequisites ORDER BY concept_id, prerequisite_id"
        ).fetchall()
    records = [dict(row) for row in evidence]
    prerequisites: dict[str, list[str]] = {}
    for edge in edges:
        prerequisites.setdefault(edge["concept_id"], []).append(edge["prerequisite_id"])
    latest_loop_evidence = next(
        (item for item in records if item["concept_id"] == "loops"), None
    )
    misconceptions = []
    if latest_loop_evidence and not latest_loop_evidence["correct"] and "recurs" in latest_loop_evidence["details"].lower():
        misconceptions.append("loop_recursion_confusion")
    return {
        "learner": dict(learner),
        "knowledge_graph": {
            "concepts": concepts,
            "skills": [
                "trace_loop",
                "distinguish_iteration_from_recursion",
                "solve_equations",
                "translate_word_problems_to_equations",
            ],
            "prerequisites": prerequisites,
            "misconceptions": misconceptions,
        },
        "evidence": records,
        "mastery_estimates": _mastery_estimates(records),
        "evidence_refs": [f"evidence:{item['id']}" for item in records],
        "uncertainty": ["Seed records are illustrative; more independent and delayed evidence is needed."],
    }


def _mastery_estimates(records: list[dict]) -> dict[str, float]:
    estimates: dict[str, float] = {}
    for concept in {item["concept_id"] for item in records}:
        concept_records = [item for item in records if item["concept_id"] == concept]
        prior = 0.5
        for item in reversed(concept_records):
            strength = 0.8 if item["independent"] else 0.35
            likelihood = 0.85 if item["correct"] else 0.2
            posterior = (prior * likelihood) / (
                prior * likelihood + (1 - prior) * (1 - likelihood)
            )
            prior = prior * (1 - strength) + posterior * strength
        estimates[concept] = round(prior, 3)
    return estimates


@app.get("/api/curriculum")
def curriculum(user: dict[str, str] = Depends(actor)) -> dict:
    del user
    with connect() as connection:
        concepts = [
            dict(row)
            for row in connection.execute(
                "SELECT id, subject, description FROM concepts ORDER BY subject, id"
            ).fetchall()
        ]
        prerequisites = [
            dict(row)
            for row in connection.execute(
                "SELECT concept_id, prerequisite_id FROM prerequisites ORDER BY concept_id, prerequisite_id"
            ).fetchall()
        ]
    return {"concepts": concepts, "prerequisites": prerequisites}


@app.post("/api/assessments/submit")
def submit_assessment(
    payload: AssessmentSubmission, user: dict[str, str] = Depends(actor)
) -> dict:
    learner_id = payload.learner_id or user["learner_id"]
    require_learner_access(learner_id, user)
    with connect() as connection:
        exists = connection.execute("SELECT 1 FROM learners WHERE id = ?", (learner_id,)).fetchone()
        if exists is None:
            raise HTTPException(status_code=404, detail="Learner not found.")
        result = LearningOrchestrator(connection).run(
            learner_id, payload.answer, user["role"], payload.concept
        )
        write_audit(
            connection,
            "assessment_submitted",
            user,
            learner_id,
            {"concept": payload.concept, "response_length": len(payload.answer)},
        )
    return result


@app.post("/api/learners/{learner_id}/verify")
def verify_learning(
    learner_id: str,
    payload: VerificationSubmission,
    user: dict[str, str] = Depends(actor),
) -> dict:
    require_learner_access(learner_id, user)
    with connect() as connection:
        learner = connection.execute("SELECT 1 FROM learners WHERE id = ?", (learner_id,)).fetchone()
        if learner is None:
            raise HTTPException(status_code=404, detail="Learner not found.")
        if payload.kind == "delayed_retention":
            prior = connection.execute(
                """
                SELECT created_at FROM evidence
                WHERE learner_id = ? AND concept_id = 'loops'
                  AND evidence_type = 'independent_application' AND independent = 1 AND correct = 1
                ORDER BY id DESC LIMIT 1
                """,
                (learner_id,),
            ).fetchone()
            if prior is None:
                raise HTTPException(status_code=409, detail="Complete an independent application before delayed retention.")
            elapsed = connection.execute(
                "SELECT julianday('now') - julianday(?) AS days", (prior["created_at"],)
            ).fetchone()["days"]
            if elapsed is None or elapsed < 1:
                raise HTTPException(status_code=409, detail="Delayed retention must be checked at least 24 hours after independent application.")
        assessment = AssessmentAgent().process(
            {"concept": "loops", "answer": payload.answer, "assessment_type": payload.kind}
        )
        correct = bool(assessment["output"]["correct"])
        evidence_type = payload.kind
        connection.execute(
            "INSERT INTO evidence (learner_id, concept_id, evidence_type, correct, independent, details) VALUES (?, 'loops', ?, ?, 1, ?)",
            (learner_id, evidence_type, int(correct), payload.answer[:1000]),
        )
        rows = connection.execute(
            "SELECT id, concept_id, evidence_type, correct, independent, details, created_at FROM evidence WHERE learner_id = ? ORDER BY id DESC LIMIT 50",
            (learner_id,),
        ).fetchall()
        records = [dict(row) for row in rows]
        application_records = [
            item for item in records if item["evidence_type"] == "independent_application"
        ]
        retention_records = [
            item for item in records if item["evidence_type"] == "delayed_retention"
        ]
        has_application = any(item["correct"] for item in application_records)
        has_retention = any(item["correct"] for item in retention_records)
        verified = has_application and has_retention
        write_audit(
            connection,
            "learning_verification",
            user,
            learner_id,
            {"kind": payload.kind, "correct": correct, "verified": verified},
            "VERIFY",
        )
        mastery = LearnerIntelligenceAgent().process(
            {
                "concept": "loops",
                "correct": correct,
                "prior_mastery": _mastery_estimates(records[1:]).get("loops", 0.5),
                "independent": True,
                "evidence_refs": [f"evidence:{records[0]['id']}"],
            }
        )
    return {
        "verification": assessment["output"],
        "independent_application_completed": has_application,
        "delayed_retention_completed": has_retention,
        "verified": verified,
        "mastery_update": mastery,
        "prompt": (
            "A door sensor should count each time it opens until it has counted five openings. Explain what repeats and when the process stops."
            if payload.kind == "independent_application"
            else "Without looking back, describe how to check a temperature every minute for ten minutes. Explain the stopping rule."
        ),
        "next_step": "Learning verified with independent and delayed evidence." if verified else (
            "Complete a delayed retention check at least 24 hours after successful independent application."
            if has_application
            else "Pass a fresh independent application task before the delayed retention check."
        ),
    }


@app.post("/api/plan/{learner_id}")
def study_plan(
    learner_id: str,
    payload: StudyPlanRequest,
    user: dict[str, str] = Depends(actor),
) -> dict:
    require_learner_access(learner_id, user)
    from .agents import PlannerAgent

    with connect() as connection:
        if connection.execute("SELECT 1 FROM learners WHERE id = ?", (learner_id,)).fetchone() is None:
            raise HTTPException(status_code=404, detail="Learner not found.")
        result = PlannerAgent().process(
            {
                "targets": payload.targets,
                "missed_days": payload.missed_days,
                "evidence_refs": [f"learner:{learner_id}:study_plan"],
            }
        )
        write_audit(
            connection,
            "study_plan_generated",
            user,
            learner_id,
            result,
            "PLAN",
        )
    return result


@app.post("/api/demo/run")
def run_demo(user: dict[str, str] = Depends(actor)) -> dict:
    require_staff(user)
    with connect() as connection:
        return LearningOrchestrator(connection).run_cohort_demo()


@app.post("/api/interventions/{intervention_id}/decision")
def decide_intervention(
    intervention_id: str,
    payload: InterventionDecision,
    user: dict[str, str] = Depends(actor),
) -> dict:
    require_staff(user)
    status = "approved" if payload.approved else "rejected"
    with connect() as connection:
        intervention = connection.execute(
            "SELECT id, status FROM interventions WHERE id = ?", (intervention_id,)
        ).fetchone()
        if intervention is None:
            raise HTTPException(status_code=404, detail="Intervention draft not found.")
        if intervention["status"] != "pending":
            raise HTTPException(status_code=409, detail="This intervention has already been reviewed.")
        connection.execute(
            "UPDATE interventions SET status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?",
            (status, user["role"], intervention_id),
        )
        write_audit(
            connection,
            "intervention_decision",
            user,
            None,
            {"intervention_id": intervention_id, "approved": payload.approved},
        )
    return {"intervention_id": intervention_id, "status": status}


@app.post("/api/demo/follow-up")
def demo_follow_up(
    payload: DemoFollowupSubmission,
    user: dict[str, str] = Depends(actor),
) -> dict:
    require_staff(user)
    learner_ids = [response.learner_id for response in payload.responses]
    if len(set(learner_ids)) != len(learner_ids):
        raise HTTPException(status_code=422, detail="Each learner may appear only once in a follow-up batch.")
    with connect() as connection:
        intervention = connection.execute(
            "SELECT status FROM interventions WHERE id = ?", (payload.intervention_id,)
        ).fetchone()
        if intervention is None:
            raise HTTPException(status_code=404, detail="Intervention draft not found.")
        if intervention["status"] != "approved":
            raise HTTPException(status_code=409, detail="An educator must approve the intervention before follow-up.")
        results = []
        for response in payload.responses:
            if connection.execute(
                "SELECT 1 FROM learners WHERE id = ?", (response.learner_id,)
            ).fetchone() is None:
                raise HTTPException(status_code=404, detail=f"Learner {response.learner_id} not found.")
            assessment = AssessmentAgent().process(
                {
                    "concept": "loops",
                    "answer": response.answer,
                    "assessment_type": "independent_application",
                    "evidence_refs": [f"intervention:{payload.intervention_id}"],
                }
            )
            correct = bool(assessment["output"]["correct"])
            evidence_cursor = connection.execute(
                """
                INSERT INTO evidence
                    (learner_id, concept_id, evidence_type, correct, independent, details)
                VALUES (?, 'loops', 'independent_application', ?, 1, ?)
                """,
                (response.learner_id, int(correct), response.answer[:1000]),
            )
            results.append(
                {
                    "learner_id": response.learner_id,
                    "correct": correct,
                    "feedback": assessment["output"]["feedback"],
                    "evidence_refs": [
                        f"evidence:{evidence_cursor.lastrowid}",
                        f"intervention:{payload.intervention_id}",
                    ],
                }
            )
        summary = {
            "intervention_id": payload.intervention_id,
            "responses_received": len(results),
            "correct": sum(result["correct"] for result in results),
            "incorrect": sum(not result["correct"] for result in results),
            "results": results,
            "delayed_retention_due": "At least 24 hours after each successful independent application.",
        }
        write_audit(
            connection,
            "cohort_follow_up_assessment",
            user,
            None,
            summary,
            "VERIFY",
        )
    return {"sample_data_label": "Illustrative sample cohort with follow-up responses", **summary}


@app.get("/api/agents")
def agents(user: dict[str, str] = Depends(actor)) -> dict:
    del user
    return {
        "orchestrator": "seven-stage auditable learning cycle",
        "agents": [
            "knowledge_agent",
            "diagnostic_agent",
            "learner_intelligence_agent",
            "planner_agent",
            "tutor_agent",
            "assessment_agent",
            "pedagogical_agent",
            "support_analytics_agent",
        ],
    }


@app.get("/api/audit")
def audit_log(limit: int = 100, user: dict[str, str] = Depends(actor)) -> list[dict]:
    require_staff(user)
    safe_limit = max(1, min(limit, 500))
    with connect() as connection:
        rows = connection.execute(
            "SELECT id, event_type, actor_role, learner_id, stage, payload, created_at FROM audit_log ORDER BY id DESC LIMIT ?",
            (safe_limit,),
        ).fetchall()
    return [dict(row) for row in rows]


@app.post("/api/voice/consent")
def voice_consent(
    payload: ConsentRequest, user: dict[str, str] = Depends(actor)
) -> dict:
    learner_id = user["learner_id"]
    require_learner_access(learner_id, user)
    with connect() as connection:
        connection.execute(
            """
            INSERT INTO voice_consents (learner_id, granted, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(learner_id) DO UPDATE SET
                granted = excluded.granted, updated_at = CURRENT_TIMESTAMP
            """,
            (learner_id, int(payload.consent)),
        )
        write_audit(
            connection,
            "voice_consent_updated",
            user,
            learner_id,
            {"consent": payload.consent},
        )
    return {"consent": payload.consent, "revocable": True}


@app.post("/api/voice/synthesize")
def voice_synthesis(payload: VoiceRequest, user: dict[str, str] = Depends(actor)) -> dict:
    learner_id = user["learner_id"]
    with connect() as connection:
        consent_row = connection.execute(
            "SELECT granted FROM voice_consents WHERE learner_id = ?", (learner_id,)
        ).fetchone()
        consent = bool(consent_row and consent_row["granted"])
        try:
            response = synthesize(
                {"text": payload.text, "personalized": payload.personalized, "consent": consent}
            )
        except ValueError as error:
            raise HTTPException(status_code=403, detail=str(error)) from error
        write_audit(
            connection,
            "voice_synthesis_requested",
            user,
            learner_id,
            {"personalized": payload.personalized, "consent_granted": consent},
        )
    return response
