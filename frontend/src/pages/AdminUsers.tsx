import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { AuthUser } from "../auth/AuthContext";
import { apiJson } from "../api/client";

export function AdminUsersPage() {
  const [rows, setRows] = useState<AuthUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiJson<AuthUser[]>("/api/v1/admin/users")
      .then((list) => {
        if (!cancelled) setRows(list.map((u) => ({ ...u, is_sso: Boolean(u.is_sso) })));
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load users");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flow">
      <div className="flow__top">
        <Link className="link-back muted" to="/admin/overview">
          ← Overview
        </Link>
        <div className="flow__hero">
          <div>
            <p className="pill">Admin</p>
            <h1>Users</h1>
            <p className="muted" style={{ margin: "8px 0 0", maxWidth: "72ch", lineHeight: 1.55 }}>
              Directory view (roles are enforced server-side). SSO accounts appear as <span className="kbd">viewer</span>.
            </p>
          </div>
        </div>
      </div>

      {error ? <div className="error">{error}</div> : null}

      {!rows ? (
        <p className="muted">Loading…</p>
      ) : (
        <div className="table-wrap panel">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Role</th>
                <th>SSO</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>{u.username}</td>
                  <td>
                    <span className="kbd">{u.role}</span>
                  </td>
                  <td>{u.is_sso ? "yes" : "no"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
