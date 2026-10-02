import { Request, Response, NextFunction } from 'express';

interface CachedResponse {
  statusCode: number;
  body: any;
  timestamp: number;
}

const idempotencyStore = new Map<string, CachedResponse>();
const TTL_MS = 60 * 1000; // 60 seconds

export function idempotencyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const key = req.headers['idempotency-key'] as string;
  if (!key) {
    return next();
  }

  // Clean expired keys
  const now = Date.now();
  for (const [k, v] of idempotencyStore.entries()) {
    if (now - v.timestamp > TTL_MS) {
      idempotencyStore.delete(k);
    }
  }

  const cached = idempotencyStore.get(key);
  if (cached) {
    return res.status(cached.statusCode).json(cached.body);
  }

  // Intercept json send
  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      idempotencyStore.set(key, {
        statusCode: res.statusCode,
        body,
        timestamp: Date.now(),
      });
    }
    return originalJson(body);
  };

  next();
}
