"use client";

import { useMemo, useState } from "react";
import { Activity, ArrowRight, Building2, Network, Sparkles, Users } from "lucide-react";
import { Button, Card, PageHeading, SectionTitle, StatusPill } from "@/components/ui";
import { apiGet, apiPost, displayValue, objectFrom } from "@/lib/api";
import { useApi } from "@/lib/use-api";

const overviewFallback = {
  sample_data_label: "Illustrative sample data",
  cohort: { name: "First-year programming", students: 25, loop_recursion_confusion: 16 },
  audit_events: 0,
};

function listFrom(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(objectFrom) : [];
}

export default function CampusPage() {
  const { data: learnersData, error: learnersError } = useApi("/api/learners", [], "educator");
  const { data: overviewData, error: overviewError, refresh: refreshOverview } = useApi("/api/overview", overviewFallback, "educator");
  const { data: auditData, error: auditError, refresh: refreshAudit } = useApi("/api/audit?limit=8", [], "educator");
  const learners = useMemo(() => listFrom(learnersData), [learnersData]);
  const audit = useMemo(() => listFrom(auditData), [auditData]);
  const overview = objectFrom(overviewData);
  const cohort = objectFrom(overview.cohort);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [demo, setDemo] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

  async function showLearner(learner: Record<string, unknown>) {
    const id = displayValue(learner.id);
    if (id === "—") return;
    setError("");
    try {
      setSelected(objectFrom(await apiGet<unknown>(`/api/learners/${encodeURIComponent(id)}`, learner, "educator")));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The learner profile could not be loaded.");
    }
  }

  async function runCohortDemo() {
    setWorking(true);
    setError("");
    try {
      setDemo(objectFrom(await apiPost<unknown>("/api/demo/run", undefined, "educator")));
      await Promise.all([refreshOverview(), refreshAudit()]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The cohort insight could not be generated.");
    } finally {
      setWorking(false);
    }
  }

  const detailLearner = objectFrom(selected?.learner);
  const graph = objectFrom(selected?.knowledge_graph);
  const mastery = objectFrom(selected?.mastery_estimates);
  const detection = objectFrom(objectFrom(demo?.detection).output);

  return (
    <div>
      <PageHeading eyebrow="MINDTRACE CAMPUS · Institution view" title="A learning community, in context." description="Monitor cohort learning signals and learner evidence from the same intelligence engine. Signals support human review; they never make academic decisions." action={<StatusPill>Illustrative sample data</StatusPill>} />
      {(learnersError || overviewError || auditError) && <p role="status" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Some live campus data could not be loaded: {learnersError || overviewError || auditError}</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Cohort learners", cohort.students ?? 25, Users],
          ["Loop / recursion signal", cohort.loop_recursion_confusion ?? 16, Network],
          ["Signal rate", `${Math.round((Number(cohort.loop_recursion_confusion ?? 16) / Math.max(1, Number(cohort.students ?? 25))) * 100)}%`, Activity],
          ["Auditable events", overview.audit_events ?? 0, Building2],
        ].map(([label, value, Icon]) => {
          const MetricIcon = Icon as typeof Users;
          return <Card key={String(label)} className="flex items-center gap-4 p-5"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#edf5ef] text-forest"><MetricIcon size={20} /></span><div><p className="text-xl font-semibold text-ink">{displayValue(value)}</p><p className="mt-1 text-xs text-slate-500">{String(label)}</p></div></Card>;
        })}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
        <Card className="p-6 sm:p-7">
          <div className="mb-5 flex items-center justify-between"><SectionTitle title="First-year programming cohort" detail="Select a learner to view their shared evidence and knowledge graph." /><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f0effb] text-[#65599e]"><Users size={19} /></span></div>
          <div className="grid gap-3 sm:grid-cols-2">
            {learners.slice(0, 8).map((learner, index) => {
              const accuracy = typeof learner.observed_accuracy === "number" ? Math.round(learner.observed_accuracy * 100) : null;
              return <button key={displayValue(learner.id, `learner-${index}`)} onClick={() => void showLearner(learner)} className="focus-ring rounded-xl border border-slate-100 p-4 text-left transition hover:border-[#c9ddcd] hover:bg-[#fbfdfb]">
                <div className="flex items-start justify-between"><div><p className="font-semibold text-ink">{displayValue(learner.display_name, `Student ${String(index + 1).padStart(2, "0")}`)}</p><p className="mt-1 text-xs text-slate-400">{displayValue(learner.cohort, "First-year programming")}</p></div><ArrowRight size={16} className="text-slate-300" /></div>
                <div className="mt-4 flex items-center justify-between text-xs"><span className="text-slate-500">{displayValue(learner.evidence_count, "0")} evidence items</span><span className="font-semibold text-forest">{accuracy === null ? "New evidence" : `${accuracy}% observed accuracy`}</span></div>
              </button>;
            })}
          </div>
          <p className="mt-4 text-xs text-slate-400">25 illustrative learners · latest learner activity updates the cohort views.</p>
        </Card>

        <div className="space-y-5">
          <Card className="p-6">
            <SectionTitle title="Cohort learning signal" detail="One assessment can connect learner actions with educator support." />
            <div className="rounded-xl bg-[#f7f9f6] p-4">
              <p className="text-sm font-semibold text-ink">{displayValue(cohort.loop_recursion_confusion, "16")} learners flagged for a loop-versus-recursion check</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">The cohort signal is a hypothesis, not a diagnosis. Test variables and conditionals before assuming root cause.</p>
            </div>
            <Button className="mt-4 w-full" disabled={working} onClick={() => void runCohortDemo()}><Sparkles size={16} /> {working ? "Updating cohort insight…" : "Run shared cohort assessment"}</Button>
            {demo && <p role="status" className="mt-3 rounded-lg bg-[#f0f8f1] p-3 text-sm leading-5 text-forest">Assessment covered {displayValue(objectFrom(demo.assessment).students_completed, "0")} learners and detected {displayValue(detection.affected_learners, "0")} possible misconceptions. The educator-reviewed lesson draft is available in Teach.</p>}
            {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          </Card>

          <Card className="p-6">
            <SectionTitle title="Recent audit trail" detail="Reviewable events from the shared learner engine." />
            {audit.length === 0 ? <p className="text-sm text-slate-500">No recent events yet.</p> : <ul className="space-y-3">{audit.slice(0, 5).map((event, index) => <li key={displayValue(event.id, String(index))} className="flex items-start gap-3 border-b border-slate-50 pb-3 last:border-0"><span className="mt-1 h-2 w-2 rounded-full bg-[#70ad86]" /><div><p className="text-sm font-medium text-ink">{displayValue(event.event_type, "Learning event").replace(/_/g, " ")}</p><p className="mt-1 text-xs text-slate-400">{displayValue(event.stage ?? event.actor_role, "System")} · {displayValue(event.created_at, "recent")}</p></div></li>)}</ul>}
          </Card>
        </div>
      </div>

      {selected && <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#102820]/45 p-3 sm:items-center" role="dialog" aria-modal="true" aria-label="Learner profile" onClick={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
        <Card className="max-h-[90vh] w-full max-w-xl overflow-y-auto p-6">
          <div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-forest">Shared learner profile · illustrative data</p><h2 className="mt-2 text-xl font-semibold">{displayValue(detailLearner.display_name, "Learner profile")}</h2><p className="mt-1 text-xs text-slate-500">{displayValue(detailLearner.cohort)}</p></div><button onClick={() => setSelected(null)} aria-label="Close learner profile" className="rounded-lg px-3 py-1 text-xl text-slate-400 hover:bg-slate-100">×</button></div>
          <h3 className="mt-5 text-sm font-semibold text-ink">Mastery estimates</h3>
          <div className="mt-2 flex flex-wrap gap-2">{Object.entries(mastery).length ? Object.entries(mastery).map(([concept, value]) => <StatusPill key={concept}>{concept.replace(/_/g, " ")} · {Math.round(Number(value) * 100)}%</StatusPill>) : <p className="text-sm text-slate-500">No mastery evidence yet.</p>}</div>
          <h3 className="mt-5 text-sm font-semibold text-ink">Prerequisite graph</h3>
          <div className="mt-2 flex flex-wrap gap-2">{Object.entries(objectFrom(graph.prerequisites)).map(([concept, prereqs]) => <StatusPill key={concept}>{concept} ← {Array.isArray(prereqs) ? prereqs.join(", ") : ""}</StatusPill>)}</div>
          <h3 className="mt-5 text-sm font-semibold text-ink">Evidence</h3>
          <ul className="mt-2 space-y-2">{(Array.isArray(selected.evidence) ? selected.evidence.map(objectFrom) : []).slice(0, 5).map((entry) => <li key={displayValue(entry.id)} className="rounded-lg bg-[#f7f9f6] p-3 text-xs leading-5 text-slate-600">{displayValue(entry.evidence_type)} · {displayValue(entry.concept_id)} · {entry.correct ? "correct" : "needs practice"} · {displayValue(entry.created_at)}</li>)}</ul>
          <p className="mt-4 text-xs leading-5 text-slate-400">Learning signals are evidence-informed estimates, not grades or automated decisions.</p>
          <Button className="mt-5 w-full" onClick={() => setSelected(null)}>Done</Button>
        </Card>
      </div>}
    </div>
  );
}
