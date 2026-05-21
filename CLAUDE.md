# CLAUDE.md

## 프로젝트 개요

온라인 멀티플레이 보드게임 서비스. 1단계는 Pineapple OFC(Open Face Chinese Poker) MVP.
React + Vite + TypeScript 프론트엔드, FastAPI + Python 3.13 백엔드, WebSocket 실시간 통신.

참고 레포: https://github.com/taeho-gwon/mahjong-group-project

---

## 개발 단계 및 현재 상태

**현재: 2.5단계(코스메틱) 진입 직전.** 2단계 코어(A~F) Done, G·Ops·QA는 2026-05-21 결정으로 **스킵**. 필요 시 재아이디에이션해 별도 트랙으로 재개.

| 단계 | 내용 | DB | 상태 |
|------|------|----|----|
| 1 | OFC MVP — 게임 로직·실시간 통신 검증 | Redis만 (게임 상태) | Done |
| 2 | OFC Rich — 회원·기록·연습 (G·Ops·QA 스킵) | PostgreSQL 도입 | Closed (코어 Done, 운영 안전장치 트랙은 별도) |
| 2.5 | 코스메틱 — 카드 face/back·board·score_effect (1차 무료 자동소유, 결제는 후속) | cosmetics 3 테이블 추가 | **In Progress (plan 작성 단계)** |
| 3 | 하트·스페이드 추가 | 게임별 이벤트 스키마 확장 | 미진입 |
| 4 | 티츄 — 실시간 경합, XState·MSA 전환 검토 | - | 미진입 |

> **2단계 변동 사항**:
> - M6 랭킹 — 2026-05-12 결정으로 스킵
> - G(공개 운영 안전장치)·Ops(운영 준비)·QA(E2E 검증) — 2026-05-21 결정으로 스킵. 코스메틱 진입을 우선. 운영 공개 직전에 별도 트랙으로 재개 검토

단계 전환 시 DB를 초기화하는 전략을 유지하되, **2 → 2.5 → 3 사이는 DB 보존**(스키마는 확장만). 3 → 4 전환 시 재초기화 검토.

### 다음 작업 진입 경로

2.5단계 코스메틱 **plan 작성** (`superpowers:writing-plans`) → TDD 구현 → 마이그레이션 → 프론트 마이페이지 연동. spec은 [`docs/superpowers/specs/2026-05-17-cosmetics-backend-design.md`](docs/superpowers/specs/2026-05-17-cosmetics-backend-design.md).

---

## 문서·메모리 체계 (SoT 지도)

작업 시 어느 문서가 진실인지 헷갈리지 않도록 역할을 고정한다.

| 위치 | 역할 | 갱신 주기 |
|------|------|---------|
| `CLAUDE.md` (이 파일) | **단일 진실 원천**. 현재 단계, 방법론, 디자인 시스템, 게임 규칙 | 단계·방법론·핵심 규칙 변경 시 |
| `docs/PHASE2.md` | 2단계 설계 청사진 (도메인 트리·DB 스키마·재사용 자원). 과거 청사진이므로 잔여 작업 확인은 BACKLOG.md를 본다 | 거의 안 바뀜 |
| `docs/BACKLOG.md` | 2단계 작업 단위. 진행 상태·잔여 티켓·미결 항목 | 매 작업 시 |
| `docs/superpowers/specs/` | Superpowers brainstorm→spec 산출물. sub-project별 1개 | sub-project 진입 시 |
| `~/.claude/projects/.../memory/` | 다음 세션 컨텍스트 회복용 메모리 | 세션 종료 시 |

**규칙**:
- 단계 상태·결정 사항은 CLAUDE.md를 1차 출처로 본다. 다른 문서는 CLAUDE.md를 가리키게 둔다.
- BACKLOG.md는 2단계 전용. 2.5단계 진입 시 `docs/BACKLOG_PHASE25.md`로 분리.
- 결정이 바뀌면 CLAUDE.md → memory → 관련 spec 순으로 동기화한다.

---

## 아키텍처 원칙

- **모듈러 모놀리스**로 시작. 4단계 이후 MSA 전환 검토.
- 도메인 간 직접 import 금지. 도메인 경계는 ID·이벤트로만 통신.
- XState는 4단계(티츄, 실시간 경합)에서 도입. 1~3단계는 Zustand의 `phase` 필드로 게임 흐름 관리.

---

## 개발 방법론 — Superpowers

