"use client";

import { useEffect, useState } from "react";
import { readJson } from "@/lib/apiClient";
import type { PublicState } from "@/lib/types";

export type PollAuth = {
  eventId: string;
  role: "host" | "guest" | "screen";
  token: string;
  guestId?: string;
};

export function usePollState(auth: PollAuth | null, enabled = true) {
  const [state, setState] = useState<PublicState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const eventId = auth?.eventId ?? "";
  const role = auth?.role;
  const token = auth?.token ?? "";
  const guestId = auth?.guestId;

  useEffect(() => {
    if (!enabled || !eventId || !role || !token) return;
    let cancelled = false;

    async function tick() {
      try {
        const headers: Record<string, string> = {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
          "x-event-id": eventId,
          "x-event-role": role!,
        };
        if (guestId) headers["x-guest-id"] = guestId;

        const res = await fetch("/api/state", {
          method: "POST",
          headers,
          body: JSON.stringify({
            eventId,
            role,
            ...(guestId ? { guestId } : {}),
          }),
        });
        const data = await readJson<PublicState & { error?: string }>(res);
        if (!res.ok) throw new Error(data.error || `Ошибка ${res.status}`);
        if (!cancelled) {
          setState(data);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Ошибка связи");
      }
    }

    tick();
    const id = window.setInterval(tick, 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [eventId, role, token, guestId, enabled]);

  return { state, setState, error, setError };
}
