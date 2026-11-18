import { json } from "@/lib/json";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || url.host;
  return json({ base: `${proto}://${host}` });
}
