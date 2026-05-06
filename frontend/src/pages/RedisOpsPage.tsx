import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiJson } from "../api/client";
import { IconRedis } from "../components/icons";

type Env = "prod" | "nonprod";

type ClusterOpt = { id: string; display_name: string };

type Catalog = {
  environments: Env[];
  clusters_by_environment: Record<string, ClusterOpt[]>;
};

export function RedisOpsPage() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [env, setEnv] = useState<Env | null>(null);
  const [clusterId, setClusterId] = useState<string | null>(null);
  const [key, setKey] = useState("");

  const [lookup, setLookup] = useState<unknown>(null);
  const [deleteResult, setDeleteResult] = useState<unknown>(null);

  useEffect(() => {
    apiJson<Catalog>("/api/v1/catalog/redis")
      .then(setCatalog)
      .catch((e) => setError(String(e.message ?? e)));
  }, []);

  const clusters = useMemo(() => {
    if (!catalog || !env) return [];
    return catalog.clusters_by_environment[env] ?? [];
  }, [catalog, env]);

  const lookupNow = useCallback(async () => {
    if (!env || !clusterId) return;
    setError(null);
    setLookup(null);
    try {
      const params = new URLSearchParams({ environment: env, cluster_id: clusterId, key });
      const resp = await apiJson(`/api/v1/redis/lookup?${params.toString()}`, { method: "GET" });
      setLookup(resp);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed");
    }
  }, [env, clusterId, key]);

  async function requestDelete() {
    if (!env || !clusterId) return;
    setError(null);
    setDeleteResult(null);
    try {
      const resp = await apiJson("/api/v1/redis/delete-requests", {
        method: "POST",
        body: JSON.stringify({ environment: env, cluster_id: clusterId, key }),
      });
      setDeleteResult(resp);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete request failed");
    }
  }

  return (
    <div className="flow">
      <div className="flow__top">
        <Link className="muted link-back" to="/">
          Back to hub
        </Link>
        <div className="flow__hero">
          <div className="flow__icon" aria-hidden>
            <IconRedis size={46} />
          </div>
          <div>
            <h1>Redis</h1>
            <p className="muted">Environment → cluster → key operations. Deletes require admin approval.</p>
          </div>
        </div>
      </div>

      <div className="stepper" aria-label="Progress">
        <div className={`stepper__item ${step >= 1 ? "active" : ""}`}>1. Environment</div>
        <div className={`stepper__item ${step >= 2 ? "active" : ""}`}>2. Cluster</div>
        <div className={`stepper__item ${step >= 3 ? "active" : ""}`}>3. Key</div>
      </div>

      {error ? <div className="error">{error}</div> : null}

      {step === 1 ? (
        <section className="panel">
          <h2>Select Redis environment</h2>
          <div className="choice-grid">
            <button
              type="button"
              className={`choice-tile ${env === "prod" ? "selected" : ""}`}
              onClick={() => {
                setEnv("prod");
                setClusterId(null);
                setStep(2);
              }}
            >
              <div className="choice-tile__title">Production</div>
              <div className="choice-tile__desc muted">Hotter caches — extra caution on deletes.</div>
            </button>
            <button
              type="button"
              className={`choice-tile ${env === "nonprod" ? "selected" : ""}`}
              onClick={() => {
                setEnv("nonprod");
                setClusterId(null);
                setStep(2);
              }}
            >
              <div className="choice-tile__title">Non‑production</div>
              <div className="choice-tile__desc muted">Dev/stage caches.</div>
            </button>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="panel">
          <div className="flow__row">
            <div>
              <h2>Select Redis cluster</h2>
              <p className="muted">
                Environment: <span className="kbd">{env}</span>
              </p>
            </div>
            <button type="button" className="btn ghost" onClick={() => setStep(1)}>
              Change environment
            </button>
          </div>

          {clusters.length === 0 ? (
            <div className="callout warn">
              No Redis clusters configured for this environment. Set <span className="kbd">REDIS_CLUSTERS_BY_ENV_JSON</span> on the backend.
            </div>
          ) : (
            <div className="cluster-grid">
              {clusters.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`cluster-tile ${clusterId === c.id ? "selected" : ""}`}
                  onClick={() => {
                    setClusterId(c.id);
                    setStep(3);
                  }}
                >
                  <div className="cluster-tile__title">{c.display_name}</div>
                  <div className="cluster-tile__meta muted">{c.id}</div>
                </button>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {step === 3 ? (
        <section className="panel">
          <div className="flow__row">
            <div>
              <h2>Key operations</h2>
              <p className="muted">
                <span className="kbd">{env}</span> / <span className="kbd">{clusterId}</span>
              </p>
            </div>
            <button type="button" className="btn ghost" onClick={() => setStep(2)}>
              Change cluster
            </button>
          </div>

          <div className="form">
            <label className="field">
              <span>Key</span>
              <input value={key} onChange={(e) => setKey(e.target.value)} required />
            </label>
            <div className="flow__row">
              <button className="btn primary" type="button" onClick={() => void lookupNow()}>
                Lookup
              </button>
              <button className="btn secondary" type="button" onClick={() => void requestDelete()}>
                Request delete (approval)
              </button>
            </div>
          </div>

          <div className="muted small">
            Tip: delete creates a pending approval item for admins — execution happens only after approval.
          </div>

          {lookup ? (
            <div className="callout info">
              <div className="callout__title">Lookup result</div>
              <pre className="json">{JSON.stringify(lookup, null, 2)}</pre>
            </div>
          ) : null}

          {deleteResult ? (
            <div className="callout success">
              <div className="callout__title">Delete request created</div>
              <pre className="json">{JSON.stringify(deleteResult, null, 2)}</pre>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
