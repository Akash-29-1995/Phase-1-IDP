import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiJson } from "../api/client";

type ServiceRequest = {
  id: number;
  request_type: string;
  status: string;
  payload_json: Record<string, unknown>;
  created_at: string;
};

export function ApprovalsPage() {
  const [items, setItems] = useState<ServiceRequest[]>([]);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...items].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [items],
  );

  async function refresh() {
    setError(null);
    try {
      const rows = await apiJson<ServiceRequest[]>("/api/v1/approvals/pending");
      setItems(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load pending approvals");
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function approve(id: number) {
    setError(null);
    try {
      await apiJson(`/api/v1/approvals/${id}/approve`, {
        method: "POST",
        body: JSON.stringify({ reason: reason || null }),
      });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approve failed");
    }
  }

  async function reject(id: number) {
    setError(null);
    try {
      await apiJson(`/api/v1/approvals/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: reason || null }),
      });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reject failed");
    }
  }

  function onSubmitRefresh(e: FormEvent) {
    e.preventDefault();
    void refresh();
  }

  return (
    <div className="stack">
      <Link className="muted link-back" to="/">
        Back to hub
      </Link>
      <div>
        <h1>Approvals</h1>
        <p className="muted">Approve or reject sensitive operational requests (Redis delete flow).</p>
      </div>

      <form className="row" onSubmit={onSubmitRefresh}>
        <label className="field inline">
          <span>Optional decision note</span>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ticket link / context" />
        </label>
        <button className="btn secondary" type="submit">
          Refresh
        </button>
      </form>

      {error ? <div className="error">{error}</div> : null}

      <div className="tablewrap">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Type</th>
              <th>Payload</th>
              <th>Created</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.request_type}</td>
                <td>
                  <pre className="json">{JSON.stringify(r.payload_json)}</pre>
                </td>
                <td>{new Date(r.created_at).toLocaleString()}</td>
                <td className="nowrap">
                  <button className="btn primary" type="button" onClick={() => void approve(r.id)}>
                    Approve
                  </button>{" "}
                  <button className="btn ghost" type="button" onClick={() => void reject(r.id)}>
                    Reject
                  </button>
                </td>
              </tr>
            ))}
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted">
                  No pending approvals.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
