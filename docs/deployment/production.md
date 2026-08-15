# Production Deployment & Security Configuration Guide

This guide outlines the production deployment strategy, environment configuration requirements, database migrations, and security hardening for AuthFlow.

---

## 1. Environment Variable Requirements

Set `NODE_ENV=production` in production. The API application will refuse to start if placeholder secrets or insecure cookie configurations are detected in production mode.

| Variable | Description | Production Requirement |
| :--- | :--- | :--- |
| `NODE_ENV` | Environment mode | Must be set to `production` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://authflow_app:<PASSWORD>@<HOST>:5432/authflow?sslmode=require` |
| `REDIS_URL` | Redis instance connection URL | `redis://:<PASSWORD>@<REDIS_HOST>:6379` |
| `JWT_ACCESS_SECRET` | 64-byte random key for access tokens | Generated via `openssl rand -base64 48` |
| `JWT_REFRESH_SECRET` | 64-byte random key for refresh tokens | Generated via `openssl rand -base64 48` |
| `TOTP_ENCRYPTION_KEY` | 32-byte base64 AES key | Generated via `openssl rand -base64 32` |
| `COOKIE_SECURE` | Enforce HTTPS cookies | **Must be `true`** |
| `EMAIL_HOST` | Production SMTP hostname | Real transactional email provider (e.g. SendGrid, AWS SES) |
| `EMAIL_PORT` | SMTP port | `587` or `465` |
| `EMAIL_SECURE` | TLS requirement for SMTP | `true` |
| `EMAIL_USER` | SMTP username | Authenticated account credential |
| `EMAIL_PASSWORD` | SMTP password | Authenticated account password |

---

## 2. HTTPS & Reverse Proxy Setup

- **TLS Termination:** All incoming traffic must be routed through an HTTPS reverse proxy (e.g. NGINX, Cloudflare, Caddy) enforcing TLS 1.3 or 1.2 with HSTS (`Strict-Transport-Security`).
- **Secure Cookies:** `COOKIE_SECURE=true` ensures `access_token`, `refresh_token`, and device cookies are marked `HttpOnly; Secure; SameSite=Lax`.

---

## 3. Database Migration Strategy

Do not run `npx prisma migrate dev` in production environments. Execute deploy-only zero-downtime migrations during release pipelines:

```bash
# 1. Run migrations as DDL owner role (authflow_owner)
DATABASE_URL="postgresql://authflow_owner:OWNER_PASS@localhost:5432/authflow" \
npx prisma migrate deploy --schema apps/api/prisma/schema.prisma

# 2. Start API service using least-privilege runtime role (authflow_app)
DATABASE_URL="postgresql://authflow_app:APP_PASS@localhost:5432/authflow" \
npm run start -w apps/api
```

---

## 4. Multi-Instance Horizontal Scaling

- Rate limiting is backed by Redis (`rate-limit-redis`). Configure `REDIS_URL` across all API nodes to enforce progressive lockout rules globally.
- Session revocation and token blacklist state are synchronized across API instances via Redis.
