"use client";

import { QRCodeSVG } from "qrcode.react";

export function HallQr({ url, label }: { url: string; label?: string }) {
  if (!url) return null;
  return (
    <div
      className="flex items-center gap-4 rounded-3xl border p-3"
      style={{ borderColor: "var(--line)", background: "rgba(0,0,0,0.28)" }}
    >
      <div className="rounded-2xl bg-white p-2">
        <QRCodeSVG value={url} size={96} level="M" includeMargin={false} />
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>
          {label || "Гости"}
        </p>
        <p className="mt-1 max-w-[14rem] break-all text-sm" style={{ color: "var(--cyan)" }}>
          Сканируй и рисуй
        </p>
      </div>
    </div>
  );
}
