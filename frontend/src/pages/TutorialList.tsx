import { useNavigate } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { TUTORIAL_SCENARIOS } from "../lib/tutorialScenarios";

const SUBTITLE: Record<string, string> = {
  basics: "OFC 라운드 흐름과 점수 계산 익히기",
  fantasy: "top에 QQ 이상 페어로 다음 라운드 FantasyLand 진입",
  foul: "Foul로 자동 패배하는 함정과 회피 요령",
  "fl-progress": "14장 한 번에 받는 FL 라운드 + 연속 FL 조건",
};

const scenarioButtonStyle = {
  textAlign: "left" as const,
  padding: 12,
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--border-subtle)",
  background: "var(--bg-elevated)",
  cursor: "pointer",
  width: "100%",
};

export function TutorialList() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen p-4 flex flex-col items-center pb-12">
      <PageHeader
        title="튜토리얼"
        back={{ label: "← 로비", to: "/" }}
        maxWidth={448}
      />

      <div
        className="card"
        style={{ maxWidth: 448, width: "100%", padding: 12, gap: 8 }}
      >
        {TUTORIAL_SCENARIOS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => navigate(`/tutorial/${s.id}`)}
            style={scenarioButtonStyle}
          >
            <div className="flex items-baseline gap-2">
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--fs-caption)",
                  fontWeight: 600,
                  color: "var(--accent)",
                }}
              >
                {i + 1}
              </span>
              <span style={{ fontWeight: 600 }}>{s.title}</span>
            </div>
            <div
              style={{
                fontSize: "var(--fs-caption)",
                color: "var(--text-tertiary)",
                marginTop: 4,
              }}
            >
              {SUBTITLE[s.id] ?? ""}
            </div>
          </button>
        ))}
      </div>

      <div
        className="w-full text-center mt-4"
        style={{
          maxWidth: 448,
          fontSize: "var(--fs-caption)",
          color: "var(--text-tertiary)",
        }}
      >
        시나리오는 순서대로 진행하는 것을 권장합니다.
      </div>
    </div>
  );
}
