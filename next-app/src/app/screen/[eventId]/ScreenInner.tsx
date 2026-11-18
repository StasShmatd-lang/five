"use client";

import { use, useEffect, useMemo, useState } from "react";
import { BrandFooter } from "@/components/BrandFooter";
import { CollageGrid } from "@/components/CollageGrid";
import { HallQr } from "@/components/HallQr";
import { InkAtmosphere } from "@/components/InkAtmosphere";
import { useLinkBase } from "@/hooks/useLinkBase";
import { usePollState } from "@/hooks/usePollState";
import { readJson } from "@/lib/apiClient";
import type { DrawingTile, PublicState } from "@/lib/types";

export function ScreenInner({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params);
  const base = useLinkBase();
  const [screenToken, setScreenToken] = useState("");
  const [selected, setSelected] = useState<DrawingTile | null>(null);
  const [busy, setBusy] = useState(false);
  const [modError, setModError] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash || "";
    const m = /^#s=(.+)$/.exec(hash);
    const fromHash = m?.[1] ? decodeURIComponent(m[1]) : "";
    const fromStore = sessionStorage.getItem(`screenToken:${eventId}`) || "";
    const token = fromHash || fromStore;
    if (token) {
      sessionStorage.setItem(`screenToken:${eventId}`, token);
      setScreenToken(token);
      if (fromHash) {
        history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    }
  }, [eventId]);

  const auth = useMemo(
    () => (screenToken ? { eventId, role: "screen" as const, token: screenToken } : null),
    [eventId, screenToken],
  );
  const { state, setState, error } = usePollState(auth, Boolean(screenToken));
  const joinUrl = state?.joinPath ? `${base}${state.joinPath}` : "";

  useEffect(() => {
    if (!selected || !state) return;
    if (!state.drawings.some((d) => d.guestId === selected.guestId)) {
      setSelected(null);
    }
  }, [state, selected]);

  async function moderate(action: "eraseDrawing" | "banGuest") {
    if (!selected) return;
    setBusy(true);
    setModError(null);
    try {
      const res = await fetch("/api/screen", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${screenToken}`,
        },
        body: JSON.stringify({
          eventId,
          action,
          payload: { guestId: selected.guestId },
        }),
      });
      const data = await readJson<PublicState & { error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Ошибка");
      setState(data);
      setSelected(null);
    } catch (e) {
      setModError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  if (!screenToken) {
    return (
      <div className="shell-hall relative-z flex items-center justify-center">
        <p className="panel text-center text-xl">Откройте экран по ссылке ведущего (#s=…).</p>
      </div>
    );
  }

  return (
    <>
      <InkAtmosphere />
      <div className="shell-hall relative-z flex min-h-screen flex-col">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo.png" alt="Schmidt" className="brand-mark mb-3" />
            <p className="chip mb-3">{state?.companyName || "Синхронный рисунок"}</p>
            <h1 className="display max-w-4xl text-4xl leading-none md:text-6xl lg:text-7xl">
              {state?.theme || "Готовим тему…"}
            </h1>
          </div>
          <div className="flex flex-col items-end gap-3">
            {state?.phase === "drawing" && (
              <div
                className="anim-timer inline-block rounded-full border px-8 py-4"
                style={{ borderColor: "var(--hot)" }}
              >
                <span className="timer-big text-6xl md:text-8xl">{state.secondsLeft ?? "—"}</span>
              </div>
            )}
            {state?.phase === "lobby" && (
              <p className="display text-3xl" style={{ color: "var(--cyan)" }}>
                Сканируйте QR
              </p>
            )}
            {state?.phase === "collage" && (
              <p className="display text-3xl" style={{ color: "var(--acid)" }}>
                Коллаж
              </p>
            )}
            <p className="text-lg" style={{ color: "var(--mute)" }}>
              {state?.drawings.length ?? 0} / {state?.guestCount ?? 0} рисунков
            </p>
            {joinUrl && <HallQr url={joinUrl} large size={180} label="Войти с телефона" />}
          </div>
        </header>

        {state?.referencePhoto && state.phase !== "collage" && (
          <div className="mb-6 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={state.referencePhoto}
              alt="Референс"
              className="max-h-40 rounded-3xl border object-cover md:max-h-52"
              style={{ borderColor: "var(--line)" }}
            />
          </div>
        )}

        <div className="flex-1">
          {state?.phase === "lobby" && (
            <div className="flex h-full min-h-[30vh] flex-col items-center justify-center gap-8">
              <p
                className="display anim-rise text-center text-4xl md:text-6xl"
                style={{ color: "var(--mute)" }}
              >
                Присоединяйтесь с телефона
              </p>
              {joinUrl && (
                <div className="md:hidden">
                  <HallQr url={joinUrl} large size={200} />
                </div>
              )}
            </div>
          )}
          {(state?.phase === "drawing" || state?.phase === "collage") && (
            <>
              <p className="mb-3 text-sm" style={{ color: "var(--mute)" }}>
                Нажмите на рисунок, чтобы увидеть автора, стереть или забанить
              </p>
              <CollageGrid
                drawings={state.drawings}
                large
                selectable
                selectedId={selected?.guestId}
                onSelect={setSelected}
              />
            </>
          )}
          {state?.phase === "setup" && (
            <p className="text-center text-2xl" style={{ color: "var(--mute)" }}>
              Ведущий настраивает студию
            </p>
          )}
        </div>

        {(error || modError) && (
          <p className="mt-4 text-center" style={{ color: "var(--hot)" }}>
            {modError || error}
          </p>
        )}
        <BrandFooter compact />
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => !busy && setSelected(null)}
        >
          <div
            className="panel w-full max-w-md space-y-4 anim-rise"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>
              Автор на экране
            </p>
            <h2 className="display text-3xl">{selected.name}</h2>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selected.drawingDataUrl}
              alt={selected.name}
              className="max-h-56 w-full rounded-2xl object-contain"
              style={{ background: "var(--paper)" }}
            />
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="btn-acid flex-1"
                disabled={busy}
                onClick={() => moderate("eraseDrawing")}
              >
                Стереть рисунок
              </button>
              <button
                type="button"
                className="btn-hot flex-1"
                disabled={busy}
                onClick={() => moderate("banGuest")}
              >
                Забанить
              </button>
              <button
                type="button"
                className="btn-ghost w-full"
                disabled={busy}
                onClick={() => setSelected(null)}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
