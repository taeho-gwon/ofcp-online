import { Button } from "../ui/Button";

export interface RoomCodeProps {
  value: string;
  label?: string;
  onCopy?: (value: string) => void;
  hideLabel?: boolean;
  className?: string;
}

export function RoomCode({
  value,
  label = "방 코드",
  onCopy,
  hideLabel = false,
  className = "",
}: RoomCodeProps) {
  const handleCopy = () => {
    if (onCopy) return onCopy(value);
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(value);
    }
  };

  return (
    <div
      style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
      className={className}
    >
      <div className="room-code">
        {!hideLabel ? <span className="room-code-label">{label}</span> : null}
        <span>{value}</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        icon="copy"
        onClick={handleCopy}
        aria-label="방 코드 복사"
      >
        복사
      </Button>
    </div>
  );
}
