import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "../utils/cn";
import { Button, Logo, useCta } from "./ui";

const NAV = [
  { id: "home", label: "Home" },
  { id: "platform", label: "Platform" },
  { id: "features", label: "Features" },
  { id: "how-it-works", label: "How It Works" },
  { id: "technology", label: "Technology" },
  { id: "security", label: "Security" },
  { id: "faq", label: "FAQ" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("home");
  const { open: openCta } = useCta();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const els = NAV.map((n) => document.getElementById(n.id)).filter(Boolean) as HTMLElement[];
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 animate-fade-in transition-all duration-500",
        scrolled ? "py-2" : "py-3 sm:py-4"
      )}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-navy-900 focus:shadow-lg"
      >
        Skip to content
      </a>
      <div className="mx-auto max-w-7xl px-3 sm:px-6">
        <nav
          aria-label="Primary"
          className={cn(
            "flex items-center justify-between rounded-2xl border px-3 py-2 transition-all duration-500 sm:px-4",
            scrolled
              ? "glass border-slate-200/70 shadow-[0_10px_40px_-18px_rgba(15,43,92,0.35)]"
              : "border-transparent bg-transparent"
          )}
        >
          <a href="#home" className="shrink-0 rounded-xl" aria-label="Human Health Care System — home">
            <Logo />
          </a>

          <ul className="hidden items-center gap-0.5 lg:flex">
            {NAV.map((n) => (
              <li key={n.id}>
                <a
                  href={`#${n.id}`}
                  aria-current={active === n.id ? "location" : undefined}
                  className={cn(
                    "relative rounded-full px-3.5 py-2 text-[13.5px] font-medium transition-colors duration-300",
                    active === n.id ? "text-navy-900" : "text-slate-500 hover:text-navy-900"
                  )}
                >
                  {active === n.id && (
                    <span className="absolute inset-0 -z-10 rounded-full bg-brand-50 ring-1 ring-brand-100" aria-hidden />
                  )}
                  {n.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="hidden items-center gap-2 lg:flex">
            <button
              onClick={() => openCta("sign-in")}
              className="rounded-full px-4 py-2 text-sm font-semibold text-navy-900 transition-colors hover:bg-slate-100"
            >
              Sign In
            </button>
            <Button onClick={() => openCta("get-started")} arrow>
              Get Started
            </Button>
          </div>

          <button
            className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white/80 text-navy-900 transition hover:bg-white lg:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>

        {/* Mobile menu */}
        <div
          id="mobile-menu"
          className={cn(
            "lg:hidden",
            "origin-top overflow-hidden transition-all duration-400 ease-out",
            open ? "mt-2 max-h-[80vh] opacity-100" : "pointer-events-none max-h-0 opacity-0"
          )}
          inert={!open}
        >
          <div className="glass rounded-2xl border border-slate-200/70 p-3 shadow-[0_20px_50px_-20px_rgba(15,43,92,0.4)]">
            <ul className="flex flex-col">
              {NAV.map((n, i) => (
                <li
                  key={n.id}
                  className={cn("transition-all duration-500", open ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0")}
                  style={{ transitionDelay: open ? `${i * 40}ms` : "0ms" }}
                >
                  <a
                    href={`#${n.id}`}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center justify-between rounded-xl px-4 py-3.5 text-[15px] font-medium",
                      active === n.id ? "bg-brand-50 text-navy-900" : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {n.label}
                    {active === n.id && <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden />}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-200/70 pt-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setOpen(false);
                  openCta("sign-in");
                }}
              >
                Sign In
              </Button>
              <Button
                onClick={() => {
                  setOpen(false);
                  openCta("get-started");
                }}
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
