import { Activity, BellRing, Brain, HeartPulse } from "lucide-react";
import { Button, Reveal, useCta } from "./ui";

const FLOATERS = [
  { icon: HeartPulse, label: "72 BPM", pos: "left-[6%] top-[18%]", delay: "0s" },
  { icon: Activity, label: "SpO₂ 98%", pos: "right-[7%] top-[22%]", delay: "1.5s" },
  { icon: Brain, label: "Risk: Low", pos: "left-[10%] bottom-[16%]", delay: "3s" },
  { icon: BellRing, label: "Alert reviewed", pos: "right-[10%] bottom-[18%]", delay: "2.2s" },
];

export default function FinalCTA() {
  const { open } = useCta();
  return (
    <section aria-labelledby="cta-title" className="relative px-3 py-16 sm:px-6 sm:py-24">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[36px] bg-navy-950 px-6 py-20 text-center sm:px-12 sm:py-28">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -left-20 -top-24 h-[420px] w-[420px] rounded-full bg-brand-600/40 blur-[100px] animate-blob" />
          <div className="absolute -bottom-32 -right-10 h-[460px] w-[460px] rounded-full bg-cyan-500/25 blur-[110px] animate-blob" style={{ animationDelay: "-7s" }} />
          <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-400/15 blur-[90px] animate-blob" style={{ animationDelay: "-13s" }} />
          <div className="grid-bg-dark absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
          {FLOATERS.map((f) => (
            <span
              key={f.label}
              className={`absolute hidden animate-float items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-2 text-xs font-medium text-slate-200 backdrop-blur-md md:inline-flex ${f.pos}`}
              style={{ animationDelay: f.delay }}
            >
              <f.icon className="h-3.5 w-3.5 text-cyan-300" />
              {f.label}
            </span>
          ))}
        </div>

        <div className="relative mx-auto max-w-3xl">
          <Reveal>
            <h2 id="cta-title" className="text-3xl font-semibold leading-[1.1] tracking-[-0.03em] text-white sm:text-5xl lg:text-6xl">
              Build a more <span className="text-gradient-light">connected</span> healthcare experience.
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
              Bring monitoring, healthcare information, intelligent insights, and hospital assistance together in one platform.
            </p>
          </Reveal>
          <Reveal delay={200}>
            <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Button size="lg" variant="light" arrow onClick={() => open("get-started")}>
                Get Started
              </Button>
              <Button size="lg" variant="outline-light" href="#platform">
                Explore the Platform
              </Button>
            </div>
          </Reveal>
          <Reveal delay={280}>
            <p className="mt-8 text-xs text-slate-400">Decision-support platform · Not a substitute for professional medical care</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
