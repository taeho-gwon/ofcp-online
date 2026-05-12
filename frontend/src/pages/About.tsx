import { useNavigate } from "react-router-dom";

export function About() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-100 p-4 pb-12">
      <header className="max-w-2xl mx-auto flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          ← 돌아가기
        </button>
        <h1 className="text-xl font-bold">이용 안내</h1>
        <span className="w-16" />
      </header>

      <main className="max-w-2xl mx-auto bg-white rounded-lg shadow p-5 flex flex-col gap-4 text-slate-800 text-sm leading-relaxed">
        <section>
          <h2 className="font-bold text-base mb-1">현금을 다루지 않습니다</h2>
          <p>
            이 사이트에서는 현금을 다루지 않습니다. 이 게임은 오픈 페이스
            차이니즈 포커(OFC) 규칙을 따르지만 현금이 아니라 점수를 이용합니다.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-base mb-1">비영리·교육 목적</h2>
          <p>
            본 사이트는 비영리·교육 목적으로 운영됩니다. 게임 결과로 발생하는
            어떠한 금전적 보상도 없으며, 결제·환금 기능을 제공하지 않습니다.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-base mb-1">신고</h2>
          <p>
            부적절한 사용 또는 문제가 있다면 운영자에게 신고해 주세요. 신고
            접수 시 해당 서비스 또는 콘텐츠를 즉시 비공개로 전환할 수 있도록
            운영하고 있습니다.
          </p>
        </section>
      </main>
    </div>
  );
}
