import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiJson } from "../api/client";
import { IconKafka } from "../components/icons";

type Env = "prod" | "nonprod";

type ClusterOpt = { id: string; display_name: string };

type Catalog = {
  environments: Env[];
  clusters_by_environment: Record<string, ClusterOpt[]>;
};

export function KafkaOpsPage() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [env, setEnv] = useState<Env | null>(null);
  const [clusterId, setClusterId] = useState<string | null>(null);

  const [topicName, setTopicName] = useState("");
  const [partitions, setPartitions] = useState(3);
  const [replicationFactor, setReplicationFactor] = useState(3);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<unknown>(null);

  useEffect(() => {
    apiJson<Catalog>("/api/v1/catalog/kafka")
      .then(setCatalog)
      .catch((e) => setError(String(e.message ?? e)));
  }, []);

  const clusters = useMemo(() => {
    if (!catalog || !env) return [];
    return catalog.clusters_by_environment[env] ?? [];
  }, [catalog, env]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!env || !clusterId) return;
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const resp = await apiJson("/api/v1/kafka/topics", {
        method: "POST",
        body: JSON.stringify({
          environment: env,
          cluster_id: clusterId,
          topic_name: topicName,
          partitions,
          replication_factor: replicationFactor,
        }),
      });
      setResult(resp);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create topic failed");
    } finally {
      setSubmitting(false);
    }
  }

  function resetFlow() {
    setStep(1);
    setEnv(null);
    setClusterId(null);
    setResult(null);
    setError(null);
  }

  return (
    <div className="flow">
      <div className="flow__top">
        <Link className="muted link-back" to="/">
          Back to hub
        </Link>
        <div className="flow__hero">
          <div className="flow__icon" aria-hidden>
            <IconKafka size={46} />
          </div>
          <div>
            <h1>Kafka topic creation</h1>
            <p className="muted">Choose environment, pick a cluster, then submit topic parameters.</p>
          </div>
        </div>
      </div>

      <div className="stepper" aria-label="Progress">
        <div className={`stepper__item ${step >= 1 ? "active" : ""}`}>1. Environment</div>
        <div className={`stepper__item ${step >= 2 ? "active" : ""}`}>2. Cluster</div>
        <div className={`stepper__item ${step >= 3 ? "active" : ""}`}>3. Topic</div>
      </div>

      {error ? <div className="error">{error}</div> : null}

      {step === 1 ? (
        <section className="panel">
          <h2>Select Kafka environment</h2>
          <p className="muted">This mirrors how teams usually separate blast radius.</p>
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
              <div className="choice-tile__desc muted">Higher caution — validate naming/partitions carefully.</div>
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
              <div className="choice-tile__desc muted">Sandboxes, staging, dev Kafka endpoints.</div>
            </button>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="panel">
          <div className="flow__row">
            <div>
              <h2>Select Kafka cluster</h2>
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
              No clusters are configured for this environment yet. Set{" "}
              <span className="kbd">KAFKA_CLUSTERS_BY_ENV_JSON</span> on the backend (or legacy bootstrap maps as a fallback).
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
              <h2>Topic parameters</h2>
              <p className="muted">
                <span className="kbd">{env}</span> / <span className="kbd">{clusterId}</span>
              </p>
            </div>
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setStep(2);
                setResult(null);
              }}
            >
              Change cluster
            </button>
          </div>

          <form className="form" onSubmit={onSubmit}>
            <label className="field">
              <span>Topic name</span>
              <input value={topicName} onChange={(e) => setTopicName(e.target.value)} required />
            </label>
            <div className="form-grid">
              <label className="field">
                <span>Partitions</span>
                <input type="number" min={1} value={partitions} onChange={(e) => setPartitions(Number(e.target.value))} />
              </label>
              <label className="field">
                <span>Replication factor</span>
                <input
                  type="number"
                  min={1}
                  value={replicationFactor}
                  onChange={(e) => setReplicationFactor(Number(e.target.value))}
                />
              </label>
            </div>
            <div className="flow__row">
              <button className="btn primary" type="submit" disabled={submitting}>
                {submitting ? "Creating…" : "Create topic"}
              </button>
              <button type="button" className="btn secondary" onClick={resetFlow}>
                Start over
              </button>
            </div>
          </form>

          {result ? (
            <div className="callout info">
              <div className="callout__title">API response</div>
              <pre className="json">{JSON.stringify(result, null, 2)}</pre>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
