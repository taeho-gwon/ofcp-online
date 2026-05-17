# 2단계(OFC Rich) 백로그 설계

**일자**: 2026-05-17
**상태**: 사용자 검토 대기
**관련 문서**: [PHASE2.md](../../PHASE2.md), [BACKLOG.md](../../BACKLOG.md)

## 배경

기존 `docs/BACKLOG.md`는 1단계(OFC MVP) 작업 누적본이다. 2단계(OFC Rich)로 본격 진입하면서 처음부터 재구성한다.

이전 세션의 2단계 결정 사항(메모리 + `docs/PHASE2.md`)은 출발 전제로 유지한다. 단 두 가지는 백로그에 반영하지 않는다:

- **랭킹 (PHASE2.md의 M6)** — 2026-05-12 사용자 결정으로 스킵.
- **코스메틱 수익화** — 2026-05-16 결정. 2단계와 분리해 2.5단계 별도 트랙으로 운영.

오픈 라인은 **A~G sub-project 전체 완성 후** 일괄 공개.

## 백로그 운영 규칙

### 파일 구조

- `docs/PHASE2.md` — 설계 청사진 (도메인 트리·DB 스키마·재사용 자원). 자주 안 바뀜.
- `docs/BACKLOG.md` — 작업 단위. sub-project별로 목표·티켓·진행 상태·미결 항목·관련 spec 링크. 매 작업 시 갱신.
- `docs/superpowers/specs/...` — Superpowers brainstorming 결과물. sub-project 진입 시 sub-project별 spec doc 생성.

### Sub-project 분해

| Sub | 이름 | 의존 |
|-----|------|------|
| A | DB 인프라 | — |
| B | 인증·회원 | A |
| C | 로비·인증 가드 | B |
| D | 게임 기록 | C |
| E | 리플레이 | D |
| F | 연습 모드 | — |
| G | 공개 운영 안전장치 | — |

순차 체인: A → B → C → D → E. F·G는 언제든 끼워넣기 가능.

### 티켓 단위

- 1티켓 = 한 커밋 또는 한 PR로 끝낼 수 있는 크기.
- 너무 잘게 쪼개지 않음. 쓸 코드·검증 방법이 분명하면 1티켓.
- 체크박스 형식 (`- [ ]`).

### 미결 항목 처리

- 각 sub-project 섹션 하단에 `**미결 항목**` 블록.
- sub-project 진입 직전 사용자에게 확인하고 답을 받은 시점에 spec doc과 BACKLOG.md를 동시 갱신.
- 결정 안 된 항목을 코드에 추측으로 박지 않는다.

### Spec 링크

- sub-project를 시작할 때 `docs/superpowers/specs/<날짜>-<sub>-design.md`가 생성된다.
- 그 시점에 BACKLOG.md의 해당 sub-project 섹션 상단에 `Spec: [...](path)` 추가.
- 시작 전에는 링크 없음.

### 진행 상태 표시

- sub-project 헤더 옆: `[Pending]` `[In Progress]` `[Done]`.
- 티켓 단위: `- [ ]` / `- [x]`.

## Sub-project 내용 (스케치)

각 sub-project의 핵심 산출물과 미결 항목 요약. 자세한 내용은 BACKLOG.md에 반영.

| Sub | 핵심 산출물 | 미결 항목 |
|-----|------------|---------|
| A | postgres compose, `app/core/db.py`, alembic 초기화 | — |
| B | `app/auth/`, `app/users/`, users 테이블 | JWT 만료, 닉네임 정책 |
| C | `authStore`, `Login`, `NicknameSetup`, `Lobby`, `<RequireAuth>`, ws 토큰 | room_code 형식, 재접속 정책 |
| D | games/game_players/game_events 테이블, `app/records/`, ws 훅 | — |
| E | `app/records/replay.py`, 기록·리플레이 페이지·API | 리플레이 재생 UI |
| F | `Practice.tsx`, `/practice` 게스트 라우트 | 1인용 UI 인터랙션 |
| G | Footer·About 문구, 운영자 비공개 모드, 신고 채널 | 비공개 전환 방식, 신고 채널 |

## 2.5단계 예고

코스메틱 (카드 이미지·게임 보드·아바타 유료) 도입 시 추가 검토 사항:

- 게임물관리위원회 등급분류 대상 여부 (유료 게임으로 분류될 수 있음)
- 결제 인프라 (PG사 계약, 결제·환불 흐름)
- 인벤토리·소유 도메인
- 소비자보호법·약관 재작성
- "비영리·교육 목적" 문구 교체 (`Footer.tsx`, `About.tsx`)

2단계 완료 후 별도 brainstorming → spec → plan 트랙으로 진행. 백로그는 `docs/BACKLOG_PHASE25.md`로 분리.

## 다음 단계

이 spec 사용자 승인 → BACKLOG.md 초안 검토 → A. DB 인프라 sub-project의 brainstorming/writing-plans 진입.

## 부록 — 2026-05-17 코드 스캔 결과

BACKLOG.md 초안 작성 후 A 진입을 위해 코드를 스캔한 결과, 본 spec이 가정한 "신규 작업"이 사실상 대부분 완료된 상태였음.

- A·B·D 영역: 마이그레이션·도메인 모듈·테스트까지 완비
- C 영역: App.tsx 라우트·RequireAuth·authStore·ws JWT 검증 wired up
- E 영역: round_end payload에 boards/scores/deltas 포함, Replay.tsx에서 직접 표시 (replay.py 별도 모듈 불필요)
- F 영역: Practice.tsx 1라운드 반복 + Royalty + FL 진입 카드 수
- G 영역: Footer·About 문구만 적용, 신고 채널·비공개 모드·등급분류 검토 잔여

이에 따라 BACKLOG.md는 잔여 작업 + Ops + QA 중심으로 재작성. 본 spec의 구조(sub-project 단위 섹션)는 그대로 유지.
