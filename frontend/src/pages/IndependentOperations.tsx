import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { api } from "../api/client";
import type { Page, Patient } from "../api/client";
import { useAuth } from "../auth/Auth";
import {
  PageTitle,
  Panel,
  Loading,
  Empty,
  ErrorState,
  Guardrail,
  Badge,
  Pagination,
  Reference,
} from "../components/UI";

function values(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  return Object.fromEntries(new FormData(event.currentTarget)) as Record<
    string,
    string
  >;
}
function useCommand() {
  const [error, setError] = useState<unknown>(null);
  const [pending, setPending] = useState(false);
  const keys = useRef(new Map<string, string>());
  const cache = useQueryClient();
  async function execute<T>(
    path: string,
    body?: unknown,
    method: "POST" | "PUT" | "DELETE" = "POST",
  ): Promise<T | undefined> {
    const intent = path + JSON.stringify(body);
    if (!keys.current.has(intent))
      keys.current.set(intent, crypto.randomUUID());
    setError(null);
    setPending(true);
    try {
      const result =
        method === "PUT"
          ? await api.put<T>(path, body, keys.current.get(intent))
          : method === "DELETE"
            ? await api.delete<T>(path)
            : await api.post<T>(path, body, keys.current.get(intent));
      keys.current.delete(intent);
      await cache.invalidateQueries();
      return result;
    } catch (e) {
      setError(e);
      return undefined;
    } finally {
      setPending(false);
    }
  }
  return { execute, error, pending };
}
function Result({ command }: { command: ReturnType<typeof useCommand> }) {
  return (
    <>
      {command.error != null && <ErrorState error={command.error} />}{" "}
      {command.pending && <p role="status">Saving validated operation…</p>}
    </>
  );
}

