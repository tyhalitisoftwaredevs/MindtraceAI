"use client";

import { FormEvent, useMemo, useState } from "react";
import { Activity, Brain, CheckCircle2, Code2, Compass, HeartHandshake, Lightbulb, Play, Sparkles, Users } from "lucide-react";
import { Button, Card, PageHeading, SectionTitle, StatusPill } from "@/components/ui";
import { apiPost, displayValue, objectFrom } from "@/lib/api";
import { useApi } from "@/lib/use-api";

const agentFallback = {
  agents: [
    "knowledge_agent",
    "diagnostic_agent",
    "learner_intelligence_agent",
    "planner_agent",
    "tutor_agent",
    "assessment_agent",
    "pedagogical_agent",
    "support_analytics_agent",
  ],
};
const descriptions: Record<string, string> = {
  knowledge_agent: "Retrieves approved course material and shows its sources.",
  diagnostic_agent: "Tests prerequisite hypotheses and surfaces possible misconceptions.",
  learner_intelligence_agent: "Connects concepts, evidence and statistical mastery estimates.",
  planner_agent: "Builds and replans personal study schedules.",
  tutor_agent: "Provides grounded explanations and guided practice.",
  assessment_agent: "Reviews learner responses and practical checks.",
  pedagogical_agent: "Drafts focused lessons and practice for educator review.",
  support_analytics_agent: "Highlights descriptive cohort signals for human review.",
};
const icons = [Compass, Brain, Users, Activity, Lightbulb, Code2, HeartHandshake, Sparkles];

export default function SkillsPage() {
  const { data, loading, error: agentsError } = useApi("/api/agents", agentFallback, "learner");
  const agents = useMemo(() => {
    const raw = objectFrom(data).agents;
    return Array.isArray(raw)
      ? raw.map((entry) => typeof entry === "string" ? entry : displayValue(objectFrom(entry).name, "learning_agent"))
      : agentFallback.agents;
  }, [data]);
  const [repetitions, setRepetitions] = useState(3);
  const [simulation, setSimulation] = useState<number[]>([]);
  const [answer, setAnswer] = useState("Repeat the sensor check until five openings, then stop.");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  async function submitApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!answer.trim()) return;
    setWorking(true);
    setError("");
    setResult(null);
    try {
      setResult(objectFrom(await apiPost<unknown>("/api/learners/learner-01/verify", {
        kind: "independent_application",
        answer: answer.trim(),
      }, "learner")));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The competency check could not be submitted.");
    } finally {
      setWorking(false);
    }
  }

  const assessment = objectFrom(result?.verification);
  const mastery = objectFrom(result?.mastery_update);
  const masteryOutput = objectFrom(mastery.output);

  return (
    <div>
      <PageHeading eyebrow="MINDTRACE SKILLS · Practical learning" title="Try it. Apply it. Show what you know." description="Practice a concept in a small simulation, then demonstrate the idea in a new situation. An independent check is evidence—not a grade." action={<StatusPill>Shared learner engine</StatusPill>} />
      {agentsError && <p role="status" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Agent directory unavailable: {agentsError}</p>}

      <div className="grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
        <Card className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-3"><SectionTitle title="Loop counter simulation" detail="See iteration and its stopping rule in action." /><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#edf5ef] text-forest"><Activity size={19} /></span></div>
          <label htmlFor="repetitions" className="mt-4 block text-sm font-semibold text-ink">How many sensor openings should the loop count?</label>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <input id="repetitions" type="number" min={1} max={10} value={repetitions} onChange={(event) => setRepetitions(Math.max(1, Math.min(10, Number(event.target.value) || 1)))} className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <Button onClick={() => setSimulation(Array.from({ length: repetitions }, (_, index) => index + 1))}><Play size={15} /> Run loop</Button>
          </div>
          <div className="mt-5 min-h-24 rounded-xl bg-[#173d33] p-4 text-white">
            {simulation.length === 0 ? <p className="text-sm text-white/65">Run the simulation to trace each iteration and see where it stops.</p> : <ol className="flex flex-wrap gap-2">{simulation.map((step) => <li key={step} className="rounded-lg bg-white/10 px-3 py-2 text-sm">Opening {step}</li>)}</ol>}
            {simulation.length > 0 && <p className="mt-3 text-xs text-[#b8e3c6]">Stopped after {simulation.length} iteration{simulation.length === 1 ? "" : "s"}.</p>}
          </div>

          <form onSubmit={submitApplication} className="mt-7 border-t border-slate-100 pt-6">
            <label htmlFor="application-answer" className="block text-sm font-semibold text-ink">Independent competency check</label>
            <p className="mt-2 text-sm leading-6 text-slate-600">A door sensor should count each time it opens until it has counted five openings. Explain what repeats and when the process stops—without copying the simulation.</p>
            <textarea id="application-answer" value={answer} onChange={(event) => setAnswer(event.target.value)} rows={3} className="mt-3 w-full rounded-xl border border-slate-200 p-3 text-sm leading-5 text-ink" />
            <Button type="submit" className="mt-3" disabled={working || !answer.trim()}>{working ? "Checking application…" : "Submit independent application"}</Button>
          </form>

          {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {result && <div role="status" className="mt-4 rounded-xl border border-[#cfe4d5] bg-[#f0f8f1] p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-forest"><CheckCircle2 size={16} /> {assessment.correct ? "Application evidence recorded" : "Try another explanation"}</p>
            <p className="mt-2 text-sm leading-5 text-slate-600">{displayValue(assessment.feedback)}</p>
            <p className="mt-2 text-xs text-slate-500">Mastery estimate: {displayValue(masteryOutput.mastery_estimate)} · Learning is not verified until an independent task and delayed-retention check are both passed.</p>
          </div>}
        </Card>

        <Card className="p-6 sm:p-8">
          <SectionTitle title="One engine, eight specialists" detail="Each agent returns evidence-linked, reviewable output." />
          {loading && <p className="mb-3 text-sm text-slate-500" aria-live="polite">Connecting to the skills catalog…</p>}
          <div className="space-y-3">
            {agents.map((name, index) => {
              const Icon = icons[index % icons.length];
              return <div key={name} className="flex items-start gap-3 rounded-xl border border-slate-100 p-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#edf5ef] text-forest"><Icon size={17} /></span>
                <div><p className="text-sm font-semibold text-ink">{name.replace(/_agent$/, "").replace(/_/g, " ")}</p><p className="mt-1 text-xs leading-5 text-slate-500">{descriptions[name] ?? "Contributes evidence-linked work to the shared learner intelligence engine."}</p></div>
              </div>;
            })}
          </div>
          <p className="mt-5 text-xs leading-5 text-slate-400">Independent application is followed by a separate delayed-retention check. A correct multiple-choice response alone does not establish competency.</p>
        </Card>
      </div>
    </div>
  );
}
