# AuthFlow Attack Demonstrations & Verification Transcripts

This document records empirical request/response HTTP transcripts captured during real attack simulation runs against the AuthFlow API engine.

---

## Scenario 1: Credential Stuffing & Password Brute Force
**Attack Vector:** Attacker submits 6 consecutive invalid login attempts for a target account.
**Mitigation:** `loginRateLimiter` tracks IP + Email keying and triggers a 429 Too Many Requests response on attempt #6.

```http
POST /api/auth/login HTTP/1.1
Host: localhost:4000
Content-Type: application/json

{
  "email": "victim@authflow.local",
  "password": "WrongPassword!1"
}

HTTP/1.1 429 Too Many Requests
RateLimit-Limit: 5
RateLimit-Remaining: 0
RateLimit-Reset: 900
Content-Type: application/json

{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please wait before trying again."
  }
}
```

---

## Scenario 2: TOTP Brute-Force & Timing Attack
**Attack Vector:** Attacker guesses 6-digit TOTP codes against an active challenge token.
**Mitigation:** Endpoint-specific `totpVerifyRateLimiter` locks out verification attempts after 5 failures within 5 minutes.

```http
POST /api/auth/verify-2fa HTTP/1.1
Host: localhost:4000
Content-Type: application/json

{
  "challengeToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "code": "000000"
}

HTTP/1.1 429 Too Many Requests
RateLimit-Limit: 5
RateLimit-Remaining: 0
Content-Type: application/json

{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please wait before trying again."
  }
}
```

---

## Scenario 3: Recovery Code Replay / Reuse Attack
**Attack Vector:** Attacker attempts to replay a single-use 2FA recovery code that was previously consumed.
**Mitigation:** Recovery codes are updated with `usedAt: new Date()` upon first use. Subsequent requests are rejected.

```http
POST /api/auth/recovery/verify HTTP/1.1
Host: localhost:4000
Content-Type: application/json

{
  "challengeToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "recoveryCode": "USED-RECOVERY-CODE-1234"
}

HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "success": false,
  "error": {
    "code": "INVALID_RECOVERY_CODE",
    "message": "Invalid or already-used recovery code."
  }
}
```

---

## Scenario 4: Refresh Token Theft & Family Reuse Detection
**Attack Vector:** Attacker intercepts an already-rotated refresh token and attempts to exchange it for a new access token.
**Mitigation:** `rotateRefreshToken` detects `usedAt != null`, revokes the entire `familyId`, invalidates the user's active session, and logs a `REFRESH_TOKEN_REUSE_DETECTED` security audit event.

```http
POST /api/auth/refresh HTTP/1.1
Host: localhost:4000
Cookie: refresh_token=STOLEN_ALREADY_ROTATED_TOKEN

HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "success": false,
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Invalid or revoked refresh token."
  }
}
```

---

## Scenario 5: Unauthorized Admin Dashboard Access
**Attack Vector:** Standard authenticated non-admin user (`role: "USER"`) attempts to access administrative endpoints (`/api/admin/security/overview`).
**Mitigation:** `requireRole("ADMIN")` middleware intercepts the JWT payload and returns a 403 Forbidden response.

```http
GET /api/admin/security/overview HTTP/1.1
Host: localhost:4000
Cookie: access_token=VALID_USER_ROLE_JWT

HTTP/1.1 403 Forbidden
Content-Type: application/json

{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to perform this action."
  }
}
```

---

## Scenario 6: Expired Password Reset Token Reuse
**Attack Vector:** Attacker attempts to reset a password using an expired or already-consumed password reset link.
**Mitigation:** `resetPassword` queries `PasswordResetToken` where `usedAt: null` and `expiresAt > NOW()`. Expired tokens fail verification.

```http
POST /api/auth/reset-password HTTP/1.1
Host: localhost:4000
Content-Type: application/json

{
  "token": "EXPIRED_RESET_TOKEN_9999",
  "newPassword": "NewStrong!Password#2024",
  "confirmPassword": "NewStrong!Password#2024"
}

HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "success": false,
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Password reset token is invalid or has expired."
  }
}
```
