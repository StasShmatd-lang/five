import { bearerToken, readBodyLimited } from "@/lib/auth";
import { hostAction } from "@/lib/game";
import { err, json } from "@/lib/json";
import { rateLimit, requestLimitKey } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await readBodyLimited(req, 2_500_000)) as {
      eventId?: string;
      action?: string;
      payload?: Record<string, unknown>;
    };
    const eventId = String(body.eventId || "").trim();
    const action = String(body.action || "").trim();
    if (!eventId || !action) return err("Некорректный запрос", 400);

    const token = bearerToken(req);
    if (!token) return err("Нет токена", 401);

    const key = requestLimitKey(req, `host:${eventId}`, token);
    if (!rateLimit(key, 60, 60_000)) return err("Слишком часто", 429);

    const state = await hostAction(eventId, token, action, body.payload || {});
    return json(state);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ошибка";
    const status = msg.includes("доступ") ? 401 : 400;
    return err(msg, status);
  }
}
