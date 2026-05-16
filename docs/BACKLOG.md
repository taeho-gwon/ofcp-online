# BACKLOG

다음 작업 세션에서 참고할 진행 상태 + 남은 작업 후보. 시급도·크기 기준.

## 최근 완료 (2026-05-16 ~ 2026-05-17)

### 디자인 시스템 마이그레이션
- **페이지 12개 + Footer**: Tailwind slate/emerald 직접 사용 제거, `.card` / 디자인 시스템 컴포넌트 / 토큰 색으로 교체. 레이아웃 유틸(flex/gap/min-h 등)은 그대로 유지.
- **`PageHeader` 컴포넌트 신설**: `components/PageHeader.tsx` — back/title/rightActions 슬롯. 헤더 있는 페이지 10종이 한 줄로 호출.
- **다크 모드 시스템 완전 제거**: `useColorMode`/`ColorModeToggle` 파일 삭제, `tokens.css`의 `[data-mode="dark"]` 블록 삭제. 라이트 모드만 사용.
- **카드 스킨 시스템**: `components/cardSkins/` 신설. `CardSkin` 인터페이스(Face/Back/EmptySlot) + `default` 스킨(첫 구현체) + `useCardSkin` 훅 + `CARD_SKINS` 레지스트리. **카드 시각은 토큰을 안 거치고 raw 색** 사용 — 추후 모드 도입돼도 카드는 영향받지 않음.
- **CLAUDE.md "프론트엔드 디자인 시스템" 섹션 신설**: 계층/Tailwind 분담/색 토큰/라이트 전용/카드 raw 색 원칙 명문화.

### 코드 품질
- `useMatchupAnimation.ts`, `OfcTable.tsx`의 useEffect 내 setState reset 패턴 → React 19 권장 derived-state 패턴으로 교체.
- `ActionBar.tsx`의 헬퍼(`getRequiredPlace`/`getRequiredDiscard`)를 `lib/turnRequirements.ts`로 분리 (react-refresh 룰 위반 해소).
- lint·tsc 0 에러.

### 버그 수정
- **FantasyTutorial**: 상대 보드가 step과 무관하게 처음부터 완성 상태로 보이던 문제. `opp_done` step 추가해서 FL → 일반 플레이어 → 결과 순서가 시각적으로 드러나게.

### 비즈니스
- **코스메틱 판매 결정** (2026-05-16): 카드 이미지·게임 보드·아바타 비기능성 코스메틱으로 판매하기로. memory `project_monetization.md`에 저장.

---

## 남은 작업 후보

### 🔴 시급 — 비즈니스 정합성 정리 (30분)

코스메틱 판매 결정이 기존 코드/문서의 "비영리·교육 목적, 환금 없음" 명시와 정면 충돌.

- [ ] `frontend/src/components/Footer.tsx` 문구 수정: "비영리·교육 목적 — 현금/환금 일절 다루지 않으며 점수만 사용합니다."
- [ ] `frontend/src/pages/About.tsx`의 "현금을 다루지 않습니다", "비영리·교육 목적" 섹션 — 코스메틱은 영리 요소이므로 표현 재검토
- [ ] memory `project_phase2_decisions.md` 갱신 — "영리 요소 일절 배제로 등급분류 회피" Why가 더 이상 맞지 않음
- [ ] 게임물관리위원회 등급분류 전략 재검토 — 코스메틱 판매 시 "유료 게임"이 등급분류 대상이 될 수 있음. 환금성/사행성과는 무관하지만 별도 확인 필요
- [ ] 결제·환불 정책 검토 — 소비자보호법 적용, 결제 수단(PG/IAP/PayPal), 환불 정책

### 🟡 큰 작업 — 게임 도메인 시각 정리 (회차 1~2개)

페이지는 디자인 시스템 톤으로 통일됐지만, 게임 컴포넌트는 아직 Tailwind slate/emerald 직접 사용 중. 페이지 톤과 미세하게 어긋남.

