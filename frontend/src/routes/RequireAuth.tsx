import type { ReactElement } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function RequireAuth({ children }: { children: ReactElement }) {
  const { token, user, loading } = useAuth();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (loading || !user) {
    return <div className="muted">Loading session…</div>;
  }

  return children;
}

export function RequireAdmin({ children }: { children: ReactElement }) {
  const { user } = useAuth();
  if (user?.role !== "admin") {
    return <Navigate to="/" replace />;
  }
  return children;
}

export function RequireMutator({ children }: { children: ReactElement }) {
  const { user } = useAuth();
  if (user?.role === "viewer") {
    return <Navigate to="/explore" replace />;
  }
  return children;
}
