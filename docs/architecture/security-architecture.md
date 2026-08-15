# AuthFlow Security Architecture

```
Browser (React SPA, HttpOnly cookies only — no tokens in localStorage)
        │  HTTPS, CORS allow-list, SameSite=Lax cookies
        ▼
API Layer (Express) ── helmet security headers, per-route rate limiting, Zod validation
        │
        ▼
Authentication Service (auth.service.ts) ── register/login/2FA state machine,
        │                                    password reset, account-enumeration-safe responses
        ▼
Security Policy Engine ── password policy (packages/shared), TOTP replay protection,
        │                  risk engine (risk.service.ts), rate limiters
        ▼
Session / Token Service (token.service.ts, session.service.ts) ── JWT access tokens,
        │                  refresh-token rotation + family reuse detection
        ▼
Database (PostgreSQL via Prisma) ── Argon2id password hashes, AES-256-GCM-encrypted
        │                            TOTP secrets, hashed recovery/reset/verification tokens
        ▼
Audit / Event System (audit.service.ts) ── SecurityEvent audit trail +
                                             SecurityNotification (in-app + email)
```

## Component responsibilities

**Browser / SPA.** Renders UI, calls the API with `withCredentials: true`
so HttpOnly cookies flow automatically. Holds no secrets itself — not the
access token, not the refresh token, not TOTP secrets. On a 401, the
Axios interceptor (`api/client.ts`) attempts one silent refresh before
giving up and routing to `/login`.

**API layer.** `app.ts` assembles: Helmet (CSP + standard hardening
headers) → CORS (explicit origin allow-list, credentials enabled) →
JSON body parsing (50kb limit) → cookie parsing → structured request
logging (pino, with cookie/authorization redaction) → routes → centralized
error handler (never leaks stack traces / SQL errors / internal paths).

**Authentication Service.** Implements the full state machine from
registration through login, keeping "password verified" and "fully
authenticated" as distinct states whenever 2FA is enabled (a temporary
challenge token, not a session, is issued after password-only
verification — see `token.service.ts` `issueChallengeToken`).

**Security Policy Engine.** Cross-cutting rules that apply regardless of
which flow triggered them: the centralized password policy
(`packages/shared/passwordPolicy.ts`, imported by both frontend and
backend so they can never drift), TOTP time-step replay protection, and
the deterministic risk engine that flags new-device/new-IP/high-failure
logins as `SUSPICIOUS_LOGIN` without claiming any ML sophistication it
doesn't have.

**Session / Token Service.** Two distinct credential types: short-lived
JWT access tokens (15 min default, stateless verification) and long-lived
refresh tokens (30 days default, stateful — hashed and stored, rotated on
every use, chained into families for reuse detection). A `Session` row is
the user-facing "device signed in" record; `RefreshToken` rows are the
rotating credential family backing it. Revoking a session revokes its
whole refresh-token family.

**Database.** PostgreSQL via Prisma, least-privilege application
credentials in production (not the Postgres superuser). Every secret-shaped
column is either a one-way hash (passwords, recovery codes, reset/
verification tokens — Argon2id or SHA-256 for high-entropy bearer tokens)
or authenticated-encrypted ciphertext (TOTP secrets — AES-256-GCM with key
versioning for future rotation). See `prisma/schema.prisma` for the full
model set and index rationale.

**Audit / Event System.** Every security-relevant action funnels through
`recordSecurityEvent()`, which writes an immutable `SecurityEvent` audit
row and — for event types that warrant it — creates an in-app
`SecurityNotification` and sends an email, in one place, so no event type
can accidentally skip notification. Audit metadata is sanitized to strip
anything secret-shaped before it's ever persisted.

## Design decisions worth calling out

- **Cookies, not localStorage, for tokens.** Eliminates the entire class of
  "XSS steals the token" attacks, at the cost of needing explicit CORS +
  SameSite reasoning (documented in the threat model).
- **Refresh-token families over simple rotation.** Simple rotation alone
  can't distinguish "legitimate client refreshed" from "attacker replayed
  a stolen token" once both have happened. Chaining tokens into a family
  and treating any reuse of an already-consumed token as a compromise
  signal closes that gap.
- **Challenge tokens, not partial sessions.** A user who has only verified
  their password never receives anything indistinguishable from a real
  session — the challenge token is a different JWT `typ`, short-lived (5
  min), and rejected by every endpoint except the 2FA/recovery-verify
  routes.
