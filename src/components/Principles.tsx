import { Quote } from "lucide-react";
import { Reveal, SectionHeader } from "./ui";

const QUOTES = [
  {
    q: "Designed to reduce information fragmentation and give healthcare teams a clearer view of patient data.",
    tag: "Clarity",
  },
  {
    q: "AI should add context for clinicians — never replace their judgment. Every insight is built to be reviewed by a person.",
    tag: "Human oversight",
  },
  {
    q: "Patients and caregivers deserve to understand their own health information, not just the professionals around them.",
    tag: "Shared visibility",
  },
];

export default function Principles() {
  return (
    <section aria-labelledby="principles-title" className="relative overflow-hidden bg-slate-50/70 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        <SectionHeader
          id="principles-title"
          eyebrow="What Guides Us"
          title="The principles behind the product."
          description="We're early in collecting real-world feedback. Until verified testimonials are available, here are the design principles we hold ourselves to."
        />
        <ul className="mt-14 grid gap-5 md:grid-cols-3">
          {QUOTES.map((x, i) => (
            <Reveal as="li" key={x.tag} delay={i * 100}>
              <figure className="group relative flex h-full flex-col rounded-3xl border border-slate-200/80 bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_30px_60px_-30px_rgba(15,43,92,0.4)]">
                <Quote className="h-8 w-8 text-brand-200 transition-colors group-hover:text-brand-400" aria-hidden />
                <blockquote className="mt-5 flex-1 text-lg font-medium leading-relaxed tracking-tight text-navy-900">
                  “{x.q}”
                </blockquote>
                <figcaption className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">Product Design Principle</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">{x.tag}</span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </ul>
        <p className="mt-6 text-center text-xs text-slate-500">
          These are not customer testimonials. Verified user feedback will replace them as it becomes available.
        </p>
      </div>
    </section>
  );
}
