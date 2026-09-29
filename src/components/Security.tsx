import { CheckCircle2, ClipboardCheck, Database, EyeOff, FileSearch, KeyRound, Lock, Server, ShieldCheck, Users } from "lucide-react";
import { Reveal, SectionHeader } from "./ui";

const ITEMS = [
  { icon: KeyRound, title: "Secure authentication", desc: "Credential-based sign-in with hashed secrets." },
  { icon: Users, title: "Role-based authorization", desc: "Each role sees only what it's permitted to." },
  { icon: Server, title: "Protected API endpoints", desc: "Every sensitive route requires authorization." },
  { icon: Lock, title: "Secure sessions & tokens", desc: "Expiring sessions and token-based access." },
  { icon: Database, title: "Database security", desc: "Parameterized queries and restricted access." },
  { icon: ClipboardCheck, title: "Input validation", desc: "Requests are validated at every boundary." },
  { icon: FileSearch, title: "Audit-friendly architecture", desc: "Designed to support access and activity logging." },
  { icon: ShieldCheck, title: "Secure communication", desc: "Encrypted transport for data in transit." },
  { icon: EyeOff, title: "Privacy-conscious handling", desc: "Minimum-necessary data exposure by design." },
];

function ShieldVisual() {
  const orbit = ["Auth", "RBAC", "TLS", "Tokens", "Validation", "Audit"];
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[440px]" aria-hidden>
      <div className="absolute inset-0 rounded-full border border-brand-100" />
      <div className="absolute inset-[12%] rounded-full border border-dashed border-brand-200 animate-[spin_60s_linear_infinite]" />
      <div className="absolute inset-[26%] rounded-full border border-cyan-100" />
      <div className="absolute inset-[18%] rounded-full bg-gradient-to-br from-brand-100/60 via-cyan-50/60 to-teal-50/60 blur-2xl" />

      {/* orbiting chips */}
      <div className="absolute inset-0 animate-[spin_50s_linear_infinite]">
        {orbit.map((o, i) => {
          const a = (i / orbit.length) * Math.PI * 2;
          const x = 50 + Math.cos(a) * 44;
          const y = 50 + Math.sin(a) * 44;
          return (
            <span
              key={o}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              <span className="block animate-[spin_50s_linear_infinite_reverse] rounded-full border border-slate-200 bg-white px-3 py-1.5 font-mono text-[11px] font-semibold text-navy-800 shadow-[0_10px_20px_-10px_rgba(15,43,92,0.35)]">
                {o}
              </span>
            </span>
          );
        })}
      </div>

      {/* shield */}
      <div className="absolute inset-[30%] grid place-items-center">
        <div className="relative grid h-full w-full place-items-center rounded-[32%] bg-gradient-to-br from-navy-800 via-brand-600 to-cyan-600 shadow-[0_30px_60px_-20px_rgba(29,86,214,0.7)]">
          <span className="absolute inset-0 rounded-[32%] border-2 border-cyan-300/40 animate-pulse-ring" />
          <svg viewBox="0 0 48 48" className="h-1/2 w-1/2">
            <path d="M24 4 8 10v12c0 10 7 18.5 16 22 9-3.5 16-12 16-22V10L24 4z" fill="rgba(255,255,255,0.12)" stroke="#a5f3fc" strokeWidth="2" strokeLinejoin="round" />
            <path d="m17 24 5 5 9-10" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}

export default function Security() {
  return (
    <section id="security" aria-labelledby="security-title" className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50 to-white py-24 sm:py-32">
      <div className="mx-auto grid max-w-7xl gap-14 px-5 sm:px-6 lg:grid-cols-2 lg:items-center">
        <Reveal variant="scale" className="order-2 lg:order-1">
          <ShieldVisual />
        </Reveal>

        <div className="order-1 lg:order-2">
          <SectionHeader
            id="security-title"
            align="left"
            eyebrow="Security & Privacy"
            title={
              <>
                Healthcare data deserves <span className="text-gradient">serious protection.</span>
              </>
            }
            description="Security is built into every layer of the platform — from how users sign in to how data is stored, requested, and displayed."
          />
          <ul className="mt-9 grid gap-3 sm:grid-cols-2">
            {ITEMS.map((it, i) => (
              <Reveal as="li" key={it.title} delay={i * 50}>
                <div className="group flex h-full gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-[0_18px_40px_-24px_rgba(13,148,136,0.45)]">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-teal-100 transition-colors group-hover:bg-teal-600 group-hover:text-white">
                    <it.icon className="h-4.5 w-4.5" aria-hidden />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-navy-900">{it.title}</h3>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-slate-500">{it.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </ul>
          <Reveal delay={200}>
            <p className="mt-6 flex items-start gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-[13px] leading-relaxed text-slate-500">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" aria-hidden />
              We describe only the safeguards implemented in the platform. Formal regulatory certifications are not claimed —
              organizations can review security and deployment requirements directly with our team.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
