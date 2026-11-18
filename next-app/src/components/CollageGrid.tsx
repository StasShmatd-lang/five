"use client";

import type { DrawingTile } from "@/lib/types";

function gridClass(count: number) {
  if (count <= 1) return "grid-cols-1";
  if (count <= 4) return "grid-cols-2";
  if (count <= 9) return "grid-cols-3";
  if (count <= 16) return "grid-cols-4";
  if (count <= 25) return "grid-cols-4 md:grid-cols-5";
  // 20–30+ people on the hall wall
  return "grid-cols-4 md:grid-cols-5 lg:grid-cols-6";
}

export function CollageGrid({
  drawings,
  large = false,
  selectable = false,
  selectedId,
  onSelect,
}: {
  drawings: DrawingTile[];
  large?: boolean;
  selectable?: boolean;
  selectedId?: string | null;
  onSelect?: (tile: DrawingTile) => void;
}) {
  if (drawings.length === 0) {
    return (
      <div
        className="flex min-h-[220px] items-center justify-center rounded-3xl border border-dashed text-center"
        style={{ borderColor: "var(--line)", color: "var(--mute)" }}
      >
        Ждём первые штрихи…
      </div>
    );
  }

  const dense = drawings.length >= 12;
  const gap = dense ? "gap-1.5 md:gap-2" : "gap-3 md:gap-4";
  const captionPad = dense ? "px-2 py-1 text-xs" : "px-3 py-2 text-sm";

  return (
    <div className={`grid ${gridClass(drawings.length)} ${gap}`}>
      {drawings.map((d, i) => {
        const selected = selectedId === d.guestId;
        return (
          <figure
            key={d.guestId}
            className={`tile anim-tile ${selectable ? "cursor-pointer transition hover:brightness-110" : ""}`}
            style={{
              animationDelay: `${Math.min(i, 12) * 0.05}s`,
              boxShadow: selected ? "0 0 0 3px var(--cyan)" : undefined,
            }}
            role={selectable ? "button" : undefined}
            tabIndex={selectable ? 0 : undefined}
            onClick={selectable && onSelect ? () => onSelect(d) : undefined}
            onKeyDown={
              selectable && onSelect
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(d);
                    }
                  }
                : undefined
            }
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={d.drawingDataUrl}
              alt={`Рисунок ${d.name}`}
              className={`w-full object-cover ${large ? "aspect-square" : "aspect-[4/3]"}`}
            />
            <figcaption
              className={`truncate font-semibold ${captionPad}`}
              style={{ background: "#0e121a", color: "var(--snow)" }}
            >
              {d.name}
              {selectable && !dense ? " · нажми" : ""}
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
