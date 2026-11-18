"use client";

import { useEffect, useRef, useState } from "react";
import { canvasToDataUrl } from "@/lib/photo";

type Props = {
  colors: string[];
  defaultColor?: string;
  disabled?: boolean;
  onSubmit: (dataUrl: string) => Promise<void>;
};

export function DrawCanvas({ colors, defaultColor, disabled, onSubmit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const colorRef = useRef(defaultColor || colors[0] || "#FF2D6A");
  const [color, setColor] = useState(defaultColor || colors[0] || "#FF2D6A");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hasStroke, setHasStroke] = useState(false);

  useEffect(() => {
    colorRef.current = color;
  }, [color]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    const w = Math.min(560, parent?.clientWidth || 360);
    const h = Math.round(w * 0.85);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#f4efe6";
    ctx.fillRect(0, 0, w, h);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 4.5;
    setHasStroke(false);
  }, []);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled || busy) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = pos(e);
  }

  function onMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || disabled) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !last.current) return;
    const p = pos(e);
    ctx.strokeStyle = colorRef.current;
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    setHasStroke(true);
  }

  function onUp() {
    drawing.current = false;
    last.current = null;
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    ctx.fillStyle = "#f4efe6";
    ctx.fillRect(0, 0, w, h);
    setHasStroke(false);
    setErr(null);
  }

  async function send() {
    const canvas = canvasRef.current;
    if (!canvas || !hasStroke) {
      setErr("Нарисуйте что-нибудь");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const dataUrl = canvasToDataUrl(canvas);
      await onSubmit(dataUrl);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Не удалось отправить");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {colors.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Цвет ${c}`}
            className="h-9 w-9 rounded-full border-2 transition"
            style={{
              background: c,
              borderColor: color === c ? "#fff" : "rgba(255,255,255,0.2)",
              boxShadow: color === c ? "0 0 0 2px rgba(46,230,214,0.55)" : undefined,
              outline: c.toUpperCase() === "#FFFFFF" ? "1px solid rgba(0,0,0,0.25)" : undefined,
            }}
            disabled={disabled || busy}
            onClick={() => setColor(c)}
          />
        ))}
      </div>
      <canvas
        ref={canvasRef}
        className="draw-surface w-full"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      />
      <div className="flex gap-2">
        <button type="button" className="btn-ghost flex-1" disabled={disabled || busy} onClick={clear}>
          Очистить
        </button>
        <button type="button" className="btn-hot flex-[1.4]" disabled={disabled || busy} onClick={send}>
          {busy ? "Отправляем…" : "Отправить"}
        </button>
      </div>
      {err && (
        <p className="text-center text-sm" style={{ color: "var(--hot)" }}>
          {err}
        </p>
      )}
    </div>
  );
}
