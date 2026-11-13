"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, BookOpenCheck, Brain, CheckCircle2 } from "lucide-react";
import { SpeechInput } from "@/components/speech-input";
import { Button, Card, PageHeading, StatusPill } from "@/components/ui";
import { apiPost, objectFrom } from "@/lib/api";

const prompt = "In your own words, how does a loop repeat instructions, and what makes it stop?";

export default function LearnPage() {
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!answer.trim()) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const response = await apiPost<unknown>("/api/assessments/submit", {
        learner_id: "learner-01",
        concept: "loops",
        answer: answer.trim(),
      });
      setResult(objectFrom(response));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not submit your check-in.");
    } finally {
      setBusy(false);
    }
  }

  const cycle = objectFrom(result?.cycle);
  const assessment = objectFrom(objectFrom(cycle.ASSESS).output);
  const diagnosis = objectFrom(objectFrom(cycle.DIAGNOSE).output);
  const update = objectFrom(objectFrom(cycle.UPDATE).output);
  const teaching = objectFrom(objectFrom(cycle.TEACH).output);
  const feedback = assessment.feedback;
  const sources = Array.isArray(teaching.sources) ? teaching.sources.map(objectFrom) : [];

  return (
    <div>
      <PageHeading eyebrow="Your learning space" title="Learn at your pace." description="Practice a concept, notice what makes sense, and let your learning context travel with you." action={<StatusPill><span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#63a47c]" /> Connected practice</span></StatusPill>} />
      <div className="grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
        <Card className="overflow-hidden">
          <div className="bg-[#173d33] px-6 py-6 text-white sm:px-8">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-[.16em] text-[#9fd4b5]">Programming foundations · Loops</span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">2 min</span>
            </div>
            <h2 className="mt-4 max-w-xl text-2xl font-semibold leading-snug sm:text-3xl">{prompt}</h2>
            <p className="mt-3 text-sm text-white/65">There’s no perfect answer. Start with what you remember.</p>
          </div>
          <form onSubmit={submit} className="p-6 sm:p-8">
            <label htmlFor="answer" className="mb-2 block text-sm font-semibold text-ink">Your answer</label>
            <textarea id="answer" value={answer} onChange={(event) => setAnswer(event.target.value)} rows={5} placeholder="A loop repeats instructions while…" className="focus-ring w-full resize-y rounded-xl border border-[#dfe6df] bg-[#fbfcfa] p-4 text-sm leading-6 text-ink placeholder:text-slate-400" />
            <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
              <SpeechInput onTranscript={(text) => setAnswer((current) => `${current}${current ? " " : ""}${text}`)} />
              <Button type="submit" disabled={busy || !answer.trim()}>{busy ? "Sending…" : "Share my answer"} <ArrowRight size={16} /></Button>
            </div>
            {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            {result && <div role="status" className="mt-5 rounded-xl border border-[#cfe4d5] bg-[#f0f8f1] p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-forest"><CheckCircle2 size={17} /> Check-in received</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{typeof feedback === "string" ? feedback : "Thanks for sharing your thinking. Your progress is now part of your learning context."}</p>
              {typeof diagnosis.next_diagnostic === "string" && <p className="mt-3 text-sm text-slate-600"><strong>Next diagnostic:</strong> {diagnosis.next_diagnostic}</p>}
              {typeof update.next_action === "string" && <p className="mt-2 text-sm text-slate-600"><strong>Next action:</strong> {update.next_action.replace(/_/g, " ")}</p>}
              {sources.length > 0 && <p className="mt-3 text-xs text-slate-500"><strong>Course source:</strong> {sources.map((source) => String(source.title ?? source.id ?? "Approved course material")).join(", ")}</p>}
              <p className="mt-3 rounded-lg bg-white/70 p-3 text-xs leading-5 text-slate-600">Verification is still due: complete a fresh, independent application and a separate delayed-retention check. A lesson or correct quiz alone does not verify mastery.</p>
            </div>}
            <p className="mt-5 text-xs leading-5 text-slate-400">Your check-in connects to the shared learner engine. You can always type instead of speaking.</p>
          </form>
        </Card>
        <div className="space-y-5">
          <Card className="p-6">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf5ef] text-forest"><Brain size={20} /></span>
            <h2 className="mt-5 text-lg font-semibold">One learner, connected context</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">The learning engine helps connect what you practice here with the support your educators can offer.</p>
            <div className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-500">
              <p className="flex items-center gap-2"><BookOpenCheck size={16} className="text-forest" /> Practice is private to your learning journey</p>
            </div>
          </Card>
          <Card className="bg-[#f0f5ef] p-6">
            <p className="text-xs font-bold uppercase tracking-[.15em] text-forest">A gentle reminder</p>
            <p className="mt-3 text-lg font-semibold leading-snug">Progress isn’t a straight line.</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">Take a pause, try another angle, or come back when you’re ready.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
