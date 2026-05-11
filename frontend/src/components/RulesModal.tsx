interface Props {
  onClose: () => void;
}

const TOP_PAIR_ROYALTY: { label: string; pts: number }[] = [
  { label: "66x", pts: 1 },
  { label: "77x", pts: 2 },
  { label: "88x", pts: 3 },
  { label: "99x", pts: 4 },
  { label: "TTx", pts: 5 },
  { label: "JJx", pts: 6 },
  { label: "QQx", pts: 7 },
  { label: "KKx", pts: 8 },
  { label: "AAx", pts: 9 },
];

const TOP_TRIPS_ROYALTY: { label: string; pts: number }[] = [
  { label: "222", pts: 10 },
  { label: "333", pts: 11 },
  { label: "444", pts: 12 },
  { label: "555", pts: 13 },
  { label: "666", pts: 14 },
  { label: "777", pts: 15 },
  { label: "888", pts: 16 },
  { label: "999", pts: 17 },
  { label: "TTT", pts: 18 },
  { label: "JJJ", pts: 19 },
  { label: "QQQ", pts: 20 },
  { label: "KKK", pts: 21 },
  { label: "AAA", pts: 22 },
];

const MIDDLE_ROYALTY: { label: string; pts: number }[] = [
  { label: "트리플", pts: 2 },
  { label: "스트레이트", pts: 4 },
  { label: "플러시", pts: 8 },
  { label: "풀하우스", pts: 12 },
  { label: "포카드", pts: 20 },
  { label: "스트레이트 플러시", pts: 30 },
  { label: "로열 플러시", pts: 50 },
];

const BOTTOM_ROYALTY: { label: string; pts: number }[] = [
  { label: "스트레이트", pts: 2 },
  { label: "플러시", pts: 4 },
  { label: "풀하우스", pts: 6 },
  { label: "포카드", pts: 10 },
  { label: "스트레이트 플러시", pts: 15 },
  { label: "로열 플러시", pts: 25 },
];

const FL_ENTRY: { label: string; cards: number }[] = [
  { label: "QQ", cards: 14 },
  { label: "KK", cards: 15 },
  { label: "AA", cards: 16 },
  { label: "탑 트리플", cards: 17 },
];

function PointRow({ label, pts }: { label: string; pts: number | string }) {
  return (
    <div className="flex items-center justify-between py-1 px-2 text-sm border-b border-slate-100 last:border-0">
      <span className="text-slate-700">{label}</span>
      <span className="font-mono font-semibold text-amber-700">+{pts}</span>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="px-3 py-2 text-sm font-semibold text-slate-800 border-b border-slate-200 bg-slate-50 rounded-t-lg">
        {title}
      </div>
      <div>{children}</div>
    </section>
  );
}

export function RulesModal({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Pineapple OFC 룰</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-lg leading-none"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <Section title="기본 규칙">
            <ul className="px-4 py-2 text-sm text-slate-700 list-disc list-outside space-y-1">
              <li>
                매 턴 3장을 받아 탑(3장)·미들(5장)·바텀(5장) 중{" "}
                <span className="font-semibold">2장 배치, 1장 버림</span>.
              </li>
              <li>
                <span className="font-semibold">탑 ≤ 미들 ≤ 바텀</span>{" "}
                강도를 지켜야 함. 위반 시{" "}
                <span className="text-rose-600 font-semibold">Foul</span> —
                3줄 모두 최하 핸드 취급, 로열티 없음.
              </li>
              <li>
                줄별 1:1 비교: 이기면 +1, 지면 -1, 비기면 0 (제로섬).
              </li>
              <li>
                <span className="font-semibold">Scooping</span>: 3줄 모두
                이기면 추가 +3.
              </li>
            </ul>
          </Section>

          <Section title="FantasyLand 진입">
            <div className="px-2 py-2 text-xs text-slate-500">
              탑에 아래 핸드 배치 완료 시 다음 라운드 진입
            </div>
            <div className="px-1 pb-2">
              {FL_ENTRY.map((r) => (
                <div
                  key={r.label}
                  className="flex items-center justify-between py-1 px-2 text-sm border-b border-slate-100 last:border-0"
                >
                  <span className="text-slate-700">{r.label}</span>
                  <span className="font-mono font-semibold text-fuchsia-700">
                    {r.cards}장
                  </span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="FantasyLand 연속 진입">
            <ul className="px-4 py-2 text-sm text-slate-700 list-disc list-outside space-y-1">
              <li>
                FL 중 다음 중 하나 달성 시 다음 라운드도 FL{" "}
                <span className="font-mono font-semibold text-fuchsia-700">
                  (14장 고정)
                </span>
                :
              </li>
              <li className="list-none pl-4">
                · 탑: <span className="font-semibold">트리플 이상</span>
              </li>
              <li className="list-none pl-4">
                · 바텀:{" "}
                <span className="font-semibold">포카드(Four of a Kind) 이상</span>
              </li>
            </ul>
          </Section>

          <Section title="로열티 — 탑 (페어)">
            <div>
              {TOP_PAIR_ROYALTY.map((r) => (
                <PointRow key={r.label} label={r.label} pts={r.pts} />
              ))}
            </div>
          </Section>

          <Section title="로열티 — 탑 (트리플)">
            <div>
              {TOP_TRIPS_ROYALTY.map((r) => (
                <PointRow key={r.label} label={r.label} pts={r.pts} />
              ))}
            </div>
          </Section>

          <Section title="로열티 — 미들">
            <div>
              {MIDDLE_ROYALTY.map((r) => (
                <PointRow key={r.label} label={r.label} pts={r.pts} />
              ))}
            </div>
          </Section>

          <Section title="로열티 — 바텀">
            <div>
              {BOTTOM_ROYALTY.map((r) => (
                <PointRow key={r.label} label={r.label} pts={r.pts} />
              ))}
            </div>
          </Section>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded bg-slate-800 text-white hover:bg-slate-900"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
