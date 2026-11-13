"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, CircleAlert, ClipboardCheck, Play, UsersRound } from "lucide-react";
import { Button, Card, PageHeading, SectionTitle, StatusPill } from "@/components/ui";
import { apiPost, displayValue, objectFrom } from "@/lib/api";
import { useApi } from "@/lib/use-api";

const emptyLearners: Record<string, unknown>[] = [];
const overviewFallback = {
  sample_data_label: "Illustrative sample data",
  cohort: { name: "First-year programming", students: 25, loop_recursion_confusion: 16 },
  audit_events: 0,
};

function getLearners(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(objectFrom) : emptyLearners;
}

export default function TeachPage() {
  const { data: learnersData, error: learnersError, refresh: refreshLearners } = useApi("/api/learners", emptyLearners, "educator");
  const { data: overviewData, error: overviewError, refresh: refreshOverview } = useApi("/api/overview", overviewFallback, "educator");
  const learners = useMemo(() => getLearners(learnersData), [learnersData]);
  const overview = objectFrom(overviewData);
  const cohort = objectFrom(overview.cohort);
  const [demo, setDemo] = useState<Record<string, unknown> | null>(null);
  const [decision, setDecision] = useState("");
  const [running, setRunning] = useState(false);
  const [followUpAnswer, setFollowUpAnswer] = useState("Repeat each time the sensor opens until five openings, then stop.");
  const [followUp, setFollowUp] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");

  async function runDemo() {
    setRunning(true);
    setError("");
    setDecision("");
    setFollowUp(null);
    try {
      setDemo(objectFrom(await apiPost<unknown>("/api/demo/run", undefined, "educator")));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The cohort assessment could not be run.");
    } finally {
      setRunning(false);
    }
  }

  async function reviewIntervention(approved: boolean) {
    const approvalInfo = objectFrom(demo?.approval);
    const interventionId = approvalInfo.intervention_id;
    if (typeof interventionId !== "string") return;
    setRunning(true);
    setError("");
    try {
      await apiPost(`/api/interventions/${encodeURIComponent(interventionId)}/decision`, { approved }, "educator");
      setDecision(approved ? "approved" : "rejected");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The intervention review could not be saved.");
    } finally {
      setRunning(false);
    }
  }

  async function runFollowUp() {
    const approvalInfo = objectFrom(demo?.approval);
    if (typeof approvalInfo.intervention_id !== "string") return;
    setRunning(true);
    setError("");
    try {
      const result = await apiPost<unknown>("/api/demo/follow-up", {
        intervention_id: approvalInfo.intervention_id,
        responses: [{ learner_id: "learner-01", answer: followUpAnswer }],
      }, "educator");
      setFollowUp(objectFrom(result));
      await Promise.all([refreshOverview(), refreshLearners()]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The follow-up assessment could not be submitted.");
    } finally {
      setRunning(false);
    }
  }

  const detection = objectFrom(objectFrom(demo?.detection).output);
  const lesson = objectFrom(objectFrom(demo?.educator_intervention_draft).output);
  const lessonSteps = Array.isArray(lesson.lesson) ? lesson.lesson : [];
  const practice = Array.isArray(lesson.practice) ? lesson.practice.map(objectFrom) : [];
  const individualActions = Array.isArray(demo?.individual_recommendations) ? demo.individual_recommendations : [];
  const followUpCounts = objectFrom(followUp);

  return (
    <div>
      <PageHeading
        eyebrow="MINDTRACE TEACH · Educator workspace"
        title="One assessment. Learner support and a class-wide signal."
        description="Review evidence, test prerequisite hypotheses, and decide whether a drafted intervention is appropriate for your class."
        action={<StatusPill>Illustrative sample data</StatusPill>}
      />
      {(learnersError || overviewError) && <p role="status" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">The backend data could not be loaded: {learnersError || overviewError}</p>}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          ["Quiz submissions", cohort.students ?? 25, "First-year programming cohort"],
          ["Loop / recursion confusion", cohort.loop_recursion_confusion ?? 16, "Latest learner evidence"],
          ["Learner-specific actions", demo ? individualActions.length : "—", "Evidence-linked next steps"],
        ].map(([label, value, detail]) => (
          <Card key={String(label)} className="p-5">
            <p className="text-xs font-bold uppercase tracking-[.13em] text-slate-400">{String(label)}</p>
            <p className="mt-2 text-2xl font-semibold text-ink">{String(value)}</p>
            <p className="mt-1 text-sm text-slate-500">{String(detail)}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
        <Card className="p-6 sm:p-7">
          <SectionTitle title="Cohort evidence" detail="Signals are descriptive and should be checked with learners." />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead><tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400"><th className="pb-3 font-semibold">Learner</th><th className="pb-3 font-semibold">Evidence items</th><th className="pb-3 font-semibold">Observed accuracy</th></tr></thead>
              <tbody>
                {learners.slice(0, 10).map((learner, index) => {
                  const accuracy = typeof learner.observed_accuracy === "number" ? Math.round(learner.observed_accuracy * 100) : null;
                  return <tr key={displayValue(learner.id, `learner-${index}`)} className="border-b border-slate-50 last:border-0">
                    <td className="py-3 font-semibold text-ink">{displayValue(learner.display_name, `Student ${String(index + 1).padStart(2, "0")}`)}</td>
                    <td className="py-3 text-slate-500">{displayValue(learner.evidence_count, "—")}</td>
                    <td className="py-3 text-slate-500">{accuracy === null ? "—" : `${accuracy}%`}</td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-slate-400">25 first-year programming learners · all figures are illustrative sample data.</p>
        </Card>

        <div className="space-y-5">
          <Card className="p-6">
            <SectionTitle title="Run the cohort assessment" detail="A single assessment creates individual actions and a shared teaching signal." />
            <div className="rounded-xl bg-[#f7f9f6] p-4">
              <p className="text-sm font-semibold text-ink">Quiz: loops versus recursion</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">The seed includes 25 responses. The illustrative signal detects 16 learners confusing iteration with a function calling itself.</p>
            </div>
            <Button className="mt-4 w-full" disabled={running} onClick={() => void runDemo()}>
              <Play size={16} /> {running ? "Analyzing cohort…" : "Run assessment analysis"}
            </Button>
          </Card>

          {demo && <Card className="p-6">
            <SectionTitle title="Class-wide teaching signal" detail="The diagnostic is a hypothesis; use a focused prerequisite check before deciding on support." />
            <div className="rounded-xl border border-[#f1dfbf] bg-[#fffaf0] p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink"><CircleAlert size={17} className="text-[#a9792b]" /> {displayValue(detection.affected_learners, "0")} learners may confuse loops with recursion</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{displayValue(detection.teaching_signal, "Review the latest evidence with the class.")}</p>
            </div>
            <p className="mt-4 text-sm font-semibold text-ink">Individual actions created: {individualActions.length}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">Each action references learner evidence. Proposed prerequisite checks focus on variables and conditionals before reteaching loops.</p>

            <div className="mt-5 border-t border-slate-100 pt-5">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#edf5ef] text-forest"><UsersRound size={18} /></span>
                <div><p className="font-semibold text-ink">{displayValue(lesson.lesson_title, "Targeted remedial lesson")}</p><p className="mt-1 text-xs text-slate-500">{displayValue(lesson.duration_minutes, "10")} minutes · draft for educator review</p></div>
              </div>
              <ol className="mt-4 list-inside list-decimal space-y-2 text-sm leading-5 text-slate-600">
                {lessonSteps.map((step, index) => <li key={index}>{String(step)}</li>)}
              </ol>
              {practice.length > 0 && <div className="mt-4 space-y-2">{practice.map((item, index) => <p key={index} className="rounded-lg bg-[#f7f9f6] p-3 text-xs leading-5 text-slate-600">{String(item.prompt ?? "Practice task")}</p>)}</div>}
              <div className="mt-5 rounded-xl border border-[#f1dfbf] bg-[#fffaf0] p-4">
                <p className="text-sm font-semibold text-ink">Educator approval required</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">The draft cannot be used for consequential academic decisions without your explicit review.</p>
                {!decision && <div className="mt-3 flex flex-wrap gap-2">
                  <Button disabled={running} onClick={() => void reviewIntervention(true)}><ClipboardCheck size={15} /> Approve draft</Button>
                  <button disabled={running} onClick={() => void reviewIntervention(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-50">Decline</button>
                </div>}
                {decision && <p role="status" className="mt-3 flex items-center gap-2 text-sm font-semibold text-forest"><CheckCircle2 size={16} /> Intervention {decision} by educator</p>}
              </div>

              {decision === "approved" && <div className="mt-5 border-t border-slate-100 pt-5">
                <label htmlFor="follow-up-answer" className="block text-sm font-semibold text-ink">Independent follow-up application</label>
                <p className="mt-1 text-xs leading-5 text-slate-500">A door sensor counts each time it opens until five openings. Explain what repeats and when the process stops.</p>
                <textarea id="follow-up-answer" value={followUpAnswer} onChange={(event) => setFollowUpAnswer(event.target.value)} rows={3} className="mt-3 w-full rounded-xl border border-slate-200 p-3 text-sm leading-5 text-ink" />
                <Button className="mt-3 w-full" disabled={running || !followUpAnswer.trim()} onClick={() => void runFollowUp()}>{running ? "Checking application…" : "Run follow-up check for Student 01"}</Button>
                {followUp && <p role="status" className="mt-3 rounded-lg bg-[#f0f8f1] p-3 text-sm leading-5 text-forest">Follow-up recorded: {displayValue(followUpCounts.correct, "0")} correct, {displayValue(followUpCounts.incorrect, "0")} needs another try. Delayed retention is still required at least 24 hours after successful independent application.</p>}
              </div>}
            </div>
          </Card>}

          {(error || learnersError || overviewError) && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error || learnersError || overviewError}</p>}
          <p className="text-xs leading-5 text-slate-400">Illustrative sample data. Educator decisions are logged and reviewable; no intervention is automatic.</p>
        </div>
      </div>
    </div>
  );
}
