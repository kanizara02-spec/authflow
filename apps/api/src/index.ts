import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import { prisma } from "./config/prisma";

const app = createApp();

const server = app.listen(env.API_PORT, () => {
  logger.info(`AuthFlow API listening on port ${env.API_PORT} [${env.NODE_ENV}]`);
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
