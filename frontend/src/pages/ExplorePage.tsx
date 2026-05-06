import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiJson } from "../api/client";

type ClusterRow = { id: string; display_name: string };

type CatalogPayload = {
  environments: string[];
  clusters_by_environment: Record<string, ClusterRow[]>;
};

export function ExplorePage() {
  const [kafka, setKafka] = useState<CatalogPayload | null>(null);
  const [redis, setRedis] = useState<CatalogPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    Promise.all([
      apiJson<CatalogPayload>("/api/v1/catalog/kafka"),
      apiJson<CatalogPayload>("/api/v1/catalog/redis"),
    ])
      .then(([k, r]) => {
        if (!cancelled) {
          setKafka(k);
          setRedis(r);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load catalogs");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flow">
      <div className="flow__top">
        <Link className="link-back muted" to="/">
          ← Back to hub
        </Link>
        <div className="flow__hero">
          <div>
            <p className="pill">Read-only</p>
            <h1>Infrastructure explorer</h1>
            <p className="muted" style={{ margin: "8px 0 0", maxWidth: "72ch", lineHeight: 1.55 }}>
              Kafka and Redis catalogs exposed to the UI (bootstrap URLs and secrets stay on the server). Change actions live under{" "}
              <span className="kbd">Ops</span> for developer accounts.
            </p>
          </div>
        </div>
      </div>

      {error ? <div className="error">{error}</div> : null}

      <div className="explore-grid">
        <section className="panel explore-panel explore-panel--kafka">
          <h2 className="explore-panel__title">Kafka clusters</h2>
          {!kafka ? (
            <p className="muted">Loading…</p>
          ) : (
            kafka.environments.map((env) => (
              <div key={env} className="explore-env">
                <div className="explore-env__label">{env}</div>
                <ul className="explore-list">
                  {(kafka.clusters_by_environment[env] ?? []).length === 0 ? (
                    <li className="muted">No clusters configured</li>
                  ) : (
                    (kafka.clusters_by_environment[env] ?? []).map((c) => (
                      <li key={c.id}>
                        <span className="explore-id">{c.id}</span>
                        <span className="muted"> · {c.display_name}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            ))
          )}
        </section>

        <section className="panel explore-panel explore-panel--redis">
          <h2 className="explore-panel__title">Redis clusters</h2>
          {!redis ? (
            <p className="muted">Loading…</p>
          ) : (
            redis.environments.map((env) => (
              <div key={env} className="explore-env">
                <div className="explore-env__label">{env}</div>
                <ul className="explore-list">
                  {(redis.clusters_by_environment[env] ?? []).length === 0 ? (
                    <li className="muted">No clusters configured</li>
                  ) : (
                    (redis.clusters_by_environment[env] ?? []).map((c) => (
                      <li key={c.id}>
                        <span className="explore-id">{c.id}</span>
                        <span className="muted"> · {c.display_name}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
