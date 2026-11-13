# MindTrace AI

**From answering questions to understanding learning.** MindTrace AI is a South African-born learning intelligence MVP with five connected experiences using one learner model and evidence base.

## The five experiences

| Experience | Route | MVP capability |
|---|---|---|
| MINDTRACE LEARN | `/learn` | Diagnostics, grounded tutoring, adaptive plans, evidence and progress |
| MINDTRACE TEACH | `/teach` | Assessment analysis, misconception signals and reviewable feedback/intervention drafts |
| MINDTRACE CAMPUS | `/campus` | Cohort trends, learner evidence and controlled administration |
| MINDTRACE SKILLS | `/skills` | Applied tasks, independent practice and competency evidence |
| MINDTRACE VOICE | `/voice` | Browser speech input/output, text alternatives and optional consent-based voice personalization |

The shared SQLite learner record connects individual evidence to educator and institutional views. The seeded 25-person cohort and its assessment outcomes are **Illustrative sample data**.

## Run locally

Requirements: Python 3.10+ and Node.js 18+.

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API is at `http://localhost:8000`; interactive API documentation is at `/docs`. The SQLite database is created and seeded on first startup. Set `MINDTRACE_DB` to change its location and `MINDTRACE_CORS_ORIGINS` to a comma-separated list of allowed frontend origins.

### Frontend

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`. Set `NEXT_PUBLIC_API_URL` if the backend is not at `http://localhost:8000`.

The local demo accepts `X-Role: learner|educator|admin` and `X-Learner-ID` headers (default learner: `learner-01`). These headers are enabled by `MINDTRACE_DEMO_MODE=true` for a credential-free hackathon demo and are **not production authentication**. For API-key authentication, set `MINDTRACE_DEMO_MODE=false` and configure `MINDTRACE_API_TOKENS` as a JSON object mapping secret bearer tokens to claims, for example `{"replace-with-secret":{"role":"educator"}}` or `{"learner-token":{"role":"learner","learner_id":"learner-01"}}`. Never commit real tokens. Use a managed identity provider and short-lived credentials for a real deployment.

### Backend tests

```bash
PYTHONPATH=backend backend/.venv/bin/python -m unittest discover -s backend/tests -v
```

## Shared intelligence cycle

The lightweight state-machine orchestrator in `backend/app/orchestrator.py` emits an auditable structured result at each stage. Every stage includes `output`, `evidence_refs`, `confidence`, `uncertainty`, and `audit_event`.

1. **OBSERVE** — capture answers and learning activity.
2. **DIAGNOSE** — identify possible gaps and misconceptions; test prerequisite hypotheses rather than assume root causes.
3. **PLAN** — choose a next path and schedule; missed days shift the plan.
4. **TEACH** — provide a guided explanation grounded in seeded course material and include source references.
5. **ASSESS** — ask a question or task and analyze the response.
6. **VERIFY** — require a fresh independent application and a separate delayed-retention check. A lesson completion or correct MCQ alone is not verification. The API requires at least 24 hours between the independent application and delayed-retention evidence.
7. **UPDATE** — update a transparent Bayesian-style mastery estimate and next action. The estimate is an MVP indicator, not a high-stakes grade.

Use `POST /api/assessments/submit` to run a cycle and `POST /api/learners/{learner_id}/verify` with `independent_application` and later `delayed_retention` to add verification evidence.

## Cohort demonstration

`POST /api/demo/run` (educator/admin role) performs the seeded first-year programming flow: 25 quiz records, a detected loop/recursion misconception (16 illustrative learners), prerequisite hypotheses, individual recommendations, an educator intervention draft and a proposed fresh follow-up plus delayed-retention check. The draft is **not automatically approved**. Any consequential academic action must remain under educator control.

## Agent architecture

All agents are separate, JSON-in/JSON-out components in `backend/app/agents/`:

- `knowledge_agent.py` — retrieval over seeded, source-labelled course materials
- `diagnostic_agent.py` — misconception and prerequisite hypotheses
- `learner_intelligence_agent.py` — knowledge graph and Bayesian-style mastery
- `planner_agent.py` — adaptive schedule and missed-day replanning
- `tutor_agent.py` — grounded explanations and guided practice
- `assessment_agent.py` — quiz/response analysis
- `pedagogical_agent.py` — targeted lesson and exercise drafts
- `support_analytics_agent.py` — cohort signals and routine triage

The LLM integration is isolated behind `LLMProvider.complete()` in `backend/app/services/llm_provider.py`; the hackathon uses a swappable mock. Mastery estimation uses a statistical calculation, not an LLM. SQLite models and schema are an MVP starting point for PostgreSQL, Neo4j and pgvector evolution.

## Responsible AI, privacy and operations

- Role checks limit learner records to their owner; cohort and audit data are staff-only. Demo headers are for local presentation only; use configured bearer credentials or a verified identity provider outside demo mode.
- The MVP stores learner evidence in local SQLite. It does **not** implement production encryption at rest/in transit, key management, backup, monitoring, retention enforcement or incident response. Production deployment must add these controls and documented retention/deletion rules.
- The requested Next.js 14 dependency line currently reports critical Next.js and high PostCSS advisories in `npm audit --omit=dev`; npm's automatic fix requires a breaking upgrade beyond the requested Next.js 14 stack. Keep this MVP in a controlled demo environment and resolve/revalidate dependencies before public deployment.
- Course-grounded tutor responses include source references. Seed materials are illustrative and must be reviewed and replaced with approved, rights-cleared content.
- Educators retain control over consequential academic decisions; remedial interventions are drafts requiring approval.
- Voice personalization is optional and off by default. `I consent to personalised voice synthesis` must be explicitly opted into and can be revoked. Backend consent is checked for personalized requests; there is no voice matching for authentication. Standard AI speech and text alternatives remain available.
- The MVP browser voice experience uses Web Speech APIs where supported. Backend voice synthesis is a stub.
- Use `backend/Dockerfile` for a containerized API prototype. Persistent `/data` storage is required for its SQLite database; the image is not a production security baseline.

## South African readiness before pilot

- Align mapped content and assessment outcomes with the relevant **CAPS** requirements and educator review.
- Validate low-bandwidth operation, data costs, offline/resume behavior and shared-device privacy.
- Test language, accent, speech-recognition and text-to-speech quality across South African languages and speakers; do not make voice a prerequisite.
- Complete a **POPIA** privacy impact and legal review, establish lawful basis, purpose limitation, access controls, retention/deletion, data-subject workflows and vendor agreements before using real learner data.
- Validate fairness and learning effectiveness with educators and learners before any controlled pilot.

## Market and staged delivery

**Beachhead:** coding academies, technical training providers and private academies.

**Indicative pricing:** Cohort Starter per active learner; annual Institutional Licence; Enterprise/API.

1. Foundation — identity, permissions, approved curriculum, learner evidence and audit.
2. Intelligence — prerequisite graph, misconception diagnostics and cohort analytics.
3. Autonomous tutor — grounded tutoring, adaptive plans and educator-reviewed interventions.
4. Voice input/output — accessible ASR/TTS with text alternatives.
5. VOICE validation — consent, language/accent, privacy and usability validation.
6. Controlled pilot — small, governed cohort with measured learning outcomes and educator oversight.

## Project layout

```text
frontend/                 Next.js 14 App Router + TypeScript + Tailwind
backend/app/main.py       FastAPI API and role checks
backend/app/agents/       Eight specialist agents
backend/app/data/seed.py  SQLite schema and 25 illustrative learners
backend/app/orchestrator.py  Seven-stage shared learning cycle
backend/app/services/     LLM provider abstraction and voice stub
```
