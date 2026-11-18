"use client";

import { use, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BrandFooter } from "@/components/BrandFooter";
import { DrawCanvas } from "@/components/DrawCanvas";
import { InkAtmosphere } from "@/components/InkAtmosphere";
import { usePollState } from "@/hooks/usePollState";
import { readJson } from "@/lib/apiClient";
import type { PublicState } from "@/lib/types";

export function JoinInner({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params);
  const search = useSearchParams();
  const accessToken = search.get("k") || "";

  const [name, setName] = useState("");
  const [guestId, setGuestId] = useState(
    () => (typeof window !== "undefined" ? sessionStorage.getItem(`guestId:${eventId}`) || "" : ""),
  );
  const [guestToken, setGuestToken] = useState(
    () =>
      typeof window !== "undefined" ? sessionStorage.getItem(`guestToken:${eventId}`) || "" : "",
  );
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const auth = useMemo(
    () =>
      guestToken && guestId
        ? { eventId, role: "guest" as const, token: guestToken, guestId }
        : null,
    [eventId, guestToken, guestId],
  );
  const { state, setState, error } = usePollState(auth, Boolean(auth));

  async function join() {
    setBusy(true);
    setLocalError(null);
    try {
      const res = await fetch("/api/guest/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eventId, accessToken, name }),
      });
      const data = await readJson<{
        guestId: string;
        guestToken: string;
        state: PublicState;
        error?: string;
      }>(res);
      if (!res.ok) throw new Error(data.error || "Не удалось войти");
      sessionStorage.setItem(`guestId:${eventId}`, data.guestId);
      sessionStorage.setItem(`guestToken:${eventId}`, data.guestToken);
      setGuestId(data.guestId);
      setGuestToken(data.guestToken);
      setState(data.state);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  async function submitDrawing(drawingDataUrl: string) {
    const res = await fetch("/api/guest/draw", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${guestToken}`,
        "x-guest-id": guestId,
      },
      body: JSON.stringify({ eventId, guestId, drawingDataUrl }),
    });
    const data = await readJson<PublicState & { error?: string }>(res);
    if (!res.ok) throw new Error(data.error || "Не удалось отправить");
    setState(data);
  }

  if (!accessToken && !guestToken) {
    return (
      <div className="shell relative-z">
        <p className="panel text-center">Откройте ссылку из QR ведущего.</p>
        <BrandFooter />
      </div>
    );
  }

  return (
    <>
      <InkAtmosphere />
      <div className="shell relative-z">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo.png" alt="Schmidt" className="brand-mark anim-rise mx-auto mb-6" />

        {!guestToken && (
          <div className="anim-rise-delay space-y-4">
            <h1 className="display text-center text-3xl">Присоединяйся</h1>
            <p className="text-center" style={{ color: "var(--mute)" }}>
              Имя на коллаже зала
            </p>
            <input
              className="field"
              placeholder="Ваше имя"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
            />
            <button type="button" className="btn-hot w-full" disabled={busy || !name.trim()} onClick={join}>
              {busy ? "Входим…" : "Войти в студию"}
            </button>
          </div>
        )}

        {guestToken && state && (
          <div className="anim-rise space-y-4">
            <div className="text-center">
              <p className="chip mx-auto mb-3">{state.companyName || "Студия"}</p>
              <h1 className="display text-3xl leading-tight">{state.theme || "Ждём тему…"}</h1>
              {state.phase === "drawing" && (
                <p className="timer-big mt-3 text-5xl anim-timer inline-block rounded-full px-5 py-2">
                  {state.secondsLeft ?? "—"}
                </p>
              )}
            </div>

            {state.referencePhoto && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={state.referencePhoto}
                alt="Референс"
                className="mx-auto max-h-36 rounded-2xl object-cover"
              />
            )}

            {state.me?.banned && (
              <div className="panel text-center">
                <p className="display text-2xl" style={{ color: "var(--hot)" }}>
                  Вас отключили
                </p>
                <p className="mt-2" style={{ color: "var(--mute)" }}>
                  Ведущий убрал вас из студии
                </p>
              </div>
            )}

            {!state.me?.banned && state.phase === "lobby" && (
              <div className="panel text-center">
                <p className="display text-xl">Готовы?</p>
                <p className="mt-2" style={{ color: "var(--mute)" }}>
                  Ведущий даст старт. Тонкая кисть и палитра — чтобы 20–30 рисунков читались на экране.
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {(state.palette || [state.brushColor]).slice(0, 6).map((c) => (
                    <span
                      key={c}
                      className="inline-block h-4 w-4 rounded-full"
                      style={{ background: c, outline: c === "#FFFFFF" ? "1px solid #999" : undefined }}
                    />
                  ))}
                </div>
              </div>
            )}

            {!state.me?.banned && state.phase === "drawing" && !state.me?.submitted && (
              <DrawCanvas
                colors={state.palette?.length ? state.palette : [state.brushColor]}
                defaultColor={state.brushColor}
                onSubmit={submitDrawing}
              />
            )}

            {!state.me?.banned && state.me?.submitted && (
              <div className="panel anim-tile text-center">
                <p className="display text-2xl" style={{ color: "var(--acid)" }}>
                  На экране!
                </p>
                <p className="mt-2" style={{ color: "var(--mute)" }}>
                  Смотрите коллаж зала
                </p>
              </div>
            )}

            {state.phase === "collage" && (
              <div className="panel text-center">
                <p className="display text-2xl">Коллаж готов</p>
                <p className="mt-2" style={{ color: "var(--mute)" }}>
                  Рисунков: {state.drawings.length}
                </p>
              </div>
            )}

            {state.phase === "setup" && (
              <p className="text-center" style={{ color: "var(--mute)" }}>
                Ведущий ещё настраивает студию…
              </p>
            )}
          </div>
        )}

        {(localError || error) && (
          <p className="mt-4 text-center text-sm" style={{ color: "var(--hot)" }}>
            {localError || error}
          </p>
        )}
        <BrandFooter compact />
      </div>
    </>
  );
}