- [ ] `components/PlayerBoard.tsx`
- [ ] `components/Hand.tsx`
- [ ] `components/ActionBar.tsx`
- [ ] `components/ResultModal.tsx`
- [ ] `components/RulesModal.tsx`
- [ ] `components/ReplayBoard.tsx`
- [ ] `components/TutorialOverlay.tsx`

주의: 카드(`CardView`)는 raw 색 유지 원칙 — 다른 게임 컴포넌트와 다름.

### 🟣 매우 큼 — 코스메틱 도메인 구현 (별도 마일스톤)

카드 스킨 시스템 인프라는 이미 준비됨 (`components/cardSkins/`). 그 위에 얹을 것:

- [ ] 백엔드 도메인 추가: `app/shop/` (상품 카탈로그), `app/inventory/` (사용자 소유), `app/payments/` (결제·환불)
- [ ] DB 스키마: `cosmetics`, `user_cosmetics`, `purchases` 테이블
- [ ] 프론트 페이지: `pages/Shop.tsx`, `pages/Inventory.tsx`
- [ ] 결제 통합: 국내 PG / Stripe / PayPal 중 선택
- [ ] `useCardSkin` 훅을 사용자 store 기반으로 확장 (현재는 항상 default 반환)
- [ ] 추가 스킨 구현: vintage, modern, neon 등 + 카드 보드/아바타 스킨 카테고리
- [ ] 비기능성 코스메틱 카테고리 확정 (이미 결정: 카드/보드/아바타). 향후 후보: 닉네임 효과·칭호, Royalty/FL/Scoop 이펙트 팩, ResultModal 배경, 사운드 팩, (3단계 채팅 도입 후) 이모트

### 🟢 작은 폴리시

- [ ] **사라진 hover 효과 복원**: `History.tsx` 게임 목록 항목, `TutorialList.tsx` 시나리오 카드. `components.css`에 `.list-item`, `.scenario-card` 클래스 추가하면 일관 처리 가능
- [ ] **모바일/좁은 화면 점검**: 특히 `Game.tsx`의 `PageHeader title=` 영역(라운드+gameId+배지+룰 버튼)에 가로 폭 부담. 줄바꿈/생략 검토
- [ ] **`useMatchupAnimation` 의 `useRef` 불필요화 검토**: `onDone` callback ref 패턴 자체가 의도된 것인지 재검토
- [ ] **AppShell 전환 검토** (백로그): 페이지 30개 초과 또는 다중 패널 UI 요구 시 — 현재는 `PageHeader`로 충분

### ⚙️ 인프라/배포

- [ ] **배포 절차 문서화**: 현재 `docs/`에 배포 가이드 없음. SSH 호스트, deploy 명령, 환경변수 주입 절차를 `docs/DEPLOY.md`로 정리
- [ ] **CI/CD**: GitHub Actions로 자동 배포 (push to main → AWS)
- [ ] **`docker-compose.prod.yml` 변경 검토**: 다크 모드 제거 후 build cache 영향 없는지

---

## 핵심 파일 빠른 참조

| 영역 | 파일 |
|------|------|
| 디자인 시스템 토큰 | `frontend/src/styles/tokens.css` |
| 디자인 시스템 컴포넌트 스타일 | `frontend/src/styles/components.css` |
| 프리미티브 UI | `frontend/src/components/ui/*` |
| 페이지 헤더 통일 | `frontend/src/components/PageHeader.tsx` |
| 카드 스킨 시스템 | `frontend/src/components/cardSkins/` (types/default/index) |
| 카드 wrapper | `frontend/src/components/Card.tsx` |
| 게임 도메인 컴포넌트 (미정리) | `frontend/src/components/{PlayerBoard,Hand,ActionBar,ResultModal,RulesModal,ReplayBoard,TutorialOverlay}.tsx` |
| 디자인 원칙 | `CLAUDE.md` "프론트엔드 디자인 시스템" 섹션 |
