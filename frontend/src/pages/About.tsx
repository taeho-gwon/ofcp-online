import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui";

const PAGE_MAX_WIDTH = 720;

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

const sectionHeading = {
  fontSize: "var(--fs-body-lg)",
  fontWeight: 700,
  margin: "0 0 4px",
};

const sectionBody = {
  margin: 0,
  color: "var(--text-secondary)",
  lineHeight: "var(--lh-relaxed)",
};

export function About() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center p-6 pb-12">
      <div className="w-full" style={{ maxWidth: PAGE_MAX_WIDTH }}>
        <header className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 style={heroTitleStyle}>이용 안내</h1>
            <p style={heroSubtitleStyle}>비영리·교육 목적으로 운영합니다.</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
          >
            ← 돌아가기
          </Button>
        </header>

        <main
          className="card flex flex-col gap-4"
          style={{ fontSize: "var(--fs-body-sm)" }}
        >
          <section>
            <h2 style={sectionHeading}>현금을 다루지 않습니다</h2>
            <p style={sectionBody}>
              이 사이트에서는 현금을 다루지 않습니다. 이 게임은 오픈 페이스
              차이니즈 포커(OFC) 규칙을 따르지만 현금이 아니라 점수를 이용합니다.
            </p>
          </section>

          <section>
            <h2 style={sectionHeading}>비영리·교육 목적</h2>
            <p style={sectionBody}>
              본 사이트는 비영리·교육 목적으로 운영됩니다. 게임 결과로 발생하는
              어떠한 금전적 보상도 없으며, 결제·환금 기능을 제공하지 않습니다.
            </p>
          </section>

          <section>
            <h2 style={sectionHeading}>신고</h2>
            <p style={sectionBody}>
              부적절한 사용 또는 문제가 있다면 운영자에게 신고해 주세요. 신고
              접수 시 해당 서비스 또는 콘텐츠를 즉시 비공개로 전환할 수 있도록
              운영하고 있습니다.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
