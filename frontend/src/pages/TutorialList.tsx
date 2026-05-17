import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui";
import { TUTORIAL_SCENARIOS } from "../lib/tutorialScenarios";

const PAGE_MAX_WIDTH = 560;

const heroTitleStyle = {
  fontSize: "var(--fs-display)",
  fontWeight: 700,
  letterSpacing: "var(--tracking-tight)",
  margin: 0,
  lineHeight: 1.1,
};

const heroSubtitleStyle = {
  fontSize: "var(--fs-body-lg)",
  color: "var(--text-secondary)",
  margin: "10px 0 0",
};

const SUBTITLE: Record<string, string> = {
  basics: "OFC 라운드 흐름과 점수 계산 익히기",
  fantasy: "top에 QQ 이상 페어로 다음 라운드 FantasyLand 진입",
  foul: "Foul로 자동 패배하는 함정과 회피 요령",
  "fl-progress": "14장 한 번에 받는 FL 라운드 + 연속 FL 조건",
};

export function TutorialList() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center p-6 pb-12">
      <div className="w-full" style={{ maxWidth: PAGE_MAX_WIDTH }}>
        <header className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 style={heroTitleStyle}>튜토리얼</h1>
            <p style={heroSubtitleStyle}>
              OFC 룰과 점수 계산을 4개 시나리오로 익혀봅니다.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
          >
            ← 로비
          </Button>
        </header>

        <div
          className="card"
          style={{ padding: 12, gap: 8 }}
        >
          {TUTORIAL_SCENARIOS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => navigate(`/tutorial/${s.id}`)}
              className="scenario-card"
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
            fontSize: "var(--fs-caption)",
            color: "var(--text-tertiary)",
          }}
        >
          시나리오는 순서대로 진행하는 것을 권장합니다.
        </div>
      </div>
    </div>
  );
}
