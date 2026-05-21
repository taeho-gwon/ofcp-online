import type { CardSize } from "../types";

const DIM: Record<CardSize, { w: number; h: number }> = {
  sm: { w: 56, h: 72 },
  md: { w: 80, h: 104 },
};

export function NavyBack({ size }: { size: CardSize }) {
  const { w, h } = DIM[size];
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ borderRadius: 6, background: "#1a2a52", display: "block" }}
    >
      <defs>
        <pattern
          id="navy-diamond"
          x={0}
          y={0}
          width={10}
          height={10}
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 5 0 L 10 5 L 5 10 L 0 5 z"
            fill="none"
            stroke="#3a4d80"
            strokeWidth={0.8}
          />
        </pattern>
      </defs>
      <rect x={2} y={2} width={w - 4} height={h - 4} fill="url(#navy-diamond)" />
      <path
        d={`M ${w / 2} ${h / 2 - 8} L ${w / 2 + 6} ${h / 2} L ${w / 2} ${h / 2 + 8} L ${w / 2 - 6} ${h / 2} z`}
        fill="#ffffff"
        opacity={0.9}
      />
    </svg>
  );
}
