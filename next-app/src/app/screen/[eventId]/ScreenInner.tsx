"use client";

import { use, useEffect, useMemo, useState } from "react";
import { BrandFooter } from "@/components/BrandFooter";
import { CollageGrid } from "@/components/CollageGrid";
import { InkAtmosphere } from "@/components/InkAtmosphere";
import { usePollState } from "@/hooks/usePollState";

export function ScreenInner({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params);
  const [screenToken, setScreenToken] = useState("");

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
  const { state, error } = usePollState(auth, Boolean(screenToken));

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
          <div className="text-right">
            {state?.phase === "drawing" && (
              <div className="anim-timer inline-block rounded-full border px-8 py-4" style={{ borderColor: "var(--hot)" }}>
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
            <p className="mt-3 text-lg" style={{ color: "var(--mute)" }}>
              {state?.drawings.length ?? 0} / {state?.guestCount ?? 0} рисунков
            </p>
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
            <div className="flex h-full min-h-[40vh] items-center justify-center">
              <p className="display anim-rise text-center text-4xl md:text-6xl" style={{ color: "var(--mute)" }}>
                Присоединяйтесь с телефона
              </p>
            </div>
          )}
          {(state?.phase === "drawing" || state?.phase === "collage") && (
            <CollageGrid drawings={state.drawings} large />
          )}
          {state?.phase === "setup" && (
            <p className="text-center text-2xl" style={{ color: "var(--mute)" }}>
              Ведущий настраивает студию
            </p>
          )}
        </div>

        {error && (
          <p className="mt-4 text-center" style={{ color: "var(--hot)" }}>
            {error}
          </p>
        )}
        <BrandFooter compact />
      </div>
    </>
  );
}
