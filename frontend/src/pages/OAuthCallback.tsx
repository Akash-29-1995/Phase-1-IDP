import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/** Backend redirects here with #access_token after OIDC; persist token and hard-reload for a clean session. */
export function OAuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
    const token = new URLSearchParams(hash).get("access_token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }
    localStorage.setItem("idp_token", token);
    // Clear token-bearing fragment from browser history address bar.
    window.history.replaceState(null, "", "/oauth/callback");
    window.location.replace("/");
  }, [navigate]);

  return (
    <div className="login__center">
      <p className="muted">Completing organization sign-in…</p>
    </div>
  );
}
