import { useId, useState } from "react";
import { Plus } from "lucide-react";
import { Reveal, SectionHeader, useCta } from "./ui";
import { cn } from "../utils/cn";

const FAQS = [
  {
    q: "What is Human Health Care System?",
    a: "Human Health Care System is an AI-powered healthcare monitoring and hospital assistance platform. It brings real-time health monitoring, electronic health records, intelligent alerts, analytics, and machine-learning-based decision support together in one connected system for patients, care teams, and organizations.",
  },
  {
    q: "Who is the platform designed for?",
    a: "Patients, doctors, nurses, caregivers, hospitals, clinics, and healthcare administrators. Each role receives a dedicated dashboard and permissions suited to its responsibilities.",
  },
  {
    q: "Does the AI diagnose diseases?",
    a: "No. The AI is intended to provide decision-support insights and identify potentially significant patterns in available data. Medical decisions remain with qualified healthcare professionals.",
  },
  {
    q: "Can patients access their health information?",
    a: "Yes — according to the permissions and functionality implemented by the platform. Patients can view relevant information such as their dashboard, records, trends, and notifications.",
  },
  {
    q: "Can healthcare professionals monitor patients?",
    a: "Yes. The platform is designed to give healthcare professionals centralized patient monitoring, health trends, alerts, records, and AI-assisted context in one place.",
  },
  {
    q: "Is my healthcare data secure?",
    a: "The platform uses secure authentication, role-based authorization, protected API endpoints, secure sessions/tokens, input validation, database access controls, and encrypted communication in transit. We do not claim formal regulatory certifications; organizations can discuss specific security and compliance requirements with our team before deployment.",
  },
  {
    q: "Can the platform integrate with hospitals?",
    a: "The current architecture is built around REST APIs and a modular, containerized backend, which makes it extensible. Direct integrations with existing hospital systems (such as EHR/HIS platforms) are considered future capabilities and would be scoped per organization.",
  },
  {
    q: "Can the system work with real-time health devices?",
    a: "The platform is designed to ingest and visualize health readings through its API layer. Direct integrations with specific wearables or bedside devices are a planned future extension rather than a current, out-of-the-box feature.",
  },
  {
    q: "Is this a replacement for a doctor?",
    a: "No. It is a healthcare information and AI-assisted decision-support platform and should not replace professional medical evaluation. In an emergency, contact local emergency services immediately.",
  },
];

function Item({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  const id = useId();
  return (
    <div className={cn("rounded-2xl border bg-white transition-all duration-300", open ? "border-brand-200 shadow-[0_20px_40px_-28px_rgba(15,43,92,0.45)]" : "border-slate-200/80 hover:border-slate-300")}>
      <h3>
        <button
          id={`${id}-btn`}
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-4 rounded-2xl px-5 py-5 text-left sm:px-6"
        >
          <span className="text-[15.5px] font-semibold text-navy-900">{q}</span>
          <span
            className={cn(
              "grid h-8 w-8 shrink-0 place-items-center rounded-full border transition-all duration-300",
              open ? "rotate-45 border-brand-500 bg-brand-500 text-white" : "border-slate-200 text-slate-500"
            )}
          >
            <Plus className="h-4 w-4" aria-hidden />
          </span>
        </button>
      </h3>
      <div
        id={`${id}-panel`}
        role="region"
        aria-labelledby={`${id}-btn`}
        className={cn("grid transition-[grid-template-rows] duration-400 ease-out", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}
      >
        <div className="overflow-hidden">
          <p className="px-5 pb-5 text-[15px] leading-relaxed text-slate-600 sm:px-6">{a}</p>
        </div>
      </div>
    </div>
  );
}

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  const { open: openCta } = useCta();
  return (
    <section id="faq" aria-labelledby="faq-title" className="relative bg-slate-50/70 py-24 sm:py-32">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeader
            id="faq-title"
            align="left"
            eyebrow="FAQ"
            title="Questions, answered clearly."
            description="Straight answers about what the platform does — and what it doesn't."
          />
          <Reveal delay={200}>
            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-semibold text-navy-900">Still have questions?</p>
              <p className="mt-1 text-sm text-slate-500">Our team can walk you through the platform and deployment options.</p>
              <button onClick={() => openCta("contact")} className="mt-3 text-sm font-semibold text-brand-600 underline-offset-4 hover:underline">
                Talk to our team →
              </button>
            </div>
          </Reveal>
        </div>
        <div className="space-y-3">
          {FAQS.map((f, i) => (
            <Reveal key={f.q} delay={i * 40}>
              <Item q={f.q} a={f.a} open={open === i} onToggle={() => setOpen(open === i ? null : i)} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
