"use client";

import { Suspense } from "react";
import { JoinInner } from "./JoinInner";

export default function JoinPage({ params }: { params: Promise<{ eventId: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="shell relative-z">
          <p style={{ color: "var(--mute)" }}>Загрузка…</p>
        </div>
      }
    >
      <JoinInner params={params} />
    </Suspense>
  );
}
