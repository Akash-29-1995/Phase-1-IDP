import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiBlobDownload, apiJson } from "../api/client";

type Overview = {
  pending_approvals: number;
  users: number;
  audit_events: number;
  service_requests_total: number;
  approval_rows: number;
};

export function AdminOverviewPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiJson<Overview>("/api/v1/admin/overview")
      .then((o) => {
        if (!cancelled) setData(o);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load overview");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function exportAudit() {
    setBusy(true);
    setError(null);
    try {
      await apiBlobDownload("/api/v1/admin/audit/export", "relay-audit-export.csv");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flow">
      <div className="flow__top">
        <Link className="link-back muted" to="/">
          ← Back to hub
        </Link>
        <div className="flow__hero">
          <div>
            <p className="pill">Admin</p>
            <h1>Operations overview</h1>
            <p className="muted" style={{ margin: "8px 0 0", maxWidth: "72ch", lineHeight: 1.55 }}>
              Snapshot counts across requests, approvals, users, and audit volume. Export recent audit rows as CSV for offline analysis.
            </p>
          </div>
        </div>
      </div>

      {error ? <div className="error">{error}</div> : null}

      {!data ? (
        <p className="muted">Loading…</p>
      ) : (
        <div className="metric-grid">
          <div className="metric-card">
            <div className="metric-card__value">{data.pending_approvals}</div>
            <div className="metric-card__label">Pending approvals</div>
          </div>
          <div className="metric-card">
            <div className="metric-card__value">{data.users}</div>
            <div className="metric-card__label">Users</div>
          </div>
          <div className="metric-card">
            <div className="metric-card__value">{data.service_requests_total}</div>
            <div className="metric-card__label">Service requests</div>
          </div>
          <div className="metric-card">
            <div className="metric-card__value">{data.audit_events}</div>
            <div className="metric-card__label">Audit events</div>
          </div>
          <div className="metric-card">
            <div className="metric-card__value">{data.approval_rows}</div>
            <div className="metric-card__label">Approval rows</div>
          </div>
        </div>
      )}

      <div className="row-actions">
        <button type="button" className="btn primary" disabled={busy} onClick={() => void exportAudit()}>
          {busy ? "Preparing…" : "Download audit CSV (latest 5000)"}
        </button>
        <Link className="btn ghost" to="/admin/users">
          Manage users (directory)
        </Link>
        <Link className="btn ghost" to="/admin/system">
          Integration status
        </Link>
      </div>
    </div>
  );
}
