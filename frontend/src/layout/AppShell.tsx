import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ThemeToggle } from "../components/ThemeToggle";

export function AppShell() {
  const { user, logout } = useAuth();
  const roleLabel =
    user?.role === "viewer" ? (user?.is_sso ? "viewer · org SSO" : "viewer") : user?.role;

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar__left">
          <Link className="brand" to="/">
            Relay
          </Link>
          <span className="divider" aria-hidden />
          <nav className="top-nav" aria-label="Primary">
            <Link className="top-link" to="/">
              Hub
            </Link>
            <Link className="top-link" to="/explore">
              Explore
            </Link>
          </nav>
        </div>

        <div className="userbox">
          <ThemeToggle compact />
          <span className="muted meta">
            {user?.username} · {roleLabel}
          </span>
          <button type="button" className="btn ghost" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <main className="content content--wide">
        <Outlet />
      </main>
    </div>
  );
}
