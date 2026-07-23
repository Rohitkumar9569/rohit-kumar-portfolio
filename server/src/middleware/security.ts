import { NextFunction, Request, Response } from 'express';

type RateLimitOptions = {
  windowMs: number;
  max: number;
  message: string;
  keyPrefix: string;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();
const configuredMaxBuckets = Number(process.env.RATE_LIMIT_BUCKET_LIMIT || 20000);
const maxBuckets = Number.isFinite(configuredMaxBuckets) && configuredMaxBuckets > 0
  ? configuredMaxBuckets
  : 20000;

const cleanupExpiredBuckets = (now = Date.now()) => {
  for (const [bucketKey, value] of buckets.entries()) {
    if (value.resetAt <= now) buckets.delete(bucketKey);
  }
};

const trimOldestBuckets = () => {
  if (buckets.size <= maxBuckets) return;

  const sortedBuckets = [...buckets.entries()].sort(([, left], [, right]) => left.resetAt - right.resetAt);
  const deleteCount = Math.max(0, sortedBuckets.length - maxBuckets);
  sortedBuckets.slice(0, deleteCount).forEach(([bucketKey]) => buckets.delete(bucketKey));
};

const getClientKey = (req: Request) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  const forwardedIp = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : forwardedFor?.split(',')[0];

  return (forwardedIp || req.ip || req.socket.remoteAddress || 'unknown').trim();
};

export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  if (process.env.NODE_ENV === 'production' && (req.secure || forwardedProto === 'https')) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
};

export const createRateLimiter = ({ windowMs, max, message, keyPrefix }: RateLimitOptions) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = `${keyPrefix}:${getClientKey(req)}`;
    const bucket = buckets.get(key);
    const resetAt = bucket && bucket.resetAt > now ? bucket.resetAt : now + windowMs;

    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Reset', String(Math.ceil(resetAt / 1000)));

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      res.setHeader('RateLimit-Remaining', String(Math.max(0, max - 1)));

      if (buckets.size > maxBuckets) {
        cleanupExpiredBuckets(now);
        trimOldestBuckets();
      }

      return next();
    }

    if (bucket.count >= max) {
      const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSeconds));
      res.setHeader('RateLimit-Remaining', '0');
      return res.status(429).json({ message });
    }

    bucket.count += 1;
    res.setHeader('RateLimit-Remaining', String(Math.max(0, max - bucket.count)));

    if (Math.random() < 0.01) {
      cleanupExpiredBuckets(now);
    }

    next();
  };
};

export const apiLimiter = createRateLimiter({
  keyPrefix: 'api',
  windowMs: 60 * 1000,
  max: 300,
  message: 'Too many requests. Please slow down and try again shortly.',
});

export const authLimiter = createRateLimiter({
  keyPrefix: 'auth',
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many authentication attempts. Please try again later.',
});

export const contactLimiter = createRateLimiter({
  keyPrefix: 'contact',
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many contact submissions. Please try again later.',
});

export const chatLimiter = createRateLimiter({
  keyPrefix: 'chat',
  windowMs: 60 * 1000,
  max: 12,
  message: 'Too many AI chat requests. Please wait a moment and try again.',
});

export const pdfProxyLimiter = createRateLimiter({
  keyPrefix: 'pdf-proxy',
  windowMs: 60 * 1000,
  max: 30,
  message: 'Too many PDF requests. Please wait a moment and try again.',
});