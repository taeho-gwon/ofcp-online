import type { Phase } from "../api/types";

interface Props {
  phase: Phase;
  isMyTurn: boolean;
  hasPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onShowResult?: () => void;
}

export function getRequiredPlace(phase: Phase): number {
  if (phase === "first_turn") return 5;
  if (phase === "normal_turn") return 2;
  if (phase === "fantasy_turn") return 13;
  return 0;
}

export function getRequiredDiscard(phase: Phase, handCount: number): number {
  if (phase === "first_turn") return 0;
  if (phase === "normal_turn") return 1;
  if (phase === "fantasy_turn") return Math.max(0, handCount - 13);
  return 0;
}

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
      <div className="flex flex-col items-center gap-2 text-slate-500">
        <div>{label}</div>
        {(phase === "done" || phase === "game_over") && onShowResult && (
          <button
            type="button"
            onClick={onShowResult}
            className="px-3 py-1.5 text-sm rounded border border-slate-300 hover:bg-slate-50"
          >
            결과 보기
          </button>
        )}
      </div>
    );
  }

  if (!isMyTurn) {
    return (
      <div className="text-center text-slate-500 text-sm">
        상대 차례를 기다리는 중...
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onCancel}
        disabled={!hasPending}
        className="px-3 py-1.5 text-sm rounded border border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-default"
      >
        취소
      </button>
      <button
        type="button"
        onClick={onConfirm}
        className="px-4 py-1.5 text-sm rounded bg-emerald-600 text-white hover:bg-emerald-700"
      >
        턴 종료
      </button>
    </div>
  );
}
