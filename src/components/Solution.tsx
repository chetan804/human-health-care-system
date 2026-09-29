import { useEffect, useState } from "react";
import { Activity, BellRing, Brain, CheckCircle2, Stethoscope, User } from "lucide-react";
import { Button, Reveal, SectionHeader, useCta } from "./ui";
import { useInView, usePrefersReducedMotion } from "../hooks/useInView";
import { cn } from "../utils/cn";

const STAGES = [
  { icon: User, title: "Patient", short: "Health data originates", detail: "Patient profiles, history, and incoming readings form the foundation of every insight. Patients can view their own information according to their permissions." },
  { icon: Activity, title: "Monitoring", short: "Vitals organized live", detail: "Heart rate, blood pressure, SpO₂, temperature, and respiratory rate are organized and visualized in real time on role-based dashboards." },
  { icon: Brain, title: "AI Analysis", short: "Patterns assessed", detail: "Machine-learning models evaluate available data to identify potentially significant patterns and produce risk-oriented insights." },
  { icon: BellRing, title: "Alerts", short: "Changes surfaced", detail: "Readings outside configured reference ranges and elevated risk signals are surfaced as prioritized alerts for prompt review." },
  { icon: Stethoscope, title: "Healthcare Professional", short: "Human review", detail: "Doctors and nurses review alerts alongside records, trends, and AI context — clinical judgment always stays with qualified professionals." },
  { icon: CheckCircle2, title: "Action", short: "Informed decisions", detail: "Care teams make informed decisions and document outcomes, closing the loop and keeping everyone connected to the latest information." },
];

