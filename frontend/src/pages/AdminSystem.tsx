import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiJson } from "../api/client";

type IntegrationFlags = {
  kafka_configured: boolean;
  redis_configured: boolean;
  aws_region_set: boolean;
  sso_enabled: boolean;
  database_backend: string;
};

export function AdminSystemPage() {
  const [flags, setFlags] = useState<IntegrationFlags | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiJson<IntegrationFlags>("/api/v1/admin/integrations")
      .then((f) => {
        if (!cancelled) setFlags(f);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load status");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function pill(ok: boolean) {
    return ok ? <span className="tag tag--ok">yes</span> : <span className="tag tag--off">no</span>;
  }

  return (
    <div className="flow">
      <div className="flow__top">
        <Link className="link-back muted" to="/admin/overview">
          ← Overview
        </Link>
        <div className="flow__hero">
          <div>
            <p className="pill">Admin</p>
            <h1>Integrations</h1>
            <p className="muted" style={{ margin: "8px 0 0", maxWidth: "72ch", lineHeight: 1.55 }}>
              Quick signal for env-driven catalogs, AWS region for EC2 checks, database driver, and whether SSO env vars are wired.
            </p>
          </div>
        </div>
      </div>

      {error ? <div className="error">{error}</div> : null}

      {!flags ? (
        <p className="muted">Loading…</p>
      ) : (
        <ul className="panel integration-list">
          <li>
            <span>Kafka catalog configured</span>
            {pill(flags.kafka_configured)}
          </li>
          <li>
            <span>Redis catalog configured</span>
            {pill(flags.redis_configured)}
          </li>
          <li>
            <span>AWS region set</span>
            {pill(flags.aws_region_set)}
          </li>
          <li>
            <span>SSO enabled (issuer + client + domains)</span>
            {pill(flags.sso_enabled)}
          </li>
          <li>
            <span>Database backend</span>
            <span className="kbd">{flags.database_backend}</span>
          </li>
        </ul>
      )}
    </div>
  );
}
