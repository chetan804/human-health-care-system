import { HeartPulse, ShieldCheck, Sparkles } from "lucide-react";
import HeroDashboard from "./HeroDashboard";
import { Button, Eyebrow, useCta } from "./ui";

export default function Hero() {
  const { open } = useCta();
  return (
    <section id="home" aria-labelledby="hero-title" className="relative overflow-hidden pb-20 pt-28 sm:pt-36 lg:pb-28 lg:pt-40">
      {/* ambient background */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="absolute inset-0 bg-gradient-to-b from-brand-50/80 via-white to-white" />
        <div className="grid-bg absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]" />
        <div className="absolute -left-40 -top-20 h-[520px] w-[520px] rounded-full bg-brand-200/50 blur-3xl animate-blob" />
        <div className="absolute -right-32 top-24 h-[460px] w-[460px] rounded-full bg-cyan-200/50 blur-3xl animate-blob" style={{ animationDelay: "-8s" }} />
        <div className="absolute bottom-0 left-1/3 h-[360px] w-[360px] rounded-full bg-teal-100/60 blur-3xl animate-blob" style={{ animationDelay: "-14s" }} />
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-6 lg:grid-cols-[1.02fr_1fr] lg:gap-10">
        <div className="text-center lg:text-left">
          <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
            <Eyebrow>
              <Sparkles className="-ml-1 h-3 w-3" aria-hidden /> AI-Powered Healthcare Platform
            </Eyebrow>
          </div>

          <h1
            id="hero-title"
            className="mt-6 text-[2.35rem] font-bold leading-[1.04] tracking-[-0.035em] text-navy-900 sm:text-5xl lg:text-[4rem] xl:text-[4.4rem]"
          >
            <span className="block animate-fade-up" style={{ animationDelay: "160ms" }}>Healthcare That</span>
            <span className="block animate-fade-up" style={{ animationDelay: "260ms" }}>
              <span className="text-gradient">Watches, Understands,</span>
            </span>
            <span className="block animate-fade-up" style={{ animationDelay: "360ms" }}>and Responds.</span>
          </h1>

          <p
            className="mx-auto mt-6 max-w-xl animate-fade-up text-base leading-relaxed text-slate-600 sm:text-lg lg:mx-0"
            style={{ animationDelay: "480ms" }}
          >
            Human Health Care System brings real-time health monitoring, AI-powered insights, electronic health records,
            intelligent alerts, and hospital assistance together in one connected healthcare platform.
          </p>

          <div
            className="mt-9 flex animate-fade-up flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center lg:justify-start"
            style={{ animationDelay: "600ms" }}
          >
            <Button size="lg" arrow onClick={() => open("get-started")}>
              Get Started
            </Button>
            <Button size="lg" variant="secondary" href="#platform">
              Explore the Platform
            </Button>
          </div>

          <p
            className="mx-auto mt-7 max-w-md animate-fade-up text-sm leading-relaxed text-slate-500 lg:mx-0"
            style={{ animationDelay: "720ms" }}
          >
            Built for patients. Designed for healthcare professionals. Powered by intelligent technology.
          </p>

          <ul
            className="mt-6 flex animate-fade-up flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] font-medium text-slate-500 lg:justify-start"
            style={{ animationDelay: "820ms" }}
          >
            <li className="inline-flex items-center gap-1.5">
              <HeartPulse className="h-4 w-4 text-brand-500" aria-hidden /> Real-time vitals
            </li>
            <li className="inline-flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-cyan-600" aria-hidden /> AI decision support
            </li>
            <li className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-teal-600" aria-hidden /> Role-based access
            </li>
          </ul>
        </div>

        <div className="animate-fade-up px-2 sm:px-8 lg:px-4" style={{ animationDelay: "420ms", animationDuration: "1.2s" }}>
          <HeroDashboard />
        </div>
      </div>
    </section>
  );
}
