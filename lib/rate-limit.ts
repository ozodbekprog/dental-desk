// Minimal in-memory rate limiter for a single-instance deployment.
// For a multi-instance setup, replace with Redis/Upstash.

type Bucket = { count: number; reset: number };
const buckets = new Map<string, Bucket>();

export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") || "local";
}

function prune(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, b] of buckets) if (b.reset <= now) buckets.delete(key);
}

export function hit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.reset <= now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    prune(now);
    return { ok: true, retryAfter: 0 };
  }
  if (bucket.count >= limit) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((bucket.reset - now) / 1000)) };
  }
  bucket.count += 1;
  return { ok: true, retryAfter: 0 };
}

export function clear(key: string) {
  buckets.delete(key);
}

export function tooMany(retryAfter: number): Response {
  return Response.json(
    {
      error: `Juda ko'p urinish. ${Math.ceil(retryAfter / 60)} daqiqadan keyin qayta urinib ko'ring.`,
    },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}
