import { Check, HeartHandshake, Hospital, Stethoscope, User, Users } from "lucide-react";
import { Reveal, SectionHeader } from "./ui";
import { cn } from "../utils/cn";

const px = (id: number, w: number, h: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=${w}&h=${h}`;

const ROLES = [
  {
    icon: User,
    role: "For Patients",
    img: 4428994,
    alt: "A person checking health information on a smartphone and smartwatch",
    items: ["Better visibility into health information", "Easier access to records", "Health trend awareness", "Connected healthcare experience"],
    big: true,
  },
  {
    icon: Stethoscope,
    role: "For Doctors",
    img: 5452291,
    alt: "A physician in a white coat reviewing information on a tablet",
    items: ["Centralized patient information", "Faster access to health trends", "AI-assisted insights", "Alert visibility"],
    big: true,
  },
  {
    icon: Users,
    role: "For Nurses",
    img: 6129676,
    alt: "A nurse measuring a patient's blood pressure in a hospital room",
    items: ["Patient monitoring support", "Important event visibility", "Centralized patient information"],
  },
  {
    icon: Hospital,
    role: "For Hospitals",
    img: 127873,
    alt: "A bright hospital corridor with medical staff",
    items: ["Centralized healthcare operations", "Patient monitoring", "Analytics", "Intelligent alerts", "Better information visibility"],
  },
  {
    icon: HeartHandshake,
    role: "For Caregivers",
    img: 7446755,
    alt: "A family member checking an older adult's blood pressure at home",
    items: ["Relevant patient information", "Health status visibility", "Important alerts"],
  },
];

export default function Benefits() {
  return (
    <section aria-labelledby="benefits-title" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        <SectionHeader
          id="benefits-title"
          eyebrow="Who It's For"
          title={
            <>
              Designed around the people who <span className="text-gradient">deliver and receive care.</span>
            </>
          }
          description="Every role gets an experience tailored to what it needs to know — and nothing it shouldn't see."
        />
      </div>

      <ul
        className="no-scrollbar mt-14 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 sm:px-6 lg:mx-auto lg:grid lg:max-w-7xl lg:grid-cols-6 lg:overflow-visible lg:pb-0"
        aria-label="Benefits by role"
      >
        {ROLES.map((r, i) => (
          <Reveal
            as="li"
            key={r.role}
            delay={i * 80}
            className={cn("w-[82%] shrink-0 snap-center sm:w-[46%] lg:w-auto", r.big ? "lg:col-span-3" : "lg:col-span-2")}
          >
            <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-[0_30px_60px_-30px_rgba(15,43,92,0.45)]">
              <div className={cn("relative overflow-hidden", r.big ? "aspect-[16/8]" : "aspect-[16/9]")}>
                <img
                  src={px(r.img, 800, 450)}
                  srcSet={`${px(r.img, 480, 270)} 480w, ${px(r.img, 800, 450)} 800w, ${px(r.img, 1100, 560)} 1100w`}
                  sizes="(min-width: 1024px) 40vw, 82vw"
                  alt={r.alt}
                  loading="lazy"
                  decoding="async"
                  width={800}
                  height={450}
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-950/70 via-navy-950/10 to-transparent" />
                <span className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur-md">
                  <r.icon className="h-4 w-4" aria-hidden />
                  {r.role}
                </span>
              </div>
              <div className="flex-1 p-5 sm:p-6">
                <h3 className="sr-only">{r.role}</h3>
                <ul className="space-y-2.5">
                  {r.items.map((it) => (
                    <li key={it} className="flex items-start gap-2.5 text-[14.5px] text-slate-600">
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                        <Check className="h-3 w-3" aria-hidden />
                      </span>
                      {it}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          </Reveal>
        ))}
      </ul>
      <p className="mt-2 text-center text-xs text-slate-400 lg:hidden" aria-hidden>
        Swipe to explore roles →
      </p>
    </section>
  );
}
