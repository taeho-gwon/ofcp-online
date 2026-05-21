# 2단계 (OFC Rich) 구현 계획

> CLAUDE.md의 단계 전략에 따른 2단계 상세 계획. 1단계 → 2단계 전환 시 DB 전체 초기화.

## 현 상태 (2026-05-21)

본 문서는 **과거의 청사진**이며, 잔여 작업·진행 상태는 [`BACKLOG.md`](BACKLOG.md)를 본다.

- **M1~M5, M7, M8, M9**: 완료. A·B·C·D·E·F sub-project가 모두 Done.
- **M6 (랭킹)**: ❌ **스킵** — 2026-05-12 사용자 결정. 본 문서 아래의 `rankings/` 모듈, `Ranking.tsx`, `/api/rankings` 엔드포인트, "랭킹 페이지 진입 동선" 관련 기술은 **무효**.
- **잔여**: G(공개 운영 안전장치), Ops(운영 준비), QA(E2E 검증) — `BACKLOG.md` 참조.

2.5단계 코스메틱은 본 문서 범위 밖. [`superpowers/specs/2026-05-17-cosmetics-backend-design.md`](superpowers/specs/2026-05-17-cosmetics-backend-design.md) 참조.

---

## 목표

1단계 OFC MVP의 게임 로직·실시간 통신 검증 완료 → 공개 서비스로 전환하며 **회원·랭킹·기록** 도입.

## 결정 사항

| 항목 | 결정 |
|------|------|
| 공개 범위 | 공개 서비스, 비영리/교육 목적 명시 (푸터·이용 안내) |
| 인증 | Google OAuth 단일 |
| 표시 이름 | 닉네임 별도 설정 (첫 로그인 시 입력, 이후 수정 가능) |
| 게스트 허용 범위 | 1인용 연습 모드 전용. 멀티플레이 방은 로그인 필수 |
| 랭킹 지표 | 승률·경기수·총점·평균점 단순 집계 (Elo 미도입) |
| 기록 깊이 | 매 행동 이벤트 전체 저장 (리플레이 가능) |
| 매칭 방식 | 방 만들기·참가 중심 (빠른 매칭 미도입) |
| 봇 | 미도입. 1인용 연습 모드로 대체 |
| 연습 모드 형태 | 소로 설치 + 자유 배치, Royalty·Foul 계산만 표시 |
| Surrender | 미도입 |
| DB 마이그레이션 도구 | Alembic |

## 아키텍처 변경

### 백엔드 추가 도메인

```
app/
├── auth/           [NEW] Google OAuth, JWT 발급/검증
│   ├── oauth.py        # Google 토큰 검증 (google-auth lib)
│   ├── jwt.py          # 자체 JWT 발급/검증
│   ├── deps.py         # FastAPI Depends (get_current_user, optional_user)
│   └── router.py       # POST /api/auth/google, POST /api/auth/refresh
├── users/          [NEW] 회원 관리
│   ├── models.py       # User ORM
│   ├── repository.py
│   ├── service.py      # 닉네임 중복 검사, 닉네임 변경
│   └── router.py       # GET /api/users/me, PATCH /api/users/me/nickname
├── records/        [NEW] 게임 기록 + 이벤트
│   ├── models.py       # Game, GamePlayer, GameEvent ORM
│   ├── repository.py
│   ├── service.py      # 게임 시작/종료 시 기록, 이벤트 append
│   ├── replay.py       # 이벤트 stream → 라운드별 상태 재구성
│   └── router.py       # GET /api/users/{id}/games, GET /api/games/{id}/events
├── rankings/       [NEW] 단순 통계 집계
│   ├── service.py      # SQL aggregate
│   └── router.py       # GET /api/rankings?period=all|month
└── core/
    └── db.py       [NEW] PostgreSQL async pool (asyncpg + SQLAlchemy 2.x async)
```

### 백엔드 기존 코드 수정 지점

- `app/config.py` — `database_url`, `jwt_secret`, `google_client_id` 추가
- `app/main.py` — 새 라우터 등록, 시작/종료 시 DB pool 관리
- `app/api/games.py:create_game` — `player_ids` 검증을 user_id 기반으로, `records.service.start_game()` 호출
- `app/api/ws.py:_handle_action` — 액션 처리 후 `records.service.append_event()` 훅. JWT로 player_id ↔ user_id 검증
- `app/api/ws.py:ConnectionManager` — 라운드 종료(DONE phase) 시 `records.service.finish_round()` 호출
- `app/game/` — **변경 없음** (게임 로직 그대로 재사용)

### 프론트엔드 추가/수정

```
frontend/src/
├── pages/
│   ├── Login.tsx           [NEW] Google 로그인 버튼
│   ├── NicknameSetup.tsx   [NEW] 첫 로그인 시 닉네임 입력
│   ├── Lobby.tsx           [NEW] Entry 분할 — 방 만들기/참가/연습/랭킹/기록 진입
│   ├── Ranking.tsx         [NEW]
│   ├── History.tsx         [NEW] 본인/타인 게임 목록
│   ├── Replay.tsx          [NEW] 이벤트 stream 재생
│   └── Practice.tsx        [NEW] 1인용 연습 (소로 설치 + 자유 배치)
├── store/
│   ├── authStore.ts        [NEW] 토큰, user 객체, 닉네임
│   └── gameStore.ts        # 변경 없음
├── api/
│   ├── client.ts           # Authorization 헤더 자동 추가, 신규 endpoint 함수
│   └── auth.ts             [NEW] google login, refresh, me
└── App.tsx                 # 라우트 추가, <RequireAuth> 가드 도입
```

