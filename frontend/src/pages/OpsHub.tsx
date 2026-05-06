import { Link } from "react-router-dom";
import { RecentRequests } from "../components/RecentRequests";
import {
  IconAudit,
  IconEc2,
  IconKafka,
  IconPulse,
  IconRedis,
  IconShield,
  IconUsers,
} from "../components/icons";
import { useAuth } from "../auth/AuthContext";

export function OpsHubPage() {
  const { user } = useAuth();
  const viewer = user?.role === "viewer";

  return (
    <div className="hub">
      <section className="hub__hero">
        <div className="hub__heroInner">
          <p className="pill">Dev ↔ Ops relay</p>
          <h1 className="hub__title">{viewer ? "Welcome — browse safely" : "What should we ship next?"}</h1>
          <p className="hub__subtitle muted">
            {viewer ? (
              <>
                Your organization SSO account is <span className="kbd">read-only</span>. Explore catalogs below; engineers sign in with local credentials for Kafka,
                EC2, and Redis actions.
              </>
            ) : (
              <>
                Self-service paths for builders, guardrails for production: pick Kafka, EC2, or Redis flows after choosing{" "}
                <span className="kbd">prod</span> vs <span className="kbd">nonprod</span>.
              </>
            )}
          </p>
        </div>
      </section>

      <section className="hub__grid" aria-label={viewer ? "Read-only entry points" : "Operations tools"}>
        {viewer ? (
          <Link className="hub-card hub-card--explore" to="/explore">
            <div className="hub-card__icon" aria-hidden>
              <IconPulse size={52} />
            </div>
            <div className="hub-card__body">
              <div className="hub-card__title">Infrastructure explorer</div>
              <div className="hub-card__desc muted">Kafka + Redis catalogs (no secrets), read-only.</div>
            </div>
            <div className="hub-card__cta">Open</div>
          </Link>
        ) : (
          <>
            <Link className="hub-card hub-card--kafka" to="/ops/kafka">
              <div className="hub-card__icon" aria-hidden>
                <IconKafka size={52} />
              </div>
              <div className="hub-card__body">
                <div className="hub-card__title">Kafka topics</div>
                <div className="hub-card__desc muted">Create topics after choosing environment + cluster.</div>
              </div>
              <div className="hub-card__cta">Open</div>
            </Link>

            <Link className="hub-card hub-card--ec2" to="/ops/ec2">
              <div className="hub-card__icon" aria-hidden>
                <IconEc2 size={52} />
              </div>
              <div className="hub-card__body">
                <div className="hub-card__title">EC2 access</div>
                <div className="hub-card__desc muted">
                  Resolve an instance by IP, choose access posture, optionally paste an SSH public key.
                </div>
              </div>
              <div className="hub-card__cta">Open</div>
            </Link>

            <Link className="hub-card hub-card--redis" to="/ops/redis">
              <div className="hub-card__icon" aria-hidden>
                <IconRedis size={52} />
              </div>
              <div className="hub-card__body">
                <div className="hub-card__title">Redis</div>
                <div className="hub-card__desc muted">Lookup keys; deletes go through approval.</div>
              </div>
              <div className="hub-card__cta">Open</div>
            </Link>

            <Link className="hub-card hub-card--explore" to="/explore">
              <div className="hub-card__icon" aria-hidden>
                <IconPulse size={52} />
              </div>
              <div className="hub-card__body">
                <div className="hub-card__title">Explorer</div>
                <div className="hub-card__desc muted">Browse Kafka / Redis catalogs without making changes.</div>
              </div>
              <div className="hub-card__cta">Open</div>
            </Link>
          </>
        )}
      </section>

      {user?.role === "admin" ? (
        <section className="hub__section hub__section--admin" aria-labelledby="hub-admin-heading">
          <header className="hub__sectionHead">
            <h2 id="hub-admin-heading" className="hub__sectionTitle">
              Administration
            </h2>
            <p className="hub__sectionLead muted">Directory, integrations, approvals, and audit trail.</p>
          </header>
          <div className="hub__grid hub__grid--admin">
            <Link className="hub-card hub-card--admin hub-card--accent" to="/admin/overview">
              <div className="hub-card__icon" aria-hidden>
                <IconPulse size={40} />
              </div>
              <div className="hub-card__body">
                <div className="hub-card__title">Overview</div>
                <div className="hub-card__desc muted">Counts, health snapshot, audit CSV export.</div>
              </div>
              <div className="hub-card__cta">Open</div>
            </Link>

            <Link className="hub-card hub-card--admin hub-card--accent" to="/admin/users">
              <div className="hub-card__icon" aria-hidden>
                <IconUsers size={40} />
              </div>
              <div className="hub-card__body">
                <div className="hub-card__title">Users</div>
                <div className="hub-card__desc muted">Directory of accounts and roles.</div>
              </div>
              <div className="hub-card__cta">Open</div>
            </Link>

            <Link className="hub-card hub-card--admin hub-card--accent" to="/admin/system">
              <div className="hub-card__icon" aria-hidden>
                <IconKafka size={40} />
              </div>
              <div className="hub-card__body">
                <div className="hub-card__title">Integrations</div>
                <div className="hub-card__desc muted">Kafka, Redis, AWS, SSO wiring signal.</div>
              </div>
              <div className="hub-card__cta">Open</div>
            </Link>

            <Link className="hub-card hub-card--admin" to="/admin/approvals">
              <div className="hub-card__icon" aria-hidden>
                <IconShield size={40} />
              </div>
              <div className="hub-card__body">
                <div className="hub-card__title">Approvals</div>
                <div className="hub-card__desc muted">Approve sensitive destructive actions.</div>
              </div>
              <div className="hub-card__cta">Open</div>
            </Link>

            <Link className="hub-card hub-card--admin" to="/admin/audit">
              <div className="hub-card__icon" aria-hidden>
                <IconAudit size={40} />
              </div>
              <div className="hub-card__body">
                <div className="hub-card__title">Audit log</div>
                <div className="hub-card__desc muted">Operational audit trail in the app.</div>
              </div>
              <div className="hub-card__cta">Open</div>
            </Link>
          </div>
        </section>
      ) : null}

      {!viewer ? <RecentRequests /> : null}
    </div>
  );
}
