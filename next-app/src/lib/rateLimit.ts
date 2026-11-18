import { tokenFingerprint } from "./auth";

type Bucket = { n: number; reset: number };
const g = globalThis as unknown as { __rate?: Map<string, Bucket> };
g.__rate ??= new Map();

export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  let b = g.__rate!.get(key);
  if (!b || now > b.reset) b = { n: 0, reset: now + windowMs };
  b.n += 1;
  g.__rate!.set(key, b);
  return b.n <= max;
}

export function clientIp(req: Request) {
  const xf = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const real = req.headers.get("x-real-ip")?.trim();
  return real || xf || "unknown";
}

export function requestLimitKey(req: Request, scope: string, secret?: string) {
  const ip = clientIp(req);
  if (secret) return `${scope}:tok:${tokenFingerprint(secret)}`;
  return `${scope}:ip:${ip}`;
}