[obra/superpowers](https://github.com/obra/superpowers) Claude Code 플러그인의 워크플로우를 따른다. 설치된 skills는 세션에서 자동 트리거된다.

### 7단계 워크플로우

새 기능·비자명한 변경 시 다음 순서를 거친다:

1. **Brainstorm** — 요구사항 소크라테스식 정리
2. **Spec** — 사양 문서화 (수용 기준 포함)
3. **Plan** — 구현 계획 분해
4. **TDD** — RED/GREEN/REFACTOR (적용 범위는 아래 참고)
5. **Subagent Development** — 독립 작업은 git worktree에서 sub-agent로 병렬 실행
6. **Review** — 체계적 코드 리뷰
7. **Finalize** — 머지 전 정리

### TDD 적용 범위 (1단계)

- **강제**: `backend/` 게임 도메인 로직 — 핸드 평가, 점수 계산, Foul 판정, FantasyLand 진입·연속 조건, Royalty 계산, 패 비교.
- **권장**:
  - 백엔드 WebSocket 핸들러·상태 전이·이벤트 디스패치.
  - 프론트엔드 Zustand 스토어(리듀서·액션), 커스텀 훅 로직, 순수 유틸 함수(카드 정렬·포맷터 등).
- **면제**: 프론트엔드 컴포넌트 렌더링·페이지 조립·디자인 토큰·CSS, 인프라(Caddy·docker-compose) 설정.

이유: 게임 룰과 상태 관리는 회귀 위험이 크지만, 시각 컴포넌트는 시각 검증이 더 효과적이다. 2단계 진입 시 컴포넌트 행동 테스트(RTL) 도입 여부를 재검토한다.

### 워크플로우 면제 케이스

다음은 7단계를 건너뛰고 바로 수정한다:

- 1-line 버그 픽스, 오타·문구·로그 메시지 수정
- 의존성 버전 업, lockfile 갱신
- 인프라 설정값 조정 (포트, 환경변수 등)
- 디자인 토큰·CSS 조정, 컴포넌트 시각 보정

---

## 프론트엔드 디자인 시스템

페이지·컴포넌트 작성 시 다음 규칙을 따른다.

### 계층 구조

- **토큰**: `frontend/src/styles/tokens.css` — 색·간격·폰트·그림자 등 raw 값을 CSS 변수로 정의. 라이트/다크 모드 모두 같은 변수명.
- **프리미티브 컴포넌트**: `frontend/src/components/ui/*` — Button, Field/Input, Alert, Badge, Modal 등. 토큰을 흡수한 일관된 UI 단위.
- **게임 컴포넌트**: `frontend/src/components/game/*` — RoomCode, ScorePill, Timer 등 게임 도메인 전용.
- **페이지**: 위 컴포넌트를 조립하는 곳. 색·시각 스타일을 직접 작성하지 않는다.

### Tailwind와의 분담

- **Tailwind = 레이아웃 전용**: `flex`, `grid`, `gap-*`, `p-*`, `m-*`, `min-h-*`, `max-w-*`, `w-*`, `items-*`, `justify-*`, `text-center`, `text-left` 등 구조·간격 유틸만 사용.
- **색·배경·테두리·그림자·radius·폰트 크기·hover 상태 = 디자인 시스템**: 토큰(`var(--bg-surface)` 등)을 흡수한 클래스(`.card`, `.btn`)나 UI 컴포넌트를 쓴다.
- **금지**: `bg-slate-*`, `bg-white`, `text-amber-*`, `border-slate-*`, `shadow`(Tailwind), `rounded-lg` 같은 색·시각 유틸. 발견 즉시 토큰·컴포넌트로 교체.

### 새 색·새 컴포넌트가 필요할 때

- 색이 필요한 곳: 먼저 `tokens.css`에 해당 의미의 토큰이 있는지 확인 → 있으면 사용, 없으면 라이트/다크 두 모드에 함께 추가.
- 1회용 시각 보정: 인라인 `style={{ color: "var(--text-secondary)" }}` 허용.
- 재사용될 컴포넌트: `components/ui/`에 추가하고 `index.ts`에서 export.

### 라이트 모드 전용

- 1단계는 라이트 모드만 사용. 다크 모드 토글·`useColorMode` 훅·`[data-mode="dark"]` 토큰 블록 모두 제거됨.
- **카드 시각(`components/cardSkins/`)은 토큰을 거치지 않고 raw 색을 사용**한다. 추후 다크 모드가 다시 도입되더라도 카드 face·back·empty slot은 모드와 무관하게 동일한 색을 유지해야 한다 (다른 코스메틱 스킨도 동일 원칙).

---

## 의도적 제외 항목 (단계별)

아래는 버그나 누락이 아니라 **의도적으로 배제**한 항목이다.

**1단계에서 제외했던 것 (이미 2단계에서 도입됨)**
- 인증 없음 → 2단계 Google OAuth 도입 완료
- PostgreSQL 없음 → 2단계 도입 완료
- 게임 기록 저장 없음 → 2단계 도입 완료

**현 단계(2~2.5)에서도 계속 제외**
- 드래그앤드롭 — 카드 클릭 → 슬롯 클릭 방식 유지
- 봇 AI — 1인용 연습 모드로 대체
- 채팅 — 운영 부담 회피
- 랭킹 — 2026-05-12 결정으로 스킵 (M6 청사진은 무효)
- Surrender — 보류
- Elo/Glicko 등 레이팅
- 빠른 매칭 큐
- 다중 OAuth (Google 단일)

**2.5단계까지의 코스메틱 정책**
- 결제·잠금 UX 없음 — 모든 코스메틱 자동 소유 (cosmetics-backend-design.md 참조)
- 결제 인프라·게임물관리위원회 등급분류는 후속 spec에서 별도 검토

---

## OFC 게임 도메인 규칙

### 기본 구조

- **Pineapple OFC**: 매 턴 3장 받고, 탑(3장)·미들(5장)·바텀(5장) 중 2장 배치, 1장 버림.
- **Foul**: 탑 ≥ 미들 ≥ 바텀 조건 위반 시 발생. Foul 플레이어는 3줄 모두 최하 핸드 취급, Royalty 없음.
- **점수**: 줄별 1:1 비교 (이기면 +1, 지면 -1, 비기면 0). 제로섬.
- **Scooping**: 3줄 모두 이기면 추가 +3.

### FantasyLand 진입 조건

탑에 QQ 이상 페어 배치 완료 시 진입.

| 탑 핸드 | 수령 장수 |
|---------|---------|
| QQ | 14장 |
| KK | 15장 |
| AA | 16장 |
| 트립스(탑 트리플) | 17장 |

### FantasyLand 연속 진입 조건

FantasyLand 중 다음 조건 달성 시 다음 라운드도 FantasyLand(14장):
- 탑: 트립스 이상
- 바텀: 퀴즈(Four of a Kind) 이상

### Royalty 점수표

| 탑 | 점수 | 미들 | 점수 | 바텀 | 점수 |
|----|------|------|------|------|------|
| 66x | 1 | 트리플 | 2 | 스트레이트 | 2 |
| 77x | 2 | 스트레이트 | 4 | 플러시 | 4 |
| 88x | 3 | 플러시 | 8 | 풀하우스 | 6 |
| 99x | 4 | 풀하우스 | 12 | 포카드 | 10 |
| TTx | 5 | 포카드 | 20 | 스트레이트 플러시 | 15 |
| JJx | 6 | 스트레이트 플러시 | 30 | 로열 플러시 | 25 |
| QQx | 7 | 로열 플러시 | 50 | | |
| KKx | 8 | | | | |
| AAx | 9 | | | | |
| 222 | 10 | | | | |
| 333 | 11 | | | | |
| 444 | 12 | | | | |
| 555 | 13 | | | | |
| 666 | 14 | | | | |
| 777 | 15 | | | | |
| 888 | 16 | | | | |
| 999 | 17 | | | | |
| TTT | 18 | | | | |
| JJJ | 19 | | | | |
| QQQ | 20 | | | | |
| KKK | 21 | | | | |
| AAA | 22 | | | | |

---

## 미결 항목 (추후 논의)

- 2단계 봇 상세 설계
- 2단계 Surrender 옵션 상세 룰
- 3단계 관전 시 손패 공개 범위
- MSA 전환 구체적 시점 및 기준
- 프론트엔드 AppShell 전환 — 현재 `PageHeader` 컴포넌트로 헤더 슬롯을 통일했지만, 추후 사이드바·상단바·콘텐츠 영역을 분리한 풀 AppShell로 발전시킬 수 있음. 페이지가 30개를 넘거나 다중 패널 UI(채팅·관전·랭킹 등)가 필요해지는 시점에 재검토.
