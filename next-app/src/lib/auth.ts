import { createHash } from "node:crypto";

export function bearerToken(req: Request): string | undefined {
  const h = req.headers.get("authorization");
  if (!h) return undefined;
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m?.[1]?.trim() || undefined;
}

export function tokenFingerprint(token: string) {
  return createHash("sha256").update(token).digest("hex").slice(0, 20);
}

export async function readBodyLimited(req: Request, maxBytes: number): Promise<unknown> {
  const len = Number(req.headers.get("content-length") || 0);
  if (len > maxBytes) throw new Error("Слишком большой запрос");
  const text = await req.text();
  if (text.length > maxBytes) throw new Error("Слишком большой запрос");
  if (!text) return {};
  return JSON.parse(text) as unknown;
}
