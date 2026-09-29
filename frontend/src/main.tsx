import { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  Link,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./auth/Auth";
import { Layout } from "./components/Layout";
import { Loading, Empty } from "./components/UI";
import { AuthPage } from "./pages/AuthPages";
import { Dashboard } from "./pages/Dashboard";
import { Patients, PatientCreate, PatientDetail } from "./pages/Patients";
import {
  Appointments,
  AppointmentCreate,
  AppointmentDetail,
} from "./pages/Appointments";
import {
  Billing,
  InvoiceCreate,
  InvoiceDetail,
  Administration,
  AuditPage,
  Notifications,
  Profile,
  Unavailable,
} from "./pages/Operations";
const SecuritySettings = lazy(() =>
  import("./pages/IndependentOperations").then((m) => ({
    default: m.SecuritySettings,
  })),
);
const CompleteChallenge = lazy(() =>
  import("./pages/IndependentOperations").then((m) => ({
    default: m.CompleteChallenge,
  })),
);
const FacilityManagement = lazy(() =>
  import("./pages/IndependentOperations").then((m) => ({
    default: m.FacilityManagement,
  })),
);
const DataExchange = lazy(() =>
  import("./pages/IndependentOperations").then((m) => ({
    default: m.DataExchange,
  })),
);
const PatientGovernance = lazy(() =>
  import("./pages/IndependentOperations").then((m) => ({
    default: m.PatientGovernance,
  })),
);
const NotificationSettings = lazy(() =>
  import("./pages/IndependentOperations").then((m) => ({
    default: m.NotificationSettings,
  })),
);
const Documents = lazy(() => import("./pages/Documents"));
import "./styles.css";
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false, staleTime: 15000 },
    mutations: { retry: false },
  },
});
function IdentityProtected() {
  const auth = useAuth();
  if (auth.loading) return <Loading />;
  return auth.user ? <Outlet /> : <Navigate to="/login" replace />;
}
function Protected() {
  const auth = useAuth();
  if (auth.loading) return <Loading />;
  if (!auth.user) return <Navigate to="/login" replace />;
  if (!auth.facility)
    return (
      <Empty
        title="No facility access assigned"
        description="An authorized operator must provision your facility membership. Registration never grants staff privileges."
        action={
          <>
            <Link className="button primary" to="/security">
              Manage account security
            </Link>
            <button className="button secondary" onClick={() => auth.logout()}>
              Sign out
            </button>
          </>
        }
      />
    );
  return <Outlet />;
}
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/login" element={<AuthPage />} />
              <Route path="/register" element={<AuthPage />} />
              <Route path="/forgot-password" element={<AuthPage />} />
              <Route path="/reset-password" element={<CompleteChallenge />} />
              <Route path="/verify-email" element={<CompleteChallenge />} />
              <Route element={<IdentityProtected />}>
                <Route element={<Layout />}>
                  <Route path="/security" element={<SecuritySettings />} />
                  <Route path="/profile" element={<Profile />} />
                </Route>
              </Route>
              <Route element={<Protected />}>
                <Route element={<Layout />}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/patients" element={<Patients />} />
                  <Route path="/patients/new" element={<PatientCreate />} />
                  <Route path="/patients/:id" element={<PatientDetail />} />
                  <Route
                    path="/patients/:id/documents"
                    element={<Documents />}
                  />
                  <Route path="/appointments" element={<Appointments />} />
                  <Route
                    path="/appointments/new"
                    element={<AppointmentCreate />}
                  />
                  <Route
                    path="/appointments/:id"
                    element={<AppointmentDetail />}
                  />
                  <Route path="/billing" element={<Billing />} />
                  <Route path="/billing/new" element={<InvoiceCreate />} />
                  <Route path="/invoices/:id" element={<InvoiceDetail />} />
                  <Route path="/notifications" element={<Notifications />} />

                  <Route path="/admin" element={<Administration />} />
                  <Route
                    path="/admin/manage"
                    element={<FacilityManagement />}
                  />

                  <Route path="/exchange" element={<DataExchange />} />
                  <Route
                    path="/notification-settings"
                    element={<NotificationSettings />}
                  />
                  <Route
                    path="/patients/:id/history"
                    element={<PatientGovernance />}
                  />
                  <Route path="/audit" element={<AuditPage />} />
                  {[
                    "/medical-records",
                    "/medical-records/:id",
                    "/prescriptions",
                    "/lab-results",
                    "/claims",
                    "/clinical-ai",
                  ].map((path) => (
                    <Route key={path} path={path} element={<Unavailable />} />
                  ))}
                </Route>
              </Route>
              <Route
                path="*"
                element={
                  <Empty
                    title="Page not found"
                    description="This route does not exist."
                    action={
                      <a href="/dashboard" className="button primary">
                        Return to workspace
                      </a>
                    }
                  />
                }
              />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
