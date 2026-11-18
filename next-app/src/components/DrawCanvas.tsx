"use client";

import { useEffect, useRef, useState } from "react";
import { canvasToDataUrl } from "@/lib/photo";

/** Thin by default so 20–30 phone drawings stay line-art, not paint blobs on the hall collage. */
const BRUSH_SIZES = [
  { id: "thin", label: "Тонкая", width: 1.6 },
  { id: "mid", label: "Средняя", width: 2.8 },
  { id: "thick", label: "Толстая", width: 4.2 },
] as const;

type BrushId = (typeof BRUSH_SIZES)[number]["id"];

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
  const widthRef = useRef<number>(BRUSH_SIZES[0].width);
  const [color, setColor] = useState(defaultColor || colors[0] || "#FF2D6A");
  const [brushId, setBrushId] = useState<BrushId>("thin");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hasStroke, setHasStroke] = useState(false);

  useEffect(() => {
    colorRef.current = color;
  }, [color]);

  useEffect(() => {
    const found = BRUSH_SIZES.find((b) => b.id === brushId) || BRUSH_SIZES[0];
    widthRef.current = found.width;
  }, [brushId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    // Slightly smaller drawing field on phones → finer strokes on the hall wall
    const w = Math.min(420, parent?.clientWidth || 360);
    const h = Math.round(w * 0.9);
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
    setHasStroke(false);
  }, []);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function stroke(ctx: CanvasRenderingContext2D, from: { x: number; y: number }, to: { x: number; y: number }) {
    ctx.strokeStyle = colorRef.current;
    ctx.lineWidth = widthRef.current;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }

  function onDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled || busy) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const p = pos(e);
    last.current = p;
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) {
      // Dot on tap so thin brush still registers
      ctx.fillStyle = colorRef.current;
      ctx.beginPath();
      ctx.arc(p.x, p.y, widthRef.current / 2, 0, Math.PI * 2);
      ctx.fill();
      setHasStroke(true);
    }
  }

  function onMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || disabled) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !last.current) return;
    const p = pos(e);
    stroke(ctx, last.current, p);
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
      <p className="text-center text-xs leading-relaxed" style={{ color: "var(--mute)" }}>
        Тонкая кисть по умолчанию — на экране зала поместятся 20–30 рисунков без «закраски».
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {colors.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Цвет ${c}`}
            className="h-8 w-8 rounded-full border-2 transition"
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
      <div className="flex justify-center gap-2">
        {BRUSH_SIZES.map((b) => (
          <button
            key={b.id}
            type="button"
            className={brushId === b.id ? "btn-cyan px-3 py-2 text-sm" : "btn-ghost px-3 py-2 text-sm"}
            disabled={disabled || busy}
            onClick={() => setBrushId(b.id)}
          >
            {b.label}
          </button>
        ))}
      </div>
      <canvas
        ref={canvasRef}
        className="draw-surface mx-auto block w-full max-w-[420px]"
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
