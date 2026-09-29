import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowRight,
  ShieldCheck,
  LockKeyhole,
  Layers3,
  Check,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../auth/Auth";
import { api } from "../api/client";
import { Logo } from "../components/Layout";
import { ErrorState } from "../components/UI";
const schema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
  display_name: z.string().optional(),
  second_factor: z.string().optional(),
});
type Fields = z.infer<typeof schema>;
export function AuthPage() {
  const { pathname } = useLocation();
  const registerMode = pathname === "/register",
    forgotMode = pathname === "/forgot-password";
  const auth = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState("");
  const form = useForm<Fields>({
    resolver: zodResolver(schema),
    defaultValues: { password: forgotMode ? "not-used" : "" },
  });
  async function submit(values: Fields) {
    setError(null);
    setNotice("");
    try {
      if (forgotMode) {
        await api.post("/auth/forgot-password", { email: values.email });
      } else if (registerMode) {
        const data = await api.post<{ message: string }>(
          "/auth/register",
          values,
        );
        setNotice(data.message);
      } else {
        await auth.login(
          values.email,
          values.password,
          values.second_factor || undefined,
        );
        navigate("/dashboard");
      }
    } catch (e) {
      setError(e);
    }
  }
  return (
    <div className="auth-page">
      <section className="auth-story">
        <Logo />
        <div className="story-main">
          <div className="story-kicker">
            <span /> A CONNECTED CARE WORKSPACE
          </div>
          <h1>
            Better coordination.
            <br />
            <span>Human care.</span>
          </h1>
          <p>
            One secure place for the people, information, and operations that
            support healthcare.
          </p>
          <div className="story-features">
            <div>
              <UsersGraphic />
              <span>
                <strong>Built around the care journey</strong>Patient identity,
                appointments, and accountable workflows.
              </span>
            </div>
            <div>
              <ShieldCheck />
              <span>
                <strong>Access with accountability</strong>Facility-scoped
                permissions and durable audit records.
              </span>
            </div>
            <div>
              <Layers3 />
              <span>
                <strong>Honest by design</strong>Unavailable integrations are
                never presented as operational.
              </span>
            </div>
          </div>
        </div>
        <div className="auth-story-footer">
          HUMAN HEALTH CARE SYSTEM <span>DEVELOPMENT · v0.1</span>
        </div>
      </section>
      <section className="auth-form-side">
        <div className="auth-top-note">
          <span className="env-dot" /> Synthetic-data environment
        </div>
        <div className="auth-form">
          <div className="auth-lock">
            <LockKeyhole size={24} />
          </div>
          <div className="eyebrow">YOUR CARE WORKSPACE</div>
          <h2>
            {registerMode
              ? "Create an account"
              : forgotMode
                ? "Account recovery"
                : "Welcome back"}
          </h2>
          <p>
            {registerMode
              ? "Register an unprivileged account. Verification delivery is not configured."
              : forgotMode
                ? "Recovery delivery requires an approved provider. No reset email will be simulated."
                : "Sign in with your provisioned development account."}
          </p>
          {auth.expired && (
            <div className="inline-notice">
              Your session expired. Sign in again to continue.
            </div>
          )}
          {error != null && <ErrorState error={error} />}{" "}
          {notice ? (
            <div className="success-notice">
              <Check />
              {notice}
            </div>
          ) : (
            <form onSubmit={form.handleSubmit(submit)}>
              {registerMode && (
                <label>
                  Display name
                  <input
                    autoComplete="name"
                    required
                    minLength={2}
                    maxLength={120}
                    {...form.register("display_name")}
                  />
                </label>
              )}
              <label>
                Email address
                <input
                  type="email"
                  autoComplete="username"
                  placeholder="you@organization.org"
                  aria-invalid={!!form.formState.errors.email}
                  {...form.register("email")}
                />
                {form.formState.errors.email && (
                  <span className="field-error">
                    {form.formState.errors.email.message}
                  </span>
                )}
              </label>
              {!forgotMode && (
                <label>
                  Password
                  <input
                    type="password"
                    autoComplete={
                      registerMode ? "new-password" : "current-password"
                    }
                    placeholder="Enter your password"
                    minLength={registerMode ? 12 : undefined}
                    {...form.register("password")}
                  />
                  {form.formState.errors.password && (
                    <span className="field-error">
                      {form.formState.errors.password.message}
                    </span>
                  )}
                </label>
              )}
              {!registerMode && !forgotMode && (
                <label>
                  Authenticator or recovery code (if enabled)
                  <input
                    autoComplete="one-time-code"
                    maxLength={64}
                    {...form.register("second_factor")}
                  />
                </label>
              )}
              {!registerMode && !forgotMode && (
                <div className="form-side-link">
                  <Link to="/forgot-password">Forgot password?</Link>
                </div>
              )}
              <button
                className="button primary auth-submit"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting
                  ? "Please wait…"
                  : registerMode
                    ? "Register account"
                    : forgotMode
                      ? "Check recovery availability"
                      : "Sign in to workspace"}
                <ArrowRight size={17} />
              </button>
            </form>
          )}
          <p className="auth-switch">
            {registerMode || forgotMode ? (
              <Link to="/login">Back to sign in</Link>
            ) : (
              <>
                Need an account? <Link to="/register">Register</Link>
              </>
            )}
          </p>
          <p className="auth-switch">
            <Link to="/verify-email">Complete email verification</Link> ·{" "}
            <Link to="/reset-password">Use recovery token</Link>
          </p>
          <div className="auth-warning">
            <ShieldCheck size={17} />
            <span>
              For development and evaluation only. Do not enter real patient
              information. This build is not approved for clinical use.
            </span>
          </div>
        </div>
        <small className="auth-form-footer">
          Access is logged. Your role determines what you can view and change.
        </small>
      </section>
    </div>
  );
}
function UsersGraphic() {
  return (
    <svg
      width="24"
      height="24"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <circle cx="9" cy="7" r="3" />
      <path d="M3 20v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6M18 13a5 5 0 0 1 3 5v2" />
    </svg>
  );
}
