const SIZE_CLASS = { sm: "sm", md: "", lg: "lg" } as const;

export type AvatarSize = keyof typeof SIZE_CLASS;

export interface AvatarProps {
  name?: string;
  size?: AvatarSize;
  status?: boolean;
  src?: string;
  className?: string;
}

export function Avatar({
  name = "?",
  size = "md",
  status = false,
  src,
  className = "",
}: AvatarProps) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const cls = ["avatar", SIZE_CLASS[size], className].filter(Boolean).join(" ");
  return (
    <div
      className={cls}
      style={
        src
          ? {
              backgroundImage: `url(${src})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              color: "transparent",
            }
          : undefined
      }
    >
      {src ? "" : initials}
      {status ? <span className="status" /> : null}
    </div>
  );
}
