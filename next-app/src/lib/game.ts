import { customAlphabet } from "nanoid";
import { sql } from "./db";
import type { DrawingTile, EventData, Guest, Phase, PublicState } from "./types";

const nano = customAlphabet("abcdefghjkmnpqrstuvwxyz23456789", 10);
const secret = customAlphabet("abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789", 24);

const MAX_EVENTS = 80;
const MAX_AGE_MS = 36 * 60 * 60 * 1000;
const MAX_GUESTS = 100;
const PHOTO_MAX = 450_000;
const DRAW_MAX = 420_000;
const HEX = /^#([0-9a-fA-F]{6})$/;

type Row = { id: string; data: EventData };

async function load(id: string): Promise<EventData | null> {
  const rows = await sql<Row>("select id, data from events where id = $1", [id]);
  const row = rows[0];
  if (!row) return null;
  return typeof row.data === "string" ? (JSON.parse(row.data) as EventData) : row.data;
}

async function save(ev: EventData) {
  ev.updatedAt = Date.now();
  await sql(
    `insert into events (id, data, updated_at) values ($1, $2::jsonb, now())
     on conflict (id) do update set data = excluded.data, updated_at = now()`,
    [ev.id, JSON.stringify(ev)],
  );
}

export async function pruneOld() {
  const cutoff = Date.now() - MAX_AGE_MS;
  await sql(`delete from events where (data->>'createdAt')::bigint < $1`, [cutoff]).catch(
    () => undefined,
  );
  const rows = await sql<{ id: string }>(
    `select id from events order by updated_at desc offset $1`,
    [MAX_EVENTS],
  ).catch(() => [] as { id: string }[]);
  for (const row of rows) {
    await sql(`delete from events where id = $1`, [row.id]).catch(() => undefined);
  }
}

function assertHost(ev: EventData, token?: string) {
  if (!token || token !== ev.hostToken) throw new Error("Нет доступа ведущего");
}

function sanitizePhoto(photo?: string) {
  if (!photo) return undefined;
  if (!photo.startsWith("data:image/")) throw new Error("Неверный формат изображения");
  if (photo.length > PHOTO_MAX) throw new Error("Фото слишком большое");
  return photo;
}

function sanitizeDrawing(drawing?: string) {
  if (!drawing) throw new Error("Нет рисунка");
  if (!drawing.startsWith("data:image/")) throw new Error("Неверный формат рисунка");
  if (drawing.length > DRAW_MAX) throw new Error("Рисунок слишком большой");
  return drawing;
}

function sanitizeBrush(color?: string) {
  const c = String(color || "#FF2D6A").trim();
  if (!HEX.test(c)) throw new Error("Цвет кисти: формат #RRGGBB");
  return c.toUpperCase();
}

function maybeExpireRound(ev: EventData): boolean {
  if (ev.phase !== "drawing" || !ev.roundEndsAt) return false;
  if (Date.now() < ev.roundEndsAt) return false;
  ev.phase = "collage";
  ev.roundEndsAt = null;
  return true;
}

function secondsLeft(ev: EventData): number | null {
  if (ev.phase !== "drawing" || !ev.roundEndsAt) return null;
  return Math.max(0, Math.ceil((ev.roundEndsAt - Date.now()) / 1000));
}

function drawingsOf(ev: EventData): DrawingTile[] {
  return ev.guests
    .filter((g): g is Guest & { drawingDataUrl: string; submittedAt: number } =>
      Boolean(g.drawingDataUrl && g.submittedAt),
    )
    .map((g) => ({
      guestId: g.id,
      name: g.name,
      drawingDataUrl: g.drawingDataUrl,
      submittedAt: g.submittedAt,
    }))
    .sort((a, b) => a.submittedAt - b.submittedAt);
}

function toPublic(
  ev: EventData,
  role: "host" | "guest" | "screen",
  guest?: Guest,
): PublicState {
  const base: PublicState = {
    id: ev.id,
    companyName: ev.companyName,
    theme: ev.theme,
    referencePhoto: ev.referencePhoto,
    brushColor: ev.brushColor,
    phase: ev.phase,
    roundSeconds: ev.roundSeconds,
    secondsLeft: secondsLeft(ev),
    guestCount: ev.guests.length,
    drawings: drawingsOf(ev),
    role,
  };
  if (role === "host") {
    base.joinPath = `/join/${ev.id}?k=${ev.guestAccessToken}`;
    base.screenPath = `/screen/${ev.id}#s=${ev.screenToken}`;
    base.guestAccessToken = ev.guestAccessToken;
  }
  if (role === "guest" && guest) {
    base.me = {
      guestId: guest.id,
      name: guest.name,
      submitted: Boolean(guest.drawingDataUrl),
    };
  }
  return base;
}

export async function createEvent(companyName = ""): Promise<EventData> {
  const now = Date.now();
  const ev: EventData = {
    id: nano(),
    companyName: String(companyName || "").trim().slice(0, 80),
    theme: "",
    brushColor: "#FF2D6A",
    hostToken: secret(),
    guestAccessToken: secret(),
    screenToken: secret(),
    phase: "setup",
    roundEndsAt: null,
    roundSeconds: 30,
    guests: [],
    createdAt: now,
    updatedAt: now,
  };
  await save(ev);
  return ev;
}

