"use client";

import type { DrawingTile } from "@/lib/types";

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

  const cols =
    drawings.length === 1
      ? "grid-cols-1"
      : drawings.length <= 4
        ? "grid-cols-2"
        : drawings.length <= 9
          ? "grid-cols-3"
          : "grid-cols-3 md:grid-cols-4";

  return (
    <div className={`grid ${cols} gap-3 md:gap-4`}>
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
              className="truncate px-3 py-2 text-sm font-semibold"
              style={{ background: "#0e121a", color: "var(--snow)" }}
            >
              {d.name}
              {selectable ? " · нажми" : ""}
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
