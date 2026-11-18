import { createEvent, pruneOld } from "@/lib/game";
import { readBodyLimited } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { err, json } from "@/lib/json";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    if (!rateLimit(`event:${ip}`, 3, 60_000)) return err("Слишком много событий", 429);
    await pruneOld();
    const body = (await readBodyLimited(req, 4_096).catch(() => ({}))) as {
      companyName?: string;
    };
    const ev = await createEvent(body.companyName || "");
    return json({
      id: ev.id,
      hostToken: ev.hostToken,
      guestAccessToken: ev.guestAccessToken,
      screenToken: ev.screenToken,
      joinPath: `/join/${ev.id}?k=${ev.guestAccessToken}`,
      hostPath: `/host/${ev.id}`,
      screenPath: `/screen/${ev.id}#s=${ev.screenToken}`,
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Ошибка", 500);
  }
}
