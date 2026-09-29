import type { MouseEvent, ReactNode } from "react";
import {
  Activity,
  BellRing,
  Brain,
  Building2,
  FileHeart,
  KeyRound,
  LayoutDashboard,
  LineChart,
  Lock,
  Radar,
  Stethoscope,
  Workflow,
} from "lucide-react";
import { Reveal, SectionHeader, Sparkline, Button, useCta } from "./ui";
import { cn } from "../utils/cn";

type Feature = { icon: typeof Activity; title: string; desc: string; big?: boolean; visual?: ReactNode };

const FEATURES: Feature[] = [
  {
    icon: Activity,
    title: "Real-Time Health Monitoring",
    desc: "Monitor important patient health parameters and visualize their current status through intuitive dashboards.",
    big: true,
    visual: (
      <div className="grid grid-cols-3 gap-2">
        {[
          { l: "HR", v: "72", c: "#f43f5e", d: [70, 72, 71, 74, 73, 72, 75, 73] },
          { l: "SpO₂", v: "98%", c: "#0d9488", d: [97, 98, 98, 97, 98, 99, 98, 98] },
          { l: "BP", v: "120/80", c: "#2f6ff0", d: [118, 121, 119, 120, 122, 120, 119, 121] },
        ].map((m) => (
          <div key={m.l} className="rounded-xl border border-slate-200/80 bg-white p-2.5">
            <p className="text-[10px] font-medium text-slate-400">{m.l}</p>
            <p className="font-mono text-sm font-semibold text-navy-900">{m.v}</p>
            <Sparkline data={m.d} stroke={m.c} className="mt-1 h-5 w-full" fill={false} strokeWidth={1.5} />
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Brain,
    title: "AI-Powered Health Analysis",
    desc: "Use machine-learning models to analyze available patient information and provide risk-oriented insights.",
    big: true,
    visual: (
      <div className="rounded-xl border border-slate-200/80 bg-white p-3">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-navy-900">Risk assessment</span>
          <span className="rounded-md bg-teal-50 px-1.5 py-0.5 font-semibold text-teal-700">Low</span>
        </div>
        <div className="mt-2.5 space-y-1.5">
          {[
            ["Heart rate variability", 72],
            ["Blood pressure trend", 46],
            ["Oxygen saturation", 28],
          ].map(([l, w]) => (
            <div key={l as string} className="flex items-center gap-2">
              <span className="w-32 shrink-0 truncate text-[10.5px] text-slate-500">{l}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                <span className="block h-full rounded-full bg-gradient-to-r from-brand-500 to-cyan-500" style={{ width: `${w}%` }} />
              </span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-slate-400">Feature contribution · for clinician review</p>
      </div>
    ),
  },
  { icon: BellRing, title: "Intelligent Alerts", desc: "Surface abnormal or potentially concerning readings so healthcare professionals can review them promptly." },
  { icon: FileHeart, title: "Electronic Health Records", desc: "Maintain centralized patient information, medical history, and healthcare records." },
  { icon: LayoutDashboard, title: "Patient Dashboard", desc: "Give patients access to relevant health information, trends, appointments, alerts, and personalized insights." },
  { icon: Stethoscope, title: "Doctor Dashboard", desc: "Patient overviews, health trends, alerts, records, and AI-assisted insights for healthcare professionals." },
  { icon: Building2, title: "Hospital Dashboard", desc: "Centralized visibility into patients, healthcare activity, alerts, and operational information." },
  { icon: LineChart, title: "Health Trend Analytics", desc: "Visualize historical health information through charts, trends, comparisons, and summaries." },
  {
    icon: KeyRound,
    title: "Role-Based Access",
    desc: "Different experiences and permissions for every member of the care network.",
    big: true,
    visual: (
      <div className="flex flex-wrap gap-2">
        {["Patients", "Doctors", "Nurses", "Administrators", "Caregivers"].map((r, i) => (
          <span
            key={r}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600"
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", ["bg-brand-500", "bg-cyan-500", "bg-teal-500", "bg-indigo-500", "bg-sky-500"][i])} />
            {r}
          </span>
        ))}
      </div>
    ),
  },
  {
    icon: Lock,
    title: "Secure Healthcare Data",
    desc: "Secure authentication, authorization, protected APIs, encrypted communication, and privacy-conscious data handling.",
    big: true,
    visual: (
      <div className="flex flex-wrap gap-2">
        {["Authentication", "Authorization", "Protected APIs", "Encrypted transport", "Input validation"].map((r) => (
          <span key={r} className="inline-flex items-center gap-1.5 rounded-full border border-teal-100 bg-teal-50/70 px-3 py-1.5 text-xs font-medium text-teal-800">
            <Lock className="h-3 w-3" aria-hidden /> {r}
          </span>
        ))}
      </div>
    ),
  },
  { icon: Radar, title: "AI-Assisted Risk Detection", desc: "Highlight potentially abnormal patterns using the platform's machine-learning capabilities." },
  { icon: Workflow, title: "Centralized Healthcare Management", desc: "Bring patient data, monitoring, analytics, alerts, and workflows together." },
];

function onSpot(e: MouseEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
}

export default function Features() {
  const { open } = useCta();
  return (
    <section id="features" aria-labelledby="features-title" className="relative py-24 sm:py-32">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-slate-50 to-transparent" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-6">
        <SectionHeader
          id="features-title"
          eyebrow="Capabilities"
          title={
            <>
              Everything healthcare teams need to <span className="text-gradient">stay informed.</span>
            </>
          }
          description="Twelve integrated capabilities working together — from the first reading to the final clinical decision."
        />

        <ul className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <Reveal as="li" key={f.title} delay={(i % 4) * 70} className={cn(f.big && "sm:col-span-2")}>
              <article
                onMouseMove={onSpot}
                className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-[0_28px_60px_-30px_rgba(15,43,92,0.45)]"
              >
                <div
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{ background: "radial-gradient(420px circle at var(--mx,50%) var(--my,0%), rgba(47,111,240,0.08), transparent 60%)" }}
                  aria-hidden
                />
                <div className={cn("relative flex h-full flex-col", f.big && "md:flex-row md:gap-6")}>
                  <div className={cn(f.big && "md:w-1/2")}>
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-brand-50 to-cyan-50 text-brand-600 ring-1 ring-brand-100 transition-all duration-300 group-hover:from-brand-600 group-hover:to-cyan-600 group-hover:text-white group-hover:ring-transparent">
                      <f.icon className="h-5 w-5" aria-hidden />
                    </span>
                    <h3 className="mt-5 text-[17px] font-semibold tracking-tight text-navy-900">{f.title}</h3>
                    <p className="mt-2 text-[14.5px] leading-relaxed text-slate-600">{f.desc}</p>
                  </div>
                  {f.visual && (
                    <div className="mt-5 flex items-center rounded-2xl bg-slate-50/80 p-3 ring-1 ring-slate-100 md:mt-0 md:w-1/2">
                      <div className="w-full">{f.visual}</div>
                    </div>
                  )}
                </div>
              </article>
            </Reveal>
          ))}
        </ul>

        <Reveal className="mt-12 flex flex-col items-center justify-center gap-3 text-center sm:flex-row">
          <p className="text-sm text-slate-500">Ready to see how the capabilities fit together?</p>
          <Button variant="secondary" arrow onClick={() => open("demo")}>
            Request a walkthrough
          </Button>
        </Reveal>
      </div>
    </section>
  );
}
