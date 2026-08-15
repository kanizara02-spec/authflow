# Architecture Diagrams

## 1. System architecture

```mermaid
flowchart TD
    U[User] --> FE[React SPA]
    FE -->|HttpOnly cookies, CORS allow-list| API[Express API]
    API --> AUTH[Authentication Service]
    AUTH --> POLICY[Security Policy Engine]
    POLICY --> TOKEN[Session / Token Service]
    TOKEN --> DB[(PostgreSQL via Prisma)]
    AUTH --> AUDIT[Audit / Event System]
    AUDIT --> DB
    AUDIT --> EMAIL[Email Service - MailHog / SMTP]
    DEMO[Demo Third-Party App] -->|GET /api/auth/me, same cookie| API
```

## 2. Registration flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as API
    participant DB as Database
    participant M as Email

    U->>FE: Fill registration form
    FE->>API: POST /auth/register
    API->>API: Validate password policy (Zod + shared policy)
    API->>DB: Check existing user (generic response either way)
    API->>DB: Argon2id hash + create User (PENDING_VERIFICATION)
    API->>DB: Create EmailVerificationToken (hashed, 24h TTL)
    API->>M: Send verification email
    API-->>FE: Generic success message
```

## 3. Login flow (with 2FA)

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as API
    participant DB as Database

    U->>FE: Email + password
    FE->>API: POST /auth/login
    API->>DB: Verify password (Argon2id)
    alt 2FA enabled
        API-->>FE: TOTP_REQUIRED + challengeToken (no session cookie set)
        U->>FE: 6-digit code
        FE->>API: POST /auth/verify-2fa
        API->>API: Verify TOTP (replay-protected)
        API->>DB: Create Session + RefreshToken family
        API-->>FE: Set-Cookie access_token, refresh_token
    else 2FA disabled
        API->>DB: Create Session + RefreshToken family
        API-->>FE: Set-Cookie access_token, refresh_token
    end
```

## 4. 2FA enrollment

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as API
    participant DB as Database

    FE->>API: POST /security/2fa/setup
    API->>API: Generate secret, encrypt (AES-256-GCM)
    API->>DB: Upsert TotpCredential (verified=false)
    API-->>FE: QR code + otpauth URI + manual key
    U->>FE: Enter first code from authenticator app
    FE->>API: POST /security/2fa/verify
    API->>API: Verify code against decrypted secret
    API->>DB: Set verified=true, twoFactorEnabled=true
    API->>DB: Generate + hash 10 recovery codes
    API-->>FE: Plaintext recovery codes (shown once)
```

## 5. Refresh-token rotation

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant API as API
    participant DB as Database

    FE->>API: POST /auth/refresh (refresh_token cookie)
    API->>DB: Look up token by hash
    alt Token already used or revoked
        API->>DB: Revoke entire family + session
        API-->>FE: 401 REFRESH_TOKEN_REUSE_DETECTED
    else Token valid and unused
        API->>DB: Mark used, issue successor in same family
        API-->>FE: New access_token + refresh_token cookies
    end
```

## 6. Account recovery (lost authenticator)

```mermaid
flowchart TD
    A[Can't access authenticator] --> B{Have a recovery code?}
    B -->|Yes| C[POST /auth/recovery/verify]
    C --> D[Code consumed, session created, notification sent]
    B -->|No| E[Contact support / manual identity verification]
    E --> F[Out of scope for self-service: documented trade-off]
```
