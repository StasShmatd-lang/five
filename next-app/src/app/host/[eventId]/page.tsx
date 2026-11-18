"use client";

import { use, useEffect, useMemo, useState } from "react";
import { BrandFooter } from "@/components/BrandFooter";
import { CollageGrid } from "@/components/CollageGrid";
import { HallQr } from "@/components/HallQr";
import { InkAtmosphere } from "@/components/InkAtmosphere";
import { useLinkBase } from "@/hooks/useLinkBase";
import { usePollState } from "@/hooks/usePollState";
import { readJson } from "@/lib/apiClient";
import { fileToDataUrl } from "@/lib/photo";
import type { PublicState } from "@/lib/types";

const BRUSH_PRESETS = ["#FF2D6A", "#2EE6D6", "#D4FF3A", "#1A1A1A", "#FF8A3D", "#6B5CFF"];

export default function HostPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params);
  const base = useLinkBase();
  const [hostToken, setHostToken] = useState("");
  useEffect(() => {
    setHostToken(sessionStorage.getItem(`hostToken:${eventId}`) || "");
  }, [eventId]);
  const auth = useMemo(
    () => (hostToken ? { eventId, role: "host" as const, token: hostToken } : null),
    [eventId, hostToken],
  );
  const { state, setState, error, setError } = usePollState(auth, Boolean(hostToken));

  const [theme, setTheme] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [brushColor, setBrushColor] = useState("#FF2D6A");
  const [roundSeconds, setRoundSeconds] = useState(30);
  const [referencePhoto, setReferencePhoto] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (!state || seeded) return;
    setTheme(state.theme || "");
    setCompanyName(state.companyName || "");
    setBrushColor(state.brushColor || "#FF2D6A");
    setRoundSeconds(state.roundSeconds || 30);
    setReferencePhoto(state.referencePhoto);
    setSeeded(true);
  }, [state, seeded]);

  async function host(action: string, payload: Record<string, unknown> = {}) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/host", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${hostToken}`,
        },
        body: JSON.stringify({ eventId, action, payload }),
      });
      const data = await readJson<PublicState & { error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Ошибка");
      setState(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  async function onPhoto(file: File | null) {
    if (!file) {
      setReferencePhoto(undefined);
      return;
    }
    try {
      setReferencePhoto(await fileToDataUrl(file, 640, 400_000));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Фото не загрузилось");
    }
  }

  const joinUrl = state?.joinPath ? `${base}${state.joinPath}` : "";
  const screenUrl = state?.screenPath ? `${base}${state.screenPath}` : "";

  if (!hostToken) {
    return (
      <div className="shell relative-z">
        <p className="panel text-center">Откройте студию с главной — токен ведущего в этой вкладке.</p>
        <BrandFooter />
      </div>
    );
  }

  return (
    <>
      <InkAtmosphere />
      <div className="shell-wide relative-z">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo.png" alt="Schmidt" className="brand-mark mb-4" />
            <h1 className="display text-3xl md:text-4xl">Пульт ведущего</h1>
            <p className="mt-2" style={{ color: "var(--mute)" }}>
              {state?.companyName || "Синхронный рисунок"} · фаза{" "}
              <span style={{ color: "var(--cyan)" }}>{state?.phase || "…"}</span>
            </p>
          </div>
          {state?.phase === "drawing" && (
            <div className="anim-timer rounded-full border px-6 py-3" style={{ borderColor: "var(--hot)" }}>
              <span className="timer-big text-4xl">{state.secondsLeft ?? "—"}</span>
              <span className="ml-2 text-sm" style={{ color: "var(--mute)" }}>
                сек
              </span>
            </div>
          )}
        </header>

        {(state?.phase === "setup" || state?.phase === "lobby") && (
          <section className="panel mb-6 space-y-4 anim-rise">
            <h2 className="display text-xl">Тема и бренд</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="label" htmlFor="theme">
                  Что рисуем
                </label>
                <input
                  id="theme"
                  className="field"
                  placeholder="Лого компании / ёлку / продукт"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  maxLength={120}
                />
              </div>
              <div>
                <label className="label" htmlFor="company">
                  Компания
                </label>
                <input
                  id="company"
                  className="field"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  maxLength={80}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="label">Цвет кисти бренда</label>
                <div className="mb-3 flex flex-wrap gap-2">
                  {BRUSH_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`Цвет ${c}`}
                      className="h-10 w-10 rounded-full border-2 transition"
                      style={{
                        background: c,
                        borderColor: brushColor === c ? "#fff" : "transparent",
                        transform: brushColor === c ? "scale(1.1)" : undefined,
                      }}
                      onClick={() => setBrushColor(c)}
                    />
                  ))}
                </div>
                <input
                  type="color"
                  className="h-12 w-full cursor-pointer rounded-xl border-0 bg-transparent"
                  value={brushColor}
                  onChange={(e) => setBrushColor(e.target.value.toUpperCase())}
                />
              </div>
              <div>
                <label className="label" htmlFor="sec">
                  Таймер (сек)
                </label>
                <input
                  id="sec"
                  type="number"
                  min={15}
                  max={60}
                  className="field"
                  value={roundSeconds}
                  onChange={(e) => setRoundSeconds(Number(e.target.value) || 30)}
                />
                <label className="label mt-4" htmlFor="ref">
                  Референс-фото (опционально)
                </label>
                <input
                  id="ref"
                  type="file"
                  accept="image/*"
                  className="field"
                  onChange={(e) => onPhoto(e.target.files?.[0] || null)}
                />
                {referencePhoto && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={referencePhoto}
                    alt="Референс"
                    className="mt-3 max-h-40 rounded-2xl object-cover"
                  />
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="btn-cyan"
                disabled={busy}
                onClick={() =>
                  host("setup", {
                    theme,
                    companyName,
                    brushColor,
                    roundSeconds,
                    referencePhoto: referencePhoto ?? "",
                  })
                }
              >
                Сохранить
              </button>
              {state?.phase === "setup" && (
                <button
                  type="button"
                  className="btn-hot"
                  disabled={busy}
                  onClick={async () => {
                    await host("setup", {
                      theme,
                      companyName,
                      brushColor,
                      roundSeconds,
                      referencePhoto: referencePhoto ?? "",
                    });
                    await host("openLobby");
                  }}
                >
                  Открыть лобби
                </button>
              )}
              {state?.phase === "lobby" && (
                <button type="button" className="btn-hot" disabled={busy} onClick={() => host("startRound")}>
                  Старт {state.roundSeconds} сек
                </button>
              )}
            </div>
          </section>
        )}

        {state && state.phase !== "setup" && (
          <section className="mb-6 grid gap-4 md:grid-cols-[1.2fr_1fr]">
            <div className="panel space-y-4">
              <h2 className="display text-xl">Тема: {state.theme || "—"}</h2>
              <p style={{ color: "var(--mute)" }}>
                Гостей в зале: <strong style={{ color: "var(--acid)" }}>{state.guestCount}</strong> ·
                рисунков: <strong style={{ color: "var(--cyan)" }}>{state.drawings.length}</strong>
              </p>
              {state.referencePhoto && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={state.referencePhoto}
                  alt="Референс"
                  className="max-h-48 rounded-2xl object-cover"
                />
              )}
              <div className="flex flex-wrap gap-3">
                {state.phase === "lobby" && (
                  <button type="button" className="btn-hot" disabled={busy} onClick={() => host("startRound")}>
                    Старт раунда
                  </button>
                )}
                {state.phase === "drawing" && (
                  <button type="button" className="btn-acid" disabled={busy} onClick={() => host("finish")}>
                    Показать коллаж
                  </button>
                )}
                {(state.phase === "collage" || state.phase === "drawing") && (
                  <button
                    type="button"
                    className="btn-ghost"
                    disabled={busy}
                    onClick={() => host("resetLobby")}
                  >
                    Ещё раунд
                  </button>
                )}
              </div>
            </div>
            <div className="panel space-y-4">
              <HallQr url={joinUrl} />
              {screenUrl && (
                <a className="btn-ghost w-full" href={screenUrl} target="_blank" rel="noreferrer">
                  Открыть экран зала
                </a>
              )}
            </div>
          </section>
        )}

        {state && (state.phase === "drawing" || state.phase === "collage") && (
          <section className="panel">
            <h2 className="display mb-4 text-xl">
              {state.phase === "collage" ? "Коллаж зала" : "Live-плитки"}
            </h2>
            <CollageGrid drawings={state.drawings} />
          </section>
        )}

        {(error || (!state && !error)) && (
          <p className="mt-4 text-center text-sm" style={{ color: error ? "var(--hot)" : "var(--mute)" }}>
            {error || "Загрузка…"}
          </p>
        )}
        <BrandFooter />
      </div>
    </>
  );
}
