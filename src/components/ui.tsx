import { createContext, useContext, type CSSProperties, type ElementType, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "../utils/cn";
import { useInView } from "../hooks/useInView";

/* ---------------- CTA context (Get Started / Demo modal) ---------------- */
export type CtaIntent = "get-started" | "demo" | "contact" | "sign-in";
export const CtaContext = createContext<{ open: (intent: CtaIntent, plan?: string) => void }>({
  open: () => {},
});
export const useCta = () => useContext(CtaContext);

/* ---------------- Reveal ---------------- */
type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  variant?: "up" | "left" | "right" | "scale";
  as?: ElementType;
  style?: CSSProperties;
};
export function Reveal({ children, className, delay = 0, variant = "up", as: Tag = "div", style }: RevealProps) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <Tag
      ref={ref}
      className={cn(
        "reveal",
        variant === "left" && "reveal-left",
        variant === "right" && "reveal-right",
        variant === "scale" && "reveal-scale",
        inView && "is-visible",
        className
      )}
      style={{ ...style, ["--reveal-delay" as string]: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}

/* ---------------- Section header ---------------- */
export function Eyebrow({ children, dark = false, className }: { children: ReactNode; dark?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em]",
        dark
          ? "border-white/15 bg-white/5 text-cyan-200"
          : "border-brand-200/70 bg-brand-50/80 text-brand-700",
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dark ? "bg-cyan-300" : "bg-brand-500")} aria-hidden />
      {children}
    </span>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  dark = false,
  align = "center",
  className,
  id,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  dark?: boolean;
  align?: "center" | "left";
  className?: string;
  id?: string;
}) {
  return (
    <div className={cn("max-w-3xl", align === "center" ? "mx-auto text-center" : "text-left", className)}>
      <Reveal>
        <Eyebrow dark={dark}>{eyebrow}</Eyebrow>
      </Reveal>
      <Reveal delay={80}>
        <h2
          id={id}
          className={cn(
            "mt-5 text-3xl font-semibold leading-[1.1] tracking-[-0.025em] sm:text-4xl lg:text-[3.1rem]",
            dark ? "text-white" : "text-navy-900"
          )}
        >
          {title}
        </h2>
      </Reveal>
      {description && (
        <Reveal delay={160}>
          <p className={cn("mt-5 text-base leading-relaxed sm:text-lg", dark ? "text-slate-300" : "text-slate-600")}>
            {description}
          </p>
        </Reveal>
      )}
    </div>
  );
}

/* ---------------- Buttons ---------------- */
type BtnProps = {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "light" | "outline-light";
  size?: "md" | "lg";
  className?: string;
  onClick?: () => void;
  href?: string;
  arrow?: boolean;
  type?: "button" | "submit";
  ariaLabel?: string;
};
export function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  onClick,
  href,
  arrow,
  type = "button",
  ariaLabel,
}: BtnProps) {
  const base =
    "group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full font-semibold transition-all duration-300 ease-out will-change-transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline-offset-4";
  const sizes = { md: "h-11 px-5 text-sm", lg: "h-13 px-7 text-[15px]" };
  const variants = {
    primary:
      "bg-gradient-to-r from-brand-600 via-brand-500 to-cyan-600 bg-[length:200%_100%] bg-left text-white shadow-[0_10px_30px_-10px_rgba(29,86,214,0.7)] hover:bg-right hover:shadow-[0_18px_40px_-12px_rgba(29,86,214,0.75)]",
    secondary:
      "border border-slate-200 bg-white/80 text-navy-900 shadow-sm backdrop-blur hover:border-brand-300 hover:bg-white hover:shadow-[0_12px_30px_-14px_rgba(15,43,92,0.35)]",
    ghost: "text-navy-900 hover:bg-slate-100",
    light: "bg-white text-navy-900 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.4)] hover:shadow-[0_18px_40px_-12px_rgba(0,0,0,0.5)]",
    "outline-light": "border border-white/25 bg-white/5 text-white backdrop-blur hover:border-white/50 hover:bg-white/10",
  };
  const content = (
    <>
      <span className="relative z-10 inline-flex items-center gap-2">
        {children}
        {arrow && (
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
        )}
      </span>
    </>
  );
  const cls = cn(base, sizes[size], variants[variant], className);
  if (href) {
    return (
      <a href={href} className={cls} onClick={onClick} aria-label={ariaLabel}>
        {content}
      </a>
    );
  }
  return (
    <button type={type} className={cls} onClick={onClick} aria-label={ariaLabel}>
      {content}
    </button>
  );
}

/* ---------------- Logo ---------------- */
export function Logo({ dark = false, className }: { dark?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="relative grid h-9 w-9 place-items-center rounded-[11px] bg-gradient-to-br from-navy-800 via-brand-600 to-cyan-600 shadow-[0_6px_18px_-6px_rgba(29,86,214,0.8)]">
        <svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden>
          <path
            d="M5 17h5l2.2-5.5 4.3 11 3.2-7.5 1.8 2H27"
            fill="none"
            stroke="#a5f3fc"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="flex flex-col leading-none">
        <span className={cn("text-[15px] font-bold tracking-tight", dark ? "text-white" : "text-navy-900")}>
          Human Health
        </span>
        <span
          className={cn(
            "mt-0.5 text-[10px] font-semibold uppercase tracking-[0.2em]",
            dark ? "text-cyan-200/80" : "text-brand-600"
          )}
        >
          Care System
        </span>
      </span>
    </span>
  );
}

/* ---------------- Sparkline ---------------- */
export function Sparkline({
  data,
  className,
  stroke = "#2f6ff0",
  fill = true,
  height = 40,
  width = 120,
  strokeWidth = 2,
}: {
  data: number[];
  className?: string;
  stroke?: string;
  fill?: boolean;
  height?: number;
  width?: number;
  strokeWidth?: number;
}) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - 3 - ((d - min) / range) * (height - 6);
    return [x, y] as const;
  });
  const path = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const gid = `sg-${stroke.replace(/[^a-z0-9]/gi, "")}-${data.length}`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className={className} aria-hidden>
      {fill && (
        <defs>
          <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.25" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
      )}
      {fill && <path d={`${path} L${width},${height} L0,${height} Z`} fill={`url(#${gid})`} />}
      <path d={path} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/* ---------------- Live dot ---------------- */
export function LiveDot({ color = "bg-emerald-500", className }: { color?: string; className?: string }) {
  return (
    <span className={cn("relative inline-flex h-2 w-2", className)} aria-hidden>
      <span className={cn("absolute inset-0 rounded-full animate-pulse-ring", color)} />
      <span className={cn("relative inline-flex h-2 w-2 rounded-full", color)} />
    </span>
  );
}

export function DemoBadge({ className, dark = false }: { className?: string; dark?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider",
        dark ? "border-amber-300/30 bg-amber-300/10 text-amber-200" : "border-amber-200 bg-amber-50 text-amber-700",
        className
      )}
    >
      Demo data
    </span>
  );
}
