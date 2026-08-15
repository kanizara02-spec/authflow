# AuthFlow

**Secure authentication. Human-friendly recovery. Zero password-only trust.**

AuthFlow is a full-stack authentication platform: password auth with
Argon2id, RFC 6238 TOTP two-factor authentication, encrypted secrets at
rest, one-time recovery codes, refresh-token rotation with reuse
detection, per-session device management, a rule-based risk engine, a full
security audit trail, and an admin dashboard — plus a demo third-party
application that consumes it as an identity provider.

> ⚠️ **A note on how this was built:** this codebase was generated in a
> sandboxed environment with no network access, so it has not been
> `npm install`'d, migrated, or run end-to-end in that environment. The
> manual RFC 6238 TOTP implementation *was* independently executed there
> against the official RFC 6238/4226 test vectors and passed all of them
> (see `packages/security/src/totp.test.ts`). Everything else is complete,
> real source code — not stubs or mocked flows — but budget time for the
> normal first-run debugging any new codebase needs once you `npm install`
> it locally. See `docs/security/security-review.md` for known gaps.

## Overview

AuthFlow demonstrates that authentication is a *system*, not a library
call: the password check is the easy 5% of the problem. The other 95% is
what happens around it — how a partially-configured 2FA enrollment can't
leave an account half-protected, how a stolen refresh token gets detected
instead of silently accepted, how an admin can see that 2FA adoption is
low without ever being able to see a password hash.

## Why this project exists

To be able to say, and defend under questioning: *"I didn't just integrate
an OTP library. I designed an authentication system around password
security, TOTP, recovery, session management, rate limiting, auditability,
and threat modeling."*

## Features

See `docs/security/threat-model.md` and `docs/architecture/security-architecture.md`
for the full design rationale. In short:

- Registration with email verification, Argon2id password hashing, centralized password policy
- Login state machine that never conflates "password verified" with "fully authenticated" when 2FA is on
- TOTP 2FA: QR + manual-entry enrollment, RFC 6238 verification with clock-drift tolerance and replay protection, AES-256-GCM encrypted secrets at rest
- 10 one-time recovery codes, hashed at rest, regenerable with step-up verification
- Session management: list/revoke individual sessions or all-others, full device metadata
- Refresh-token rotation with family-based reuse detection
- Rule-based (not fake-ML) risk engine flagging new-device/new-IP/high-failure logins
- Full security audit log + in-app/email notifications
- Per-endpoint rate limiting (never one global limit) + progressive (non-permanent) lockout
- Admin dashboard with server-enforced RBAC, metadata-only (never secrets)
- Demo third-party app proving AuthFlow works as a platform, not a bolted-on login page

## Architecture

```
User → Frontend → Authentication API → Authentication Service →
Security Policy Engine → Session/Token Service → Database → Audit/Event System
```

Full breakdown: `docs/architecture/security-architecture.md`. ER model:
`apps/api/prisma/schema.prisma` (13 models — User, UserSecuritySettings,
TotpCredential, RecoveryCode, Session, RefreshToken, TrustedDevice,
SecurityEvent, SecurityNotification, PasswordResetToken,
EmailVerificationToken, LoginAttempt).

## Tech stack

- **Frontend:** React 18, Vite, TypeScript, React Router, Tailwind CSS, Axios
- **Backend:** Node.js, TypeScript, Express, Prisma, PostgreSQL, Redis
- **Auth:** Argon2id, JWT access tokens + rotating refresh tokens, RFC 6238 TOTP (manual implementation, RFC-vector-tested), AES-256-GCM
- **Testing:** Vitest, Supertest
- **DevOps:** Docker, Docker Compose, GitHub Actions

## TOTP explanation

`docs/security/totp.md` — the full RFC 6238 chain (secret → timestamp →
time-step → HMAC-SHA1 → dynamic truncation → 6-digit OTP), with pointers to
where each step lives in code.

## Security features & threat model

`docs/security/threat-model.md` (credential stuffing, brute force,
phishing, session/token theft, TOTP/recovery-code theft, account
enumeration, CSRF, XSS, SQLi, replay, refresh-token reuse, and account-
recovery abuse — each with attack scenario, impact, and mitigation) and
`docs/security/security-review.md` (final review report with no Critical
findings and one High finding, which is a deployment-configuration item,
not a design flaw).

