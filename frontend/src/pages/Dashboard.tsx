import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowRight,
  CalendarDays,
  Users,
  FileCheck2,
  ShieldCheck,
  Plus,
  Clock3,
  CircleHelp,
  CreditCard,
} from "lucide-react";
import { useAuth } from "../auth/Auth";
import { api } from "../api/client";
import type {
  Appointment,
  Patient,
  Page,
  Integration,
  Invoice,
  Notice,
} from "../api/client";
import {
  Badge,
  Panel,
  PageTitle,
  Loading,
  ErrorState,
  Empty,
  TextLink,
  Reference,
  formatDate,
  formatTime,
} from "../components/UI";
export function Dashboard() {
  const { user, facility } = useAuth();
  const roles = facility?.roles ?? [];
  const care = roles.some((r) =>
    ["ADMIN", "DOCTOR", "NURSE", "PATIENT"].includes(r),
  );
  const billing = roles.some((r) => ["BILLING_STAFF", "PATIENT"].includes(r));
  const admin = roles.includes("ADMIN");
  const patients = useQuery({
    queryKey: ["patients", facility?.id, "dashboard"],
    queryFn: () => api.get<Page<Patient>>("/patients?page_size=5"),
    enabled: care,
  });
  const appointments = useQuery({
    queryKey: ["appointments", facility?.id, "dashboard"],
    queryFn: () => api.get<Page<Appointment>>("/appointments?page_size=100"),
    enabled: care,
  });
  const invoices = useQuery({
    queryKey: ["invoices", facility?.id, "dashboard"],
    queryFn: () => api.get<Page<Invoice>>("/invoices?page_size=5"),
    enabled: billing,
  });
  const integrations = useQuery({
    queryKey: ["integrations", facility?.id],
    queryFn: () => api.get<{ items: Integration[] }>("/integrations"),
  });
  const notifications = useQuery({
    queryKey: ["notifications", facility?.id],
    queryFn: () => api.get<{ items: Notice[] }>("/notifications"),
  });
  const scheduled =
    appointments.data?.items.filter((a) => a.status === "SCHEDULED") ?? [];
  const upcoming = scheduled
    .filter((a) => new Date(a.starts_at) > new Date())
    .slice(0, 5);
  const loaded = appointments.data?.items ?? [];
  const scheduledCount = loaded.filter((a) => a.status === "SCHEDULED").length;
  const cancelledCount = loaded.filter((a) => a.status === "CANCELLED").length;
  return (
    <>
      <PageTitle
        eyebrow="WORKSPACE OVERVIEW"
        title={`Welcome, ${user?.display_name.split(" ")[0]}.`}
        description="A clear view of your care operations. Every action, accountable."
        action={
          admin ? (
            <Link className="button primary" to="/patients/new">
              <Plus size={17} />
              Register patient
            </Link>
          ) : care ? (
            <Link className="button primary" to="/appointments/new">
              <Plus size={17} />
              Book appointment
            </Link>
          ) : undefined
        }
      />
      <div className="scope-line">
        <span className="live-dot" />
        Live facility data<span className="scope-separator">/</span>
        {facility?.name}
        <span className="scope-separator">/</span>
        <span>{roles[0]?.replaceAll("_", " ").toLowerCase()} workspace</span>
      </div>
      <div className="stats-grid">
        <Stat
          title={care ? "Accessible patients" : "Your notifications"}
          value={
            care
              ? (patients.data?.total ?? "—")
              : (notifications.data?.items.length ?? "—")
          }
          description={
            care ? "Within your authorized scope" : "In-app messages"
          }
          icon={<Users size={20} />}
          to={care ? "/patients" : "/notifications"}
          loading={care && patients.isLoading}
        />
        <Stat
          title={care ? "Scheduled appointments" : "Draft invoices"}
          value={
            care
              ? appointments.data
                ? scheduledCount
                : "—"
              : (invoices.data?.total ?? "—")
          }
          description={
            care ? "In the loaded appointment window" : "Not issued or settled"
          }
          icon={care ? <CalendarDays size={20} /> : <CreditCard size={20} />}
          to={care ? "/appointments" : "/billing"}
        />
        <Stat
          title="External integrations"
          value={
            integrations.data
              ? `${integrations.data.items.filter((i) => i.status === "NOT_CONFIGURED").length} unavailable`
              : "—"
          }
          description={
            integrations.data
              ? `${integrations.data.items.length} integration boundaries`
              : "Checking configuration"
          }
          icon={<FileCheck2 size={20} />}
          to="/admin"
          amber
        />
        <Stat
          title="Access boundary"
          value="Facility-scoped"
          description="Backend authorization enforced"
          icon={<ShieldCheck size={20} />}
          to="/profile"
          compact
        />
      </div>
      {integrations.error && (
        <ErrorState
          error={integrations.error}
          retry={() => integrations.refetch()}
        />
      )}
      {notifications.error && (
        <ErrorState
          error={notifications.error}
          retry={() => notifications.refetch()}
        />
      )}
      {invoices.error && (
        <ErrorState error={invoices.error} retry={() => invoices.refetch()} />
      )}
      {patients.error && (
        <ErrorState error={patients.error} retry={() => patients.refetch()} />
      )}
      <div className="dashboard-columns">
        <div className="dashboard-main">
          <Panel
            title={care ? "Upcoming appointments" : "Workspace activity"}
            subtitle={
              care
                ? "Your next scheduled care interactions"
                : "Latest in-app workflow notifications"
            }
            action={
              <TextLink to={care ? "/appointments" : "/notifications"}>
                View all
              </TextLink>
            }
          >
            {care ? (
              appointments.isLoading ? (
                <Loading />
              ) : appointments.error ? (
                <ErrorState error={appointments.error} />
              ) : upcoming.length ? (
                <div className="appointment-list">
                  {upcoming.map((a, i) => (
                    <Link
                      to={`/appointments/${a.id}`}
                      className="appointment-row"
                      key={a.id}
                    >
                      <div className={`time-block ${i === 0 ? "first" : ""}`}>
                        <strong>{formatTime(a.starts_at)}</strong>
                        <span>
                          {formatDate(a.starts_at)
                            .split(" ")
                            .slice(0, 2)
                            .join(" ")}
                        </span>
                      </div>
                      <div className="appointment-person">
                        <strong>
                          {patients.data?.items.find(
                            (p) => p.id === a.patient_id,
                          )?.full_name ?? "Authorized patient"}
                        </strong>
                        <span>
                          <Reference value={a.patient_id} />
                          <span className="inline-dot">·</span>
                          {a.appointment_type === "FOLLOW_UP"
                            ? "Follow-up"
                            : "Consultation"}
                        </span>
                      </div>
                      <Badge tone="green">Scheduled</Badge>
                      <ArrowUpRight className="row-arrow" size={19} />
                    </Link>
                  ))}
                </div>
              ) : (
                <Empty
                  title="No upcoming appointments in this window"
                  description="This summary covers up to 100 loaded records. Open the schedule to browse your scope."
                  action={
                    <Link to="/appointments/new" className="text-link">
                      Find an available time <ArrowRight size={15} />
                    </Link>
                  }
                />
              )
            ) : (
              <div className="notice-preview">
                {notifications.data?.items.slice(0, 4).map((n) => (
                  <div key={n.id}>
                    <span className="activity-dot" />
                    <span>
                      <strong>{n.kind.replaceAll(".", " ")}</strong>
                      <small>{formatDate(n.created_at)}</small>
                    </span>
                  </div>
                ))}
                {!notifications.data?.items.length && (
                  <Empty title="No new activity" />
                )}
              </div>
            )}
            <div className="panel-foot">
              <Clock3 size={14} />
              {care
                ? "Times shown in your browser timezone. Scheduling is validated on the server."
                : "Notifications are generated from committed database events."}
            </div>
          </Panel>
          {care && (
            <Panel
              title="Recently registered patients"
              subtitle="Latest profiles you are authorized to access"
              action={<TextLink to="/patients">Patient directory</TextLink>}
            >
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Patient reference</th>
                      <th>Insurance</th>
                      <th>
                        <span className="sr-only">Open</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.data?.items.map((p, i) => (
                      <tr key={p.id}>
                        <td>
                          <Link
                            className="person-cell"
                            to={`/patients/${p.id}`}
                          >
                            <span
                              className={`avatar patient-avatar color-${i % 3}`}
                            >
                              {p.full_name
                                .split(" ")
                                .slice(0, 2)
                                .map((n) => n[0])
                                .join("")}
                            </span>
                            <span>
                              <strong>{p.full_name}</strong>
                              <small>
                                Registered {formatDate(p.created_at)}
                              </small>
                            </span>
                          </Link>
                        </td>
                        <td>
                          <Reference value={p.id} />
                        </td>
                        <td>
                          <Badge
                            tone={
                              p.insurance_status === "PENDING"
                                ? "amber"
                                : "neutral"
                            }
                          >
                            {p.insurance_status === "PENDING"
                              ? "Pending verification"
                              : "Not provided"}
                          </Badge>
                        </td>
                        <td>
                          <Link
                            to={`/patients/${p.id}`}
                            aria-label={`Open ${p.full_name}`}
                            className="icon-button"
                          >
                            <ArrowUpRight size={17} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {patients.data?.items.length === 0 && (
                <Empty title="Your patient directory is empty" />
              )}
            </Panel>
          )}
        </div>
        <aside className="dashboard-aside">
          <div className="quick-actions">
            <div className="eyebrow">QUICK ACTIONS</div>
            {admin && (
              <Link to="/patients/new">
                <span className="quick-icon">
                  <Users size={19} />
                </span>
                <span>
                  <strong>Register a patient</strong>
                  <small>Create a patient profile</small>
                </span>
                <ArrowRight size={17} />
              </Link>
            )}
            {care && (
              <Link to="/appointments/new">
                <span className="quick-icon">
                  <CalendarDays size={19} />
                </span>
                <span>
                  <strong>Schedule an appointment</strong>
                  <small>Check clinician availability</small>
                </span>
                <ArrowRight size={17} />
              </Link>
            )}
            {billing && (
              <Link to="/billing">
                <span className="quick-icon">
                  <CreditCard size={19} />
                </span>
                <span>
                  <strong>Review invoice drafts</strong>
                  <small>Internal financial workspace</small>
                </span>
                <ArrowRight size={17} />
              </Link>
            )}
            <Link to="/admin">
              <span className="quick-icon">
                <ShieldCheck size={19} />
              </span>
              <span>
                <strong>Review system status</strong>
                <small>Configuration & dependencies</small>
              </span>
              <ArrowRight size={17} />
            </Link>
          </div>
          {care && (
            <Panel
              title="Appointment snapshot"
              subtitle="Distribution in the loaded window"
            >
              <div className="snapshot">
                <div className="snapshot-total">
                  <strong>{appointments.data ? loaded.length : "—"}</strong>
                  <span>appointments loaded</span>
                  <CalendarDays size={35} />
                </div>
                <div className="distribution-bar">
                  <span
                    style={{
                      width: `${loaded.length ? (scheduledCount / loaded.length) * 100 : 0}%`,
                    }}
                  />
                </div>
                <div className="legend-row">
                  <span>
                    <i className="legend-dot teal" />
                    Scheduled
                  </span>
                  <strong>{scheduledCount}</strong>
                </div>
                <div className="legend-row">
                  <span>
                    <i className="legend-dot grey" />
                    Cancelled
                  </span>
                  <strong>{cancelledCount}</strong>
                </div>
                <p>
                  Showing up to 100 records. Not a facility-wide performance
                  metric.
                </p>
              </div>
            </Panel>
          )}
          <div className="care-note">
            <span className="care-note-icon">
              <CircleHelp size={21} />
            </span>
            <h3>Designed for accountable care.</h3>
            <p>
              Clinical decision support never replaces assessment by a qualified
              healthcare professional.
            </p>
            <Link to="/admin">
              Review development limits <ArrowUpRight size={15} />
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
function Stat({
  title,
  value,
  description,
  icon,
  to,
  amber = false,
  compact = false,
  loading = false,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  to: string;
  amber?: boolean;
  compact?: boolean;
  loading?: boolean;
}) {
  return (
    <Link className={`stat-card ${amber ? "stat-amber" : ""}`} to={to}>
      <div className="stat-top">
        <span>{title}</span>
        <span className="stat-icon">{icon}</span>
      </div>
      <strong className={compact ? "compact" : ""}>
        {loading ? "—" : value}
      </strong>
      <div className="stat-bottom">
        <span>{description}</span>
        <ArrowUpRight size={16} />
      </div>
    </Link>
  );
}