수정 지점:
- `Entry.tsx` — Lobby로 역할 이동. 닉네임 입력 폼 삭제, 로그인 유저의 user_id로 방 생성
- `api/ws.ts` — 연결 URL에 JWT 토큰 포함
- `App.tsx` — `<RequireAuth>` 래퍼로 멀티플레이 경로 가드, `/practice`는 게스트 허용

## 데이터베이스 스키마

```sql
-- 회원
users (
  id          UUID PK,
  google_sub  TEXT UNIQUE NOT NULL,
  email       TEXT NOT NULL,
  nickname    CITEXT UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
)

-- 게임 (라운드 모음 = 한 판)
games (
  id          UUID PK,
  room_code   TEXT,
  ruleset     TEXT NOT NULL,           -- 'pineapple'
  started_at  TIMESTAMPTZ NOT NULL,
  ended_at    TIMESTAMPTZ,
  round_count INT NOT NULL DEFAULT 0
)

-- 게임 참가자
game_players (
  game_id        UUID REFERENCES games(id),
  user_id        UUID REFERENCES users(id),
  seat_idx       INT NOT NULL,
  final_score    INT,
  fouled_rounds  INT NOT NULL DEFAULT 0,
  fantasy_rounds INT NOT NULL DEFAULT 0,
  PRIMARY KEY (game_id, user_id)
)
CREATE INDEX ON game_players (user_id);

-- 이벤트 로그 (리플레이용 매 행동 저장)
game_events (
  id          BIGSERIAL PK,
  game_id     UUID REFERENCES games(id),
  seq         INT NOT NULL,
  ts          TIMESTAMPTZ NOT NULL,
  event_type  TEXT NOT NULL,           -- 'first_turn'|'normal_turn'|'fantasy_turn'|'round_end'|'game_end'
  actor_id    UUID,
  payload     JSONB NOT NULL,
  UNIQUE (game_id, seq)
)
CREATE INDEX ON game_events (game_id, seq);
```

방(room)은 Redis만 사용. 게임 시작 시 `games` INSERT, 종료 시 `ended_at` UPDATE.

## 구현 마일스톤

| M | 내용 | 산출물 |
|---|------|--------|
| M1 | PostgreSQL + Alembic 도입 | `app/core/db.py`, `migrations/`, docker-compose에 postgres 서비스 |
| M2 | Google OAuth + JWT + 회원 API | `app/auth/`, `app/users/`, `users` 테이블 |
| M3 | 프론트 로그인 + 닉네임 설정 흐름 | `Login.tsx`, `NicknameSetup.tsx`, `authStore.ts` |
| M4 | 로비 분리 + 멀티플레이 인증 가드 | `Lobby.tsx`, `<RequireAuth>`, `ws.ts` 토큰 전달 |
| M5 | 게임 기록 저장 (games, game_players, game_events) | `app/records/`, ws 핸들러 훅 |
| M6 | 랭킹 집계 API + 페이지 | `app/rankings/`, `Ranking.tsx` |
| M7 | 기록 목록 + 리플레이 페이지 | `History.tsx`, `Replay.tsx`, `replay.py` |
| M8 | 1인용 연습 모드 (게스트 허용) | `Practice.tsx` — 기존 Royalty 계산기 재사용 |
| M9 | 비영리/교육 목적 표시 + 이용 안내 | 푸터, 약관 페이지 |

M1~M4는 순차 의존. M5~M8은 M4 이후 병렬 가능.

## 재사용할 기존 자원

- `app/game/scoring.py` — `royalty_top/middle/bottom`, `head_to_head_detail`. 연습 모드·기록 표시
- `app/game/board.py` — `PlayerBoard.is_foul`, `is_complete`
- `app/game/hand.py` — `evaluate`, `format_hand_value`
- `app/game/state.py` — 리플레이 시 GameState 재구성
- `frontend/src/components/` — Card, Hand, PlayerBoard 컴포넌트 그대로 재사용

## 검증 방법

### 단위·통합 테스트
- 기존 `tests/` 전체 통과 (게임 로직 회귀 없음)
- 신규: `tests/test_auth.py`, `tests/test_records.py`, `tests/test_rankings.py`

### 마이그레이션 검증
```bash
docker compose up -d postgres
uv run alembic upgrade head
# users, games, game_players, game_events 4개 테이블 생성 확인
```

### E2E 시나리오
1. Google 로그인 → 닉네임 입력 → 로비 진입
2. 2명 로그인 → 방 생성 → 게임 완주 → 라운드/게임 종료
3. DB에 games 1행, game_players 2행, game_events N행
4. 기록 페이지 → 게임 선택 → 라운드별 보드 재현
5. `/ranking`에서 두 유저 모두 경기수 +1
6. 로그아웃 상태로 `/practice` 진입 가능, Royalty/Foul 표시
7. 로그아웃 상태로 `/lobby` 진입 시 `/login` 리다이렉트

## 의도적 제외 항목 (3단계 이후)

- Elo·Glicko 등 레이팅 계산
- 빠른 매칭 큐
- 봇 AI
- Surrender (보류, 추후 단계에서도 재논의 보류)
- 친구·채팅·관전
- MSA 전환

## 미결 항목 (구현 직전 확정 필요)

- JWT 만료 시간·refresh 정책 (예: access 30분 / refresh 14일)
- 닉네임 정책 (길이·금칙어·변경 빈도 제한)
- `room_code` 형식 (6자 영숫자? UUID 단축?)
- 진행 중인 게임에 새로 로그인 가능 여부 (재접속 흐름)
- 랭킹 기간 (전체/월간/주간 중 어디까지)
