import { useEffect, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, Lock, X } from "lucide-react";
import { Button, Logo, type CtaIntent } from "./ui";
import { cn } from "../utils/cn";

const COPY: Record<CtaIntent, { title: string; sub: string; submit: string }> = {
  "get-started": { title: "Get started with Human Health Care System", sub: "Create your account request. We'll follow up with access details for your role.", submit: "Create account request" },
  demo: { title: "Request a platform demo", sub: "See monitoring, AI insights, alerts, and dashboards with a guided walkthrough.", submit: "Request demo" },
  contact: { title: "Contact our team", sub: "Tell us about your organization's deployment and requirements.", submit: "Send message" },
  "sign-in": { title: "Sign in", sub: "Access your dashboard securely.", submit: "Sign in" },
};

const ROLES = ["Patient", "Caregiver", "Doctor", "Nurse", "Hospital / Clinic", "Administrator"];

export default function CtaModal({ intent, plan, onClose }: { intent: CtaIntent | null; plan?: string; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstRef = useRef<HTMLInputElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const [done, setDone] = useState(false);
  const [role, setRole] = useState("Patient");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!intent) return;
    lastFocus.current = document.activeElement as HTMLElement;
    setDone(false);
    setErrors({});
    if (plan?.startsWith("Healthcare")) setRole("Doctor");
    else if (plan?.startsWith("Hospital")) setRole("Hospital / Clinic");
    else setRole("Patient");
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => firstRef.current?.focus(), 50);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && dialogRef.current) {
        const f = dialogRef.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        const list = Array.from(f).filter((el) => !el.hasAttribute("disabled"));
        if (!list.length) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      lastFocus.current?.focus?.();
    };
  }, [intent, plan, onClose]);

  if (!intent) return null;
  const c = COPY[intent];
  const isSignIn = intent === "sign-in";

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const errs: Record<string, string> = {};
    const email = String(fd.get("email") || "").trim();
    if (!isSignIn && !String(fd.get("name") || "").trim()) errs.name = "Please enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Please enter a valid email address.";
    if (isSignIn && String(fd.get("password") || "").length < 8) errs.password = "Password must be at least 8 characters.";
    if (!isSignIn && !fd.get("consent")) errs.consent = "Please acknowledge the disclaimer to continue.";
    setErrors(errs);
    if (Object.keys(errs).length === 0) setDone(true);
  };

  const field = "mt-1.5 block h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-[15px] text-navy-900 placeholder:text-slate-400 transition focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100";

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-6" role="presentation">
      <div className="absolute inset-0 animate-fade-in bg-navy-950/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cta-modal-title"
        aria-describedby="cta-modal-desc"
        className="relative max-h-[92vh] w-full max-w-lg animate-fade-up overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl sm:p-8"
        style={{ animationDuration: "0.45s" }}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-navy-900"
          aria-label="Close dialog"
        >
          <X className="h-5 w-5" />
        </button>
        <Logo />

        {done ? (
          <div className="py-8 text-center" role="status">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/60">
              <CheckCircle2 className="h-8 w-8" aria-hidden />
            </span>
            <h2 id="cta-modal-title" className="mt-6 text-2xl font-semibold tracking-tight text-navy-900">
              {isSignIn ? "Welcome back" : "Thank you — we've received your request"}
            </h2>
            <p id="cta-modal-desc" className="mt-2 text-[15px] leading-relaxed text-slate-600">
              {isSignIn
                ? "This is a preview environment. Dashboard access will open once your account is provisioned."
                : "Our team will be in touch shortly with next steps for your role and organization."}
            </p>
            <Button className="mt-8" onClick={onClose}>
              Continue exploring
            </Button>
          </div>
        ) : (
          <>
            <h2 id="cta-modal-title" className="mt-6 text-2xl font-semibold tracking-tight text-navy-900">
              {c.title}
            </h2>
            <p id="cta-modal-desc" className="mt-2 text-[15px] leading-relaxed text-slate-600">
              {c.sub}
              {plan && <span className="mt-1 block text-sm font-medium text-brand-600">Selected: {plan}</span>}
            </p>

            <form onSubmit={submit} noValidate className="mt-6 space-y-4">
              {!isSignIn && (
                <fieldset>
                  <legend className="text-sm font-medium text-navy-900">I am a…</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {ROLES.map((r) => (
                      <label
                        key={r}
                        className={cn(
                          "cursor-pointer rounded-full border px-3.5 py-2 text-sm font-medium transition-all has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand-100",
                          role === r ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-600 hover:border-slate-300"
                        )}
                      >
                        <input type="radio" name="role" value={r} checked={role === r} onChange={() => setRole(r)} className="sr-only" />
                        {r}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}

              {!isSignIn && (
                <div>
                  <label htmlFor="f-name" className="text-sm font-medium text-navy-900">Full name</label>
                  <input ref={firstRef} id="f-name" name="name" autoComplete="name" className={field} aria-invalid={!!errors.name} aria-describedby={errors.name ? "e-name" : undefined} />
                  {errors.name && <p id="e-name" className="mt-1 text-sm text-rose-600">{errors.name}</p>}
                </div>
              )}

              <div>
                <label htmlFor="f-email" className="text-sm font-medium text-navy-900">Email</label>
                <input
                  ref={isSignIn ? firstRef : undefined}
                  id="f-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={field}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "e-email" : undefined}
                />
                {errors.email && <p id="e-email" className="mt-1 text-sm text-rose-600">{errors.email}</p>}
              </div>

              {isSignIn ? (
                <div>
                  <label htmlFor="f-pass" className="text-sm font-medium text-navy-900">Password</label>
                  <input id="f-pass" name="password" type="password" autoComplete="current-password" className={field} aria-invalid={!!errors.password} aria-describedby={errors.password ? "e-pass" : undefined} />
                  {errors.password && <p id="e-pass" className="mt-1 text-sm text-rose-600">{errors.password}</p>}
                </div>
              ) : (
                (intent !== "get-started" || role.includes("Hospital") || role === "Administrator") && (
                  <div>
                    <label htmlFor="f-org" className="text-sm font-medium text-navy-900">
                      Organization <span className="font-normal text-slate-400">(optional)</span>
                    </label>
                    <input id="f-org" name="org" autoComplete="organization" className={field} />
                  </div>
                )
              )}

              {!isSignIn && (
                <div>
                  <label className="flex items-start gap-3 text-sm leading-relaxed text-slate-600">
                    <input type="checkbox" name="consent" className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 accent-brand-600" aria-invalid={!!errors.consent} aria-describedby={errors.consent ? "e-consent" : undefined} />
                    I understand this platform provides AI-assisted decision support and is not a substitute for professional medical care or emergency services.
                  </label>
                  {errors.consent && <p id="e-consent" className="mt-1 text-sm text-rose-600">{errors.consent}</p>}
                </div>
              )}

              <Button type="submit" size="lg" className="w-full" arrow>
                {c.submit}
              </Button>
              <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
                <Lock className="h-3.5 w-3.5" aria-hidden /> Your information is transmitted securely.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
