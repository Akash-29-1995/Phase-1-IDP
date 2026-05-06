import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiJson } from "../api/client";

type AuditRow = {
  id: number;
  actor_user_id: number | null;
  action: string;
  resource_type: string;
  resource_id: string;
  status: string;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
};

export function AuditPage() {
  const [items, setItems] = useState<AuditRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const rows = await apiJson<AuditRow[]>("/api/v1/audit/logs?limit=250");
      setItems(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load audit logs");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="stack">
      <Link className="muted link-back" to="/">
        Back to hub
      </Link>
      <div className="row spread">
        <div>
          <h1>Audit log</h1>
          <p className="muted">Append-only operational audit trail for Relay workflows.</p>
        </div>
        <button className="btn secondary" type="button" onClick={() => void load()}>
          Refresh
        </button>
      </div>

      {error ? <div className="error">{error}</div> : null}

      <div className="tablewrap">
        <table className="table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Resource</th>
              <th>Status</th>
              <th>Metadata</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id}>
                <td className="nowrap">{new Date(r.created_at).toLocaleString()}</td>
                <td>{r.actor_user_id ?? "-"}</td>
                <td>{r.action}</td>
                <td>
                  <span className="muted">{r.resource_type}</span> {r.resource_id}
                </td>
                <td>{r.status}</td>
                <td>
                  <pre className="json">{JSON.stringify(r.metadata_json ?? {})}</pre>
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted">
                  No audit rows yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
