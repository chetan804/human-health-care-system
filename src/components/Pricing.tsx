import { Building2, Check, Stethoscope, User } from "lucide-react";
import { Button, Reveal, SectionHeader, useCta } from "./ui";
import { cn } from "../utils/cn";

const PLANS = [
  {
    icon: User,
    name: "Patient",
    price: "Free",
    sub: "Platform access",
    desc: "For individuals who want visibility into their own health information.",
    items: ["Personal health dashboard", "Health records", "Monitoring", "Health trends", "Notifications"],
    cta: "Get Started",
    intent: "get-started" as const,
  },
  {
    icon: Stethoscope,
    name: "Healthcare Professional",
    price: "Professional",
    sub: "For clinicians & care teams",
    desc: "For doctors and nurses monitoring and reviewing patients.",
    items: ["Patient dashboard", "Monitoring", "AI-assisted insights", "Alerts", "Health analytics", "Patient records"],
    cta: "Request Access",
    intent: "demo" as const,
    featured: true,
  },
  {
    icon: Building2,
    name: "Hospital / Organization",
    price: "Enterprise",
    sub: "For hospitals & clinics",
    desc: "For organizations deploying the platform across teams and departments.",
    items: ["Hospital dashboard", "Multi-user access", "Role-based permissions", "Analytics", "Centralized monitoring", "Administrative controls", "Deployment support"],
    cta: "Contact Us",
    intent: "contact" as const,
  },
];

export default function Pricing() {
  const { open } = useCta();
  return (
    <section id="access" aria-labelledby="pricing-title" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        <SectionHeader
          id="pricing-title"
          eyebrow="Access"
          title={
            <>
              Access that fits <span className="text-gradient">every role in care.</span>
            </>
          }
          description="Choose the experience that matches how you participate in healthcare. Organizational access is tailored to your deployment."
        />

        <div className="mt-16 grid gap-5 lg:grid-cols-3 lg:items-stretch">
          {PLANS.map((p, i) => (
            <Reveal key={p.name} delay={i * 100} className="h-full">
              <article
                className={cn(
                  "relative flex h-full flex-col rounded-3xl border p-7 transition-all duration-300 hover:-translate-y-1",
                  p.featured
                    ? "border-transparent bg-navy-950 text-white shadow-[0_40px_80px_-35px_rgba(10,31,68,0.8)]"
                    : "border-slate-200/80 bg-white hover:border-brand-200 hover:shadow-[0_30px_60px_-30px_rgba(15,43,92,0.4)]"
                )}
              >
                {p.featured && (
                  <>
                    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl" aria-hidden>
                      <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-500/30 blur-3xl" />
                      <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-cyan-500/20 blur-3xl" />
                    </div>
                    <span className="absolute -top-3 left-7 rounded-full bg-gradient-to-r from-brand-500 to-cyan-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white shadow">
                      For clinicians
                    </span>
                  </>
                )}
                <div className="relative flex items-center gap-3">
                  <span
                    className={cn(
                      "grid h-11 w-11 place-items-center rounded-2xl",
                      p.featured ? "bg-white/10 text-cyan-200" : "bg-brand-50 text-brand-600 ring-1 ring-brand-100"
                    )}
                  >
                    <p.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className={cn("text-lg font-semibold", p.featured ? "text-white" : "text-navy-900")}>{p.name}</h3>
                </div>
                <div className="relative mt-6">
                  <p className={cn("text-3xl font-bold tracking-tight", p.featured ? "text-white" : "text-navy-900")}>{p.price}</p>
                  <p className={cn("mt-1 text-sm", p.featured ? "text-cyan-200" : "text-brand-600")}>{p.sub}</p>
                  <p className={cn("mt-3 text-[14.5px] leading-relaxed", p.featured ? "text-slate-300" : "text-slate-600")}>{p.desc}</p>
                </div>
                <ul className={cn("relative mt-6 flex-1 space-y-3 border-t pt-6", p.featured ? "border-white/10" : "border-slate-100")}>
                  {p.items.map((it) => (
                    <li key={it} className={cn("flex items-center gap-2.5 text-[14.5px]", p.featured ? "text-slate-200" : "text-slate-600")}>
                      <Check className={cn("h-4 w-4 shrink-0", p.featured ? "text-cyan-300" : "text-brand-500")} aria-hidden />
                      {it}
                    </li>
                  ))}
                </ul>
                <div className="relative mt-8">
                  <Button
                    className="w-full"
                    variant={p.featured ? "light" : p.intent === "get-started" ? "primary" : "secondary"}
                    arrow
                    onClick={() => open(p.intent, p.name)}
                  >
                    {p.cta}
                  </Button>
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal delay={200}>
          <p className="mt-10 text-center text-[15px] text-slate-600">
            Contact our team for deployment and organizational requirements.{" "}
            <button onClick={() => open("contact")} className="font-semibold text-brand-600 underline-offset-4 hover:underline">
              Contact Us →
            </button>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
