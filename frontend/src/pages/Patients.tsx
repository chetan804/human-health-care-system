import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  Plus,
  Search,
  ArrowUpRight,
  ArrowLeft,
  UserRound,
  Archive,
  Save,
} from "lucide-react";
import { api } from "../api/client";
import type { Patient, Page } from "../api/client";
import { useAuth } from "../auth/Auth";
import {
  Badge,
  Empty,
  ErrorState,
  Loading,
  PageTitle,
  Panel,
  Pagination,
  Reference,
  Guardrail,
  formatDate,
} from "../components/UI";
import { useIdempotency } from "../components/forms";
export function Patients() {
  const { facility } = useAuth();
  const [page, setPage] = useState(1);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const admin = facility?.roles.includes("ADMIN");
  const q = useQuery({
    queryKey: ["patients", facility?.id, page, search],
    queryFn: () =>
      api.get<Page<Patient>>(
        `/patients?page=${page}${search ? `&patient_id=${encodeURIComponent(search)}` : ""}`,
      ),
  });
  return (
    <>
      <PageTitle
        eyebrow="PATIENT MANAGEMENT"
        title="Patient directory"
        description="Manage patient identities within your authorized facility and care relationships."
        action={
          admin && (
            <Link to="/patients/new" className="button primary">
              <Plus size={17} />
              Register patient
            </Link>
          )
        }
      />
      <Panel
        title="Registered patients"
        subtitle="Personal information is protected with envelope encryption."
      >
        <form
          className="table-toolbar"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(input.trim());
            setPage(1);
          }}
        >
          <div className="search-input">
            <Search size={18} />
            <label className="sr-only" htmlFor="patient-search">
              Search exact patient UUID
            </label>
            <input
              id="patient-search"
              placeholder="Search by full patient UUID…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </div>
          <button className="button secondary">Search</button>
          {search && (
            <button
              className="text-link"
              type="button"
              onClick={() => {
                setInput("");
                setSearch("");
              }}
            >
              Clear
            </button>
          )}
          <span className="toolbar-note">
            Exact reference search · no name-only matching
          </span>
        </form>
        {q.isLoading ? (
          <Loading />
        ) : q.error ? (
          <ErrorState error={q.error} retry={() => q.refetch()} />
        ) : q.data?.items.length ? (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Date of birth</th>
                    <th>Patient reference</th>
                    <th>Insurance</th>
                    <th>Registered</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {q.data.items.map((p, i) => (
                    <tr key={p.id}>
                      <td>
                        <Link className="person-cell" to={`/patients/${p.id}`}>
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
                            <small>{p.email}</small>
                          </span>
                        </Link>
                      </td>
                      <td>{formatDate(p.date_of_birth + "T12:00:00")}</td>
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
                      <td>{formatDate(p.created_at)}</td>
                      <td>
                        <Link
                          className="icon-button"
                          to={`/patients/${p.id}`}
                          aria-label={`Open ${p.full_name}`}
                        >
                          <ArrowUpRight size={18} />
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
          <Empty
            title="No patients found"
            description={
              search
                ? "Check the full patient UUID or clear your search."
                : "No patient profiles are available within your access scope."
            }
          />
        )}
      </Panel>
      <Guardrail>
        Patient access is checked on the server and recorded in the audit trail.
        Cross-facility browsing is not permitted.
      </Guardrail>
    </>
  );
}
interface Intake {
  full_name: string;
  date_of_birth: string;
  gender: string;
  contact_number: string;
  email: string;
  address: string;
  insurance_id: string;
  emergency_contact: string;
  medical_history: string;
  duplicate_review_reason: string;
}
export function PatientCreate() {
  const form = useForm<Intake>();
  const key = useIdempotency();
  const cache = useQueryClient();
  const navigate = useNavigate();
  const mutation = useMutation({
    mutationFn: (body: Record<string, string>) =>
      api.post<Patient>("/patients", body, key(body)),
    onSuccess: (p) => {
      cache.invalidateQueries({ queryKey: ["patients"] });
      navigate(`/patients/${p.id}`);
    },
  });
  function submit(values: Intake) {
    const body = Object.fromEntries(
      Object.entries(values).filter(([, value]) => value !== ""),
    );
    mutation.mutate(body);
  }
  return (
    <>
      <Link className="back-link" to="/patients">
        <ArrowLeft size={15} />
        Patient directory
      </Link>
      <PageTitle
        eyebrow="PATIENT INTAKE"
        title="Register a patient"
        description="Create a new identity. Use synthetic information only in this environment."
      />
      <div className="form-layout">
        <Panel
          title="Patient information"
          subtitle="Fields marked * are required. Validation is enforced by the API."
        >
          <form className="standard-form" onSubmit={form.handleSubmit(submit)}>
            {mutation.error && <ErrorState error={mutation.error} />}
            <h3>Identity & demographics</h3>
            <div className="form-grid">
              <label className="span-two">
                Full name *
                <input
                  required
                  minLength={2}
                  maxLength={160}
                  autoComplete="off"
                  {...form.register("full_name")}
                />
              </label>
              <label>
                Date of birth *
                <input
                  type="date"
                  required
                  {...form.register("date_of_birth")}
                />
              </label>
              <label>
                Gender (self-described) *
                <input
                  required
                  maxLength={60}
                  placeholder="Self-described or not specified"
                  {...form.register("gender")}
                />
              </label>
            </div>
            <h3>Contact details</h3>
            <div className="form-grid">
              <label>
                Contact number *
                <input
                  type="tel"
                  required
                  placeholder="+12025550100"
                  {...form.register("contact_number")}
                />
                <small>International format, including country code.</small>
              </label>
              <label>
                Email address *
                <input type="email" required {...form.register("email")} />
              </label>
              <label className="span-two">
                Address *
                <textarea
                  required
                  minLength={5}
                  maxLength={1000}
                  rows={3}
                  {...form.register("address")}
                />
              </label>
            </div>
            <h3>Optional information</h3>
            <div className="form-grid">
              <label>
                Insurance member reference
                <input maxLength={100} {...form.register("insurance_id")} />
                <small>Will be saved as pending verification.</small>
              </label>
              <label>
                Emergency contact
                <input
                  maxLength={500}
                  {...form.register("emergency_contact")}
                />
              </label>
              <label className="span-two">
                Patient-supplied history
                <textarea
                  maxLength={10000}
                  rows={3}
                  {...form.register("medical_history")}
                />
                <small>
                  Encrypted storage only. Not a clinically verified record.
                </small>
              </label>
            </div>
            {mutation.error && (
              <label>
                Duplicate review reason (only after human review)
                <textarea
                  minLength={20}
                  maxLength={500}
                  {...form.register("duplicate_review_reason")}
                />
              </label>
            )}
            <div className="form-actions">
              <Link className="button secondary" to="/patients">
                Cancel
              </Link>
              <button disabled={mutation.isPending} className="button primary">
                <Plus size={17} />
                {mutation.isPending ? "Registering…" : "Register patient"}
              </button>
            </div>
          </form>
        </Panel>
        <aside>
          <div className="help-card">
            <UserRound size={25} />
            <h3>One person. A considered identity.</h3>
            <p>
              Duplicate detection compares contact information and date of
              birth. It does not merge people by name.
            </p>
            <hr />
            <h4>What happens next?</h4>
            <ol>
              <li>The patient profile is validated and encrypted.</li>
              <li>Registration and audit are saved atomically.</li>
              <li>An in-app workflow notification is queued.</li>
            </ol>
            <Badge tone="amber">External delivery not configured</Badge>
            <p>No insurance verification or welcome email will be simulated.</p>
          </div>
        </aside>
      </div>
    </>
  );
}
export function PatientDetail() {
  const { id } = useParams();
  const { facility } = useAuth();
  const admin = facility?.roles.includes("ADMIN");
  const cache = useQueryClient();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const form = useForm<{
    full_name: string;
    email: string;
    contact_number: string;
    address: string;
  }>();
  const q = useQuery({
    queryKey: ["patient", facility?.id, id],
    queryFn: () => api.get<Patient>(`/patients/${id}`),
  });
  const update = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.patch<Patient>(`/patients/${id}`, body),
    onSuccess: () => {
      cache.invalidateQueries({ queryKey: ["patient"] });
      cache.invalidateQueries({ queryKey: ["patients"] });
      setEditing(false);
    },
  });
  const archive = useMutation({
    mutationFn: () =>
      api.delete(`/patients/${id}?expected_version=${q.data?.version}`),
    onSuccess: () => {
      cache.invalidateQueries({ queryKey: ["patients"] });
      navigate("/patients");
    },
  });
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorState error={q.error} />;
  if (!q.data) return null;
  const p = q.data;
  return (
    <>
      <Link className="back-link" to="/patients">
        <ArrowLeft size={15} />
        Patient directory
      </Link>
      <PageTitle
        eyebrow="PATIENT PROFILE"
        title={p.full_name}
        description={`Patient reference: ${p.id}`}
        action={
          admin && (
            <button
              className="button secondary"
              onClick={() => {
                form.reset({
                  full_name: p.full_name,
                  email: p.email,
                  contact_number: p.contact_number,
                  address: p.address,
                });
                setEditing(!editing);
              }}
            >
              {editing ? "Close editor" : "Edit profile"}
            </button>
          )
        }
      />
      <Link className="back-link" to={`/patients/${id}/history`}>
        View profile history & preservation holds
      </Link>
      {facility?.roles.some((role) =>
        ["DOCTOR", "NURSE", "PATIENT"].includes(role),
      ) && (
        <Link className="back-link" to={`/patients/${id}/documents`}>
          View protected documents
        </Link>
      )}
      {archive.error && <ErrorState error={archive.error} />}
      <div className="form-layout">
        <Panel
          title="Demographics & contact"
          subtitle={`Version ${p.version} · Registered ${formatDate(p.created_at)}`}
        >
          {editing ? (
            <form
              className="standard-form"
              onSubmit={form.handleSubmit((values) =>
                update.mutate({ ...values, expected_version: p.version }),
              )}
            >
              {update.error && <ErrorState error={update.error} />}
              <label>
                Full name
                <input required {...form.register("full_name")} />
              </label>
              <label>
                Email address
                <input type="email" required {...form.register("email")} />
              </label>
              <label>
                Contact number
                <input required {...form.register("contact_number")} />
              </label>
              <label>
                Address
                <textarea required {...form.register("address")} />
              </label>
              <button className="button primary" disabled={update.isPending}>
                <Save size={16} />
                Save changes
              </button>
            </form>
          ) : (
            <dl className="detail-grid">
              {[
                ["Full name", p.full_name],
                ["Date of birth", formatDate(p.date_of_birth + "T12:00:00")],
                ["Gender", p.gender],
                ["Contact number", p.contact_number],
                ["Email", p.email],
                ["Address", p.address],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </Panel>
        <aside>
          <Panel title="Insurance verification">
            <div className="panel-body">
              <Badge tone="amber">
                {p.insurance_status === "PENDING"
                  ? "Pending verification"
                  : "Not provided"}
              </Badge>
              <p>
                Insurance verification is not configured. This does not prevent
                registration.
              </p>
            </div>
          </Panel>
          <div className="help-card">
            <h3>Clinical information</h3>
            <p>
              Clinical content is not released through this demographic profile.
              Clinical SOPs and lawful-purpose policies must be approved before
              activation.
            </p>
          </div>
          {admin && (
            <button
              className="button danger"
              onClick={() => {
                if (
                  window.confirm(
                    "Archive this profile? Historical information will be retained. Future appointments must be cancelled first.",
                  )
                )
                  archive.mutate();
              }}
              disabled={archive.isPending}
            >
              <Archive size={16} />
              Archive patient
            </button>
          )}
        </aside>
      </div>
      <Guardrail>
        Profile changes require the current version. Concurrent changes return a
        conflict rather than overwrite another user's work.
      </Guardrail>
    </>
  );
}
