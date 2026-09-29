import { Activity, BellRing, Brain, Building2, Database, HeartHandshake, Hospital, Stethoscope, User, UserCog, Users } from "lucide-react";
import { Reveal } from "./ui";
import { useCountUp, useInView } from "../hooks/useInView";

const ROLES = [
  { icon: User, label: "Patients" },
  { icon: Stethoscope, label: "Doctors" },
  { icon: Users, label: "Nurses" },
  { icon: Hospital, label: "Hospitals" },
  { icon: Building2, label: "Clinics" },
  { icon: HeartHandshake, label: "Caregivers" },
  { icon: UserCog, label: "Healthcare Administrators" },
];

const STATS = [
  { icon: Activity, title: "Real-Time Monitoring", value: 5, suffix: "", desc: "Core vital parameters visualized live on every dashboard" },
  { icon: Brain, title: "AI-Assisted Insights", value: 3, suffix: "", desc: "Risk tiers — low, moderate, elevated — for clinician review" },
  { icon: Database, title: "Centralized Health Records", value: 1, suffix: "", desc: "Unified record per patient across roles and workflows" },
  { icon: BellRing, title: "Intelligent Alerts", value: 24, suffix: "/7", desc: "Continuous evaluation of readings against configured ranges" },
];

function Stat({ s, i }: { s: (typeof STATS)[number]; i: number }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const n = useCountUp(s.value, inView, 1200 + i * 150);
  return (
    <div
      ref={ref}
      className="group relative rounded-2xl border border-slate-200/80 bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-[0_20px_40px_-24px_rgba(15,43,92,0.35)]"
    >
      <div className="flex items-center justify-between">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 transition-colors group-hover:bg-brand-600 group-hover:text-white">
          <s.icon className="h-5 w-5" aria-hidden />
        </span>
        <span className="font-mono text-3xl font-semibold tabular-nums text-navy-900">
          {n}
          <span className="text-brand-500">{s.suffix}</span>
        </span>
      </div>
      <h3 className="mt-4 text-[15px] font-semibold text-navy-900">{s.title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">{s.desc}</p>
    </div>
  );
}

export default function TrustBar() {
  const row = [...ROLES, ...ROLES];
  return (
    <section aria-labelledby="trust-title" className="relative border-y border-slate-100 bg-slate-50/60 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        <Reveal>
          <h2 id="trust-title" className="mx-auto max-w-2xl text-center text-lg font-semibold tracking-tight text-navy-900 sm:text-xl">
            One connected platform for the modern healthcare ecosystem.
          </h2>
        </Reveal>

        <Reveal delay={100}>
          <div className="mask-fade-x relative mt-8 overflow-hidden">
            <ul className="flex w-max animate-marquee gap-3 hover:[animation-play-state:paused]" aria-label="Who the platform serves">
              {row.map((r, i) => (
                <li
                  key={i}
                  aria-hidden={i >= ROLES.length}
                  className="flex shrink-0 items-center gap-2.5 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 shadow-sm"
                >
                  <r.icon className="h-4 w-4 text-brand-500" aria-hidden />
                  {r.label}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s, i) => (
            <Reveal key={s.title} delay={i * 90}>
              <Stat s={s} i={i} />
            </Reveal>
          ))}
        </div>
        <p className="mt-5 text-center text-xs text-slate-400">
          Figures describe platform capabilities, not usage or clinical outcomes.
        </p>
      </div>
    </section>
  );
}