export async function hostAction(
  eventId: string,
  hostToken: string,
  action: string,
  payload: Record<string, unknown> = {},
) {
  const ev = await load(eventId);
  if (!ev) throw new Error("Событие не найдено");
  assertHost(ev, hostToken);
  maybeExpireRound(ev);

  if (action === "setup") {
    if (ev.phase !== "setup" && ev.phase !== "lobby") {
      throw new Error("Настройка только до старта");
    }
    if (typeof payload.companyName === "string") {
      ev.companyName = payload.companyName.trim().slice(0, 80);
    }
    if (typeof payload.theme === "string") {
      ev.theme = payload.theme.trim().slice(0, 120);
    }
    if (typeof payload.roundSeconds === "number") {
      ev.roundSeconds = Math.min(60, Math.max(15, Math.round(payload.roundSeconds)));
    }
    if (typeof payload.brushColor === "string") {
      ev.brushColor = sanitizeBrush(payload.brushColor);
    }
    if ("referencePhoto" in payload) {
      const raw = payload.referencePhoto;
      if (raw == null || raw === "") ev.referencePhoto = undefined;
      else ev.referencePhoto = sanitizePhoto(String(raw));
    }
  } else if (action === "openLobby") {
    if (!ev.theme.trim()) throw new Error("Задайте тему рисунка");
    ev.phase = "lobby";
    ev.roundEndsAt = null;
  } else if (action === "startRound") {
    if (!ev.theme.trim()) throw new Error("Задайте тему рисунка");
    if (ev.phase === "setup") throw new Error("Сначала откройте лобби");
    for (const g of ev.guests) {
      delete g.drawingDataUrl;
      delete g.submittedAt;
    }
    ev.phase = "drawing";
    ev.roundEndsAt = Date.now() + ev.roundSeconds * 1000;
  } else if (action === "finish") {
    if (ev.phase !== "drawing" && ev.phase !== "collage") {
      throw new Error("Сначала запустите раунд");
    }
    ev.phase = "collage";
    ev.roundEndsAt = null;
  } else if (action === "resetLobby") {
    for (const g of ev.guests) {
      delete g.drawingDataUrl;
      delete g.submittedAt;
    }
    ev.phase = "lobby";
    ev.roundEndsAt = null;
  } else {
    throw new Error("Неизвестное действие");
  }

  await save(ev);
  return toPublic(ev, "host");
}

export async function joinGuest(eventId: string, accessToken: string, name: string) {
  const ev = await load(eventId);
  if (!ev) throw new Error("Событие не найдено");
  if (accessToken !== ev.guestAccessToken) throw new Error("Неверный ключ доступа");
  maybeExpireRound(ev);

  const clean = String(name || "").trim().slice(0, 40);
  if (clean.length < 1) throw new Error("Введите имя");
  if (ev.guests.length >= MAX_GUESTS) throw new Error("Зал заполнен");
  if (ev.phase === "collage") throw new Error("Раунд уже завершён");

  const guest: Guest = {
    id: nano(),
    name: clean,
    token: secret(),
  };
  ev.guests.push(guest);
  await save(ev);
  return {
    guestId: guest.id,
    guestToken: guest.token,
    state: toPublic(ev, "guest", guest),
  };
}

export async function submitDrawing(
  eventId: string,
  guestToken: string,
  guestId: string,
  drawingDataUrl: string,
) {
  const ev = await load(eventId);
  if (!ev) throw new Error("Событие не найдено");
  maybeExpireRound(ev);

  const guest = ev.guests.find((g) => g.id === guestId && g.token === guestToken);
  if (!guest) throw new Error("Нет доступа сессии");
  if (ev.phase !== "drawing") throw new Error("Сейчас нельзя отправить рисунок");
  if (ev.roundEndsAt && Date.now() > ev.roundEndsAt) {
    ev.phase = "collage";
    ev.roundEndsAt = null;
    await save(ev);
    throw new Error("Время вышло");
  }
  if (guest.drawingDataUrl) throw new Error("Рисунок уже отправлен");

  guest.drawingDataUrl = sanitizeDrawing(drawingDataUrl);
  guest.submittedAt = Date.now();
  await save(ev);
  return toPublic(ev, "guest", guest);
}

export async function getState(
  eventId: string,
  role: "host" | "guest" | "screen",
  tokens: {
    hostToken?: string;
    screenToken?: string;
    guestToken?: string;
    guestId?: string;
  },
) {
  const ev = await load(eventId);
  if (!ev) throw new Error("Событие не найдено");
  const changed = maybeExpireRound(ev);
  if (changed) await save(ev);

  if (role === "host") {
    assertHost(ev, tokens.hostToken);
    return toPublic(ev, "host");
  }
  if (role === "screen") {
    if (!tokens.screenToken || tokens.screenToken !== ev.screenToken) {
      throw new Error("Нет доступа экрана");
    }
    return toPublic(ev, "screen");
  }
  const guest = ev.guests.find(
    (g) => g.id === tokens.guestId && g.token === tokens.guestToken,
  );
  if (!guest) throw new Error("Нет доступа сессии");
  return toPublic(ev, "guest", guest);
}

export type { Phase };
