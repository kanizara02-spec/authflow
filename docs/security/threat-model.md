# AuthFlow Threat Model

AuthFlow is designed using industry security principles and defensive
controls, but no authentication system can guarantee absolute security.
This document analyzes the threats we considered and how each is mitigated
in the current implementation.

For each threat: **Attack scenario → Impact → Mitigation**.

---

## Credential stuffing

**Attack scenario:** Attacker uses leaked email/password pairs from other
breaches against AuthFlow's login endpoint at scale.
**Impact:** Account takeover for users who reuse passwords.
**Mitigation:** Per-endpoint login rate limiting (5 attempts / 15 min, keyed
by IP+email — `middleware/rateLimit.ts`), Argon2id hashing makes offline
verification infeasible even if the DB leaks, and 2FA (when enabled) stops
takeover even with a correct password. Common-password rejection
(`packages/shared/passwordPolicy.ts`) reduces the pool of guessable
passwords.

## Brute force (single account)

**Attack scenario:** Repeated password or TOTP guesses against one account.
**Impact:** Account takeover.
**Mitigation:** Progressive rate limiting on login (5/15min) and TOTP
verification (5/5min) — see spec #21: we deliberately avoid **permanent**
lockout, since an attacker could otherwise weaponize lockout to deny
service to a legitimate user by repeatedly failing their login.

## Phishing

**Attack scenario:** Attacker tricks the user into entering credentials on
a fake AuthFlow page.
**Impact:** Password (and possibly a single TOTP code) compromise.
**Mitigation:** TOTP codes are single-use and expire in ~30-90s, limiting
the phisher's window. Recovery codes and passwords are never requested
together with a TOTP code in emails. New-device/new-IP logins trigger a
`SUSPICIOUS_LOGIN` audit event and email notification, so the legitimate
user is alerted even if the phish succeeds. (Full phishing resistance
requires WebAuthn/FIDO2, noted under Future Improvements in the README.)

## Session / token theft (XSS, device theft)

**Attack scenario:** Malicious script or physical device access reads the
access/refresh token and replays it.
**Impact:** Session hijacking.
**Mitigation:** Both tokens are `HttpOnly` cookies — never in
`localStorage`/`sessionStorage` — so JS (including injected XSS payloads)
cannot read them. `Secure` + `SameSite=Lax` in production. Sessions are
listed and independently revocable (`/security/sessions`), with device
metadata shown so a stolen-device session is identifiable and revocable.

## TOTP secret theft

**Attack scenario:** Database compromise exposes TOTP secrets.
**Impact:** Attacker can generate valid codes indefinitely.
**Mitigation:** Secrets are encrypted at rest with AES-256-GCM
(`packages/security/crypto.ts`); a DB-only leak does not yield usable
secrets without the separate `TOTP_ENCRYPTION_KEY` (kept in environment/
secret management, never in the DB or source).

## Recovery-code theft

**Attack scenario:** Database compromise exposes recovery codes.
**Impact:** Attacker could use codes to bypass 2FA.
**Mitigation:** Only Argon2id hashes of recovery codes are stored, never
plaintext — identical protection level to passwords. Each code is
single-use and consuming one triggers an audit event + notification.

## Account enumeration

**Attack scenario:** Attacker probes register/login/forgot-password
endpoints to learn which emails have accounts.
**Impact:** Enables targeted phishing/credential-stuffing and privacy
leakage.
**Mitigation:** Registration and forgot-password return identical generic
responses regardless of whether the email exists (`auth.service.ts`
`register`/`requestPasswordReset`). Login returns a generic
"Authentication failed" for both wrong-password and unknown-email cases.

## CSRF

**Attack scenario:** A malicious site triggers a state-changing request
using the victim's ambient session cookie.
**Impact:** Unauthorized actions performed as the victim.
**Mitigation:** Auth cookies use `SameSite=Lax`, which blocks the cookie
from being attached to cross-site POST/PUT/DELETE requests (the ones that
matter) while still allowing normal top-level navigation. Combined with a
strict CORS allow-list (never `*`) that rejects the malicious origin's
`fetch`/XHR calls outright, this is judged sufficient without a separate
CSRF token for this architecture — see `utils/cookies.ts` for the explicit
reasoning. If cookie-based auth were combined with a broader `SameSite=None`
requirement (e.g. true cross-site embedding) in the future, a CSRF token
would be added.

## XSS

**Attack scenario:** Attacker injects a script via an unsanitized input.
**Impact:** Could read page content, perform actions as the user.
**Mitigation:** React escapes rendered content by default (no
`dangerouslySetInnerHTML` anywhere in the codebase); a strict
`Content-Security-Policy` (`middleware/security.ts`) further restricts
script sources; and — critically — even a successful XSS cannot read the
auth tokens themselves, since they're `HttpOnly`.

## SQL injection

**Attack scenario:** Attacker injects SQL via a form field.
**Impact:** Data exfiltration or corruption.
**Mitigation:** All database access goes through Prisma's parameterized
query builder — no raw string concatenation into SQL anywhere in the
codebase (the one raw query, `SELECT 1` in the readiness check, takes no
user input).

## Replay attacks (TOTP)

**Attack scenario:** Attacker captures a valid TOTP code (e.g. via a
compromised network) and replays it before it expires.
**Impact:** Unauthorized 2FA verification.
**Mitigation:** `TotpCredential.lastUsedStep` tracks the most recently
accepted time-step per user; any code from that step or earlier is
rejected even if otherwise valid (`totp.service.ts` `verifyLoginTotp`).

## Refresh-token reuse

**Attack scenario:** An attacker who stole a refresh token uses it after
the legitimate user has already rotated past it (or vice versa).
**Impact:** Signal of token compromise.
**Mitigation:** Refresh tokens are single-use and chained into families
(`familyId`). Presenting an already-used or revoked token immediately
revokes the entire family and its session, and raises a
`REFRESH_TOKEN_REUSE_DETECTED` audit event + user notification
(`token.service.ts` `rotateRefreshToken`).

## Password-reset / account-recovery abuse

**Attack scenario:** Attacker requests password resets for a victim's
email to spam them, or races to use a reset token before the victim.
**Impact:** Harassment, or if successful, account takeover.
**Mitigation:** Reset tokens are cryptographically random, single-use,
short-lived (30 min), stored as Argon2id hashes, and rate-limited (5/hour
per IP+email). Resetting the password invalidates every existing session,
and both the reset request and completion raise audit events.
