import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

/** Backend redirects here with ?access_token= after OIDC; persist token and hard-reload for a clean session. */
export function OAuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const t = params.get("access_token");
    if (!t) {
      navigate("/login", { replace: true });
      return;
    }
    localStorage.setItem("idp_token", t);
    window.location.replace("/");
  }, [params, navigate]);

  return (
    <div className="login__center">
      <p className="muted">Completing organization sign-in…</p>
    </div>
  );
}
