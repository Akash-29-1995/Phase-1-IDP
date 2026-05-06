import { FormEvent, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ThemeToggle } from "../components/ThemeToggle";

export function LoginPage() {
  const { token, login } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || "/";

  const [username, setUsername] = useState("developer");
  const [password, setPassword] = useState("dev123");
  const [error, setError] = useState<string | null>(null);
  const [ssoEnabled, setSsoEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.VITE_API_BASE ?? ""}/api/v1/auth/sso/status`)
      .then((r) => r.json() as Promise<{ enabled?: boolean }>)
      .then((j) => {
        if (!cancelled) setSsoEnabled(Boolean(j.enabled));
      })
      .catch(() => {
        if (!cancelled) setSsoEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (token) {
    return <Navigate to={from} replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await login(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  }

  function startSso() {
    const base = import.meta.env.VITE_API_BASE ?? "";
    window.location.assign(`${base}/api/v1/auth/oidc/login`);
  }

  return (
    <div className="login">
      <div className="login__toolbar">
        <ThemeToggle compact />
      </div>

      <div className="login__center">
        <div className="login-card">
          <p className="pill">Relay · internal</p>
          <h1 className="login-card__title">Sign in</h1>
          <p className="muted">One hub for developers and operators — guarded workflows behind auth.</p>

          {ssoEnabled ? (
            <div className="sso-block">
              <button type="button" className="btn primary sso-block__btn" onClick={startSso}>
                Continue with organization SSO
              </button>
              <p className="muted small sso-block__hint">
                Allowed email domains only · accounts are read-only in Relay.
              </p>
              <div className="sso-divider">
                <span>or local dev login</span>
              </div>
            </div>
          ) : null}

          <form className="form" onSubmit={onSubmit}>
            <label className="field">
              <span>Username</span>
              <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </label>
            {error ? <div className="error">{error}</div> : null}
            <button className="btn primary" type="submit">
              Continue
            </button>
          </form>

          <p className="muted small">
            Compose defaults: <span className="kbd">developer/dev123</span> and <span className="kbd">admin/admin123</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
