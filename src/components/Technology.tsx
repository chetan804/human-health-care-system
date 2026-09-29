import { useState } from "react";
import { BarChart3, Brain, ChevronDown, Database, KeyRound, Monitor, Server } from "lucide-react";
import { Reveal, SectionHeader } from "./ui";
import { cn } from "../utils/cn";

const LAYERS = [
  {
    icon: Monitor,
    title: "Frontend",
    sub: "Role-based web dashboards",
    detail: "Responsive interfaces for patients, doctors, nurses, caregivers, and administrators — each showing only the views and data their role permits.",
    tech: ["Web dashboards", "Responsive UI", "Data visualization"],
  },
  {
    icon: Server,
    title: "Backend API",
    sub: "Python · Flask · REST",
    detail: "A Flask application exposes REST endpoints for patients, vitals, records, alerts, and analytics, with request validation at every boundary.",
    tech: ["Python", "Flask", "REST APIs"],
  },
  {
    icon: KeyRound,
    title: "Authentication & Authorization",
    sub: "Identity · roles · permissions",
    detail: "Secure sign-in, session/token handling, and role-based authorization guard every protected endpoint and dashboard.",
    tech: ["Secure sessions / tokens", "Role-based access"],
  },
  {
    icon: Database,
    title: "Healthcare Data Layer",
    sub: "PostgreSQL · Redis",
    detail: "PostgreSQL stores structured patient, record, and monitoring data; Redis supports caching and fast access to frequently-read, real-time information.",
    tech: ["PostgreSQL", "Redis"],
  },
  {
    icon: Brain,
    title: "Machine Learning Layer",
    sub: "Random Forest models",
    detail: "Trained machine-learning models — including Random Forest classifiers — evaluate processed features to produce risk tiers and contributing factors for clinician review.",
    tech: ["Machine Learning", "Random Forest"],
  },
  {
    icon: BarChart3,
    title: "Analytics & Monitoring",
    sub: "Trends · alerts · reporting",
    detail: "Aggregates historical data into trends and summaries, evaluates readings against configured ranges, and powers the alerting engine.",
    tech: ["Health analytics", "Alerting"],
  },
];

const STACK = ["Python", "Flask", "Machine Learning", "Random Forest", "PostgreSQL", "Redis", "Docker", "REST APIs"];

export default function Technology() {
  const [active, setActive] = useState(1);
  const cur = LAYERS[active];

  return (
    <section id="technology" aria-labelledby="tech-title" className="relative py-24 sm:py-32">
      <div className="pointer-events-none absolute inset-0 grid-bg [mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_70%)]" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-6">
        <SectionHeader
          id="tech-title"
          eyebrow="Technology"
          title={
            <>
              Built like a <span className="text-gradient">modern healthcare platform.</span>
            </>
          }
          description="A layered, service-oriented architecture that separates concerns cleanly — so security, data, intelligence, and experience can each evolve independently."
        />

        <div className="mt-16 grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-start">
          <Reveal variant="left">
            <ol className="relative space-y-0" aria-label="Architecture layers">
              {LAYERS.map((l, i) => {
                const on = active === i;
                return (
                  <li key={l.title}>
                    <button
                      onClick={() => setActive(i)}
                      onMouseEnter={() => setActive(i)}
                      onFocus={() => setActive(i)}
                      aria-pressed={on}
                      className={cn(
                        "group relative flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-300",
                        on
                          ? "border-brand-300 bg-white shadow-[0_20px_50px_-24px_rgba(29,86,214,0.5)] ring-4 ring-brand-100/70"
                          : "border-slate-200/80 bg-white/80 hover:border-brand-200 hover:bg-white"
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-12 w-12 shrink-0 place-items-center rounded-xl transition-all duration-300",
                          on ? "bg-gradient-to-br from-brand-600 to-cyan-600 text-white" : "bg-slate-100 text-navy-800 group-hover:bg-brand-50"
                        )}
                      >
                        <l.icon className="h-5.5 w-5.5" aria-hidden />
                      </span>
                      <span className="flex-1">
                        <span className="block text-[15px] font-semibold text-navy-900">{l.title}</span>
                        <span className="block text-[13px] text-slate-500">{l.sub}</span>
                      </span>
                      <span className="font-mono text-xs text-slate-400">L{i + 1}</span>
                    </button>
                    {i < LAYERS.length - 1 && (
                      <div className="flex h-6 justify-center" aria-hidden>
                        <div className="relative w-px bg-slate-200">
                          <span className={cn("absolute inset-x-0 top-0 h-full bg-brand-400 transition-opacity", i === active || i + 1 === active ? "opacity-100" : "opacity-0")} />
                          <ChevronDown className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 text-slate-300" />
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </Reveal>

          <Reveal variant="right" delay={120} className="lg:sticky lg:top-28">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-navy-950 text-white shadow-[0_40px_80px_-40px_rgba(10,31,68,0.7)]">
              <div className="border-b border-white/10 px-6 py-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-300">Layer {active + 1} of {LAYERS.length}</p>
              </div>
              <div key={active} className="animate-fade-in p-6" aria-live="polite">
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-cyan-500">
                    <cur.icon className="h-6 w-6" aria-hidden />
                  </span>
                  <h3 className="text-xl font-semibold">{cur.title}</h3>
                </div>
                <p className="mt-4 leading-relaxed text-slate-300">{cur.detail}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {cur.tech.map((t) => (
                    <span key={t} className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-cyan-100">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div className="border-t border-white/10 bg-white/[0.03] p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Platform stack</p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {STACK.map((s) => (
                    <li
                      key={s}
                      className={cn(
                        "rounded-lg border px-2.5 py-1.5 font-mono text-[12px] transition-all duration-300",
                        cur.tech.includes(s)
                          ? "border-cyan-300/50 bg-cyan-300/15 text-cyan-100"
                          : "border-white/10 bg-white/[0.04] text-slate-300"
                      )}
                    >
                      {s}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs leading-relaxed text-slate-400">
                  Services are containerized with Docker for consistent, reproducible deployments.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
