import type { ReactNode } from "react";
import {
  AlertCircle,
  ArrowRight,
  Inbox,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ApiError } from "../api/client";
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return (
    <span className={`badge ${tone}`}>
      <span className="badge-dot" />
      {children}
    </span>
  );
}
export function PageTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function Loading() {
  return (
    <div className="state" role="status">
      <LoaderCircle className="spin" size={26} />
      <strong>Loading your workspace</strong>
      <p>Retrieving authorized information…</p>
    </div>
  );
}
export function ErrorState({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  const known = error instanceof ApiError;
  return (
    <div className="error-state" role="alert">
      <AlertCircle size={22} />
      <div>
        <strong>
          {known && error.status === 403
            ? "Access is restricted"
            : error instanceof Error
              ? error.message
              : "Unable to connect"}
        </strong>
        <p>
          {known
            ? `${error.error.code} · Request ${error.requestId.slice(0, 8)}`
            : "Check your connection and try again."}
        </p>
        {retry && (
          <button className="button secondary small" onClick={retry}>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
export function Empty({
  title = "Nothing here yet",
  description = "New items will appear here when they are available.",
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="state">
      <div className="empty-icon">
        <Inbox size={24} />
      </div>
      <strong>{title}</strong>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Panel({
  title,
  subtitle,
  children,
  action,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
export function TextLink({
  to,
  children,
}: {
  to: string;
  children: ReactNode;
}) {
  return (
    <Link className="text-link" to={to}>
      {children}
      <ArrowRight size={15} />
    </Link>
  );
}
export function Guardrail({ children }: { children: ReactNode }) {
  return (
    <div className="guardrail">
      <ShieldCheck size={20} />
      <div>{children}</div>
    </div>
  );
}
export function Pagination({
  page,
  total,
  size = 20,
  onChange,
}: {
  page: number;
  total: number;
  size?: number;
  onChange: (page: number) => void;
}) {
  return (
    <div className="pagination">
      <span>
        {total === 0
          ? "No results"
          : `${(page - 1) * size + 1}–${Math.min(page * size, total)} of ${total} results`}
      </span>
      <div>
        <button
          className="button secondary small"
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
        >
          Previous
        </button>
        <span>Page {page}</span>
        <button
          className="button secondary small"
          disabled={page * size >= total}
          onClick={() => onChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
export function Reference({ value }: { value: string }) {
  return (
    <span className="reference" title={value}>
      HCS-{value.slice(0, 8).toUpperCase()}
    </span>
  );
}
export function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
export function formatTime(value: string) {
  return new Date(value).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}
