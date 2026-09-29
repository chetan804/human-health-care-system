import { Clock3, Layers3, Network, Unplug, Waves } from "lucide-react";
import { Reveal, SectionHeader } from "./ui";

const PROBLEMS = [
  {
    icon: Layers3,
    title: "Fragmented Health Information",
    desc: "Patient information can be distributed across different systems, records, and formats — making a complete picture hard to assemble.",
  },
  {
    icon: Clock3,
    title: "Delayed Awareness",
    desc: "Important changes in patient health may not be immediately visible to the healthcare teams who need to know.",
  },
  {
    icon: Waves,
    title: "Information Overload",
    desc: "Healthcare professionals can face large volumes of patient information, making it harder to see what matters now.",
  },
  {
    icon: Network,
    title: "Limited Continuous Monitoring",
    desc: "Traditional workflows may not provide continuous visibility into changing patient conditions between checks.",
  },
  {
    icon: Unplug,
    title: "Disconnected Care",
    desc: "Patients, caregivers, doctors, and hospitals may operate through separate, disconnected workflows.",
  },
];

export default function Problem() {
  return (
    <section aria-labelledby="problem-title" className="relative py-24 sm:py-32">
      <div className="mx-auto grid max-w-7xl gap-14 px-5 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeader
            id="problem-title"
            align="left"
            eyebrow="The Challenge"
            title={
              <>
                Healthcare data is everywhere.{" "}
                <span className="text-slate-400">Patient intelligence shouldn't be.</span>
              </>
            }
            description="Care teams work hard to stay informed — but information scattered across systems, devices, and shifts makes it difficult to see the full picture at the right moment."
          />
          <Reveal delay={220} variant="scale">
            <div className="relative mt-10 overflow-hidden rounded-3xl border border-slate-200 shadow-[0_30px_60px_-30px_rgba(15,43,92,0.45)]">
              <img
                src="https://images.pexels.com/photos/6010873/pexels-photo-6010873.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=560&w=900"
                srcSet="https://images.pexels.com/photos/6010873/pexels-photo-6010873.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=373&w=600 600w, https://images.pexels.com/photos/6010873/pexels-photo-6010873.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=560&w=900 900w"
                sizes="(min-width: 1024px) 40vw, 100vw"
                alt="A doctor reviewing information on a digital tablet with a patient"
                loading="lazy"
                decoding="async"
                width={900}
                height={560}
                className="aspect-[16/10] w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 via-navy-900/10 to-transparent" />
              <div className="absolute inset-x-4 bottom-4 flex flex-wrap gap-2">
                {["Lab system", "Paper notes", "Bedside monitor", "Pharmacy", "Messages"].map((t, i) => (
                  <span
                    key={t}
                    className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-md"
                    style={{ transform: `translateY(${(i % 2) * 4}px)` }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        </div>

        <ol className="relative space-y-4">
          <span className="absolute bottom-6 left-[27px] top-6 hidden w-px bg-gradient-to-b from-brand-200 via-slate-200 to-transparent sm:block" aria-hidden />
          {PROBLEMS.map((p, i) => (
            <Reveal as="li" key={p.title} delay={i * 90} variant="right">
              <div className="group relative flex gap-5 rounded-3xl border border-slate-200/80 bg-white p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-[0_24px_50px_-28px_rgba(15,43,92,0.4)] sm:p-6">
                <span className="relative z-10 grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 text-navy-800 transition-all duration-300 group-hover:border-brand-200 group-hover:from-brand-50 group-hover:text-brand-600">
                  <p.icon className="h-6 w-6" aria-hidden />
                </span>
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-semibold text-slate-400">0{i + 1}</span>
                    <h3 className="text-lg font-semibold tracking-tight text-navy-900">{p.title}</h3>
                  </div>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">{p.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
          <Reveal as="li" delay={500}>
            <p className="rounded-3xl bg-gradient-to-r from-brand-50 to-cyan-50 p-6 text-[15px] font-medium leading-relaxed text-navy-800 ring-1 ring-brand-100">
              Human Health Care System was designed to bring these pieces together — so the right people see the right
              information, sooner.
            </p>
          </Reveal>
        </ol>
      </div>
    </section>
  );
}
