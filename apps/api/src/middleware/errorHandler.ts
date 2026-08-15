import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/errors";
import { logger } from "../utils/logger";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Route not found." } });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, path: req.path }, "Unhandled application error");
    }
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  // Anything else (DB errors, unexpected exceptions) is logged in full
  // server-side but never surfaced to the client — no stack traces, SQL
  // errors, or internal paths cross the API boundary.
  logger.error({ err, path: req.path }, "Unexpected error");
  res.status(500).json({
    success: false,
    error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." },
  });
}
