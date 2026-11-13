"use client";

import Link from "next/link";
import { ArrowDownRight, ArrowRight, BookOpen, Brain, GraduationCap, Headphones, Sparkles, Users } from "lucide-react";
import { Card, SectionTitle, StatusPill } from "@/components/ui";
import { useApi } from "@/lib/use-api";
import { displayValue, objectFrom } from "@/lib/api";

const overviewFallback = {
  cohort: { students: 25, loop_recursion_confusion: 16 },
  audit_events: 0,
  sample_data_label: "Illustrative sample data",
};
const healthFallback = { status: "unavailable" };
const pathways = [
  { href: "/learn", icon: BookOpen, title: "Learn", detail: "Pick up where curiosity leads.", tone: "bg-[#edf5ef] text-forest" },
  { href: "/teach", icon: GraduationCap, title: "Teach", detail: "Turn learner signals into support.", tone: "bg-[#fff1e9] text-[#ad654b]" },
  { href: "/campus", icon: Users, title: "Campus", detail: "See the whole learning community.", tone: "bg-[#f0effb] text-[#65599e]" },
  { href: "/skills", icon: Sparkles, title: "Skills", detail: "Build and verify practical skills.", tone: "bg-[#edf3fb] text-[#496b9a]" },
  { href: "/voice", icon: Headphones, title: "Voice", detail: "Choose how learning sounds.", tone: "bg-[#fff5dd] text-[#927328]" },
];

export default function HomePage() {
  const { data: overview, error: overviewError } = useApi("/api/overview", overviewFallback, "educator");
  const { data: health } = useApi("/api/health", healthFallback);
  const metrics = objectFrom(overview);
  const cohort = objectFrom(metrics.cohort);
  const healthValue = displayValue(objectFrom(health).status, "unavailable").toLowerCase();
  const connected = ["ok", "healthy", "online", "true"].includes(healthValue);

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-[28px] bg-[#173d33] px-6 py-9 text-white sm:px-10 sm:py-12 lg:px-14">
        <div className="soft-grid absolute inset-y-0 right-0 hidden w-[42%] opacity-40 md:block" />
        <div className="absolute -right-10 -top-20 h-72 w-72 rounded-full border border-white/10" />
        <div className="absolute -right-2 -top-12 h-56 w-56 rounded-full border border-white/10" />
        <div className="relative max-w-2xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-emerald-100">
            <Sparkles size={14} /> One learner engine. Many ways to grow.
          </div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[.18em] text-[#9fd4b5]">Welcome to Mindtrace</p>
          <h1 className="max-w-xl text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">Learning that sees the whole you.</h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-white/75">A thoughtful learning space where your progress travels with you—from a first question to a campus-wide community.</p>
          <Link href="/learn" className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#b8e3c6] px-5 text-sm font-bold text-[#1b483a] transition hover:bg-white focus-ring">
            Continue learning <ArrowRight size={17} />
          </Link>
        </div>
        <div className="relative mt-9 flex items-center gap-2 text-xs text-emerald-100/80 md:absolute md:bottom-7 md:right-8 md:mt-0">
          <span className={`h-2 w-2 rounded-full ${connected ? "bg-[#8cdb9e]" : "bg-amber-300"}`} />
          {connected ? "Learning engine connected" : "Demo mode · reconnecting to learning engine"}
        </div>
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[.18em] text-forest">Your workspace</p><h2 className="mt-1 text-2xl font-semibold tracking-tight">Explore Mindtrace</h2></div>
          <span className="hidden text-sm text-slate-400 sm:block">A shared learner engine, tailored to you</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {pathways.map(({ href, icon: Icon, title, detail, tone }) => (
            <Link href={href} key={href} className="group rounded-2xl focus-ring">
              <Card className="h-full p-5 transition duration-200 group-hover:-translate-y-1 group-hover:shadow-lg">
                <span className={`mb-7 grid h-11 w-11 place-items-center rounded-xl ${tone}`}><Icon size={20} /></span>
                <div className="flex items-center justify-between">
                  <div><h3 className="font-semibold text-ink">{title}</h3><p className="mt-1 text-sm text-slate-500">{detail}</p></div>
                  <ArrowRight className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-forest" size={18} />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {overviewError && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Using illustrative sample data because the backend is unavailable: {overviewError}</p>}

      <section className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <Card className="p-6 sm:p-7">
          <SectionTitle title="A little momentum goes a long way" detail="Your learning community at a glance" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Cohort learners", cohort.students, Users],
              ["Loop/recursion signal", cohort.loop_recursion_confusion, Brain],
              ["Audit events", metrics.audit_events, BookOpen],
              ["Experiences", 5, ArrowDownRight],
            ].map(([label, value, Icon]) => {
              const MetricIcon = Icon as typeof Users;
              return <div key={String(label)} className="rounded-xl bg-[#f7f9f6] p-4">
                <MetricIcon size={17} className="mb-4 text-forest" />
                <p className="text-xl font-semibold text-ink">{displayValue(value)}</p>
                <p className="mt-1 text-xs text-slate-500">{String(label)}</p>
              </div>;
            })}
          </div>
          <p className="mt-4 text-xs text-slate-400">Illustrative sample data; live learner activity updates the shared cohort signal.</p>
        </Card>
        <Card className="flex flex-col justify-between bg-[#f0f5ef] p-6 sm:p-7">
          <div><StatusPill>Small steps, real progress</StatusPill><h2 className="mt-5 max-w-sm text-2xl font-semibold leading-tight text-ink">Make space for the next good question.</h2><p className="mt-3 max-w-sm text-sm leading-6 text-slate-600">Practice, reflect, and return whenever you’re ready. Your context stays connected across experiences.</p></div>
          <Link href="/learn" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-forest hover:underline">Start a learning check-in <ArrowRight size={16} /></Link>
        </Card>
      </section>
    </div>
  );
}
