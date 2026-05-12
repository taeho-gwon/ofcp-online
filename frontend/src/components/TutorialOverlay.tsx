interface Props {
  text: string;
  step: number;
  totalSteps: number;
  onNext: () => void;
  onSkip?: () => void;
  ctaLabel?: string;
}

export function TutorialOverlay({
  text,
  step,
  totalSteps,
  onNext,
  onSkip,
  ctaLabel = "다음",
}: Props) {
  return (
    <div className="fixed inset-x-0 bottom-12 z-30 flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-md bg-slate-900 text-white rounded-lg shadow-xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-amber-300 font-semibold">튜토리얼</span>
          <span className="text-slate-400 font-mono">
            {step}/{totalSteps}
          </span>
        </div>
        <div className="text-sm leading-relaxed">{text}</div>
        <div className="flex items-center justify-between">
          {onSkip ? (
            <button
              type="button"
              onClick={onSkip}
              className="text-xs text-slate-400 hover:text-slate-200 underline"
            >
              건너뛰기
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onNext}
            className="px-4 py-1.5 text-sm rounded bg-emerald-600 hover:bg-emerald-700 font-semibold"
          >
            {ctaLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