export function SecuritySettings() {
  const { user, forgetSession } = useAuth();
  const command = useCommand();
  const status = useQuery({
    queryKey: ["mfa", user?.id],
    queryFn: () =>
      api.get<{ enabled: boolean; recovery_codes_remaining: number }>(
        "/auth/mfa",
      ),
  });
  const [enrollment, setEnrollment] = useState<{
    secret: string;
    expires_at: string;
  } | null>(null);
  const [recovery, setRecovery] = useState<string[]>([]);
  return (
    <>
      <PageTitle
        eyebrow="ACCOUNT PROTECTION"
        title="Account security"
        description="Optional authenticator protection, single-use recovery codes and authoritative session revocation."
      />
      <Result command={command} />
      {status.isLoading ? (
        <Loading />
      ) : status.error ? (
        <ErrorState error={status.error} />
      ) : (
        <Panel
          title="Authenticator protection"
          subtitle="TOTP · six digits · 30 seconds · SHA-1 (RFC 6238)"
        >
          <div className="panel-body">
            <Badge tone={status.data?.enabled ? "green" : "amber"}>
              {status.data?.enabled ? "Enabled" : "Not enabled"}
            </Badge>
            <p>
              {status.data?.recovery_codes_remaining ?? 0} unused recovery
              codes. Secrets and codes are never stored in browser storage.
            </p>
          </div>
          {!status.data?.enabled && (
            <form
              className="standard-form"
              onSubmit={async (e) => {
                const form = e.currentTarget;
                const v = values(e);
                const r = await command.execute<{
                  secret: string;
                  expires_at: string;
                }>("/auth/mfa/setup", v);
                if (r) {
                  setEnrollment(r);
                  setRecovery([]);
                  form.reset();
                }
              }}
            >
              <label>
                Current password for enrollment
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  maxLength={128}
                />
              </label>
              <button className="button primary" disabled={command.pending}>
                Start authenticator enrollment
              </button>
            </form>
          )}
          {enrollment && !status.data?.enabled && (
            <div className="panel-body">
              <Guardrail>
                Privately enter this secret in your authenticator:{" "}
                <code style={{ overflowWrap: "anywhere" }}>
                  {enrollment.secret}
                </code>
                . Enrollment expires at{" "}
                {new Date(enrollment.expires_at).toLocaleTimeString()}.
              </Guardrail>
              <form
                className="standard-form"
                onSubmit={async (e) => {
                  const v = values(e);
                  const r = await command.execute<{ recovery_codes: string[] }>(
                    "/auth/mfa/enable",
                    v,
                  );
                  if (r) {
                    setRecovery(r.recovery_codes);
                    setEnrollment(null);
                  }
                }}
              >
                <label>
                  Authenticator confirmation code
                  <input
                    name="code"
                    required
                    pattern="[0-9]{6}"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                  />
                </label>
                <button className="button primary" disabled={command.pending}>
                  Confirm and enable
                </button>
              </form>
            </div>
          )}
          {!!recovery.length && (
            <div className="panel-body">
              <Guardrail>
                Save these recovery codes privately now. This is their only
                display; each works once.
              </Guardrail>
              <ul>
                {recovery.map((c) => (
                  <li key={c}>
                    <code>{c}</code>
                  </li>
                ))}
              </ul>
              <button
                className="button secondary"
                onClick={() => setRecovery([])}
              >
                I have saved my codes
              </button>
            </div>
          )}
          {status.data?.enabled && (
            <form
              className="standard-form"
              onSubmit={async (e) => {
                const v = values(e);
                if (
                  window.confirm(
                    "Disable authenticator protection? Other sessions will be revoked.",
                  )
                ) {
                  const r = await command.execute("/auth/mfa/disable", v);
                  if (r) {
                    setRecovery([]);
                    setEnrollment(null);
                  }
                }
              }}
            >
              <label>
                Current password to disable
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </label>
              <label>
                Fresh authenticator or unused recovery code
                <input
                  name="second_factor"
                  autoComplete="one-time-code"
                  required
                  maxLength={64}
                />
              </label>
              <button className="button danger" disabled={command.pending}>
                Disable authenticator
              </button>
            </form>
          )}
        </Panel>
      )}
      <Panel
        title="Change password"
        subtitle="A successful change revokes every session, including this one."
      >
        <form
          className="standard-form"
          onSubmit={async (e) => {
            const v = values(e);
            const r = await command.execute("/auth/change-password", {
              ...v,
              second_factor: v.second_factor || undefined,
            });
            if (r) forgetSession();
          }}
        >
          <label>
            Existing password
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </label>
          <label>
            New password
            <input
              name="new_password"
              type="password"
              minLength={12}
              maxLength={128}
              required
              autoComplete="new-password"
            />
          </label>
          <label>
            Authenticator or recovery code (if enabled)
            <input
              name="second_factor"
              maxLength={64}
              autoComplete="one-time-code"
            />
          </label>
          <button className="button primary" disabled={command.pending}>
            Change password and revoke sessions
          </button>
        </form>
      </Panel>
      <Link className="text-link" to="/profile">
        Review active sessions
      </Link>
    </>
  );
}

export function CompleteChallenge() {
  const reset = useLocation().pathname === "/reset-password";
  const command = useCommand();
  const [complete, setComplete] = useState(false);
  return (
    <main style={{ maxWidth: 680, margin: "50px auto" }}>
      <PageTitle
        eyebrow="ACCOUNT LIFECYCLE"
        title={reset ? "Complete password recovery" : "Verify account email"}
        description="Paste a one-time challenge into the form. Tokens are never accepted from URLs."
      />
      <Guardrail>
        Email delivery is NOT CONFIGURED. This form does not claim an email was
        sent or bypass verification.
      </Guardrail>
      <Result command={command} />
      {complete ? (
        <div className="success-notice" role="status">
          {reset
            ? "Password changed; all sessions were revoked."
            : "Email verified. No patient link or staff role was granted."}
        </div>
      ) : (
        <Panel title="One-time challenge">
          <form
            className="standard-form"
            onSubmit={async (e) => {
              const r = await command.execute(
                reset ? "/auth/reset-password" : "/auth/verification/complete",
                values(e),
              );
              if (r) setComplete(true);
            }}
          >
            <label>
              One-time token
              <input
                name="token"
                required
                minLength={32}
                maxLength={128}
                autoComplete="off"
              />
            </label>
            {reset && (
              <label>
                New password
                <input
                  name="new_password"
                  type="password"
                  required
                  minLength={12}
                  maxLength={128}
                  autoComplete="new-password"
                />
              </label>
            )}
            <button className="button primary" disabled={command.pending}>
              Complete {reset ? "recovery" : "verification"}
            </button>
          </form>
        </Panel>
      )}
      <Link className="text-link" to="/login">
        Return to sign in
      </Link>
    </main>
  );
}

