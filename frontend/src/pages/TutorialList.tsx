import { useNavigate } from "react-router-dom";
import { TUTORIAL_SCENARIOS } from "../lib/tutorialScenarios";

const SUBTITLE: Record<string, string> = {
  basics: "OFC 라운드 흐름과 점수 계산 익히기",
  fantasy: "top에 QQ 이상 페어로 다음 라운드 FantasyLand 진입",
  foul: "Foul로 자동 패배하는 함정과 회피 요령",
};

export function TutorialList() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-100 p-4 flex flex-col items-center pb-12">
      <header className="w-full max-w-md flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="text-xs text-slate-500 hover:underline"
        >
          ← 로비
        </button>
        <h1 className="text-xl font-bold">튜토리얼</h1>
        <span className="w-12" />
      </header>

      <div className="w-full max-w-md bg-white rounded-lg shadow p-3 flex flex-col gap-2">
        {TUTORIAL_SCENARIOS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => navigate(`/tutorial/${s.id}`)}
            className="text-left p-3 rounded border border-slate-200 hover:bg-slate-50 transition"
          >
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-xs text-amber-700 font-semibold">
                {i + 1}
              </span>
              <span className="font-semibold">{s.title}</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {SUBTITLE[s.id] ?? ""}
            </div>
          </button>
        ))}
      </div>

      <div className="w-full max-w-md text-center text-xs text-slate-400 mt-4">
        시나리오는 순서대로 진행하는 것을 권장합니다.
      </div>
    </div>
  );
}
