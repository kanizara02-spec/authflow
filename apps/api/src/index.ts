// AuthFlow Production API Engine
import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import { prisma } from "./config/prisma";

const app = createApp();
const port = env.PORT || env.API_PORT;

const server = app.listen(port, "0.0.0.0", () => {
  logger.info(`AuthFlow API listening on port ${port} [${env.NODE_ENV}]`);
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_ID !== "mock-google-client-id") {
    logger.info(`Google OAuth configured with Client ID: ${env.GOOGLE_CLIENT_ID.substring(0, 15)}...`);
  }
});

async function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down gracefully`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  // Force-exit if graceful shutdown hangs.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception detected");
});

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled rejection detected");
});
