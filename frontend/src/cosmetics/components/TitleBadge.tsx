import type { TitleVariant } from "../types";

export function TitleBadge({ variant }: { variant: TitleVariant }) {
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 12,
        lineHeight: 1.2,
        padding: "3px 8px",
        borderRadius: 5,
        fontWeight: 700,
        ...variant.style,
      }}
    >
      {variant.text}
    </span>
  );
}
