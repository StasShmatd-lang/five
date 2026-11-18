import { bearerToken, readBodyLimited } from "@/lib/auth";
import { submitDrawing } from "@/lib/game";
import { err, json } from "@/lib/json";
import { rateLimit, requestLimitKey } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await readBodyLimited(req, 2_500_000)) as {
      eventId?: string;
      guestId?: string;
      drawingDataUrl?: string;
    };
    const eventId = String(body.eventId || "").trim();
    const guestId = String(body.guestId || req.headers.get("x-guest-id") || "").trim();
    const drawingDataUrl = String(body.drawingDataUrl || "");
    if (!eventId || !guestId || !drawingDataUrl) return err("Некорректный запрос", 400);

    const token = bearerToken(req);
    if (!token) return err("Нет токена", 401);

    const key = requestLimitKey(req, `draw:${eventId}`, token);
    if (!rateLimit(key, 12, 60_000)) return err("Слишком часто", 429);

    const state = await submitDrawing(eventId, token, guestId, drawingDataUrl);
    return json(state);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ошибка";
    const status = msg.includes("доступ") ? 401 : 400;
    return err(msg, status);
  }
}
