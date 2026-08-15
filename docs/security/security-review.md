# AuthFlow Final Security Review

Simulated professional review across the areas required by the project
spec. Format: **Severity — Issue — Impact — Fix/Status.**

| # | Area | Severity | Issue | Impact | Fix / Status |
|---|------|----------|-------|--------|---------------|
| 1 | Rate limiting store | **High** | Default `express-rate-limit` store is in-memory | In a multi-instance production deployment, limits reset per-instance, effectively multiplying the allowed attempt count | **Documented, not yet wired**: `rate-limit-redis` is a listed dependency and `config/redis.ts` provides a client; production deployments must pass a `RedisStore` into each limiter before scaling beyond one instance. Tracked as a pre-scale-out requirement in the README. |
| 2 | Security score placeholder logic | Medium | `computeSecurityScore`'s "Base account hygiene" component is a flat +10 rather than a computed signal | Score is slightly less meaningful than the spec's fully-itemized example | Acceptable for v1; documented as a follow-up to add a real hygiene signal (e.g. password age) rather than a constant. |
| 3 | Common-password list size | Medium | `packages/shared/passwordPolicy.ts` ships a small illustrative common-password set | Some genuinely common passwords could pass the check | **Status: open.** Production deployments should load a real top-10k/100k breach-derived list server-side (noted in the source comment). Not a gap in architecture, a gap in data. |
| 4 | CSRF strategy | Low | No dedicated CSRF token; relies on `SameSite=Lax` + strict CORS | If a future feature required `SameSite=None` (e.g. iframe embedding), the current protection would no longer suffice | Documented explicitly in the threat model as a decision with a stated trigger for revisiting it — not an oversight. |
| 5 | IP address storage | Low | Full IP addresses are stored (not truncated) on `Session`/`LoginAttempt`/`SecurityEvent` for abuse investigation | Slightly higher privacy footprint than a truncated/anonymized IP | Display layer already masks IPs (`maskIp`) before showing them in the UI; full IPs are retained only for backend abuse analysis. Document a data-retention policy before production launch. |
| 6 | Admin bootstrap | Low | The only way to create an `ADMIN` user is the seed script or a direct DB write | No self-service admin creation, which is intentional, but also no documented "promote a user" runbook | Add an internal-only promotion script or admin UI action as a follow-up; not required for the platform's core security guarantees. |
| 7 | Refresh-token store scaling | Low | `RefreshToken` rows accumulate indefinitely (rotated tokens are marked used, not deleted) | Table growth over time | Add a scheduled cleanup job for expired/used tokens older than N days — noted under Future Improvements. |

**Critical / High issues:** Item 1 is the only High-severity finding, and it
is a *deployment configuration* gap (wire the Redis store before running
more than one API instance), not a design flaw — the code path and
dependency already exist. No Critical issues were found: password storage,
TOTP secret storage, recovery-code storage, session revocation, refresh-
token reuse detection, admin RBAC enforcement, and secret redaction in logs
all passed review as implemented.

**Verified directly (not just reviewed):** the manual TOTP implementation
was executed against the official RFC 6238 Appendix B and RFC 4226
Appendix D test vectors during development — all vectors passed. See
`packages/security/src/totp.test.ts`.

## Additional areas reviewed (full §80 checklist coverage)

| # | Area | Severity | Finding | Status |
|---|------|----------|---------|--------|
| 8 | CORS | Pass | `corsMiddleware` reads `FRONTEND_URL`/`ALLOWED_ORIGINS` from environment and rejects any origin not on the allow-list; no `*` wildcard is used on any authenticated route. | Verified in `middleware/security.ts`. |
| 9 | CSRF | Pass (see #4) | Cookie-based auth with `SameSite=Lax` + strict CORS + `HttpOnly` cookies; state-changing requests cannot be triggered cross-site under this cookie policy. | Decision documented in threat model, not an oversight. |
| 10 | XSS | Pass | React escapes all rendered user input by default; no `dangerouslySetInnerHTML` is used anywhere in `apps/web` or `apps/demo-app`. User-supplied text (e.g. full name) is stored as-is and only ever rendered as text content. | Verified by code search; covered by an integration test asserting a `<script>` payload in `fullName` is stored inertly and never reflected unescaped. |
| 11 | SQL injection | Pass | All database access goes through Prisma's parameterized query builder in the repository layer; no raw SQL string concatenation exists except the fixed `SELECT 1` health check literal. | Verified by code search for `$queryRawUnsafe` (none found) and `$queryRaw` usage (health check only). |
| 12 | Authentication bypass attempts | Pass | Admin routes require `requireAuth` + `requireRole("ADMIN")` server-side (not just hidden client-side); 2FA-enabled accounts cannot reach `AUTHENTICATED` status via the password-only login branch — verified by the "2FA-gated login" and "Admin authorization" integration test suites. | Verified by test. |
| 13 | Dependency security | Pass | `npm audit --audit-level=high` runs as a blocking CI step in `.github/workflows/ci.yml` — a high/critical advisory now fails the pipeline instead of only being visible to someone who runs the command manually. | Fixed. Any future accepted-risk exception must be documented here, not silenced with `|| true`. |
| 14 | Docker security | Pass | `docker/api/Dockerfile` creates and runs as an unprivileged `authflow` user (not root) in the runtime stage; the web/demo-app images run under nginx's own unprivileged worker processes. Multi-stage builds keep build tooling out of the final image. | Verified by reading the Dockerfiles directly. |
| 15 | Logging hygiene | Pass | `pino-http` redacts `req.headers.cookie` and `req.headers.authorization`; audit/service code never logs passwords, TOTP codes, TOTP secrets, or recovery codes — verified by code search for logger calls near those variables. | Verified by code search. |
| 16 | Database credentials | Medium | `docker-compose.yml` uses a single `authflow` Postgres role for both migrations and the running API, rather than a separate least-privilege runtime role. | **Open**, acceptable for local/dev; documented as a pre-production requirement to create a runtime role without `CREATEDB`/`CREATEROLE` privileges. |

**Updated summary:** No Critical issues. One High (rate-limit store, #1,
deployment-config only — the code path and dependency exist, wiring it in
is a scale-out deployment step). Two Medium remain open (DB least-privilege
runtime role, common-password list size — both data/config gaps, not
architecture gaps). Dependency-audit gate (#13) is now fixed and blocking
in CI. All Critical/High items required by §80 before shipping to
production are either resolved or explicitly tracked with a concrete fix.
