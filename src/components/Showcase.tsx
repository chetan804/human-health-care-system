import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  Activity,
  AlertTriangle,
  BellRing,
  Brain,
  Check,
  Droplets,
  FileText,
  HeartPulse,
  Info,
  LayoutDashboard,
  LineChart,
  Pill,
  ShieldCheck,
  Thermometer,
  Wind,
  FlaskConical,
  ClipboardList,
} from "lucide-react";
import { DemoBadge, LiveDot, Reveal, SectionHeader, Sparkline } from "./ui";
import { useInView, usePrefersReducedMotion } from "../hooks/useInView";
import { cn } from "../utils/cn";

const TABS = [
  { id: "overview", label: "Patient Overview", icon: LayoutDashboard },
  { id: "live", label: "Live Monitoring", icon: Activity },
  { id: "trends", label: "Health Trends", icon: LineChart },
  { id: "ai", label: "AI Insights", icon: Brain },
  { id: "alerts", label: "Alerts", icon: BellRing },
  { id: "records", label: "Medical Records", icon: FileText },
] as const;
type TabId = (typeof TABS)[number]["id"];

const VITALS = [
  { icon: HeartPulse, label: "Heart Rate", value: "72", unit: "BPM", color: "#f43f5e", range: "60–100" },
  { icon: Activity, label: "SpO₂", value: "98", unit: "%", color: "#0d9488", range: "95–100" },
  { icon: Droplets, label: "Blood Pressure", value: "120/80", unit: "mmHg", color: "#2f6ff0", range: "<130/85" },
  { icon: Thermometer, label: "Temperature", value: "36.7", unit: "°C", color: "#f59e0b", range: "36.1–37.2" },
  { icon: Wind, label: "Respiratory Rate", value: "16", unit: "/min", color: "#7c3aed", range: "12–20" },
];

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/* ---------------- Panels ---------------- */
function Overview() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-cyan-500 font-bold text-white">PT</div>
            <div>
              <p className="font-semibold text-navy-900">Patient</p>
              <p className="text-sm text-slate-500">Age 42 · ID DEMO-0042</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-100">
            <ShieldCheck className="h-4 w-4" aria-hidden /> Health Status: Stable
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {VITALS.map((v, i) => (
            <div
              key={v.label}
              className="group animate-fade-up rounded-2xl border border-slate-200/80 bg-white p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-md"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <v.icon className="h-4 w-4" style={{ color: v.color }} aria-hidden />
              <p className="mt-2 text-[11px] font-medium text-slate-500">{v.label}</p>
              <p className="mt-0.5 flex items-baseline gap-1">
                <span className="font-mono text-xl font-semibold text-navy-900">{v.value}</span>
                <span className="text-[11px] text-slate-400">{v.unit}</span>
              </p>
              <p className="mt-1 text-[10px] text-slate-400">Ref {v.range}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <div className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-cyan-50 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-navy-900">
            <Brain className="h-4 w-4 text-brand-600" aria-hidden /> AI Health Insight
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            "Current monitored parameters are within the configured reference ranges. Continue routine monitoring."
          </p>
          <p className="mt-3 text-[11px] font-medium text-slate-500">Decision support · requires clinician review</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <BellRing className="h-4 w-4 text-amber-600" aria-hidden /> Recent Alert
          </p>
          <p className="mt-2 text-sm leading-relaxed text-amber-900/80">"Elevated heart-rate event detected at 14:32."</p>
          <p className="mt-2 text-[11px] font-medium text-amber-700">Acknowledged by care team</p>
        </div>
      </div>
    </div>
  );
}

function LiveMonitoring({ active }: { active: boolean }) {
  const reduced = usePrefersReducedMotion();
  const [hr, setHr] = useState<number[]>(() => Array.from({ length: 40 }, (_, i) => 72 + Math.sin(i / 2) * 3));
  const [spo2, setSpo2] = useState<number[]>(() => Array.from({ length: 40 }, (_, i) => 98 + Math.sin(i / 3) * 0.6));
  const [log, setLog] = useState<{ t: string; hr: number; spo2: number }[]>([]);

  useEffect(() => {
    if (!active || reduced) return;
    const id = window.setInterval(() => {
      const nh = Math.round(70 + Math.random() * 6);
      const ns = +(97.4 + Math.random() * 1.4).toFixed(1);
      setHr((a) => [...a.slice(1), nh]);
      setSpo2((a) => [...a.slice(1), ns]);
      const d = new Date();
      const t = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
      setLog((l) => [{ t, hr: nh, spo2: ns }, ...l].slice(0, 5));
    }, 1200);
    return () => clearInterval(id);
  }, [active, reduced]);

  const lastHr = Math.round(hr[hr.length - 1]);
  const lastSp = spo2[spo2.length - 1].toFixed(0);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        {[
          { label: "Heart Rate", value: lastHr, unit: "BPM", data: hr, color: "#f43f5e", icon: HeartPulse },
          { label: "SpO₂", value: lastSp, unit: "%", data: spo2, color: "#0d9488", icon: Activity },
        ].map((m) => (
          <div key={m.label} className="rounded-2xl border border-slate-200/80 bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-semibold text-navy-900">
                <m.icon className="h-4 w-4" style={{ color: m.color }} aria-hidden /> {m.label}
              </p>
              <p className="flex items-baseline gap-1">
                <span className="font-mono text-2xl font-semibold tabular-nums text-navy-900">{m.value}</span>
                <span className="text-xs text-slate-400">{m.unit}</span>
              </p>
            </div>
            <Sparkline data={m.data} stroke={m.color} className="mt-3 h-24 w-full" width={400} height={96} />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-navy-900">Incoming readings</p>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
            <LiveDot /> Streaming
          </span>
        </div>
        <ul className="mt-3 space-y-2" aria-live="off">
          {log.length === 0 && (
            <li className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
              {reduced ? "Live streaming paused (reduced motion)." : "Waiting for readings…"}
            </li>
          )}
          {log.map((r, i) => (
            <li
              key={r.t + i}
              className={cn(
                "flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-xs transition-all",
                i === 0 && "animate-fade-up bg-brand-50/60"
              )}
            >
              <span className="font-mono text-slate-500">{r.t}</span>
              <span className="font-mono text-navy-900">{r.hr} bpm</span>
              <span className="font-mono text-teal-700">{r.spo2}%</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[11px] leading-relaxed text-slate-400">Simulated stream for demonstration purposes.</p>
      </div>
    </div>
  );
}

function Trends() {
  const [range, setRange] = useState<"7D" | "30D" | "90D">("30D");
  const [metric, setMetric] = useState<"hr" | "bp" | "spo2">("hr");
  const cfg = {
    hr: { label: "Avg. heart rate", unit: "BPM", base: 72, amp: 8, color: "from-rose-400 to-rose-500", min: 55 },
    bp: { label: "Avg. systolic BP", unit: "mmHg", base: 120, amp: 10, color: "from-brand-400 to-brand-600", min: 100 },
    spo2: { label: "Avg. SpO₂", unit: "%", base: 97.8, amp: 1.5, color: "from-teal-400 to-teal-600", min: 94 },
  }[metric];
  const data = useMemo(() => {
    const rnd = seeded({ "7D": 7, "30D": 30, "90D": 90 }[range] + metric.length * 13);
    return Array.from({ length: 14 }, () => +(cfg.base + (rnd() - 0.5) * cfg.amp).toFixed(1));
  }, [range, metric, cfg.base, cfg.amp]);
  const max = Math.max(...data);
  const avg = (data.reduce((a, b) => a + b, 0) / data.length).toFixed(1);

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="radiogroup" aria-label="Metric" className="flex flex-wrap gap-1.5">
          {(["hr", "bp", "spo2"] as const).map((m) => (
            <button
              key={m}
              role="radio"
              aria-checked={metric === m}
              onClick={() => setMetric(m)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition-all",
                metric === m ? "bg-navy-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {{ hr: "Heart Rate", bp: "Blood Pressure", spo2: "SpO₂" }[m]}
            </button>
          ))}
        </div>
        <div role="radiogroup" aria-label="Time range" className="flex rounded-full bg-slate-100 p-1">
          {(["7D", "30D", "90D"] as const).map((r) => (
            <button
              key={r}
              role="radio"
              aria-checked={range === r}
              onClick={() => setRange(r)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition-all",
                range === r ? "bg-white text-navy-900 shadow-sm" : "text-slate-500 hover:text-navy-900"
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-5 flex items-baseline gap-2">
        <p className="font-mono text-3xl font-semibold text-navy-900">{avg}</p>
        <p className="text-sm text-slate-500">
          {cfg.unit} · {cfg.label} ({range})
        </p>
      </div>
      <div className="mt-6 flex h-48 items-end gap-1.5 sm:gap-2.5" role="img" aria-label={`${cfg.label} over ${range}, average ${avg} ${cfg.unit}`}>
        {data.map((d, i) => {
          const h = ((d - cfg.min) / (max - cfg.min)) * 100;
          return (
            <div key={i} className="group relative flex h-full flex-1 items-end">
              <div
                className={cn("w-full rounded-t-lg bg-gradient-to-t opacity-85 transition-all duration-700 ease-out group-hover:opacity-100", cfg.color)}
                style={{ height: `${h}%`, transitionDelay: `${i * 25}ms` }}
              />
              <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 rounded-md bg-navy-900 px-1.5 py-0.5 font-mono text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                {d}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-slate-400">
        <span>Start of period</span>
        <span>Today</span>
      </div>
    </div>
  );
}

function AIInsights() {
  const factors = [
    { l: "Heart-rate variability", v: 34, t: "Within range" },
    { l: "Blood-pressure trend (7d)", v: 22, t: "Stable" },
    { l: "SpO₂ stability", v: 14, t: "Stable" },
    { l: "Temperature deviation", v: 9, t: "Minimal" },
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white p-6 text-center">
        <div className="relative h-36 w-36">
          <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90" aria-hidden>
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#eef2f7" strokeWidth="2.6" />
            <circle
              cx="18" cy="18" r="15.5" fill="none" stroke="url(#aig)" strokeWidth="2.6" strokeLinecap="round"
              strokeDasharray="97.4" strokeDashoffset="97.4"
              style={{ animation: "none", strokeDashoffset: 97.4 - 97.4 * 0.18, transition: "stroke-dashoffset 1.2s ease" }}
            />
            <defs>
              <linearGradient id="aig" x1="0" x2="1">
                <stop offset="0" stopColor="#14b8a6" />
                <stop offset="1" stopColor="#2f6ff0" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <div>
              <p className="text-2xl font-semibold text-navy-900">Low</p>
              <p className="text-[11px] text-slate-500">risk tier</p>
            </div>
          </div>
        </div>
        <p className="mt-4 text-sm font-semibold text-navy-900">Health-risk classification</p>
        <p className="mt-1 text-xs text-slate-500">Model: Random Forest classifier (demo)</p>
      </div>
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 lg:col-span-2">
        <p className="text-sm font-semibold text-navy-900">Contributing factors</p>
        <p className="text-xs text-slate-500">Relative influence on the current assessment</p>
        <ul className="mt-4 space-y-3.5">
          {factors.map((f, i) => (
            <li key={f.l}>
              <div className="flex justify-between text-xs">
                <span className="font-medium text-slate-700">{f.l}</span>
                <span className="text-slate-500">{f.t}</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full origin-left animate-fade-in rounded-full bg-gradient-to-r from-brand-500 to-cyan-500"
                  style={{ width: `${f.v * 2.4}%`, animationDelay: `${i * 90}ms` }}
                />
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-5 rounded-xl border border-brand-100 bg-brand-50/60 p-3.5 text-sm leading-relaxed text-slate-700">
          <span className="font-semibold text-navy-900">Suggested next step: </span>
          Continue routine monitoring. Re-evaluate if heart rate exceeds configured thresholds for a sustained period.
        </div>
        <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          AI-assisted decision support — not automated medical diagnosis. Final decisions rest with qualified healthcare professionals.
        </p>
      </div>
    </div>
  );
}

type Sev = "critical" | "moderate" | "info";
const ALERTS: { id: number; sev: Sev; title: string; time: string; detail: string }[] = [
  { id: 1, sev: "moderate", title: "Elevated heart-rate event detected", time: "14:32", detail: "HR 112 bpm sustained for 4 min · Ward 4B" },
  { id: 2, sev: "info", title: "Scheduled vitals check completed", time: "13:00", detail: "All parameters within configured ranges" },
  { id: 3, sev: "critical", title: "SpO₂ reading below threshold (sensor check advised)", time: "09:18", detail: "SpO₂ 91% single reading · resolved on re-measure" },
  { id: 4, sev: "info", title: "Medication reminder acknowledged", time: "08:00", detail: "Recorded by caregiver" },
];
const sevStyle: Record<Sev, string> = {
  critical: "bg-rose-50 text-rose-700 ring-rose-100",
  moderate: "bg-amber-50 text-amber-700 ring-amber-100",
  info: "bg-sky-50 text-sky-700 ring-sky-100",
};

function Alerts() {
  const [filter, setFilter] = useState<"all" | Sev>("all");
  const [acked, setAcked] = useState<number[]>([2, 4]);
  const list = ALERTS.filter((a) => filter === "all" || a.sev === filter);
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-navy-900">Alert timeline · Today</p>
        <div role="radiogroup" aria-label="Filter alerts by severity" className="flex flex-wrap gap-1.5">
          {(["all", "critical", "moderate", "info"] as const).map((f) => (
            <button
              key={f}
              role="radio"
              aria-checked={filter === f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-all",
                filter === f ? "bg-navy-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <ul className="mt-4 space-y-2.5">
        {list.map((a, i) => {
          const isAck = acked.includes(a.id);
          return (
            <li
              key={a.id}
              className="flex animate-fade-up flex-col gap-3 rounded-2xl border border-slate-100 p-3.5 transition-colors hover:bg-slate-50/70 sm:flex-row sm:items-center"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className={cn("relative grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1", sevStyle[a.sev])}>
                {a.sev === "critical" ? <AlertTriangle className="h-4 w-4" aria-hidden /> : a.sev === "moderate" ? <BellRing className="h-4 w-4" aria-hidden /> : <Info className="h-4 w-4" aria-hidden />}
                {!isAck && a.sev !== "info" && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" aria-hidden />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-navy-900">{a.title}</p>
                <p className="text-xs text-slate-500">
                  <span className="font-mono">{a.time}</span> · {a.detail}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1", sevStyle[a.sev])}>{a.sev}</span>
                <button
                  onClick={() => setAcked((s) => (isAck ? s.filter((x) => x !== a.id) : [...s, a.id]))}
                  aria-pressed={isAck}
                  className={cn(
                    "inline-flex h-8 items-center gap-1 rounded-full px-3 text-xs font-semibold transition-all active:scale-95",
                    isAck ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100" : "bg-navy-900 text-white hover:bg-navy-800"
                  )}
                >
                  {isAck ? (
                    <>
                      <Check className="h-3.5 w-3.5" aria-hidden /> Acknowledged
                    </>
                  ) : (
                    "Acknowledge"
                  )}
                </button>
              </div>
            </li>
          );
        })}
        {list.length === 0 && <li className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No alerts for this filter.</li>}
      </ul>
    </div>
  );
}

function Records() {
  const rows = [
    { icon: ClipboardList, type: "Visit note", title: "Routine follow-up consultation", by: "Attending physician", date: "12 May" },
    { icon: FlaskConical, type: "Lab result", title: "Complete blood count", by: "Laboratory", date: "10 May" },
    { icon: Pill, type: "Prescription", title: "Medication plan updated", by: "Attending physician", date: "02 May" },
    { icon: HeartPulse, type: "Monitoring", title: "7-day vitals summary", by: "System generated", date: "01 May" },
    { icon: FileText, type: "History", title: "Allergies & medical history", by: "Nursing staff", date: "18 Apr" },
  ];
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <p className="text-sm font-semibold text-navy-900">Electronic Health Record · Patient</p>
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5 text-teal-600" aria-hidden /> Access logged
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <caption className="sr-only">Demo medical records</caption>
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-semibold">Type</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Record</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Author</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.title} className="animate-fade-in border-t border-slate-100 transition-colors hover:bg-brand-50/40" style={{ animationDelay: `${i * 50}ms` }}>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <r.icon className="h-4 w-4 text-brand-500" aria-hidden /> {r.type}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-navy-900">{r.title}</td>
                <td className="px-4 py-3 text-slate-500">{r.by}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- Main ---------------- */
export default function Showcase() {
  const [tab, setTab] = useState<TabId>("overview");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.1 }, false);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const idx = TABS.findIndex((t) => t.id === tab);
    let next = idx;
    if (e.key === "ArrowRight") next = (idx + 1) % TABS.length;
    else if (e.key === "ArrowLeft") next = (idx - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    else return;
    e.preventDefault();
    setTab(TABS[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <section id="showcase" aria-labelledby="showcase-title" className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-brand-50/40 to-white py-24 sm:py-32">
      <div className="pointer-events-none absolute -left-40 top-40 h-96 w-96 rounded-full bg-cyan-200/40 blur-3xl animate-blob" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-6">
        <SectionHeader
          id="showcase-title"
          eyebrow="Product Tour"
          title={
            <>
              See healthcare intelligence <span className="text-gradient">in action.</span>
            </>
          }
          description="Explore an interactive preview of the clinician workspace. All information shown is an illustrative demo dataset — not a real patient."
        />

        <Reveal delay={150} variant="scale" className="mt-14">
          <div ref={ref} className="rounded-[28px] border border-slate-200/80 bg-white/70 p-2 shadow-[0_40px_90px_-40px_rgba(15,43,92,0.45)] backdrop-blur-xl sm:p-3">
            {/* window chrome */}
            <div className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="flex items-center gap-1.5" aria-hidden>
                <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
              </div>
              <div className="hidden flex-1 justify-center sm:flex">
                <span className="rounded-lg bg-slate-100 px-4 py-1 font-mono text-[11px] text-slate-500">app.humanhealthcare.system/clinician</span>
              </div>
              <DemoBadge />
            </div>

            {/* tabs */}
            <div
              role="tablist"
              aria-label="Dashboard views"
              onKeyDown={onKey}
              className="no-scrollbar flex gap-1 overflow-x-auto rounded-2xl bg-slate-100/80 p-1"
            >
              {TABS.map((t, i) => {
                const on = tab === t.id;
                return (
                  <button
                    key={t.id}
                    ref={(el) => {
                      tabRefs.current[i] = el;
                    }}
                    role="tab"
                    id={`tab-${t.id}`}
                    aria-selected={on}
                    aria-controls={`panel-${t.id}`}
                    tabIndex={on ? 0 : -1}
                    onClick={() => setTab(t.id)}
                    className={cn(
                      "flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold transition-all duration-300",
                      on ? "bg-white text-navy-900 shadow-sm ring-1 ring-slate-200/80" : "text-slate-500 hover:text-navy-900"
                    )}
                  >
                    <t.icon className={cn("h-4 w-4", on ? "text-brand-600" : "")} aria-hidden />
                    {t.label}
                    {t.id === "live" && <LiveDot className="ml-0.5" />}
                  </button>
                );
              })}
            </div>

            {/* panel */}
            <div
              role="tabpanel"
              id={`panel-${tab}`}
              aria-labelledby={`tab-${tab}`}
              tabIndex={0}
              className="min-h-[420px] rounded-2xl bg-slate-50/70 p-3 sm:p-5"
            >
              <div key={tab} className="animate-fade-in">
                {tab === "overview" && <Overview />}
                {tab === "live" && <LiveMonitoring active={inView} />}
                {tab === "trends" && <Trends />}
                {tab === "ai" && <AIInsights />}
                {tab === "alerts" && <Alerts />}
                {tab === "records" && <Records />}
              </div>
            </div>
          </div>
        </Reveal>

        <p className="mt-5 text-center text-xs text-slate-500">
          Demo interface with simulated data. Reference ranges are configurable per organization and clinical protocol.
        </p>
      </div>
    </section>
  );
}
