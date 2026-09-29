import { AlertTriangle } from "lucide-react";
import { Logo, useCta } from "./ui";

const COLS: { title: string; links: { label: string; href?: string; intent?: "contact" }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Platform", href: "#platform" },
      { label: "Features", href: "#features" },
      { label: "Monitoring", href: "#showcase" },
      { label: "AI Insights", href: "#showcase" },
      { label: "Dashboards", href: "#features" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { label: "Patients", href: "#access" },
      { label: "Doctors", href: "#access" },
      { label: "Nurses", href: "#access" },
      { label: "Hospitals", href: "#access" },
      { label: "Caregivers", href: "#access" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "#technology" },
      { label: "FAQ", href: "#faq" },
      { label: "Technology", href: "#technology" },
      { label: "Security", href: "#security" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#platform" },
      { label: "Contact", intent: "contact" },
      { label: "Careers", intent: "contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "#security" },
      { label: "Terms of Service", href: "#faq" },
      { label: "Medical Disclaimer", href: "#disclaimer" },
    ],
  },
];

export default function Footer() {
  const { open } = useCta();
  return (
    <footer className="relative border-t border-slate-200 bg-white pt-16" aria-labelledby="footer-title">
      <h2 id="footer-title" className="sr-only">Footer</h2>
      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <Logo />
            <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-slate-600">
              Intelligent Healthcare. Real-Time Monitoring. Better Decisions.
            </p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-500">
              An AI-powered real-time health monitoring and hospital assistance platform for patients, caregivers, clinicians, and
              healthcare organizations.
            </p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
            {COLS.map((c) => (
              <div key={c.title}>
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-navy-900">{c.title}</h3>
                <ul className="mt-4 space-y-3">
                  {c.links.map((l) => (
                    <li key={l.label}>
                      {l.intent ? (
                        <button onClick={() => open(l.intent!)} className="text-sm text-slate-500 transition-colors hover:text-brand-600">
                          {l.label}
                        </button>
                      ) : (
                        <a href={l.href} className="text-sm text-slate-500 transition-colors hover:text-brand-600">
                          {l.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div id="disclaimer" className="mt-14 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
          <p className="text-[13.5px] leading-relaxed text-amber-900">
            <strong className="font-semibold">Medical disclaimer: </strong>
            Human Health Care System provides healthcare information, monitoring, analytics, and AI-assisted decision support. It is
            not a substitute for professional medical advice, diagnosis, treatment, or emergency medical services. In an emergency,
            contact appropriate local emergency services or a qualified healthcare professional.
          </p>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-slate-100 py-8 text-sm text-slate-500 sm:flex-row">
          <p>© {new Date().getFullYear()} Human Health Care System. All rights reserved.</p>
          <p className="text-xs">Imagery via Pexels · Dashboard data shown is illustrative.</p>
        </div>
      </div>
    </footer>
  );
}
