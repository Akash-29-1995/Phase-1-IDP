import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { apiJson } from "../api/client";
import { Modal } from "../components/Modal";
import { IconEc2 } from "../components/icons";

type Env = "prod" | "nonprod";

export function EC2OpsPage() {
  const [env, setEnv] = useState<Env | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [serverIp, setServerIp] = useState("");
  const [accessLevel, setAccessLevel] = useState<"restricted_folder" | "elevated">("restricted_folder");
  const [sshPublicKey, setSshPublicKey] = useState("");
  const [durationHours, setDurationHours] = useState(4);
  const [reason, setReason] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);

  function openFor(selected: Env) {
    setEnv(selected);
    setModalOpen(true);
    setError(null);
    setResult(null);
  }

  function closeModal() {
    setModalOpen(false);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!env) return;
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const resp = await apiJson("/api/v1/access/ec2", {
        method: "POST",
        body: JSON.stringify({
          environment: env,
          server_ip: serverIp.trim(),
          access_level: accessLevel,
          ssh_public_key: sshPublicKey.trim() ? sshPublicKey.trim() : null,
          duration_hours: durationHours,
          reason: reason.trim() ? reason.trim() : null,
        }),
      });
      setResult(resp);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSubmitting(false);
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
            <IconEc2 size={46} />
          </div>
          <div>
            <h1>EC2 access</h1>
            <p className="muted">
              Choose an environment, then provide connection intent: IP, access posture, optional SSH public key paste, and audit metadata.
            </p>
          </div>
        </div>
      </div>

      <section className="panel">
        <h2>Select environment</h2>
        <p className="muted">This gates operational policy routing (prod vs nonprod) even before AWS checks run.</p>

        <div className="choice-grid">
          <button type="button" className="choice-tile" onClick={() => openFor("prod")}>
            <div className="choice-tile__title">Production</div>
            <div className="choice-tile__desc muted">Stricter posture — confirm IP + intent carefully.</div>
          </button>
          <button type="button" className="choice-tile" onClick={() => openFor("nonprod")}>
            <div className="choice-tile__title">Non‑production</div>
            <div className="choice-tile__desc muted">Lower blast radius environments.</div>
          </button>
        </div>
      </section>

      <Modal
        open={modalOpen}
        title={env ? `EC2 access (${env})` : "EC2 access"}
        onClose={closeModal}
      >
        <form className="form" onSubmit={onSubmit}>
          <div className="callout info">
            <div className="callout__title">Heads up</div>
            <div className="muted">
              This MVP records intent + attempts AWS resolution + SSM readiness hints. Full automated least-privilege grants and root-folder enforcement belong in the next hardening pass.
            </div>
          </div>

          <label className="field">
            <span>Server IP</span>
            <input value={serverIp} onChange={(e) => setServerIp(e.target.value)} placeholder="10.0.0.42" required />
          </label>

          <div className="field">
            <span>Access level</span>
            <div className="radio-grid">
              <label className="radio">
                <input
                  type="radio"
                  name="accessLevel"
                  checked={accessLevel === "restricted_folder"}
                  onChange={() => setAccessLevel("restricted_folder")}
                />
                <span>
                  <strong>Restricted</strong>
                  <span className="muted"> — prefer non-root workflows and scoped directories.</span>
                </span>
              </label>
              <label className="radio">
                <input
                  type="radio"
                  name="accessLevel"
                  checked={accessLevel === "elevated"}
                  onChange={() => setAccessLevel("elevated")}
                />
                <span>
                  <strong>Elevated</strong>
                  <span className="muted"> — higher risk; pair with approvals/runbooks in production.</span>
                </span>
              </label>
            </div>
          </div>

          <label className="field">
            <span>SSH public key (optional paste)</span>
            <textarea
              value={sshPublicKey}
              onChange={(e) => setSshPublicKey(e.target.value)}
              rows={5}
              placeholder="ssh-ed25519 AAAA... comment@machine"
            />
            <div className="muted small">
              Use this when your workflow needs key material captured for ticketing or downstream automation. Avoid pasting private keys.
            </div>
          </label>

          <div className="form-grid">
            <label className="field">
              <span>Duration (hours)</span>
              <input type="number" step="0.25" min={0.25} max={24} value={durationHours} onChange={(e) => setDurationHours(Number(e.target.value))} />
            </label>
            <label className="field">
              <span>Reason / ticket (optional)</span>
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="INC-12345 / change record" />
            </label>
          </div>

          {error ? <div className="error">{error}</div> : null}

          <div className="modal-actions">
            <button className="btn ghost" type="button" onClick={closeModal}>
              Cancel
            </button>
            <button className="btn primary" type="submit" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit access request"}
            </button>
          </div>
        </form>

        {result ? (
          <div className="callout success">
            <div className="callout__title">Server response</div>
            <pre className="json">{JSON.stringify(result, null, 2)}</pre>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
