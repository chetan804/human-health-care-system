import { useEffect, useState } from "react";
import { Activity, BellRing, Brain, Droplets, HeartPulse, Stethoscope, Thermometer, Wind, ShieldCheck } from "lucide-react";
import { DemoBadge, LiveDot, Sparkline } from "./ui";
import { useInView, usePrefersReducedMotion } from "../hooks/useInView";
import { cn } from "../utils/cn";

const jitter = (v: number, amt: number, min: number, max: number) =>
  Math.max(min, Math.min(max, +(v + (Math.random() - 0.5) * amt).toFixed(1)));

// One ECG beat across 100 units; repeated for the strip
const beat = "l14,0 l4,-4 l4,4 l6,0 l3,4 l4,-30 l4,38 l3,-12 l8,0 l6,-7 l6,7 l38,0";
const ecgPath = `M0,30 ${Array.from({ length: 8 }).map(() => beat).join(" ")}`;

export default function HeroDashboard() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0 }, false);
  const [v, setV] = useState({ hr: 72, sys: 120, dia: 80, spo2: 98, temp: 36.7, rr: 16 });
  const [hrHistory, setHrHistory] = useState([70, 72, 71, 74, 73, 72, 75, 73, 72, 71, 72, 74, 73, 72]);

  useEffect(() => {
    if (reduced || !inView) return;
    const id = window.setInterval(() => {
      setV((p) => {
        const hr = Math.round(jitter(p.hr, 4, 66, 80));
        setHrHistory((h) => [...h.slice(1), hr]);
        return {
          hr,
          sys: Math.round(jitter(p.sys, 3, 116, 124)),
          dia: Math.round(jitter(p.dia, 2, 77, 83)),
          spo2: Math.round(jitter(p.spo2, 1, 97, 99)),
          temp: jitter(p.temp, 0.1, 36.5, 36.9),
          rr: Math.round(jitter(p.rr, 1, 14, 18)),
        };
      });
    }, 1800);
    return () => clearInterval(id);
  }, [reduced, inView]);

  const vitals = [
    { icon: Droplets, label: "Blood Pressure", value: `${v.sys}/${v.dia}`, unit: "mmHg", color: "#67e8f9", data: [118, 121, 119, 120, 122, 120, 119, 121, 120] },
    { icon: Activity, label: "SpO₂", value: `${v.spo2}`, unit: "%", color: "#5eead4", data: [97, 98, 98, 97, 98, 99, 98, 98, 98] },
    { icon: Thermometer, label: "Temperature", value: v.temp.toFixed(1), unit: "°C", color: "#93bbff", data: [36.6, 36.7, 36.7, 36.8, 36.7, 36.6, 36.7, 36.7, 36.7] },
    { icon: Wind, label: "Resp. Rate", value: `${v.rr}`, unit: "/min", color: "#c4b5fd", data: [16, 15, 16, 17, 16, 16, 15, 16, 16] },
  ];

  return (
    <div ref={ref} className="relative mx-auto w-full max-w-[600px]">
      {/* glow */}
      <div className="absolute -inset-6 -z-10 rounded-[40px] bg-gradient-to-tr from-brand-400/30 via-cyan-300/25 to-teal-300/20 blur-3xl" aria-hidden />

      <figure
        className="relative overflow-hidden rounded-[24px] border border-white/10 bg-gradient-to-b from-navy-900 to-navy-950 p-3 text-white shadow-[0_40px_80px_-30px_rgba(10,31,68,0.65)] ring-1 ring-navy-900/10 sm:p-4"
        aria-label="Example real-time patient monitoring dashboard using demo data"
      >
        <div className="grid-bg-dark pointer-events-none absolute inset-0 opacity-60" aria-hidden />
        {/* top bar */}
        <div className="relative flex items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="hidden gap-1.5 sm:flex" aria-hidden>
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
            </div>
            <span className="text-[11px] font-medium text-slate-300 sm:ml-2">Live Monitoring · Ward 4B · Bed 12</span>
          </div>
          <div className="flex items-center gap-2">
            <DemoBadge dark />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
              <LiveDot color="bg-emerald-400" /> Live
            </span>
          </div>
        </div>

        {/* patient + status */}
        <div className="relative mt-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-cyan-500 text-sm font-bold">PT</div>
            <div>
              <p className="text-sm font-semibold leading-tight">Patient · 42 y</p>
              <p className="font-mono text-[10.5px] text-slate-400">ID DEMO-0042 · Updated just now</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Stable
          </span>
        </div>

        {/* ECG */}
        <div className="relative mt-3 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <div className="flex items-end justify-between">
            <div>
              <p className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                <HeartPulse className="h-3.5 w-3.5 text-rose-300" aria-hidden /> Heart Rate
              </p>
              <p className="mt-0.5 flex items-baseline gap-1">
                <span className="font-mono text-3xl font-semibold tabular-nums" aria-live="off">{v.hr}</span>
                <span className="text-xs text-slate-400">BPM</span>
              </p>
            </div>
            <Sparkline data={hrHistory} stroke="#fda4af" className="h-8 w-24 opacity-80" />
          </div>
          <div className="relative mt-2 h-12 overflow-hidden" aria-hidden>
            <svg
              viewBox="0 0 800 50"
              preserveAspectRatio="none"
              className="absolute left-0 top-0 h-full w-[200%]"
              style={{ animation: reduced ? undefined : "marquee 6s linear infinite" }}
            >
              <path d={ecgPath} fill="none" stroke="#fb7185" strokeWidth="1.8" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </svg>
            <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-navy-900 to-transparent" />
          </div>
        </div>

        {/* vitals grid */}
        <div className="relative mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {vitals.map((m) => (
            <div key={m.label} className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5 transition-colors hover:bg-white/[0.07]">
              <p className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
                <m.icon className="h-3 w-3" style={{ color: m.color }} aria-hidden /> {m.label}
              </p>
              <p className="mt-1 flex items-baseline gap-0.5">
                <span className="font-mono text-lg font-semibold tabular-nums">{m.value}</span>
                <span className="text-[10px] text-slate-400">{m.unit}</span>
              </p>
              <Sparkline data={m.data} stroke={m.color} className="mt-1 h-5 w-full" fill={false} strokeWidth={1.5} />
            </div>
          ))}
        </div>

        {/* trend + AI risk */}
        <div className="relative mt-3 grid grid-cols-5 gap-2">
          <div className="col-span-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium text-slate-300">24h Health Trend</p>
              <span className="text-[10px] text-slate-500">HR · SpO₂</span>
            </div>
            <div className="relative mt-2 h-16">
              <Sparkline data={[72, 74, 71, 76, 79, 75, 73, 72, 70, 73, 74, 72]} stroke="#5f95fb" className="absolute inset-0 h-full w-full" />
              <Sparkline data={[97, 98, 98, 97, 98, 98, 99, 98, 98, 97, 98, 98]} stroke="#5eead4" fill={false} className="absolute inset-0 h-full w-full opacity-80" strokeWidth={1.5} />
              <span className="absolute left-[33%] top-0 h-full w-px bg-amber-300/40" aria-hidden />
              <span className="absolute left-[33%] top-0 -translate-x-1/2 rounded bg-amber-300/15 px-1 text-[8.5px] font-semibold text-amber-200">14:32</span>
            </div>
          </div>
          <div className="col-span-2 flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <div className="relative h-16 w-16">
              <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90" aria-hidden>
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="url(#riskg)" strokeWidth="3" strokeLinecap="round" strokeDasharray="97.4" strokeDashoffset="80" />
                <defs>
                  <linearGradient id="riskg" x1="0" x2="1">
                    <stop offset="0" stopColor="#5eead4" />
                    <stop offset="1" stopColor="#67e8f9" />
                  </linearGradient>
                </defs>
              </svg>
              <Brain className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-cyan-200" aria-hidden />
            </div>
            <p className="mt-1.5 text-[10px] text-slate-400">AI Risk Indicator</p>
            <p className="text-xs font-semibold text-teal-300">Low</p>
          </div>
        </div>

        {/* mobile inline alert */}
        <div className="relative mt-2 flex items-center gap-2 rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 sm:hidden">
          <BellRing className="h-4 w-4 shrink-0 text-amber-200" aria-hidden />
          <p className="text-[11px] text-amber-100">Elevated heart-rate event at 14:32 · Reviewed</p>
        </div>

        {/* scanning line */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-transparent via-cyan-300/[0.06] to-transparent animate-scan" aria-hidden />
      </figure>

      {/* Floating cards */}
      <div className="absolute -right-4 top-20 hidden w-56 animate-float rounded-2xl border border-white/70 bg-white/85 p-3.5 shadow-[0_24px_50px_-20px_rgba(15,43,92,0.45)] backdrop-blur-xl sm:block xl:-right-12">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-cyan-500">
            <Brain className="h-4 w-4 text-white" aria-hidden />
          </span>
          <p className="text-xs font-semibold text-navy-900">AI Health Insight</p>
        </div>
        <p className="mt-2 text-[11.5px] leading-snug text-slate-600">
          Monitored parameters are within configured reference ranges. Continue routine monitoring.
        </p>
        <p className="mt-2 text-[9.5px] font-medium uppercase tracking-wider text-slate-400">Decision support · Clinician review</p>
      </div>

      <div
        className="absolute -left-6 bottom-24 hidden w-60 animate-float-slow rounded-2xl border border-white/70 bg-white/90 p-3.5 shadow-[0_24px_50px_-20px_rgba(15,43,92,0.45)] backdrop-blur-xl sm:block xl:-left-14"
        style={{ animationDelay: "1.2s" }}
      >
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-xs font-semibold text-navy-900">
            <span className="relative grid h-7 w-7 place-items-center rounded-lg bg-amber-100">
              <BellRing className="h-4 w-4 text-amber-600" aria-hidden />
            </span>
            Recent Alert
          </p>
          <span className="font-mono text-[10px] text-slate-400">14:32</span>
        </div>
        <p className="mt-2 text-[11.5px] leading-snug text-slate-600">Elevated heart-rate event detected. Routed to care team for review.</p>
        <div className="mt-2 flex gap-1.5">
          <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">Moderate</span>
          <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">Acknowledged</span>
        </div>
      </div>

      <div
        className={cn(
          "absolute -bottom-6 right-6 hidden items-center gap-3 rounded-2xl border border-white/70 bg-white/90 px-3.5 py-2.5 shadow-[0_24px_50px_-20px_rgba(15,43,92,0.45)] backdrop-blur-xl sm:flex",
          "animate-float"
        )}
        style={{ animationDelay: "2.2s" }}
      >
        <div className="flex -space-x-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-600 text-[10px] font-bold text-white ring-2 ring-white">
            <Stethoscope className="h-3.5 w-3.5" aria-hidden />
          </span>
          <span className="grid h-7 w-7 place-items-center rounded-full bg-teal-500 text-[10px] font-bold text-white ring-2 ring-white">RN</span>
          <span className="grid h-7 w-7 place-items-center rounded-full bg-navy-800 text-[10px] font-bold text-white ring-2 ring-white">PT</span>
        </div>
        <div>
          <p className="text-[11.5px] font-semibold text-navy-900">Care team connected</p>
          <p className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <LiveDot className="h-1.5 w-1.5" /> Physician · Nurse · Patient
          </p>
        </div>
      </div>
    </div>
  );
}
