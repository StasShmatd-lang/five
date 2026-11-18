import { readBodyLimited } from "@/lib/auth";
import { joinGuest } from "@/lib/game";
import { err, json } from "@/lib/json";
import { clientIp, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await readBodyLimited(req, 8_192)) as {
      eventId?: string;
      accessToken?: string;
      name?: string;
    };
    const eventId = String(body.eventId || "").trim();
    const accessToken = String(body.accessToken || "").trim();
    const name = String(body.name || "").trim();
    if (!eventId || !accessToken) return err("Некорректный запрос", 400);

    const ip = clientIp(req);
    if (!rateLimit(`join:${ip}`, 20, 60_000)) return err("Слишком часто", 429);

    const result = await joinGuest(eventId, accessToken, name);
    return json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ошибка";
    const status = msg.includes("Неверный") ? 401 : 400;
    return err(msg, status);
  }
}