## Running locally

### Fastest path: Docker Compose

```bash
cp .env.example .env
# Generate real secrets before anything else:
#   openssl rand -base64 48   → JWT_ACCESS_SECRET
#   openssl rand -base64 48   → JWT_REFRESH_SECRET
#   openssl rand -base64 32   → TOTP_ENCRYPTION_KEY
# paste them into .env

docker compose up --build
```

- Web app: http://localhost:5173
- Demo app (third-party integration): http://localhost:5174
- API: http://localhost:4000 (Swagger UI at http://localhost:4000/docs)
- MailHog (view verification/reset emails): http://localhost:8025

Then seed dev users:

```bash
docker compose exec api npm run prisma:seed -w apps/api
```

This creates `admin@authflow.local` / `ChangeMe!12345` (ADMIN) and
`demo@authflow.local` / `DemoUser!2024` (USER) — **change or delete these
before anything resembling production use.**

### Manual / non-Docker setup

```bash
npm install --workspaces --include-workspace-root
cp .env.example .env   # fill in secrets as above; point DATABASE_URL at your own Postgres

npm run build -w packages/security
npm run build -w packages/shared

npx prisma migrate dev --schema apps/api/prisma/schema.prisma
npm run prisma:seed -w apps/api

npm run dev:api    # http://localhost:4000
npm run dev:web    # http://localhost:5173
npm run dev:demo   # http://localhost:5174
```

## Environment variables

See `.env.example` for the full annotated list (database, Redis, JWT
secrets, TOTP encryption key, email/SMTP, cookie settings, seed admin
credentials). **Never commit a real `.env`.**

## Docker setup

`docker-compose.yml` orchestrates Postgres, Redis, MailHog, the API, the
web app (built and served via nginx), and the demo app. Each Dockerfile
(`docker/api`, `docker/web`, `docker/demo-app`) is a multi-stage build —
compile once, ship a minimal runtime image, non-root user, healthchecks.

## Testing

```bash
npm run test -w apps/api
```

Covers: registration (including weak-password rejection and no-enumeration
duplicate-email handling), login gating on email verification, TOTP
enrollment + activation, 2FA-gated login (proving no session cookie is set
until the second factor is verified), and refresh-token reuse detection
(proving that replaying a consumed refresh token kills the whole session).

The RFC 6238/4226 conformance tests in
`packages/security/src/totp.test.ts` were run standalone during
development (outside the full workspace install) and every vector passed.

## Security testing / attack demonstrations

Manual scenarios you can run against a live instance (see
`docs/security/security-review.md` and the threat model for expected
behavior): repeated wrong passwords → rate limited; repeated wrong TOTP →
rate limited; recovery code reuse → rejected; refresh token reuse → whole
family revoked; unauthenticated admin API access → 403; expired password
reset token → rejected.

## Deployment

Set `NODE_ENV=production`; the app refuses to boot with placeholder JWT/
TOTP secrets or `COOKIE_SECURE=false` in that mode (`config/env.ts`). Put a
real Redis-backed rate-limit store in front before running more than one
API instance (see the security review, item 1). Terminate TLS in front of
the API (or in the container) — `Strict-Transport-Security` is only sent
when `NODE_ENV=production`.

## Screenshots

Not included in this generated codebase — run the app locally (`docker
compose up`) to see the live UI; the frontend covers Landing, Register,
Login (+ 2FA + recovery-code steps), Verify Email, Forgot/Reset Password,
Dashboard, Security Dashboard, Sessions, Devices, Activity, Settings (2FA
setup wizard + management), and Admin.

## Future improvements

- WebAuthn/FIDO2 as a stronger, phishing-resistant second factor
- Wire `rate-limit-redis` into the limiters for multi-instance deployments
- Scheduled cleanup of expired/used refresh tokens and old audit rows
- A larger, real breach-derived common-password corpus
- Admin "promote to ADMIN" action instead of DB-only/seed-only

## Limitations

AuthFlow is designed using industry security principles and defensive
controls, but no authentication system can guarantee absolute security.
See `docs/security/security-review.md` for the specific, itemized gaps
identified in this version.

## Author

Generated end-to-end (backend, frontend, demo app, schema, docs, tests) as
a portfolio-grade reference implementation of a production-style
authentication platform.
