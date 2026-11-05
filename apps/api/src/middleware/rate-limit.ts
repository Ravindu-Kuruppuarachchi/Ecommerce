import type { Request, Response, RequestHandler } from "express";

/**
 * Fixed-window limiter, per IP unless a verified-account key is supplied. Enough for a single API
 * instance; move the counters to Redis before running more than one.
 */
export function rateLimit({ windowMs, max, keyGenerator }: { windowMs: number; max: number; keyGenerator?: (req: Request, res: Response) => string }): RequestHandler {
  const hits = new Map<string, { count: number; resetAt: number }>();

  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
  }, windowMs).unref();

  return (req, res, next) => {
    const key = keyGenerator ? keyGenerator(req, res) : req.ip ?? "unknown";
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count++;
    if (entry.count > max) {
      res.setHeader("Retry-After", Math.ceil((entry.resetAt - now) / 1000));
      return res.status(429).json({ error: "Too many requests, try again shortly" });
    }
    next();
  };
}
