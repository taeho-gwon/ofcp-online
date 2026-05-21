import type { CardSize } from "../types";

const DIM: Record<CardSize, { w: number; h: number }> = {
  sm: { w: 56, h: 72 },
  md: { w: 80, h: 104 },
};

export function ClassicEmptySlot({
  size,
  highlighted,
}: {
  size: CardSize;
  highlighted: boolean;
}) {
  const { w, h } = DIM[size];
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: 6,
        border: `2px dashed ${highlighted ? "#f59e0b" : "#cbd5e1"}`,
        background: highlighted ? "rgba(245, 158, 11, 0.08)" : "transparent",
        boxSizing: "border-box",
      }}
    />
  );
}
