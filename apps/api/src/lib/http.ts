import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { z, ZodTypeAny } from "zod/v3";

/** Throw from a handler to send a specific status and message. */
export class HttpError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

/** Forwards rejected promises to the error handler, which Express 4 doesn't do on its own. */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

/** Validates a request body; returns the schema's output type (after transforms and defaults). */
export function parseBody<S extends ZodTypeAny>(schema: S, body: unknown): z.output<S> {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new HttpError(400, "Invalid request", result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })));
  }
  return result.data;
}