interface Staff {
  id: string;
  display_name: string;
  email: string;
  active: boolean;
  verified: boolean;
  roles: string[];
}
interface Department {
  id: string;
  name: string;
  active: boolean;
  version: number;
}
interface Config {
  version: number;
  values: { reminders_minutes: number[]; export_ttl_minutes: number };
}
export function FacilityManagement() {
  const { facility, user } = useAuth();
  const command = useCommand();
  const [page, setPage] = useState(1);
  const superUser = facility?.roles.includes("SUPER_ADMIN");
  const operator = superUser || facility?.roles.includes("ADMIN");
  const staff = useQuery({
    queryKey: ["staff", facility?.id, page],
    queryFn: () => api.get<Page<Staff>>(`/admin/staff?page=${page}`),
    enabled: !!operator,
  });
  const departments = useQuery({
    queryKey: ["departments", facility?.id],
    queryFn: () => api.get<{ items: Department[] }>("/admin/departments"),
    enabled: !!operator,
  });
  const config = useQuery({
    queryKey: ["facility-config", facility?.id],
    queryFn: () => api.get<Config>("/admin/configuration"),
    enabled: !!operator,
  });
  const form = useForm<{ offsets: string; ttl: number }>();
  useEffect(() => {
    if (config.data)
      form.reset({
        offsets: config.data.values.reminders_minutes.join(","),
        ttl: config.data.values.export_ttl_minutes,
      });
  }, [config.data, form]);
  if (!operator)
    return (
      <Empty
        title="Facility operator access required"
        description="Navigation does not grant authorization. All commands are checked again by the server."
      />
    );
  return (
    <>
      <PageTitle
        eyebrow="SCOPED ADMINISTRATION"
        title="Facility management"
        description="Manage verified staff memberships, departments and non-secret operational settings."
      />
      <Result command={command} />
      <Guardrail>
        Self-escalation, patient linking through role assignment,
        unverified-account grants and removal of the final operator are blocked.
        Privileged grants require a scoped SUPER_ADMIN.
      </Guardrail>
      <Panel
        title="Staff roster"
        subtitle="Only memberships in the active facility are shown."
      >
        {staff.isLoading ? (
          <Loading />
        ) : staff.error ? (
          <ErrorState error={staff.error} />
        ) : !staff.data?.items.length ? (
          <Empty title="No staff memberships" />
        ) : (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Reference</th>
                    <th>Roles</th>
                    <th>Status</th>
                    {superUser && <th>Account control</th>}
                  </tr>
                </thead>
                <tbody>
                  {staff.data.items.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <strong>{s.display_name}</strong>
                        <small className="block">{s.email}</small>
                      </td>
                      <td>
                        <span className="reference" title={s.id}>
                          {s.id}
                        </span>
                      </td>
                      <td>{s.roles.join(", ")}</td>
                      <td>
                        <Badge>{s.active ? "Active" : "Suspended"}</Badge>
                      </td>
                      {superUser && (
                        <td>
                          <button
                            className="button secondary small"
                            disabled={command.pending || s.id === user?.id}
                            onClick={() => {
                              const reason = window.prompt(
                                "Reason for account state change (10+ characters, no medical details)",
                              );
                              if (reason)
                                void command.execute(
                                  `/admin/accounts/${s.id}`,
                                  { active: !s.active, reason },
                                  "PUT",
                                );
                            }}
                          >
                            {s.active ? "Suspend" : "Reactivate"}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              total={staff.data.total}
              onChange={setPage}
            />
          </>
        )}
      </Panel>
      <div className="form-grid">
        <Panel title="Change a staff membership">
          <form
            className="standard-form"
            onSubmit={(e) =>
              void command.execute("/admin/memberships", values(e))
            }
          >
            <label>
              Verified account UUID
              <input
                name="user_id"
                required
                placeholder="Exact account reference"
              />
            </label>
            <label>
              Role
              <select name="role">
                {[
                  "DOCTOR",
                  "NURSE",
                  "BILLING_STAFF",
                  "LAB_TECHNICIAN",
                  ...(superUser
                    ? ["ADMIN", "SYSTEM_AUDITOR", "SUPER_ADMIN"]
                    : []),
                ].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            <label>
              Operation
              <select name="operation">
                <option>GRANT</option>
                <option>REVOKE</option>
              </select>
            </label>
            <label>
              Administrative reason
              <input name="reason" required minLength={10} maxLength={200} />
              <small>No medical details.</small>
            </label>
            <button className="button primary" disabled={command.pending}>
              Apply membership change
            </button>
          </form>
        </Panel>
        <Panel
          title="Operational configuration"
          subtitle="Only explicitly supported non-secret settings are accepted."
        >
          {config.isLoading ? (
            <Loading />
          ) : config.error ? (
            <ErrorState error={config.error} />
          ) : (
            <form
              className="standard-form"
              onSubmit={form.handleSubmit(
                (v) =>
                  void command.execute(
                    "/admin/configuration",
                    {
                      expected_version: config.data?.version,
                      reminders_minutes: v.offsets.trim()
                        ? v.offsets.split(",").map(Number)
                        : [],
                      export_ttl_minutes: Number(v.ttl),
                    },
                    "PUT",
                  ),
              )}
            >
              <label>
                Reminder offsets in minutes
                <input
                  {...form.register("offsets")}
                  placeholder="1440,120,30"
                />
                <small>
                  Comma-separated; blank disables appointment reminders. No
                  SMS/email provider is activated.
                </small>
              </label>
              <label>
                Export artifact lifetime (minutes)
                <input
                  type="number"
                  min={1}
                  max={60}
                  required
                  {...form.register("ttl", { valueAsNumber: true })}
                />
              </label>
              <button className="button primary" disabled={command.pending}>
                Save configuration
              </button>
            </form>
          )}
        </Panel>
      </div>
      <Panel title="Departments">
        {departments.isLoading ? (
          <Loading />
        ) : departments.error ? (
          <ErrorState error={departments.error} />
        ) : (
          <div className="panel-body">
            {!departments.data?.items.length ? (
              <Empty title="No departments recorded" />
            ) : (
              departments.data.items.map((d) => (
                <div className="session-row" key={d.id}>
                  <div>
                    <strong>{d.name}</strong>
                    <p>
                      Version {d.version} · {d.active ? "Active" : "Archived"}
                    </p>
                  </div>
                  <button
                    className="button secondary small"
                    disabled={command.pending}
                    onClick={() => {
                      if (
                        window.confirm(
                          `${d.active ? "Archive" : "Reactivate"} this department?`,
                        )
                      )
                        void command.execute(
                          `/admin/departments/${d.id}`,
                          {
                            name: d.name,
                            active: !d.active,
                            expected_version: d.version,
                          },
                          "PUT",
                        );
                    }}
                  >
                    {d.active ? "Archive department" : "Reactivate department"}
                  </button>
                </div>
              ))
            )}
          </div>
        )}
        <form
          className="standard-form"
          onSubmit={async (e) => {
            const target = e.currentTarget;
            const r = await command.execute("/admin/departments", values(e));
            if (r) target.reset();
          }}
        >
          <label>
            New department name
            <input name="name" required minLength={2} maxLength={120} />
          </label>
          <button className="button primary" disabled={command.pending}>
            Create department
          </button>
        </form>
        <form
          className="standard-form"
          onSubmit={(e) => {
            const v = values(e);
            void command.execute(
              "/admin/department-assignments",
              {
                user_id: v.user_id,
                department_id: v.department_id,
                assigned: v.assigned === "yes",
              },
              "PUT",
            );
          }}
        >
          <h3>Department assignment</h3>
          <label>
            Staff account UUID
            <input name="user_id" required />
          </label>
          <label>
            Department
            <select name="department_id" required>
              <option value="">Select department</option>
              {departments.data?.items
                .filter((d) => d.active)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Assignment
            <select name="assigned">
              <option value="yes">Assign</option>
              <option value="no">Unassign</option>
            </select>
          </label>
          <button className="button secondary" disabled={command.pending}>
            Save department assignment
          </button>
        </form>
      </Panel>
      {superUser && (
        <Panel title="Create facility within this organization">
          <form
            className="standard-form"
            onSubmit={async (e) => {
              const target = e.currentTarget;
              const r = await command.execute("/admin/facilities", values(e));
              if (r) {
                target.reset();
                window.alert(
                  "Facility created. Sign in again to refresh your facility membership selector.",
                );
              }
            }}
          >
            <label>
              Facility name
              <input name="name" required minLength={2} maxLength={160} />
            </label>
            <label>
              IANA timezone
              <input name="timezone" defaultValue="Etc/UTC" required />
            </label>
            <button className="button primary" disabled={command.pending}>
              Create facility
            </button>
          </form>
        </Panel>
      )}
    </>
  );
}

interface Job {
  id: string;
  kind: string;
  status: string;
  version: number;
  expires_at: string;
  error_code: string | null;
  rows?: Record<string, string>[];
}
export function DataExchange() {
  const { facility } = useAuth();
  const command = useCommand();
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState<Job | null>(null);
  const operator = facility?.roles.includes("ADMIN");
  const jobs = useQuery({
    queryKey: ["exchange", facility?.id, page],
    queryFn: () => api.get<Page<Job>>(`/exchange/jobs?page=${page}`),
    enabled: !!operator,
    refetchInterval: 5000,
  });
  if (!operator) return <Empty title="Patient administrator access required" />;
  return (
    <>
      <PageTitle
        eyebrow="CONTROLLED DATA EXCHANGE"
        title="Imports & exports"
        description="Validate → preview → approve → atomic import. Export artifacts require fresh authorized access and expire."
      />
      <Result command={command} />
      <Guardrail>
        Synthetic demographic data only. Imports accept at most 100 rows;
        exports at most 1,000. Jobs recheck account, session and facility
        privileges before execution. No medical-history, insurance or clinical
        files are imported here.
      </Guardrail>
      <div className="form-grid">
        <Panel title="Validate patient CSV">
          <form
            className="standard-form"
            onSubmit={async (e) => {
              const r = await command.execute<Job>(
                "/exchange/imports",
                values(e),
              );
              if (r) {
                const detail = await command.execute<Job>(
                  `/exchange/jobs/${r.id}/preview`,
                );
                if (detail) setPreview(detail);
              }
            }}
          >
            <label>
              Patient CSV
              <textarea
                name="csv_text"
                rows={8}
                required
                maxLength={50000}
                placeholder={
                  "full_name,date_of_birth,gender,contact_number,email,address\n"
                }
              />
            </label>
            <small>
              Use exactly the six headers shown. No duplicate-review override is
              accepted in bulk imports.
            </small>
            <button className="button primary" disabled={command.pending}>
              Validate and stage preview
            </button>
          </form>
        </Panel>
        <Panel title="Request demographic export">
          <form
            className="standard-form"
            onSubmit={(e) =>
              void command.execute("/exchange/exports", values(e))
            }
          >
            <label>
              Authorized export purpose
              <textarea
                name="purpose"
                minLength={10}
                maxLength={200}
                required
                rows={3}
              />
            </label>
            <button className="button primary" disabled={command.pending}>
              Queue encrypted export
            </button>
          </form>
          <div className="panel-body">
            <p>
              Formula-leading cells are escaped. A download is available only to
              the requesting administrator while current authorization still
              permits every included patient.
            </p>
          </div>
        </Panel>
      </div>
      {preview && (
        <Panel
          title="Import preview"
          subtitle="Review every row before explicit approval. No patients have been created from this preview."
        >
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Date of birth</th>
                  <th>Contact</th>
                  <th>Address</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows?.map((r, i) => (
                  <tr key={i}>
                    <td>{r.full_name}</td>
                    <td>{r.date_of_birth}</td>
                    <td>
                      {r.email}
                      <small className="block">{r.contact_number}</small>
                    </td>
                    <td>{r.address}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="panel-body">
            <button
              className="button primary"
              disabled={command.pending}
              onClick={async () => {
                if (
                  window.confirm(
                    "Approve this exact preview for atomic import?",
                  )
                ) {
                  const r = await command.execute(
                    `/exchange/jobs/${preview.id}/approve`,
                    { expected_version: preview.version },
                  );
                  if (r) setPreview(null);
                }
              }}
            >
              Approve reviewed import
            </button>{" "}
            <button
              className="button secondary"
              onClick={() => setPreview(null)}
            >
              Close preview
            </button>
          </div>
        </Panel>
      )}
      <Panel title="Your exchange jobs">
        {jobs.isLoading ? (
          <Loading />
        ) : jobs.error ? (
          <ErrorState error={jobs.error} />
        ) : !jobs.data?.items.length ? (
          <Empty title="No exchange jobs" />
        ) : (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Kind</th>
                    <th>State</th>
                    <th>Artifact expires</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.data.items.map((j) => (
                    <tr key={j.id}>
                      <td>
                        <Reference value={j.id} />
                      </td>
                      <td>{j.kind}</td>
                      <td>
                        <Badge
                          tone={j.status === "FAILED" ? "amber" : "neutral"}
                        >
                          {j.status}
                        </Badge>
                        {j.error_code && (
                          <small className="block">{j.error_code}</small>
                        )}
                      </td>
                      <td>{new Date(j.expires_at).toLocaleString()}</td>
                      <td>
                        {j.status === "PREVIEW" && (
                          <button
                            className="button secondary small"
                            disabled={command.pending}
                            onClick={async () => {
                              const r = await command.execute<Job>(
                                `/exchange/jobs/${j.id}/preview`,
                              );
                              if (r) setPreview(r);
                            }}
                          >
                            Review preview
                          </button>
                        )}
                        {j.kind === "EXPORT" && j.status === "SUCCEEDED" && (
                          <button
                            className="button secondary small"
                            disabled={command.pending}
                            onClick={async () => {
                              const r = await command.execute<{
                                csv_text: string;
                                filename: string;
                              }>(`/exchange/jobs/${j.id}/download`);
                              if (r) {
                                const url = URL.createObjectURL(
                                  new Blob([r.csv_text], {
                                    type: "text/csv;charset=utf-8",
                                  }),
                                );
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = r.filename;
                                a.click();
                                setTimeout(
                                  () => URL.revokeObjectURL(url),
                                  1000,
                                );
                              }
                            }}
                          >
                            Download export
                          </button>
                        )}
                        {["PREVIEW", "QUEUED"].includes(j.status) && (
                          <button
                            className="button secondary small"
                            disabled={command.pending}
                            onClick={() => {
                              if (window.confirm("Cancel this job?"))
                                void command.execute(
                                  `/exchange/jobs/${j.id}/cancel`,
                                  { expected_version: j.version },
                                );
                            }}
                          >
                            Cancel job
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              total={jobs.data.total}
              onChange={setPage}
            />
          </>
        )}
      </Panel>
    </>
  );
}

interface Hold {
  id: string;
  version: number;
  active: boolean;
  reason: string;
}
export function PatientGovernance() {
  const { id } = useParams();
  const { facility } = useAuth();
  const command = useCommand();
  const [page, setPage] = useState(1);
  const admin = facility?.roles.includes("ADMIN");
  const history = useQuery({
    queryKey: ["profile-history", facility?.id, id, page],
    queryFn: () =>
      api.get<Page<Patient>>(`/patients/${id}/profile-history?page=${page}`),
  });
  const holds = useQuery({
    queryKey: ["holds", facility?.id, id],
    queryFn: () => api.get<{ items: Hold[] }>(`/patients/${id}/holds`),
    enabled: !!admin,
  });
  return (
    <>
      <Link className="back-link" to={`/patients/${id}`}>
        Return to patient profile
      </Link>
      <PageTitle
        eyebrow="PATIENT GOVERNANCE"
        title="Profile history & holds"
        description="Immutable encrypted snapshots and explicitly recorded preservation decisions."
      />
      <Result command={command} />
      <Panel title="Profile version history">
        {history.isLoading ? (
          <Loading />
        ) : history.error ? (
          <ErrorState error={history.error} />
        ) : !history.data?.items.length ? (
          <Empty title="No snapshots available" />
        ) : (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Version</th>
                    <th>Name</th>
                    <th>Contact</th>
                    <th>Address</th>
                    <th>Recorded</th>
                  </tr>
                </thead>
                <tbody>
                  {history.data.items.map((p) => (
                    <tr key={p.version}>
                      <td>{p.version}</td>
                      <td>{p.full_name}</td>
                      <td>
                        {p.email}
                        <small className="block">{p.contact_number}</small>
                      </td>
                      <td>{p.address}</td>
                      <td>{new Date(p.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              total={history.data.total}
              onChange={setPage}
            />
          </>
        )}
      </Panel>
      {admin && (
        <Panel
          title="Administrative preservation holds"
          subtitle="Active holds block archive. Recording or releasing a hold is not a legal determination."
        >
          {holds.isLoading ? (
            <Loading />
          ) : holds.error ? (
            <ErrorState error={holds.error} />
          ) : !holds.data?.items.length ? (
            <Empty title="No recorded holds" />
          ) : (
            <div className="panel-body">
              {holds.data.items.map((h) => (
                <div className="session-row" key={h.id}>
                  <div>
                    <strong>
                      {h.active ? "Active hold" : "Released hold"}
                    </strong>
                    <p>{h.reason}</p>
                  </div>
                  {h.active && (
                    <button
                      className="button danger small"
                      disabled={command.pending}
                      onClick={() => {
                        const reason = window.prompt(
                          "Record the authorized release reason (10+ characters)",
                        );
                        if (reason)
                          void command.execute(
                            `/patients/${id}/holds/${h.id}/release`,
                            { reason, expected_version: h.version },
                          );
                      }}
                    >
                      Record hold release
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          <form
            className="standard-form"
            onSubmit={async (e) => {
              const form = e.currentTarget;
              const r = await command.execute(
                `/patients/${id}/holds`,
                values(e),
              );
              if (r) form.reset();
            }}
          >
            <label>
              Preservation reason
              <textarea
                name="reason"
                minLength={10}
                maxLength={2000}
                required
              />
            </label>
            <button className="button primary" disabled={command.pending}>
              Record preservation hold
            </button>
          </form>
        </Panel>
      )}
    </>
  );
}

export function NotificationSettings() {
  const { facility } = useAuth();
  const command = useCommand();
  const q = useQuery({
    queryKey: ["preferences", facility?.id],
    queryFn: () =>
      api.get<{
        version: number;
        email_enabled: boolean;
        sms_enabled: boolean;
      }>("/notification-preferences"),
  });
  return (
    <>
      <PageTitle
        eyebrow="COMMUNICATION PREFERENCES"
        title="Notification preferences"
        description="External channels are opt-in. These preferences do not activate unconfigured providers."
      />
      <Result command={command} />
      <Guardrail>
        In-app operational notifications remain available. Email and SMS
        delivery are NOT CONFIGURED.
      </Guardrail>
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorState error={q.error} />
      ) : (
        <Panel title="Preferred external channels">
          <form
            className="standard-form"
            key={q.data?.version}
            onSubmit={(e) => {
              const v = values(e);
              void command.execute(
                "/notification-preferences",
                {
                  expected_version: q.data?.version,
                  email_enabled: v.email === "yes",
                  sms_enabled: v.sms === "yes",
                },
                "PUT",
              );
            }}
          >
            <label>
              Email preference
              <select
                name="email"
                defaultValue={q.data?.email_enabled ? "yes" : "no"}
              >
                <option value="no">Do not send email</option>
                <option value="yes">
                  Opt in to approved email notifications
                </option>
              </select>
            </label>
            <label>
              SMS preference
              <select
                name="sms"
                defaultValue={q.data?.sms_enabled ? "yes" : "no"}
              >
                <option value="no">Do not send SMS</option>
                <option value="yes">
                  Opt in to approved SMS notifications
                </option>
              </select>
            </label>
            <button className="button primary" disabled={command.pending}>
              Save notification preferences
            </button>
          </form>
        </Panel>
      )}
    </>
  );
}
