import express from "express";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import { securityHeaders, corsMiddleware } from "./middleware/security";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import authRoutes from "./routes/auth.routes";
import securityRoutes from "./routes/security.routes";
import adminRoutes from "./routes/admin.routes";
import { prisma } from "./config/prisma";
import { redis } from "./config/redis";
import { openApiDocument } from "./docs/openapi";

export function createApp() {
  const app = express();

  // Required for req.ip / req.secure to reflect the real client behind a
  // reverse proxy (nginx, ALB, etc.) rather than the proxy itself — set to
  // your actual proxy count in production (1 is typical for a single LB).
  app.set("trust proxy", env.NODE_ENV === "production" ? 1 : false);

  app.use(securityHeaders);
  app.use(corsMiddleware);
  app.use(express.json({ limit: "50kb" })); // small limit: no auth endpoint needs a large body
  app.use(cookieParser());
  app.use(
    pinoHttp({
      logger,
      redact: ["req.headers.cookie", "req.headers.authorization"],
      autoLogging: { ignore: (req) => req.url === "/health" },
    })
  );

  app.get("/", (_req, res) => {
    res.json({
      name: "AuthFlow Security API Platform",
      status: "ONLINE",
      webFrontend: env.FRONTEND_URL,
      swaggerDocs: `${env.API_URL}/docs`,
      healthCheck: `${env.API_URL}/health`,
    });
  });

  app.get("/health", async (_req, res) => {
    res.json({ status: "ok", uptime: process.uptime() });
  });

  app.get("/ready", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      const redisOk = redis ? (await redis.ping().catch(() => null)) === "PONG" : true;
      // Never expose connection strings, credentials, or internal hostnames —
      // just a boolean per dependency.
      res.json({ status: "ready", database: true, redis: redisOk });
    } catch {
      res.status(503).json({ status: "not_ready", database: false });
    }
  });

  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

  app.use("/api/auth", authRoutes);
  app.use("/api/security", securityRoutes);
  app.use("/api/admin", adminRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
