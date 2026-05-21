import type { TitleVariant } from "../types";

export function TitleBadge({ variant }: { variant: TitleVariant }) {
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 10,
        lineHeight: 1.2,
        padding: "2px 6px",
        borderRadius: 4,
        fontWeight: 700,
        ...variant.style,
      }}
    >
      {variant.text}
    </span>
  );
}
