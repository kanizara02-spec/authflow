import "dotenv/config";
import { z } from "zod";

function sanitizeUrl(defaultUrl: string) {
  return z.preprocess((val) => {
    if (typeof val !== "string" || !val.trim() || val.includes("<") || val.includes(">")) {
      return defaultUrl;
    }
    let url = val.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = `https://${url}`;
    }
    try {
      new URL(url);
      return url;
    } catch {
      return defaultUrl;
    }
  }, z.string().url());
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().optional(),
  API_PORT: z.coerce.number().default(4000),
  API_URL: sanitizeUrl("http://localhost:4000"),
  FRONTEND_URL: sanitizeUrl("http://localhost:5173"),
  DEMO_APP_URL: sanitizeUrl("http://localhost:5174"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().optional(),

  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  JWT_ISSUER: z.string().default("authflow"),
  JWT_AUDIENCE: z.string().default("authflow-clients"),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL: z.string().default("30d"),

  TOTP_ENCRYPTION_KEY: z.string().min(1, "TOTP_ENCRYPTION_KEY is required"),
  TOTP_ENCRYPTION_KEY_VERSION: z.coerce.number().default(1),

  EMAIL_HOST: z.string().default("localhost"),
  EMAIL_PORT: z.coerce.number().default(1025),
  EMAIL_SECURE: z.preprocess((val) => val === "true" || val === true, z.boolean()).default(false),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().default("AuthFlow Security <security@authflow.local>"),

  COOKIE_DOMAIN: z.string().default("localhost"),
  COOKIE_SECURE: z.preprocess(
    (val) => (val === undefined ? process.env.NODE_ENV === "production" : val === "true" || val === true),
    z.boolean()
  ).default(false),

  SEED_ADMIN_EMAIL: z.string().email().default("admin@authflow.local"),
  SEED_ADMIN_PASSWORD: z.string().default("ChangeMe!12345"),

  GOOGLE_CLIENT_ID: z.string().optional().default("mock-google-client-id"),
  GOOGLE_CLIENT_SECRET: z.string().optional().default("mock-google-client-secret"),
  GOOGLE_CALLBACK_URL: z.string().default("http://localhost:4000/api/auth/google/callback"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Intentionally fail fast and loudly at boot rather than run with an
  // insecure/undefined configuration.
  // eslint-disable-next-line no-console
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

if (env.NODE_ENV === "production") {
  if (env.JWT_ACCESS_SECRET.includes("replace-with") || env.JWT_REFRESH_SECRET.includes("replace-with")) {
    throw new Error("Refusing to start in production with placeholder JWT secrets.");
  }
  if (env.TOTP_ENCRYPTION_KEY.includes("replace-with")) {
    throw new Error("Refusing to start in production with a placeholder TOTP encryption key.");
  }
  env.COOKIE_SECURE = process.env.COOKIE_SECURE !== "false";
}
