# 2단계 (OFC Rich) 백로그

> 2단계 작업 단위. sub-project별 섹션 + 잔여 티켓.
> 설계 청사진: [PHASE2.md](PHASE2.md) — 도메인 트리·DB 스키마·재사용 자원.
> 백로그 운영 규칙: [superpowers/specs/2026-05-17-phase2-backlog-design.md](superpowers/specs/2026-05-17-phase2-backlog-design.md).

**2026-05-17 스캔 결과**: A~F 코어 구현은 사실상 완료된 상태였음. 본 백로그는 잔여 작업(G 마감 + 운영 준비 + E2E 검증 + 옵션 보강)으로 재구성됨.

## 진행 현황

| Sub | 이름 | 의존 | 상태 | 잔여 |
|-----|------|------|------|------|
| A | DB 인프라 | — | **Done** | — |
| B | 인증·회원 | A | **Done** | google_client_id 운영값 주입 |
| C | 로비·인증 가드 | B | **Done** | E2E 수동 검증 |
| D | 게임 기록 | C | **Done** | — |
| E | 리플레이 | D | **Done** | (옵션) 재생 컨트롤 UI 보강 |
| F | 연습 모드 | — | **Done** | (옵션) FantasyLand 라운드 지원 |
| G | 공개 운영 안전장치 | — | **In Progress** | 신고 채널 구체화, 비공개 모드, 등급분류 검토 |
| Ops | 운영 준비 | — | **Pending** | 도메인·DNS·HTTPS·env·로그·백업 |
| QA | E2E 검증 | C·D·E | **Pending** | 로그인→게임→기록→리플레이 풀 시나리오 |

오픈 라인: **G·Ops·QA 완료**.

---

## A. DB 인프라 [Done]

PostgreSQL + Alembic + SQLAlchemy 2.x async 구성 완료. 두 마이그레이션(`users`, `games/game_players/game_events`) 적용 상태.

- [x] `asyncpg` / `SQLAlchemy[asyncio]` / `alembic` 의존성
- [x] postgres 서비스 (`docker-compose.yml`)
- [x] `app/config.py` `database_url`
- [x] `app/core/db.py` — `Base`, engine, session factory, `get_session`, `close_db`
- [x] `app/main.py` lifespan에 `close_db` wiring
- [x] `alembic.ini` + `migrations/env.py` (async, settings에서 url 주입)
- [x] 첫 마이그레이션 적용

**미결 항목**: 없음.

---

## B. 인증·회원 [Done]

Google OAuth + 자체 JWT(access/refresh/signup) + users 테이블 + 닉네임 정책 + dev-login. 단위·통합 테스트 포함.

- [x] `google-auth` / `pyjwt` 의존성
- [x] `users` 테이블 마이그레이션 (`b689030b915e`)
- [x] `app/users/` (models·repository·service·router·schemas)
- [x] 닉네임 정책 — 2~16자 한글/영문/숫자/_ (`_NICKNAME_PATTERN`)
- [x] `app/auth/` (jwt·oauth·deps·router·schemas)
- [x] JWT TTL — access 30분 / refresh 14일 / signup 10분
- [x] `/auth/google`, `/auth/signup`, `/auth/refresh`, `/auth/dev-login`
- [x] `/users/me`, `PATCH /users/me/nickname`, `/users/check-nickname`
- [x] 테스트: `test_auth_flow`, `test_jwt`, `test_users_api`, `test_nickname_validation`

**잔여 작업**:
- [ ] 운영 환경 `GOOGLE_CLIENT_ID` 주입 (코드 변경 없음 — env/배포 단계 작업, Ops 섹션 참고)
- [ ] `dev_auth_enabled` 운영에서 false 확인 (Ops 섹션 참고)

**미결 항목**: 없음.

---

## C. 로비·인증 가드 [Done]

프론트엔드 로그인·닉네임 설정 흐름 + Lobby + RequireAuth + ws JWT 전달 모두 wired up.

