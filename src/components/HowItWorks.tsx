import { Brain, MonitorDot, PlugZap, UserCheck } from "lucide-react";
import { Reveal, SectionHeader } from "./ui";
import { useInView } from "../hooks/useInView";
import { cn } from "../utils/cn";

const STEPS = [
  { n: "01", icon: PlugZap, title: "Connect", desc: "Patient information and health data enter the platform through secure, authenticated channels." },
  { n: "02", icon: MonitorDot, title: "Monitor", desc: "The system continuously organizes and visualizes relevant health parameters on role-based dashboards." },
  { n: "03", icon: Brain, title: "Analyze", desc: "AI/ML models analyze available information and identify potentially significant patterns." },
  { n: "04", icon: UserCheck, title: "Respond", desc: "Healthcare professionals receive relevant information and make informed clinical decisions." },
];

export default function HowItWorks() {
  const { ref, inView } = useInView<HTMLOListElement>({ threshold: 0.3 });
  return (
    <section id="how-it-works" aria-labelledby="how-title" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        <SectionHeader
          id="how-title"
          eyebrow="How It Works"
          title={
            <>
              From health data to <span className="text-gradient">meaningful insight.</span>
            </>
          }
          description="A clear, four-stage loop that keeps information flowing — and keeps people in charge of every clinical decision."
        />

        <ol ref={ref} className="relative mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {STEPS.map((s, i) => (
            <li
              key={s.n}
              className={cn(
                "relative transition-all duration-700 ease-out",
                inView ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
              )}
              style={{ transitionDelay: `${i * 220}ms` }}
            >
              {/* connector (desktop) */}
              {i < STEPS.length - 1 && (
                <svg
                  className="pointer-events-none absolute z-10 hidden h-3 lg:block"
                  style={{ top: 54, left: "calc(50% + 46px)", width: "calc(100% - 72px)" }}
                  viewBox="0 0 100 4"
                  preserveAspectRatio="none"
                  aria-hidden
                >
                  <line x1="0" y1="2" x2="100" y2="2" stroke="#dbe9ff" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                  <line
                    x1="0" y1="2" x2="100" y2="2"
                    stroke="url(#howg)" strokeWidth="2" strokeDasharray="6 6"
                    vectorEffect="non-scaling-stroke"
                    className={cn("transition-opacity duration-700", inView ? "animate-dash opacity-100" : "opacity-0")}
                    style={{ transitionDelay: `${i * 220 + 300}ms` }}
                  />
                  <defs>
                    <linearGradient id="howg" x1="0" x2="1">
                      <stop offset="0" stopColor="#2f6ff0" />
                      <stop offset="1" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                </svg>
              )}
              {/* connector (mobile/tablet vertical) */}
              {i < STEPS.length - 1 && (
                <span className="absolute -bottom-6 left-9 h-6 w-px bg-gradient-to-b from-brand-300 to-cyan-300 md:hidden" aria-hidden />
              )}

              <div className="group h-full rounded-3xl border border-slate-200/80 bg-white p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-[0_28px_60px_-30px_rgba(15,43,92,0.45)] lg:text-center">
                <div className="relative inline-grid lg:mx-auto">
                  <span className="grid h-[72px] w-[72px] place-items-center rounded-3xl bg-gradient-to-br from-navy-800 to-brand-600 text-white shadow-[0_14px_30px_-12px_rgba(29,86,214,0.7)] transition-transform duration-300 group-hover:scale-105">
                    <s.icon className="h-8 w-8" aria-hidden />
                  </span>
                  <span className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-white font-mono text-[11px] font-semibold text-brand-700 shadow ring-1 ring-brand-100">
                    {s.n}
                  </span>
                </div>
                <h3 className="mt-6 text-xl font-semibold tracking-tight text-navy-900">
                  <span className="sr-only">Step {s.n}: </span>
                  {s.title}
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{s.desc}</p>
              </div>
            </li>
          ))}
        </ol>

        <Reveal delay={200}>
          <p className="mx-auto mt-12 max-w-2xl rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-center text-sm leading-relaxed text-slate-600">
            <span className="font-semibold text-navy-900">Humans in the loop, always.</span> The platform surfaces
            information — qualified healthcare professionals interpret it and decide what happens next.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