export default function Solution() {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.3 });
  const reduced = usePrefersReducedMotion();
  const [revealed, setRevealed] = useState(0);
  const [active, setActive] = useState(0);
  const [userPicked, setUserPicked] = useState(false);
  const { open } = useCta();

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setRevealed(STAGES.length);
      return;
    }
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setRevealed(i);
      setActive(Math.min(i - 1, STAGES.length - 1));
      if (i >= STAGES.length) clearInterval(id);
    }, 420);
    return () => clearInterval(id);
  }, [inView, reduced]);

  useEffect(() => {
    if (userPicked || reduced || revealed < STAGES.length) return;
    const id = window.setInterval(() => setActive((a) => (a + 1) % STAGES.length), 3200);
    return () => clearInterval(id);
  }, [userPicked, reduced, revealed]);

  const progress = revealed <= 1 ? 0 : ((revealed - 1) / (STAGES.length - 1)) * 100;
  const current = STAGES[active];

  return (
    <section id="platform" aria-labelledby="solution-title" className="relative overflow-hidden bg-navy-950 py-24 text-white sm:py-32">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="grid-bg-dark absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]" />
        <div className="absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-brand-600/25 blur-[120px]" />
        <div className="absolute -bottom-40 right-0 h-[400px] w-[500px] rounded-full bg-teal-500/15 blur-[120px] animate-blob" />
      </div>

      <div className="relative mx-auto max-w-7xl px-5 sm:px-6">
        <SectionHeader
          id="solution-title"
          dark
          eyebrow="The Platform"
          title={
            <>
              One intelligent <span className="text-gradient-light">healthcare ecosystem.</span>
            </>
          }
          description="Human Health Care System connects every step between a patient's data and a clinician's decision — continuously, securely, and with humans in control."
        />

        <div ref={ref} className="mt-16">
          {/* Desktop horizontal flow */}
          <div className="relative hidden lg:block">
            <div className="absolute left-[8.33%] right-[8.33%] top-8 h-px bg-white/10" aria-hidden>
              <div
                className="h-full bg-gradient-to-r from-brand-400 via-cyan-300 to-teal-300 transition-[width] duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
              {revealed >= STAGES.length && (
                <span className="shimmer-line absolute inset-x-0 -top-px h-[3px] rounded-full" />
              )}
            </div>
            <ol className="relative grid grid-cols-6 gap-4" role="tablist" aria-label="Platform flow stages">
              {STAGES.map((s, i) => {
                const on = i < revealed;
                const isActive = active === i;
                return (
                  <li key={s.title} className="flex flex-col items-center text-center" role="presentation">
                    <button
                      role="tab"
                      aria-selected={isActive}
                      aria-controls="flow-detail"
                      onClick={() => {
                        setActive(i);
                        setUserPicked(true);
                      }}
                      onMouseEnter={() => {
                        if (revealed >= STAGES.length) {
                          setActive(i);
                          setUserPicked(true);
                        }
                      }}
                      className={cn(
                        "group flex flex-col items-center rounded-2xl p-1 transition-all duration-500",
                        on ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                      )}
                    >
                      <span
                        className={cn(
                          "relative grid h-16 w-16 place-items-center rounded-2xl border transition-all duration-300",
                          isActive
                            ? "border-cyan-300/60 bg-gradient-to-br from-brand-500 to-cyan-500 text-white shadow-[0_0_40px_-6px_rgba(103,232,249,0.7)]"
                            : "border-white/15 bg-navy-900 text-cyan-200 group-hover:border-white/30"
                        )}
                      >
                        {isActive && <span className="absolute inset-0 rounded-2xl border border-cyan-300/50 animate-pulse-ring" aria-hidden />}
                        <s.icon className="h-7 w-7" aria-hidden />
                      </span>
                      <span className="mt-4 font-mono text-[11px] text-slate-500">0{i + 1}</span>
                      <span className={cn("mt-1 text-[15px] font-semibold", isActive ? "text-white" : "text-slate-300")}>{s.title}</span>
                      <span className="mt-1 text-xs text-slate-400">{s.short}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Mobile vertical flow */}
          <ol className="relative space-y-3 lg:hidden" aria-label="Platform flow stages">
            <span className="absolute bottom-8 left-[27px] top-8 w-px bg-white/10" aria-hidden>
              <span className="block w-full bg-gradient-to-b from-brand-400 via-cyan-300 to-teal-300 transition-[height] duration-500" style={{ height: `${progress}%` }} />
            </span>
            {STAGES.map((s, i) => {
              const on = i < revealed;
              return (
                <li
                  key={s.title}
                  className={cn("relative flex gap-4 transition-all duration-500", on ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-3")}
                >
                  <span
                    className={cn(
                      "relative z-10 grid h-14 w-14 shrink-0 place-items-center rounded-2xl border",
                      active === i ? "border-cyan-300/60 bg-gradient-to-br from-brand-500 to-cyan-500 text-white" : "border-white/15 bg-navy-900 text-cyan-200"
                    )}
                  >
                    <s.icon className="h-6 w-6" aria-hidden />
                  </span>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-[15px] font-semibold text-white">
                      <span className="mr-2 font-mono text-xs text-slate-500">0{i + 1}</span>
                      {s.title}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-300">{s.detail}</p>
                  </div>
                </li>
              );
            })}
          </ol>

          {/* Detail panel (desktop) */}
          <Reveal delay={200} className="hidden lg:block">
            <div
              id="flow-detail"
              role="tabpanel"
              aria-live="polite"
              className="glass-dark mx-auto mt-12 flex max-w-3xl items-start gap-5 rounded-3xl border border-white/10 p-6"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-cyan-200">
                <current.icon className="h-6 w-6" aria-hidden />
              </span>
              <div key={active} className="animate-fade-in">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">Stage 0{active + 1}</p>
                <p className="mt-1 text-lg font-semibold text-white">{current.title}</p>
                <p className="mt-1.5 leading-relaxed text-slate-300">{current.detail}</p>
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal delay={150} className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button variant="light" arrow onClick={() => open("demo")}>
            Request a Demo
          </Button>
          <Button variant="outline-light" href="#showcase">
            See it in action
          </Button>
        </Reveal>
      </div>
    </section>
  );
}
