import { NavLink, Outlet, Link, useNavigate } from "react-router-dom";
import {
  Activity,
  Layers3,
  LayoutDashboard,
  Users,
  CalendarDays,
  FileHeart,
  CreditCard,
  Bell,
  ShieldCheck,
  Settings2,
  Sparkles,
  ChevronDown,
  LogOut,
  Menu,
  Building2,
  Plus,
  X,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "../auth/Auth";
import { ErrorState } from "./UI";
export function Logo() {
  return (
    <div className="brand">
      <span className="brand-mark">
        <Activity size={25} strokeWidth={2.5} />
      </span>
      <div>
        <strong>
          HCS<span> /</span>
        </strong>
        <small>Human Health Care System</small>
      </div>
    </div>
  );
}
export function Layout() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const roles = auth.facility?.roles ?? [];
  const has = (...values: string[]) => roles.some((r) => values.includes(r));
  const clinical = has("DOCTOR", "NURSE", "PATIENT", "LAB_TECHNICIAN");
  const links = [
    { to: "/dashboard", label: "Overview", icon: LayoutDashboard, show: true },
    {
      to: "/patients",
      label: "Patients",
      icon: Users,
      show: has("ADMIN", "DOCTOR", "NURSE", "PATIENT"),
    },
    {
      to: "/appointments",
      label: "Appointments",
      icon: CalendarDays,
      show: has("ADMIN", "DOCTOR", "NURSE", "PATIENT"),
    },
    {
      to: "/medical-records",
      label: "Medical records",
      icon: FileHeart,
      show: clinical,
    },
    {
      to: "/billing",
      label: "Billing & invoices",
      icon: CreditCard,
      show: has("BILLING_STAFF", "PATIENT"),
    },
    { to: "/notifications", label: "Notifications", icon: Bell, show: true },
  ];
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <Link
          to="/dashboard"
          className="brand-link"
          onClick={() => setOpen(false)}
        >
          <Logo />
        </Link>
        <button
          className="close-menu icon-button"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        >
          <X />
        </button>
        <div className="workspace-label">CARE WORKSPACE</div>
        <nav aria-label="Main navigation">
          {links
            .filter((l) => l.show)
            .map(({ to, label, icon: Icon }) => (
              <NavLink onClick={() => setOpen(false)} key={to} to={to}>
                <Icon size={19} />
                {label}
                {to === "/notifications" && <span className="nav-dot" />}
              </NavLink>
            ))}
        </nav>
        <div className="workspace-label second">GOVERNANCE</div>
        <nav aria-label="Governance navigation">
          {has("ADMIN", "SUPER_ADMIN") && (
            <NavLink to="/admin/manage" onClick={() => setOpen(false)}>
              <Building2 size={19} />
              Facility management
            </NavLink>
          )}
          {has("ADMIN") && (
            <NavLink to="/exchange" onClick={() => setOpen(false)}>
              <Layers3 size={19} />
              Imports & exports
            </NavLink>
          )}
          <NavLink to="/security" onClick={() => setOpen(false)}>
            <ShieldCheck size={19} />
            Account security
          </NavLink>
          <NavLink to="/notification-settings" onClick={() => setOpen(false)}>
            <Bell size={19} />
            Channel preferences
          </NavLink>
          {has("DOCTOR", "PATIENT") && (
            <NavLink to="/clinical-ai" onClick={() => setOpen(false)}>
              <Sparkles size={19} />
              Clinical support<span className="nav-tag">CDS</span>
            </NavLink>
          )}
          {has("SYSTEM_AUDITOR") && (
            <NavLink to="/audit" onClick={() => setOpen(false)}>
              <ShieldCheck size={19} />
              Audit trail
            </NavLink>
          )}
          <NavLink to="/admin" end onClick={() => setOpen(false)}>
            <Settings2 size={19} />
            {has("ADMIN", "SUPER_ADMIN")
              ? "Administration"
              : "Integration status"}
          </NavLink>
        </nav>
        <div className="sidebar-bottom">
          <div className="environment">
            <span className="env-dot" />
            <span>
              Development environment<small>Synthetic data only</small>
            </span>
          </div>
          <button className="user-card" onClick={() => navigate("/profile")}>
            <span className="avatar">
              {auth.user?.display_name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </span>
            <span>
              <strong>{auth.user?.display_name}</strong>
              <small>{roles[0]?.replaceAll("_", " ").toLowerCase()}</small>
            </span>
            <ChevronDown size={15} />
          </button>
        </div>
      </aside>
      {open && (
        <button
          className="menu-backdrop"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="workspace">
        <header className="topbar">
          <div className="facility-heading">
            <button
              className="mobile-menu icon-button"
              onClick={() => setOpen(true)}
              aria-label="Open navigation"
            >
              <Menu />
            </button>
            <Building2 size={18} />
            <label className="sr-only" htmlFor="facility">
              Active facility
            </label>
            <select
              id="facility"
              value={auth.facility?.id ?? ""}
              onChange={(e) => auth.switchFacility(e.target.value)}
            >
              {auth.user?.facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <span className="top-divider" />
            <span className="muted desktop-only">Care operations</span>
          </div>
          <div className="top-actions">
            <span className="date-label">
              {new Date().toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            <Link
              className="icon-button"
              to="/notifications"
              aria-label="Notifications"
            >
              <Bell size={19} />
            </Link>
            <button
              className="icon-button"
              aria-label="Sign out"
              onClick={() => auth.logout().catch(setError)}
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <div className="development-strip">
          <span className="strip-pill">DEVELOPMENT</span>Provider-independent
          workspace. No real patient data or clinical use.
          <Link to="/admin">
            View integration status <Plus size={12} />
          </Link>
        </div>
        <main id="main" tabIndex={-1}>
          {error != null && <ErrorState error={error} />}
          <Outlet />
        </main>
        <footer>
          <span>
            Human Health Care System <span className="footer-dot">·</span>{" "}
            Accountable care, connected.
          </span>
          <span>
            v0.1.0 <span className="footer-dot">·</span> Development build
          </span>
        </footer>
      </div>
    </div>
  );
}
