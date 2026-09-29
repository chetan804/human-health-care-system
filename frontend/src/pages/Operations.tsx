import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import {
  PlugZap,
  ShieldCheck,
  ArrowLeft,
  Plus,
  ArrowUpRight,
  Bell,
  Check,
  LockKeyhole,
  Monitor,
  FileLock2,
  Sparkles,
  Info,
} from "lucide-react";
import { api } from "../api/client";
import type {
  Page,
  Invoice,
  Integration,
  Audit,
  Notice,
  Session,
} from "../api/client";
import { useAuth } from "../auth/Auth";
import {
  Badge,
  PageTitle,
  Panel,
  Loading,
  ErrorState,
  Empty,
  Pagination,
  Reference,
  Guardrail,
  formatDate,
  formatTime,
} from "../components/UI";
import { useIdempotency } from "../components/forms";
export function Billing() {
  const { facility } = useAuth();
  const [page, setPage] = useState(1);
  const q = useQuery({
    queryKey: ["invoices", facility?.id, page],
    queryFn: () => api.get<Page<Invoice>>(`/invoices?page=${page}`),
  });
  return (
    <>
      <PageTitle
        eyebrow="FINANCIAL OPERATIONS"
        title="Billing & invoices"
        description="Internal drafts with exact-decimal amounts and duplicate-source protection."
        action={
          facility?.roles.includes("BILLING_STAFF") && (
            <Link to="/billing/new" className="button primary">
              <Plus size={17} />
              Create draft
            </Link>
          )
        }
      />
      <Guardrail>
        Drafts are not issued invoices. No claim submission, collection, payment
        verification, tax calculation, or settlement is active.
      </Guardrail>
      <Panel
        title="Invoice drafts"
        subtitle="Authoritative internal records · external integrations not configured"
      >
        {q.isLoading ? (
          <Loading />
        ) : q.error ? (
          <ErrorState error={q.error} />
        ) : q.data?.items.length ? (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Source reference</th>
                    <th>Patient</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {q.data.items.map((i) => (
                    <tr key={i.id}>
                      <td>
                        <strong>{i.source_reference}</strong>
                        <small className="block">
                          <Reference value={i.id} />
                        </small>
                      </td>
                      <td>
                        <Reference value={i.patient_id} />
                      </td>
                      <td>
                        <strong>
                          {i.currency} {i.total}
                        </strong>
                      </td>
                      <td>
                        <Badge tone="amber">Internal draft</Badge>
                      </td>
                      <td>
                        <Link
                          className="icon-button"
                          to={`/invoices/${i.id}`}
                          aria-label="Open invoice draft"
                        >
                          <ArrowUpRight size={17} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} total={q.data.total} onChange={setPage} />
          </>
        ) : (
          <Empty title="No invoice drafts" />
        )}
      </Panel>
    </>
  );
}
export function InvoiceCreate() {
  const [patient, setPatient] = useState("");
  const [source, setSource] = useState("");
  const [currency, setCurrency] = useState("");
  const [service, setService] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const key = useIdempotency();
  const cache = useQueryClient();
  const navigate = useNavigate();
  const mutation = useMutation({
    mutationFn: (body: unknown) =>
      api.post<Invoice>("/invoices", body, key(body)),
    onSuccess: (i) => {
      cache.invalidateQueries({ queryKey: ["invoices"] });
      navigate(`/invoices/${i.id}`);
    },
  });
  return (
    <>
      <Link className="back-link" to="/billing">
        <ArrowLeft size={15} />
        Billing
      </Link>
      <PageTitle
        eyebrow="INTERNAL FINANCIAL RECORD"
        title="Create an invoice draft"
        description="This form does not issue an invoice, submit a claim, or charge a patient."
      />
      <Panel title="Draft details" className="narrow-panel">
        <form
          className="standard-form"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate({
              patient_id: patient,
              source_reference: source,
              currency,
              items: [
                {
                  service_reference: service,
                  code_system: "INTERNAL",
                  unit_price: price,
                  quantity: Number(quantity),
                },
              ],
            });
          }}
        >
          {mutation.error && <ErrorState error={mutation.error} />}
          <label>
            Patient UUID
            <input
              value={patient}
              required
              onChange={(e) => setPatient(e.target.value)}
            />
            <small>
              Only patients at your authorized facility can be referenced.
            </small>
          </label>
          <label>
            Unique source reference
            <input
              required
              minLength={3}
              maxLength={100}
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
            <small>
              Stable internal source identifier. Duplicate source references are
              rejected.
            </small>
          </label>
          <label>
            Currency identifier
            <input
              required
              pattern="[A-Z]{3}"
              maxLength={3}
              placeholder="XXX for synthetic non-currency amounts"
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            />
          </label>
          <label>
            Internal service reference
            <input
              required
              maxLength={100}
              value={service}
              onChange={(e) => setService(e.target.value)}
            />
            <small>
              Not a validated CPT code. CPT reference data is not configured.
            </small>
          </label>
          <div className="form-grid">
            <label>
              Unit amount
              <input
                required
                inputMode="decimal"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </label>
            <label>
              Quantity
              <input
                type="number"
                required
                min={1}
                max={1000}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </label>
          </div>
          <div className="form-actions">
            <Link to="/billing" className="button secondary">
              Cancel
            </Link>
            <button className="button primary" disabled={mutation.isPending}>
              Save internal draft
            </button>
          </div>
        </form>
      </Panel>
    </>
  );
}
export function InvoiceDetail() {
  const { id } = useParams();
  const { facility } = useAuth();
  const [reason, setReason] = useState("");
  const key = useIdempotency();
  const q = useQuery({
    queryKey: ["invoice", facility?.id, id],
    queryFn: () => api.get<Invoice>(`/invoices/${id}`),
  });
  const mutation = useMutation({
    mutationFn: () =>
      api.post(`/invoices/${id}/disputes`, { reason }, key({ reason })),
  });
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorState error={q.error} />;
  if (!q.data) return null;
  const invoice = q.data;
  return (
    <>
      <Link className="back-link" to="/billing">
        <ArrowLeft size={15} />
        Billing
      </Link>
      <PageTitle
        eyebrow="INVOICE DRAFT"
        title={invoice.source_reference}
        description={invoice.notice}
        action={<Badge tone="amber">Internal draft</Badge>}
      />
      <div className="form-layout">
        <Panel title="Line items" subtitle={`Patient ${invoice.patient_id}`}>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Service reference</th>
                  <th>Quantity</th>
                  <th>Unit amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((i) => (
                  <tr key={i.service_reference}>
                    <td>{i.service_reference}</td>
                    <td>{i.quantity}</td>
                    <td>
                      {invoice.currency} {i.unit_price}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="invoice-total">
            <span>Internal draft total</span>
            <strong>
              {invoice.currency} {invoice.total}
            </strong>
          </div>
        </Panel>
        <aside>
          <Panel title="Submit a dispute">
            <form
              className="standard-form"
              onSubmit={(e) => {
                e.preventDefault();
                mutation.mutate();
              }}
            >
              {mutation.error && <ErrorState error={mutation.error} />}{" "}
              {mutation.isSuccess ? (
                <div className="success-notice">
                  <Check size={18} />
                  Dispute recorded. No external case has been opened.
                </div>
              ) : (
                <>
                  <label>
                    Reason
                    <textarea
                      value={reason}
                      minLength={10}
                      maxLength={2000}
                      required
                      rows={4}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </label>
                  <button
                    className="button secondary"
                    disabled={mutation.isPending}
                  >
                    Record dispute
                  </button>
                </>
              )}
            </form>
          </Panel>
          <div className="help-card">
            <LockKeyhole size={22} />
            <h3>No payment collection</h3>
            <p>
              Payment and insurance providers are not configured. Do not enter
              card or bank details.
            </p>
            <Badge tone="amber">Not configured</Badge>
          </div>
        </aside>
      </div>
    </>
  );
}
export function Administration() {
  const { facility } = useAuth();
  const q = useQuery({
    queryKey: ["integrations", facility?.id],
    queryFn: () =>
      api.get<{ items: Integration[]; environment: string; data_mode: string }>(
        "/integrations",
      ),
  });
  const admin = facility?.roles.some((r) =>
    ["ADMIN", "SUPER_ADMIN"].includes(r),
  );
  const summary = useQuery({
    queryKey: ["admin-summary", facility?.id],
    queryFn: () =>
      api.get<{
        patients: number;
        staff_memberships: number;
        scheduled_appointments: number;
      }>("/admin/summary"),
    enabled: admin,
  });
  return (
    <>
      <PageTitle
        eyebrow="GOVERNANCE & CONFIGURATION"
        title={admin ? "Administration" : "Integration status"}
        description="Explicit capability boundaries. No simulated provider successes."
      />
      {admin && (
        <div className="mini-stats">
          <div>
            <span>Active patient profiles</span>
            <strong>{summary.data?.patients ?? "—"}</strong>
          </div>
          <div>
            <span>Staff role memberships</span>
            <strong>{summary.data?.staff_memberships ?? "—"}</strong>
          </div>
          <div>
            <span>Scheduled appointments</span>
            <strong>{summary.data?.scheduled_appointments ?? "—"}</strong>
          </div>
        </div>
      )}
      {summary.error && <ErrorState error={summary.error} />}
      <Panel
        title="External dependency register"
        subtitle="Activation requires approved documentation, a real adapter, and verification evidence."
      >
        {q.isLoading ? (
          <Loading />
        ) : q.error ? (
          <ErrorState error={q.error} />
        ) : (
          <div className="integration-grid">
            {q.data?.items.map((i) => (
              <div className="integration-card" key={i.name}>
                <div className="integration-icon">
                  <PlugZap size={21} />
                </div>
                <h3>{i.name.replaceAll("-", " ")}</h3>
                <Badge tone="amber">Not configured</Badge>
                <p>{integrationDescription(i.name)}</p>
              </div>
            ))}
          </div>
        )}
      </Panel>
      <Guardrail>
        Secret values are never exposed in this console. This build is
        restricted to synthetic data; jurisdiction, clinical policy, production
        KMS, and deployment approval remain unresolved.
      </Guardrail>
    </>
  );
}
function integrationDescription(name: string) {
  const values: Record<string, string> = {
    insurance:
      "Requires member-verification, claim lifecycle, retry and reconciliation contracts.",
    payment:
      "Requires provider-hosted collection, authenticated webhooks and settlement verification.",
    email:
      "Requires sending, verified domains, delivery events and recovery-message contracts.",
    sms: "Requires messaging, sender registration, consent and delivery-event contracts.",
    "clinical-inference":
      "Requires an approved model artifact, feature schema, provenance and clinical evaluation.",
    "clinical-sops":
      "Requires approved typed record payloads, authorship and amendment policies.",
    terminology: "Requires licensed and versioned code-system reference data.",
    "object-storage":
      "Requires private quarantine, encryption and authorized-download configuration.",
    "malware-scanner":
      "Requires a scanner adapter and an approved fail-closed upload policy.",
    "production-kms":
      "Requires external wrapping keys, rotation, permissions and recovery procedures.",
  };
  return values[name] ?? "Activation documentation required.";
}
export function AuditPage() {
  const { facility } = useAuth();
  const [page, setPage] = useState(1);
  const q = useQuery({
    queryKey: ["audit", facility?.id, page],
    queryFn: () => api.get<Page<Audit>>(`/audit?page=${page}`),
  });
  return (
    <>
      <PageTitle
        eyebrow="ACCOUNTABILITY"
        title="Audit trail"
        description="Append-only records of who acted, what changed, and the outcome."
      />
      <Panel
        title="Facility audit events"
        subtitle="Reading this trail also generates an audit event."
      >
        {q.isLoading ? (
          <Loading />
        ) : q.error ? (
          <ErrorState error={q.error} />
        ) : q.data?.items.length ? (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>Actor</th>
                    <th>Resource</th>
                    <th>Result</th>
                    <th>Request</th>
                  </tr>
                </thead>
                <tbody>
                  {q.data.items.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <div className="stack">
                          <strong>{formatDate(a.created_at)}</strong>
                          <small>{formatTime(a.created_at)}</small>
                        </div>
                      </td>
                      <td>
                        <strong>{a.action}</strong>
                        <small className="block">{a.reason}</small>
                      </td>
                      <td>
                        {a.roles.join(", ") || "Identity service"}
                        <small className="block">
                          {a.actor_id?.slice(0, 8) ?? "Unauthenticated"}
                        </small>
                      </td>
                      <td>
                        {a.resource_type}
                        {a.resource_id && (
                          <small className="block">
                            <Reference value={a.resource_id} />
                          </small>
                        )}
                      </td>
                      <td>
                        <Badge
                          tone={a.result === "SUCCESS" ? "green" : "amber"}
                        >
                          {a.result}
                        </Badge>
                      </td>
                      <td>
                        <code>{a.request_id.slice(0, 8)}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} total={q.data.total} onChange={setPage} />
          </>
        ) : (
          <Empty title="No events in this scope" />
        )}
      </Panel>
      <Guardrail>
        Database triggers reject audit updates, deletes, and truncation. This
        does not replace external immutable retention or privileged-operator
        monitoring.
      </Guardrail>
    </>
  );
}
export function Notifications() {
  const { facility } = useAuth();
  const cache = useQueryClient();
  const q = useQuery({
    queryKey: ["notifications", facility?.id],
    queryFn: () => api.get<{ items: Notice[] }>("/notifications"),
  });
  const mutation = useMutation({
    mutationFn: (id: string) => api.post(`/notifications/${id}/read`),
    onSuccess: () => cache.invalidateQueries({ queryKey: ["notifications"] }),
  });
  return (
    <>
      <PageTitle
        eyebrow="WORKSPACE UPDATES"
        title="Notifications"
        description="In-app events from completed workflows. Email and SMS delivery are not configured."
      />
      <Panel
        title="Your inbox"
        subtitle="Up to 100 recent notifications at your active facility"
      >
        {mutation.error && <ErrorState error={mutation.error} />}{" "}
        {q.isLoading ? (
          <Loading />
        ) : q.error ? (
          <ErrorState error={q.error} />
        ) : q.data?.items.length ? (
          <div className="notification-list">
            {q.data.items.map((n) => (
              <div
                className={`notification ${n.read_at ? "read" : ""}`}
                key={n.id}
              >
                <span className="notification-icon">
                  <Bell size={19} />
                </span>
                <div>
                  <strong>{n.kind.replaceAll(".", " ")}</strong>
                  <p>
                    <Reference value={n.resource_id} />
                    <span className="inline-dot">·</span>
                    {formatDate(n.created_at)} at {formatTime(n.created_at)}
                  </p>
                </div>
                {n.read_at ? (
                  <Badge>Read</Badge>
                ) : (
                  <button
                    className="button secondary small"
                    disabled={mutation.isPending}
                    onClick={() => mutation.mutate(n.id)}
                  >
                    Mark as read
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <Empty
            title="Your inbox is clear"
            description="The background worker creates in-app notifications from committed outbox events."
          />
        )}
      </Panel>
    </>
  );
}
export function Profile() {
  const { user, facility, logout } = useAuth();
  const cache = useQueryClient();
  const q = useQuery({
    queryKey: ["sessions"],
    queryFn: () => api.get<{ items: Session[] }>("/auth/sessions"),
  });
  const mutation = useMutation({
    mutationFn: async (id: string) => {
      if (id === user?.session_id) await logout();
      else await api.delete(`/auth/sessions/${id}`);
    },
    onSuccess: () => cache.invalidateQueries({ queryKey: ["sessions"] }),
  });
  return (
    <>
      <PageTitle
        eyebrow="YOUR ACCOUNT"
        title="Profile & sessions"
        description="Review your facility access and revoke active sessions."
      />
      <div className="form-layout">
        <Panel title="Account information">
          <dl className="detail-grid">
            <div>
              <dt>Name</dt>
              <dd>{user?.display_name}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{user?.email}</dd>
            </div>
            <div>
              <dt>Active facility</dt>
              <dd>{facility?.name}</dd>
            </div>
            <div>
              <dt>Roles in this facility</dt>
              <dd>{facility?.roles.join(", ")}</dd>
            </div>
          </dl>
        </Panel>
        <div className="help-card">
          <ShieldCheck size={24} />
          <h3>Least-privilege access</h3>
          <p>
            Access is determined by server-side roles, facility membership, and
            care relationships—not client-side role claims.
          </p>
        </div>
      </div>
      <Panel
        title="Device sessions"
        subtitle="Revoking a session immediately invalidates its access and refresh tokens."
      >
        {mutation.error && <ErrorState error={mutation.error} />}{" "}
        {q.isLoading ? (
          <Loading />
        ) : q.error ? (
          <ErrorState error={q.error} />
        ) : (
          <div className="session-list">
            {q.data?.items.map((s) => (
              <div className="session-row" key={s.id}>
                <Monitor size={23} />
                <div>
                  <strong>
                    {s.id === user?.session_id
                      ? "This session"
                      : "Workspace session"}
                  </strong>
                  <p title={s.device}>{s.device}</p>
                  <small>
                    Created {formatDate(s.created_at)} · Expires{" "}
                    {formatDate(s.expires_at)}
                  </small>
                </div>
                {s.revoked_at ? (
                  <Badge>Revoked</Badge>
                ) : (
                  <button
                    className="button secondary small"
                    disabled={mutation.isPending}
                    onClick={() => {
                      if (window.confirm("Revoke this session?"))
                        mutation.mutate(s.id);
                    }}
                  >
                    Revoke session
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>
    </>
  );
}
export function Unavailable() {
  const { pathname } = useLocation();
  const ai = pathname === "/clinical-ai";
  const title = ai
    ? "Clinical decision support"
    : pathname.startsWith("/prescriptions")
      ? "Prescriptions"
      : pathname.startsWith("/lab-results")
        ? "Laboratory results"
        : pathname.startsWith("/claims")
          ? "Insurance claims"
          : "Medical records";
  return (
    <>
      <PageTitle
        eyebrow={ai ? "CLINICAL SAFETY" : "CAPABILITY STATUS"}
        title={title}
        description="This capability has not been activated. The system will not fabricate clinical or external-provider behavior."
      />
      <Panel
        title={
          ai
            ? "No approved model configured"
            : "Required contracts are not configured"
        }
      >
        <div className="unavailable-hero">
          <div className="unavailable-icon">
            {ai ? <Sparkles size={32} /> : <FileLock2 size={32} />}
          </div>
          <Badge tone="amber">Not configured</Badge>
          <h2>
            {ai
              ? "Decision support requires evidence."
              : "Safety before activation."}
          </h2>
          <p>
            {ai
              ? "No predictions, confidence scores, treatment recommendations, or synthetic-data accuracy claims are presented. An approved model, safety policy, feature schema, and evaluation record are required."
              : "Approved payload definitions, authorization policies, terminology, and any applicable provider contracts must be supplied before this workflow can be activated."}
          </p>
          <Link to="/admin" className="button secondary">
            Review dependencies
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </Panel>
      <Guardrail>
        {ai
          ? "This tool provides informational decision support and does not provide a medical diagnosis. Clinical decisions must be made by qualified healthcare professionals."
          : "Internal encrypted, versioned storage primitives are separate from a clinically approved authoring workflow. Their existence does not mean this feature is operational."}
      </Guardrail>
      {ai && (
        <div className="emergency-info">
          <Info size={21} />
          <div>
            <strong>Need urgent medical help?</strong>
            <p>
              If you believe you have a medical emergency, seek immediate
              professional or local emergency care. Do not wait for an online
              assessment.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
