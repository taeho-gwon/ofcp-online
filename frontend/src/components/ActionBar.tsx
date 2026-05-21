import type { Phase } from "../api/types";
import { Button } from "./ui";

interface Props {
  phase: Phase;
  isMyTurn: boolean;
  hasPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onShowResult?: () => void;
}

const statusTextStyle = {
  color: "var(--text-tertiary)",
  fontSize: "var(--fs-body)",
};

export function ActionBar({
  phase,
  isMyTurn,
  hasPending,
  onConfirm,
  onCancel,
  onShowResult,
}: Props) {
  if (phase === "scoring" || phase === "done" || phase === "game_over") {
    const label =
      phase === "scoring"
        ? "정산 중..."
        : phase === "game_over"
          ? "게임 종료"
          : "라운드 종료";
    return (
      <div className="flex flex-col items-center gap-2">
        <div style={statusTextStyle}>{label}</div>
        {(phase === "done" || phase === "game_over") && onShowResult && (
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={onShowResult}
          >
            결과 보기
          </Button>
        )}
      </div>
    );
  }

  if (!isMyTurn) {
    return (
      <div className="text-center" style={statusTextStyle}>
        상대 차례를 기다리는 중...
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <Button
        type="button"
        variant="secondary"
        size="lg"
        onClick={onCancel}
        disabled={!hasPending}
      >
        취소
      </Button>
      <Button type="button" variant="primary" size="lg" onClick={onConfirm}>
        턴 종료
      </Button>
    </div>
  );
}
