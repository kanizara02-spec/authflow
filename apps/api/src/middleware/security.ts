import helmet from "helmet";
import cors from "cors";
import { env } from "../config/env";

/**
 * Helmet sets a conservative default CSP plus the standard hardening
 * headers (X-Content-Type-Options, Referrer-Policy, frame protection via
 * X-Frame-Options/frame-ancestors, HSTS in production over HTTPS).
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"], // data: needed for inline QR code images
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
    },
  },
  crossOriginResourcePolicy: { policy: "same-site" },
  hsts: env.NODE_ENV === "production" ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
});

/**
 * Explicit origin allow-list from configuration — never `*` for an
 * authenticated API (spec #23). Credentials must be enabled so the
 * HttpOnly auth cookies are actually sent/received cross-origin between
 * the SPA (Vite dev server / static host) and the API.
 */
export const corsMiddleware = cors({
  origin: [env.FRONTEND_URL, env.DEMO_APP_URL],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
});
