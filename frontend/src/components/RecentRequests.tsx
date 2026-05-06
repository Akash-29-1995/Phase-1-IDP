import { useEffect, useState } from "react";
import { apiJson } from "../api/client";

type ServiceRequest = {
  id: number;
  request_type: string;
  status: string;
  payload_json: Record<string, unknown>;
  created_at: string;
};

export function RecentRequests() {
  const [items, setItems] = useState<ServiceRequest[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiJson<ServiceRequest[]>("/api/v1/approvals/mine?limit=12")
      .then(setItems)
      .catch((e) => setError(String(e.message ?? e)));
  }, []);

  return (
    <section className="recent">
      <div className="recent__header">
        <header className="hub__sectionHead">
          <h2 className="hub__sectionTitle">Recent activity</h2>
          <p className="hub__sectionLead muted">Latest requests created by your account.</p>
        </header>
      </div>

      {error ? <div className="error">{error}</div> : null}

      <div className="tablewrap">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Type</th>
              <th>Status</th>
              <th>Created</th>
              <th>Payload</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.request_type}</td>
                <td>{r.status}</td>
                <td className="nowrap">{new Date(r.created_at).toLocaleString()}</td>
                <td>
                  <pre className="json">{JSON.stringify(r.payload_json)}</pre>
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted">
                  No requests yet — pick a tool above.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
