"use client";

import { QRCodeSVG } from "qrcode.react";

export function HallQr({
  url,
  label,
  size = 96,
  large = false,
}: {
  url: string;
  label?: string;
  size?: number;
  large?: boolean;
}) {
  if (!url) return null;
  const qr = large ? Math.max(size, 180) : size;
  return (
    <div
      className={`flex items-center gap-4 rounded-3xl border p-3 ${large ? "flex-col p-5 text-center sm:flex-row sm:text-left" : ""}`}
      style={{ borderColor: "var(--line)", background: "rgba(0,0,0,0.28)" }}
    >
      <div className="rounded-2xl bg-white p-2">
        <QRCodeSVG value={url} size={qr} level="M" includeMargin={false} />
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--mute)" }}>
          {label || "Гости"}
        </p>
        <p
          className={`mt-1 break-all ${large ? "max-w-sm text-base md:text-lg" : "max-w-[14rem] text-sm"}`}
          style={{ color: "var(--cyan)" }}
        >
          Сканируй и рисуй
        </p>
      </div>
    </div>
  );
}
