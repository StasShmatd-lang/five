import { bearerToken, readBodyLimited } from "@/lib/auth";
import { getState } from "@/lib/game";
import { err, json } from "@/lib/json";
import { rateLimit, requestLimitKey } from "@/lib/rateLimit";

export const runtime = "nodejs";

type Role = "host" | "guest" | "screen";

export async function GET() {
  return err("Используйте POST /api/state", 405);
}

export async function POST(req: Request) {
  try {
    const body = (await readBodyLimited(req, 8_192)) as {
      eventId?: string;
      role?: string;
      guestId?: string;
    };
    const eventId = String(body.eventId || req.headers.get("x-event-id") || "").trim();
    const role = String(body.role || req.headers.get("x-event-role") || "guest") as Role;
    if (!eventId || !["host", "guest", "screen"].includes(role)) {
      return err("Некорректный запрос", 400);
    }

    const token = bearerToken(req);
    if (!token) return err("Нет токена", 401);

    const key = requestLimitKey(req, `state:${eventId}:${role}`, token);
    if (!rateLimit(key, 90, 60_000)) return err("Слишком часто", 429);

    const state = await getState(eventId, role, {
      hostToken: role === "host" ? token : undefined,
      screenToken: role === "screen" ? token : undefined,
      guestToken: role === "guest" ? token : undefined,
      guestId:
        role === "guest"
          ? String(body.guestId || req.headers.get("x-guest-id") || "").trim() || undefined
          : undefined,
    });
    return json(state);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ошибка";
    const status = msg.includes("доступ") || msg.includes("сессии") ? 401 : 400;
    return err(msg, status);
  }
}