- [x] `frontend/src/store/authStore.ts` (zustand persist, signup 흐름 포함)
- [x] `frontend/src/api/auth.ts`, `authTypes.ts`, `client.ts` (Authorization 헤더)
- [x] `frontend/src/pages/Login.tsx` (`@react-oauth/google`)
- [x] `frontend/src/pages/NicknameSetup.tsx`
- [x] `frontend/src/components/RequireAuth.tsx`
- [x] `frontend/src/pages/Lobby.tsx`
- [x] `frontend/src/App.tsx` — `GoogleOAuthProvider` 래핑, 라우트(`/login`, `/nickname-setup`, `/`, `/room/:code`, `/game/:gameId`, `/me`, `/history`, `/replay/:gameId`, `/practice`, `/tutorial`, `/about`)
- [x] `frontend/src/api/ws.ts` 토큰 전달
- [x] `app/api/ws.py` JWT 검증 + user_id 매핑 + 4401/4403/4404

**잔여 작업**:
- [ ] E2E 수동 검증 (QA 섹션에 포함)

**미결 항목**:
- `room_code` 형식 — `app/rooms/` 코드 확인 시 확정 필요
- 진행 중 게임 도중 재로그인 흐름 — ws에서 동일 user 재접속 시 prev 교체 처리 있음. 의도된 동작인지 정책 명시 필요

---

## D. 게임 기록 [Done]

games·game_players·game_events 테이블 + service·repository + ws 핸들러 훅 모두 적용. 테스트 포함.

- [x] `games` / `game_players` / `game_events` 마이그레이션 (`faa1a0411c89`)
- [x] `app/records/` (models·repository·service·router·schemas)
- [x] `app/records/service.py` — `start_game`, `append_action_event`, `append_round_end`, `append_game_end`, `_round_deltas`
- [x] `app/api/games.py:create_game`에 `start_game` 호출
- [x] `app/api/ws.py:_handle_action`에 `append_action_event` 훅
- [x] DONE phase에서 `append_round_end`, GAME_OVER에서 `append_game_end`
- [x] `/records/users/me/games`, `/records/users/{id}/games`, `/records/games/{id}`, `/records/games/{id}/events`
- [x] 테스트: `test_records`, `test_records_api`

**미결 항목**: 없음.

---

## E. 리플레이 [Done]

`round_end` 이벤트 payload에 boards/scores/deltas/next_fantasy_cards가 모두 포함되어 있어 별도 재구성 모듈(`replay.py`) 없이 프론트에서 직접 표시. 라운드 카드형 UI.

- [x] `Replay.tsx` — `extractRounds` 헬퍼로 `round_end`만 필터링, `ReplayBoard`로 표시
- [x] `History.tsx`
- [x] `ReplayBoard.tsx` 컴포넌트
- [x] `frontend/src/api/records.ts` (`GameDetailResponse`, `GameEventOut`, `RoundEndPayload` 타입)

**잔여 작업 (옵션)**:
- [ ] 재생 컨트롤 UI — 일시정지/속도/되감기 (현 구현은 라운드별 카드를 모두 펼친 형태)
- [ ] action 이벤트(first_turn·normal_turn·fantasy_turn) 단위 재생 — 현재 round_end만 표시

> 옵션 작업은 사용자가 명시 요청 시에만 진행.

**미결 항목**: 없음 (현 구현으로 운영 가능).

---

## F. 연습 모드 [Done]

1라운드씩 반복하는 1인용 모드. Royalty 표시·FL 진입 카드 수 표시·누적 점수. 게스트 허용 (`useAuthStore`로 인증 여부만 헤더에 반영).

- [x] `Practice.tsx` — first_turn 5장 + normal_turn × 4
- [x] Foul·Royalty 계산 (`evaluate`, `royaltyTop/middle/bottom`)
- [x] FantasyLand 진입 카드 수 표시 (`fantasyEntryCards`)
- [x] 누적 점수·버린 카드 표시
- [x] `/practice` 라우트 (게스트 허용, App.tsx)
- [x] Lobby에서 진입 동선

**잔여 작업 (옵션)**:
- [ ] FantasyLand 라운드 자체 진행 (현재는 진입 카드 수만 표시하고 다음 라운드는 다시 first_turn)
- [ ] 연속 FL 진입 조건 시연
- [ ] 다인 시뮬레이션(가상 상대 보드 비교)

