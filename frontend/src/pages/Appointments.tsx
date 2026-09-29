import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  CalendarDays,
  Plus,
  ArrowLeft,
  ArrowUpRight,
  Clock3,
  Search,
} from "lucide-react";
import { api, ApiError } from "../api/client";
import type { Appointment, Patient, Doctor, Page } from "../api/client";
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
export function Appointments() {
  const { facility } = useAuth();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("ALL");
  const q = useQuery({
    queryKey: ["appointments", facility?.id, page],
    queryFn: () => api.get<Page<Appointment>>(`/appointments?page=${page}`),
  });
  const patients = useQuery({
    queryKey: ["patients", facility?.id, "labels"],
    queryFn: () => api.get<Page<Patient>>("/patients?page_size=100"),
  });
  const doctors = useQuery({
    queryKey: ["doctors", facility?.id],
    queryFn: () => api.get<{ items: Doctor[] }>("/doctors"),
  });
  const items =
    q.data?.items.filter((a) => filter === "ALL" || a.status === filter) ?? [];
  return (
    <>
      <PageTitle
        eyebrow="CARE COORDINATION"
        title="Appointments"
        description="Coordinate clinician availability and keep every booking consistent."
        action={
          <Link className="button primary" to="/appointments/new">
            <Plus size={17} />
            Book appointment
          </Link>
        }
      />
      <Panel
        title="Appointment register"
        subtitle="All appointments within your authorized scope"
      >
        <div className="table-toolbar">
          <div
            className="segmented"
            role="group"
            aria-label="Filter loaded appointments"
          >
            {["ALL", "SCHEDULED", "CANCELLED"].map((f) => (
              <button
                key={f}
                aria-pressed={filter === f}
                className={filter === f ? "selected" : ""}
                onClick={() => setFilter(f)}
              >
                {f[0] + f.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          <span className="toolbar-note">
            <CalendarDays size={15} />
            Filters apply to this page
          </span>
        </div>
        {q.isLoading ? (
          <Loading />
        ) : q.error ? (
          <ErrorState error={q.error} />
        ) : items.length ? (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Date & time</th>
                    <th>Patient</th>
                    <th>Clinician</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <div className="stack">
                          <strong>{formatDate(a.starts_at)}</strong>
                          <small>
                            {formatTime(a.starts_at)} – {formatTime(a.ends_at)}
                          </small>
                        </div>
                      </td>
                      <td>
                        <Link
                          to={`/patients/${a.patient_id}`}
                          className="stack"
                        >
                          <strong>
                            {patients.data?.items.find(
                              (p) => p.id === a.patient_id,
                            )?.full_name ?? "Authorized patient"}
                          </strong>
                          <Reference value={a.patient_id} />
                        </Link>
                      </td>
                      <td>
                        {doctors.data?.items.find((d) => d.id === a.doctor_id)
                          ?.name ?? "Assigned clinician"}
                      </td>
                      <td>
                        {a.appointment_type === "FOLLOW_UP"
                          ? "Follow-up"
                          : "Consultation"}
                      </td>
                      <td>
                        <Badge
                          tone={a.status === "SCHEDULED" ? "green" : "neutral"}
                        >
                          {a.status === "SCHEDULED" ? "Scheduled" : "Cancelled"}
                        </Badge>
                      </td>
                      <td>
                        <Link
                          className="icon-button"
                          to={`/appointments/${a.id}`}
                          aria-label="Open appointment"
                        >
                          <ArrowUpRight size={18} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <Empty
            title="No appointments in this view"
            description="Choose another filter or book an available clinician window."
          />
        )}
        {q.data && (
          <Pagination page={page} total={q.data.total} onChange={setPage} />
        )}
      </Panel>
      <Guardrail>
        Overlapping clinician appointments are rejected by PostgreSQL. Emergency
        triage is a separate workflow and is not configured.
      </Guardrail>
    </>
  );
}
export function AppointmentCreate() {
  const { facility } = useAuth();
  const [patient, setPatient] = useState("");
  const [doctor, setDoctor] = useState("");
  const [start, setStart] = useState("");
  const [duration, setDuration] = useState("30");
  const [type, setType] = useState("CONSULTATION");
  const [search, setSearch] = useState(false);
  const navigate = useNavigate();
  const cache = useQueryClient();
  const key = useIdempotency();
  const patients = useQuery({
    queryKey: ["patients", facility?.id, "options"],
    queryFn: () => api.get<Page<Patient>>("/patients?page_size=100"),
  });
  const doctors = useQuery({
    queryKey: ["doctors", facility?.id],
    queryFn: () => api.get<{ items: Doctor[] }>("/doctors"),
  });
  const windows = useQuery({
    queryKey: ["availability", facility?.id, doctor],
    queryFn: () =>
      api.get<{ items: { id: string; starts_at: string; ends_at: string }[] }>(
        `/doctors/${doctor}/availability`,
      ),
    enabled: !!doctor,
  });
  const slots = useQuery({
    queryKey: ["slots", doctor, start, duration],
    queryFn: () =>
      api.get<{ items: { starts_at: string; ends_at: string }[] }>(
        `/appointments/available-slots?doctor_id=${doctor}&starts_at=${encodeURIComponent(new Date(start).toISOString())}&duration_minutes=${duration}`,
      ),
    enabled: search && !!doctor && !!start,
  });
  const mutation = useMutation({
    mutationFn: (body: unknown) =>
      api.post<Appointment>("/appointments", body, key(body)),
    onSuccess: (a) => {
      cache.invalidateQueries({ queryKey: ["appointments"] });
      navigate(`/appointments/${a.id}`);
    },
  });
  const alternatives =
    mutation.error instanceof ApiError &&
    Array.isArray(mutation.error.error.details.alternatives)
      ? (mutation.error.error.details.alternatives as {
          starts_at: string;
          ends_at: string;
        }[])
      : [];
  function choose(value: string) {
    const d = new Date(value);
    setStart(
      new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16),
    );
    setSearch(false);
  }
  return (
    <>
      <Link className="back-link" to="/appointments">
        <ArrowLeft size={15} />
        Appointment register
      </Link>
      <PageTitle
        eyebrow="SCHEDULING"
        title="Book an appointment"
        description="Choose a patient, clinician, and available time. The server makes the final availability check."
      />
      <div className="form-layout">
        <Panel
          title="Appointment details"
          subtitle="Times entered below use your browser's timezone."
        >
          <form
            className="standard-form"
            onSubmit={(e) => {
              e.preventDefault();
              const from = new Date(start);
              mutation.mutate({
                patient_id: patient,
                doctor_id: doctor,
                starts_at: from.toISOString(),
                ends_at: new Date(
                  from.getTime() + Number(duration) * 60000,
                ).toISOString(),
                appointment_type: type,
              });
            }}
          >
            {mutation.error && <ErrorState error={mutation.error} />}
            <label>
              Patient *
              <select
                value={patient}
                required
                onChange={(e) => setPatient(e.target.value)}
              >
                <option value="">Select an authorized patient</option>
                {patients.data?.items.map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.full_name} · {p.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </label>
            {patients.error && <ErrorState error={patients.error} />}
            <label>
              Clinician *
              <select
                value={doctor}
                required
                onChange={(e) => {
                  setDoctor(e.target.value);
                  setSearch(false);
                }}
              >
                <option value="">Select a clinician</option>
                {doctors.data?.items.map((d) => (
                  <option value={d.id} key={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            {doctors.error && <ErrorState error={doctors.error} />}
            <div className="form-grid">
              <label>
                Appointment type
                <select value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="CONSULTATION">Consultation</option>
                  <option value="FOLLOW_UP">Follow-up</option>
                </select>
              </label>
              <label>
                Duration (minutes)
                <input
                  type="number"
                  min={5}
                  max={240}
                  value={duration}
                  required
                  onChange={(e) => {
                    setDuration(e.target.value);
                    setSearch(false);
                  }}
                />
              </label>
              <label className="span-two">
                Start date & time *
                <input
                  type="datetime-local"
                  required
                  value={start}
                  onChange={(e) => {
                    setStart(e.target.value);
                    setSearch(false);
                  }}
                />
              </label>
            </div>
            <button
              className="button secondary"
              type="button"
              disabled={!doctor || !start}
              onClick={() => setSearch(true)}
            >
              <Search size={16} />
              Find nearby available slots
            </button>
            {slots.isFetching && <p role="status">Checking availability…</p>}
            {slots.error && <ErrorState error={slots.error} />}
            <div className="slot-grid">
              {search &&
                slots.data?.items.map((s) => (
                  <button
                    type="button"
                    key={s.starts_at}
                    onClick={() => choose(s.starts_at)}
                    className="slot"
                  >
                    <Clock3 size={14} />
                    {formatTime(s.starts_at)}
                  </button>
                ))}
            </div>
            {search && slots.data?.items.length === 0 && (
              <p>
                No available alternatives within ±2 hours. Try another time.
              </p>
            )}
            {alternatives.length > 0 && (
              <div>
                <h3>Available alternatives</h3>
                <div className="slot-grid">
                  {alternatives.map((s) => (
                    <button
                      type="button"
                      key={s.starts_at}
                      onClick={() => choose(s.starts_at)}
                      className="slot"
                    >
                      {formatTime(s.starts_at)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="form-actions">
              <Link to="/appointments" className="button secondary">
                Cancel
              </Link>
              <button className="button primary" disabled={mutation.isPending}>
                <CalendarDays size={17} />
                {mutation.isPending ? "Booking…" : "Confirm appointment"}
              </button>
            </div>
          </form>
        </Panel>
        <aside>
          <Panel
            title="Clinician availability"
            subtitle="Explicitly configured scheduling windows"
          >
            <div className="panel-body">
              {!doctor ? (
                <p>Select a clinician to see available windows.</p>
              ) : windows.isLoading ? (
                <Loading />
              ) : windows.error ? (
                <ErrorState error={windows.error} />
              ) : windows.data?.items.length ? (
                <div className="window-list">
                  {windows.data.items.slice(0, 10).map((w) => (
                    <button key={w.id} onClick={() => choose(w.starts_at)}>
                      <strong>{formatDate(w.starts_at)}</strong>
                      <span>
                        {formatTime(w.starts_at)} – {formatTime(w.ends_at)}
                        <ArrowUpRight size={14} />
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <Empty title="No configured availability" />
              )}
            </div>
          </Panel>
          <div className="help-card">
            <h3>Not an emergency service</h3>
            <p>
              If you believe you have a medical emergency, seek immediate
              professional or local emergency care. This booking form is not a
              triage tool.
            </p>
            <Badge tone="amber">Emergency workflow unavailable</Badge>
          </div>
        </aside>
      </div>
    </>
  );
}
export function AppointmentDetail() {
  const { id } = useParams();
  const { facility } = useAuth();
  const cache = useQueryClient();
  const key = useIdempotency();
  const [newStart, setNewStart] = useState("");
  const q = useQuery({
    queryKey: ["appointment", facility?.id, id],
    queryFn: () => api.get<Appointment>(`/appointments/${id}`),
  });
  const mutation = useMutation({
    mutationFn: ({ cancel, body }: { cancel: boolean; body: unknown }) =>
      cancel
        ? api.post(`/appointments/${id}/cancel`, body, key(body))
        : api.put(`/appointments/${id}`, body, key(body)),
    onSuccess: () => {
      cache.invalidateQueries({ queryKey: ["appointment"] });
      cache.invalidateQueries({ queryKey: ["appointments"] });
      setNewStart("");
    },
  });
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorState error={q.error} />;
  if (!q.data) return null;
  const a = q.data;
  return (
    <>
      <Link className="back-link" to="/appointments">
        <ArrowLeft size={15} />
        Appointment register
      </Link>
      <PageTitle
        eyebrow="APPOINTMENT DETAILS"
        title={formatDate(a.starts_at)}
        description={`${formatTime(a.starts_at)}–${formatTime(a.ends_at)} · Version ${a.version}`}
        action={
          <Badge tone={a.status === "SCHEDULED" ? "green" : "neutral"}>
            {a.status}
          </Badge>
        }
      />
      {mutation.error && <ErrorState error={mutation.error} />}
      <div className="form-layout">
        <Panel title="Booking information">
          <dl className="detail-grid">
            <div>
              <dt>Appointment reference</dt>
              <dd>{a.id}</dd>
            </div>
            <div>
              <dt>Patient reference</dt>
              <dd>
                <Link to={`/patients/${a.patient_id}`} className="text-link">
                  <Reference value={a.patient_id} />
                </Link>
              </dd>
            </div>
            <div>
              <dt>Type</dt>
              <dd>{a.appointment_type}</dd>
            </div>
            <div>
              <dt>Clinician reference</dt>
              <dd>
                <Reference value={a.doctor_id} />
              </dd>
            </div>
          </dl>
        </Panel>
        <aside>
          {a.status === "SCHEDULED" && (
            <Panel title="Manage appointment">
              <form
                className="standard-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const start = new Date(newStart);
                  const duration =
                    new Date(a.ends_at).getTime() -
                    new Date(a.starts_at).getTime();
                  mutation.mutate({
                    cancel: false,
                    body: {
                      starts_at: start.toISOString(),
                      ends_at: new Date(
                        start.getTime() + duration,
                      ).toISOString(),
                      expected_version: a.version,
                    },
                  });
                }}
              >
                <label>
                  New start time
                  <input
                    type="datetime-local"
                    required
                    value={newStart}
                    onChange={(e) => setNewStart(e.target.value)}
                  />
                </label>
                <button
                  className="button primary"
                  disabled={mutation.isPending}
                >
                  Reschedule
                </button>
                <button
                  className="button danger"
                  type="button"
                  disabled={mutation.isPending}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Cancel this appointment? This action is audited and the reserved time will be released.",
                      )
                    )
                      mutation.mutate({
                        cancel: true,
                        body: { expected_version: a.version },
                      });
                  }}
                >
                  Cancel appointment
                </button>
              </form>
            </Panel>
          )}
        </aside>
      </div>
    </>
  );
}
