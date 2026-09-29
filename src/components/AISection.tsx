import { useEffect, useState } from "react";
import { BarChart3, Binary, Brain, Database, GitBranch, Lightbulb, ScanSearch, Sparkles, TrendingUp, UserCheck, Gauge, AlertOctagon } from "lucide-react";
import { Reveal, SectionHeader } from "./ui";
import { useInView, usePrefersReducedMotion } from "../hooks/useInView";
import { cn } from "../utils/cn";

const CAPS = [
  { icon: Gauge, label: "Health-risk prediction" },
  { icon: ScanSearch, label: "Pattern detection" },
  { icon: TrendingUp, label: "Patient trend analysis" },
  { icon: AlertOctagon, label: "Abnormality detection" },
  { icon: GitBranch, label: "Risk classification" },
  { icon: BarChart3, label: "Health-data analytics" },
  { icon: Lightbulb, label: "AI-assisted recommendations" },
  { icon: Sparkles, label: "Explainable insights (where supported)" },
];

const PIPE = [
  { icon: Database, title: "Patient Data", sub: "Vitals · history · records" },
  { icon: Binary, title: "Feature Processing", sub: "Cleaning · normalization" },
  { icon: Brain, title: "ML Model", sub: "Random Forest ensemble" },
  { icon: Gauge, title: "Risk Analysis", sub: "Tier · contributing factors" },
  { icon: UserCheck, title: "Human Review", sub: "Clinician decides", human: true },
];

export default function AISection() {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.3 });
  const reduced = usePrefersReducedMotion();
  const [stage, setStage] = useState(-1);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setStage(PIPE.length - 1);
      return;
    }
    let i = -1;
    const id = window.setInterval(() => {
      i = (i + 1) % (PIPE.length + 2);
      setStage(i >= PIPE.length ? PIPE.length - 1 : i);
    }, 900);
    return () => clearInterval(id);
  }, [inView, reduced]);

  return (
    <section aria-labelledby="ai-title" className="relative overflow-hidden bg-navy-950 py-24 text-white sm:py-32">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-40 top-10 h-[480px] w-[480px] rounded-full bg-brand-600/25 blur-[120px] animate-blob" />
        <div className="absolute -right-20 bottom-0 h-[420px] w-[420px] rounded-full bg-cyan-500/15 blur-[120px] animate-blob" style={{ animationDelay: "-10s" }} />
        <div className="grid-bg-dark absolute inset-0 [mask-image:linear-gradient(to_bottom,transparent,black_30%,black_70%,transparent)]" />
      </div>

      <div className="relative mx-auto grid max-w-7xl gap-14 px-5 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div>
          <SectionHeader
            id="ai-title"
            dark
            align="left"
            eyebrow="AI & Machine Learning"
            title={
              <>
                Intelligence designed to <span className="text-gradient-light">assist</span> healthcare professionals.
              </>
            }
            description="The platform's machine-learning layer analyzes available patient data to surface risk-oriented insights and potentially significant patterns — giving clinicians more context, sooner."
          />
          <ul className="mt-9 grid gap-2.5 sm:grid-cols-2">
            {CAPS.map((c, i) => (
              <Reveal as="li" key={c.label} delay={i * 50}>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 transition-colors hover:border-cyan-300/30 hover:bg-white/[0.07]">
                  <c.icon className="h-4.5 w-4.5 shrink-0 text-cyan-300" aria-hidden />
                  <span className="text-sm font-medium text-slate-200">{c.label}</span>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>

        <Reveal variant="right" delay={150}>
          <div ref={ref} className="glass-dark relative rounded-[28px] border border-white/10 p-5 sm:p-7">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Decision-support pipeline</p>
              <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-cyan-200">
                Human-in-the-loop
              </span>
            </div>

            <ol className="relative mt-7 space-y-3">
              <span className="absolute bottom-7 left-[27px] top-7 w-px bg-white/10" aria-hidden>
                <span
                  className="block w-full bg-gradient-to-b from-brand-400 via-cyan-300 to-teal-300 transition-[height] duration-700 ease-out"
                  style={{ height: `${stage < 0 ? 0 : (stage / (PIPE.length - 1)) * 100}%` }}
                />
              </span>
              {PIPE.map((p, i) => {
                const on = i <= stage;
                const cur = i === stage;
                return (
                  <li key={p.title} className="relative flex items-center gap-4">
                    <span
                      className={cn(
                        "relative z-10 grid h-14 w-14 shrink-0 place-items-center rounded-2xl border transition-all duration-500",
                        on
                          ? p.human
                            ? "border-teal-300/60 bg-gradient-to-br from-teal-500 to-emerald-500 text-white"
                            : "border-cyan-300/50 bg-gradient-to-br from-brand-500 to-cyan-500 text-white"
                          : "border-white/10 bg-navy-900 text-slate-500"
                      )}
                    >
                      {cur && <span className="absolute inset-0 rounded-2xl border border-cyan-300/60 animate-pulse-ring" aria-hidden />}
                      <p.icon className="h-6 w-6" aria-hidden />
                    </span>
                    <div
                      className={cn(
                        "flex flex-1 items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition-all duration-500",
                        cur ? "border-cyan-300/30 bg-white/[0.08]" : "border-white/10 bg-white/[0.03]"
                      )}
                    >
                      <div>
                        <p className={cn("text-[15px] font-semibold transition-colors", on ? "text-white" : "text-slate-400")}>{p.title}</p>
                        <p className="text-xs text-slate-400">{p.sub}</p>
                      </div>
                      <span className="font-mono text-[11px] text-slate-500">0{i + 1}</span>
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="mt-7 rounded-2xl border border-amber-200/20 bg-amber-200/[0.07] p-4">
              <p className="text-[15px] font-semibold text-amber-100">AI-assisted decision support—not automated medical diagnosis.</p>
              <p className="mt-1 text-sm leading-relaxed text-amber-100/70">
                The AI does not diagnose diseases or replace doctors. Every insight is presented for review by qualified healthcare
                professionals, who remain responsible for clinical decisions.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
