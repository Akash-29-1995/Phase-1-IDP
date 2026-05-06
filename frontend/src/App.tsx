import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./layout/AppShell";
import { AdminOverviewPage } from "./pages/AdminOverview";
import { AdminSystemPage } from "./pages/AdminSystem";
import { AdminUsersPage } from "./pages/AdminUsers";
import { ApprovalsPage } from "./pages/Approvals";
import { AuditPage } from "./pages/Audit";
import { EC2OpsPage } from "./pages/EC2OpsPage";
import { ExplorePage } from "./pages/ExplorePage";
import { KafkaOpsPage } from "./pages/KafkaOpsPage";
import { LoginPage } from "./pages/Login";
import { OAuthCallbackPage } from "./pages/OAuthCallback";
import { OpsHubPage } from "./pages/OpsHub";
import { RedisOpsPage } from "./pages/RedisOpsPage";
import { RequireAdmin, RequireAuth, RequireMutator } from "./routes/RequireAuth";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/oauth/callback" element={<OAuthCallbackPage />} />

      <Route
        path="/"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<OpsHubPage />} />
        <Route path="explore" element={<ExplorePage />} />

        <Route
          path="ops/kafka"
          element={
            <RequireMutator>
              <KafkaOpsPage />
            </RequireMutator>
          }
        />
        <Route
          path="ops/ec2"
          element={
            <RequireMutator>
              <EC2OpsPage />
            </RequireMutator>
          }
        />
        <Route
          path="ops/redis"
          element={
            <RequireMutator>
              <RedisOpsPage />
            </RequireMutator>
          }
        />

        <Route
          path="admin/overview"
          element={
            <RequireAdmin>
              <AdminOverviewPage />
            </RequireAdmin>
          }
        />
        <Route
          path="admin/users"
          element={
            <RequireAdmin>
              <AdminUsersPage />
            </RequireAdmin>
          }
        />
        <Route
          path="admin/system"
          element={
            <RequireAdmin>
              <AdminSystemPage />
            </RequireAdmin>
          }
        />
        <Route
          path="admin/approvals"
          element={
            <RequireAdmin>
              <ApprovalsPage />
            </RequireAdmin>
          }
        />
        <Route
          path="admin/audit"
          element={
            <RequireAdmin>
              <AuditPage />
            </RequireAdmin>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
