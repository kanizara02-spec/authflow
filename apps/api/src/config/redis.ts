import Redis from "ioredis";
import { env } from "./env";
import { logger } from "../utils/logger";

export const redis =
  env.REDIS_URL && env.NODE_ENV !== "test"
    ? new Redis(env.REDIS_URL, { maxRetriesPerRequest: 2, lazyConnect: true, enableOfflineQueue: false })
    : null;

if (redis) {
  redis.on("error", (err) => logger.warn({ err }, "Redis connection error (falling back to in-memory rate limiting)"));
}
