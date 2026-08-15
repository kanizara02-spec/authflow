import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { Errors } from "../utils/errors";

/**
 * Validates { body, query, params } against a schema and replaces
 * req.body/query/params with the parsed (and coerced/trimmed) result.
 * Every route handler can therefore trust its input types — frontend
 * validation is a UX nicety only, this is the actual gate.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse({ body: req.body, query: req.query, params: req.params });
    if (!result.success) {
      return next(Errors.validation(result.error.flatten()));
    }
    const parsed = result.data as { body?: unknown; query?: unknown; params?: unknown };
    if (parsed.body !== undefined) req.body = parsed.body;
    if (parsed.params !== undefined) req.params = parsed.params as typeof req.params;
    next();
  };
}
