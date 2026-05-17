import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui";
import { useAuthStore } from "../store/authStore";

const PAGE_MAX_WIDTH = 640;

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

const sectionTitleStyle = {
  fontSize: "var(--fs-body-lg)",
  fontWeight: 600,
  margin: 0,
};

const sectionDescStyle = {
  fontSize: "var(--fs-body-sm)",
  color: "var(--text-secondary)",
  margin: 0,
};

const profileListStyle = {
  margin: 0,
  display: "grid",
  gridTemplateColumns: "auto 1fr",
  gap: "10px 20px",
  fontSize: "var(--fs-body-sm)",
} as const;

const profileLabelStyle = {
  color: "var(--text-tertiary)",
};

const profileValueStyle = {
  margin: 0,
  color: "var(--text-primary)",
};

const upcomingListStyle = {
  margin: 0,
  padding: 0,
  listStyle: "none",
  display: "flex",
  flexDirection: "column" as const,
  gap: 8,
  fontSize: "var(--fs-body-sm)",
  color: "var(--text-secondary)",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export function MyPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="min-h-screen flex flex-col items-center p-6 pb-12">
      <div className="w-full" style={{ maxWidth: PAGE_MAX_WIDTH }}>
        <header className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 style={heroTitleStyle}>마이페이지</h1>
            <p style={heroSubtitleStyle}>계정 정보와 설정을 관리합니다.</p>
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

        <div className="flex flex-col gap-4">
          <section className="card">
            <h2 style={sectionTitleStyle}>프로필</h2>
            <dl style={profileListStyle}>
              <dt style={profileLabelStyle}>닉네임</dt>
              <dd style={profileValueStyle}>{user?.nickname ?? "—"}</dd>
              <dt style={profileLabelStyle}>이메일</dt>
              <dd style={profileValueStyle}>{user?.email ?? "—"}</dd>
              <dt style={profileLabelStyle}>가입일</dt>
              <dd style={profileValueStyle}>
                {user?.created_at ? formatDate(user.created_at) : "—"}
              </dd>
            </dl>
          </section>

          <section className="card">
            <h2 style={sectionTitleStyle}>추가 예정</h2>
            <ul style={upcomingListStyle}>
              <li>· 통계 (승률·평균 점수·FantasyLand 진입률)</li>
              <li>· 닉네임 변경</li>
              <li>· 카드 스킨·코스메틱</li>
            </ul>
          </section>

          <section className="card">
            <h2 style={sectionTitleStyle}>계정</h2>
            <p style={sectionDescStyle}>
              로그아웃하면 다음 로그인 전까지 이 기기에서 게임에 접속할 수 없습니다.
            </p>
            <Button type="button" variant="secondary" onClick={logout}>
              로그아웃
            </Button>
          </section>
        </div>
      </div>
    </div>
  );
}
