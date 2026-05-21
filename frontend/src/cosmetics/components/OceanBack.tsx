import type { CardSize } from "../types";

const DIM: Record<CardSize, { w: number; h: number }> = {
  sm: { w: 56, h: 72 },
  md: { w: 80, h: 104 },
};

export function OceanBack({ size }: { size: CardSize }) {
  const { w, h } = DIM[size];
  const gradId = "ocean-grad";
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ borderRadius: 6, display: "block" }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0a5b8a" />
          <stop offset="100%" stopColor="#1a8cc4" />
        </linearGradient>
        <pattern
          id="ocean-diamond"
          x={0}
          y={0}
          width={10}
          height={10}
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 5 0 L 10 5 L 5 10 L 0 5 z"
            fill="none"
            stroke="#a8d8f0"
            strokeWidth={0.8}
            opacity={0.4}
          />
        </pattern>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill={`url(#${gradId})`} />
      <rect x={2} y={2} width={w - 4} height={h - 4} fill="url(#ocean-diamond)" />
      <path
        d={`M ${w / 2} ${h / 2 - 8} L ${w / 2 + 6} ${h / 2} L ${w / 2} ${h / 2 + 8} L ${w / 2 - 6} ${h / 2} z`}
        fill="#ffffff"
        opacity={0.9}
      />
    </svg>
  );
}