> 옵션 작업은 사용자가 명시 요청 시에만 진행.

**미결 항목**: 없음 (현 구현으로 운영 가능).

---

## G. 공개 운영 안전장치 [In Progress]

Footer·About 문구는 적용됨. 운영자 통제·신고 채널 구체화 잔여.

- [x] `Footer.tsx` — "비영리·교육 목적 — 현금/환금 일절 다루지 않으며 점수만 사용합니다."
- [x] `About.tsx` — "현금을 다루지 않습니다", "비영리·교육 목적", "신고" 3개 섹션

**잔여 작업**:
- [ ] 신고 접수 채널 구체화 — 이메일 주소 표기 또는 단순 폼 추가 (About에 명시)
- [ ] 운영자 비공개 모드 — `SHUTDOWN_MODE` env 토글 시 `/api/*` 503 응답 + 프론트 안내 페이지
- [ ] 비공개 모드 검증 — env=true로 띄워 모든 경로 차단 확인
- [ ] 게임물관리위원회 등급분류 대상 여부 자체 검토 — 무료 + 비영리 + 환금 없음 + 채팅 없음으로 비대상 판단 근거 정리(`docs/COMPLIANCE.md` 등)

**미결 항목**:
- 신고 채널 — 이메일? 폼? Discord? → 결정 후 작업
- 비공개 모드 — env 토글로 충분? 어드민 페이지까지? → 1인 운영 부담 고려해 env 토글이 1차안

---

## Ops. 운영 준비 [Pending]

코드 외 작업. 도메인·환경변수·로그·백업.

- [ ] `GOOGLE_CLIENT_ID` 운영값 발급 (Google Cloud Console) 및 env 주입
- [ ] `JWT_SECRET` 강력한 운영값 생성 및 env 주입
- [ ] `DEV_AUTH_ENABLED=false` 확인
- [ ] `DATABASE_URL` 운영값 (도커 네트워크 내부 호스트명)
- [ ] `ALLOWED_ORIGINS` 운영 도메인 (`https://ofcp.duckdns.org`)
- [ ] `docker-compose.prod.yml` 검토 — postgres 볼륨 외부 백업 경로 / 재시작 정책
- [ ] 로그 — `logging.basicConfig`만으로 충분? 파일 로테이션 필요? (1차안: stdout만 + docker logs)
- [ ] postgres 백업 — `pg_dump` cron 또는 호스트 cron + 보관 기간
- [ ] 모니터링 — health endpoint(`/health`) 외 상태점검 필요한 지점

**미결 항목**:
- 백업 보관 기간·보관 위치
- 모니터링 수준 — uptime 체크만? 알람?

---

## QA. E2E 검증 [Pending]

오픈 전 수동 시나리오 검증.

- [ ] Google 로그인 → 닉네임 설정 → 로비 진입
- [ ] 2명 로그인 → 방 생성·참가 → 게임 완주 → 점수·라운드 종료
- [ ] DB 확인 — `games` 1행 / `game_players` 2행 / `game_events` N행
- [ ] 기록 페이지 → 게임 선택 → 라운드별 보드 재현
- [ ] 게스트 상태 `/practice` 진입 가능, Royalty/Foul 표시
- [ ] 게스트 상태 `/lobby` (`/`) 진입 시 `/login` 리다이렉트
- [ ] 닉네임 변경 → `/me`에서 반영 확인
- [ ] 동일 user 다른 탭 로그인 시 ws 교체 동작
- [ ] 다국어 입력 (한글 닉네임) 정상 동작
- [ ] 모바일 viewport 기본 동선
- [ ] FL 진입·FL 라운드 정상 처리

---

## 2.5단계 예고

코스메틱 (카드 이미지·게임 보드·아바타 유료) 도입 예정. 2단계 오픈 이후 별도 brainstorming 트랙으로 진행. 결제 인프라·등급분류 재검토·약관 수정 등이 별도 백로그(`docs/BACKLOG_PHASE25.md`)로 분리될 예정.
