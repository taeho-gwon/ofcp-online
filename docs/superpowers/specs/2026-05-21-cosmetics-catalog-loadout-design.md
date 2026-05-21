# 코스메틱 카탈로그 + Inventory + Loadout 설계

- 작성일: 2026-05-21
- 단계: 2.5단계 sub-project #1 (전체 5 sub-project 중 첫 번째)
- 범위: 코스메틱 시스템의 백엔드 토대 — 카탈로그·소유·장착 모델 + REST API + 신규 가입 자동 부여 + 게임 시작 payload 노출 + 마이페이지 슬롯 변경 UI

## 1. 배경과 위치

2026-05-21 결정으로 2.5단계 코스메틱을 雀魂 스타일 풀 시스템(공통 Item·Inventory·Loadout + 재화 + 가챠 + 시즌패스 + GameEvent 트리거)으로 확장. 직전 spec(`2026-05-17-cosmetics-backend-design.md`, 4 도메인 평면 자동소유)은 폐기.

비전 전체를 단일 spec으로 묶기에 너무 크므로 5 sub-project로 분해:

| # | Sub-project | 의존 |
|---|---|---|
| **1** | **카탈로그 + Inventory + Loadout 골격** (본 spec) | — |
| 2 | GameEvent 발행 시스템 | 1 |
| 3 | 재화 (젬·코인) + 트랜잭션 로그 | 1 |
| 4 | 상점 / 가챠 (천장·확률 공시) | 3 |
| 5 | 시즌 / 패스 | 1, 4 |

본 spec은 #1만 다룬다. 나머지는 각자 별도 spec으로 진입.

## 2. 1차 PR 범위

### 포함 (e2e 검증 가능)

- `cosmetics` / `user_cosmetic_inventory` / `user_cosmetic_loadout` 3 테이블 + 마이그레이션 4파일
- 4 카테고리: `card_back`, `card_face`, `table_theme`, `title`
- 카테고리별 시드 2 row (default + alt) — 총 8 row
- 신규 가입 시 모두 자동 소유 + category별 default를 loadout에 부여
- 기존 user 데이터 마이그레이션 (idempotent backfill)
- REST 3 endpoint
- `app/api/ws.py` 게임 시작 메시지 payload에 상대 코스메틱 `code` 포함
- 프론트 마이페이지에 `CosmeticsSection` — 4 카드, 각 2 옵션, "저장" → PUT 1회
- TDD: service 3 함수 + 라우터 통합 + ws 통합

### 의도적 비포함 (후속 PR / 다른 sub-project)

- 카드 face/back·table·title의 실제 시각 컴포넌트 → 후속 PR
- 게임 화면에서 상대 코스메틱 시각 렌더링 → 후속 PR (payload는 도착하지만 화면 변화 없음)
- in-game 이벤트별 연출 (effect_pack, score_effect) → sub-project 2 (GameEvent)
- 잠금·획득 경로 (모두 자동 소유) → sub-project 4 (상점/가챠)
- 캐릭터·스킨·보이스·BGM·이모트·시즌 → sub-project 2~5 + 후속
- `rarity` / `asset_bundle_ref` / `release_season_id` 컬럼 → 해당 sub-project 진입 시 ADD
- 운영자 어드민 UI (1차는 SQL·마이그레이션) → 후속
- 카탈로그 ETag·Cache-Control → 트래픽 관찰 후

## 3. 핵심 결정 요약

| 결정 | 선택 | 이유 |
|---|---|---|
| 데이터 모델 | 공통 Item + JSONB metadata + Inventory + Loadout (slot 기반) | 카테고리 13+ 확장 시 row insert만. 5 sub-project가 같은 토대 위 |
| 1차 카테고리 | 4종 (card_back, card_face, table_theme, title) | 게임 자산 3 + 식별 자산 1. 일반화 검증 충분 |
| 1차 시드 | 카테고리별 2개 (default + alt) | 마이페이지 e2e 검증에 최소 필요 |
| 1차 소유 정책 | 시드된 8 row 모두 자동 소유 | yagni. 잠금은 sub-project 4 |
| API 갱신 단위 | PUT 4 슬롯 묶음 | 마이페이지 "저장" UX + race 회피 |
| 게임 노출 | 게임 시작 ws 메시지 payload에 `code` 문자열 | 프론트 레지스트리 키 직접 매칭. 모르는 코드는 default fallback |
| 1차 미포함 컬럼 | rarity, asset_bundle_ref, release_season_id 등 | yagni. 해당 sub-project 진입 시 NULLABLE 컬럼 ADD |

## 4. 데이터 모델

### ENUM

```sql
CREATE TYPE cosmetic_category AS ENUM (
  'card_back', 'card_face', 'table_theme', 'title'
);
```

향후 sub-project에서 `character`, `skin`, `voice_pack`, `effect_pack`, `emote`, `seasonal`, `bgm`, `victory_pose`, `profile_frame` 등을 ALTER ADD VALUE로 확장.

### `cosmetics` — 카탈로그

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` | UUID PK | `uuid.uuid4()` default |
| `category` | `cosmetic_category` NOT NULL | |
| `code` | TEXT NOT NULL | 프론트 레지스트리 키 (예: `back.navy`) |
| `name` | TEXT NOT NULL | 표시명 (한국어) |
| `is_default` | BOOLEAN NOT NULL DEFAULT FALSE | category별 default 1개 |
| `sort_order` | INT NOT NULL DEFAULT 0 | 마이페이지 표시 순서 |
| `metadata` | JSONB NOT NULL DEFAULT `'{}'` | 카테고리별 자유 필드. 1차에는 사실상 미사용 |
| `created_at` | TIMESTAMPTZ NOT NULL DEFAULT NOW() | |

**제약**:
- UNIQUE `(category, code)`
- 부분 UNIQUE INDEX `(category) WHERE is_default` — category별 default 정확히 1개

### `user_cosmetic_inventory`

| 컬럼 | 타입 |
|---|---|
| `user_id` | UUID FK `users.id` ON DELETE CASCADE |
| `cosmetic_id` | UUID FK `cosmetics.id` ON DELETE RESTRICT |
| `acquired_at` | TIMESTAMPTZ NOT NULL DEFAULT NOW() |
| `source` | TEXT NOT NULL DEFAULT `'grant'` |
| PK | `(user_id, cosmetic_id)` |

`source`는 1차에 모두 `'grant'`. sub-project 4에서 `'purchase'`, `'gacha'`, `'gift'`, `'event'`, `'achievement'`, `'season_pass'` 등으로 확장.

### `user_cosmetic_loadout`

| 컬럼 | 타입 |
|---|---|
| `user_id` | UUID FK `users.id` ON DELETE CASCADE |
| `category` | `cosmetic_category` NOT NULL |
| `cosmetic_id` | UUID FK `cosmetics.id` ON DELETE RESTRICT |
| `updated_at` | TIMESTAMPTZ NOT NULL DEFAULT NOW() |
| PK | `(user_id, category)` |

**추가 무결성**:
- 컴포지트 FK `(user_id, cosmetic_id)` → `user_cosmetic_inventory(user_id, cosmetic_id)` (소유하지 않은 아이템 장착 불가)
- `cosmetic.category == loadout.category` 일치 검증은 service 레이어 (DB CHECK는 복잡)

1차에서 `category == slot`. 미래에 캐릭터가 effect_pack을 종속하면 slot은 별도 enum으로 분리 가능.

### 시드 데이터 (마이그레이션에서 INSERT)

| category | code | name | is_default | sort_order |
|---|---|---|---|---|
| card_back | back.navy | 네이비 | ✓ | 0 |
| card_back | back.ocean | 오션 | | 1 |
| card_face | face.classic | 클래식 | ✓ | 0 |
| card_face | face.modern | 모던 | | 1 |
| table_theme | table.green | 그린 펠트 | ✓ | 0 |
| table_theme | table.walnut | 월넛 | | 1 |
| title | title.beginner | 초보자 | ✓ | 0 |
| title | title.fl_demon | 판타지랜드 악마 | | 1 |

`name`·`code`는 placeholder 아닌 실 후보. 구현 단계에서 사용자가 확정 가능.

## 5. 백엔드 모듈 구조

```
app/cosmetics/
├── __init__.py
├── models.py        # Cosmetic, UserCosmeticInventory, UserCosmeticLoadout
├── schemas.py       # Pydantic (CosmeticOut, MyCosmeticsOut, LoadoutUpdateIn)
├── repository.py    # 쿼리만
├── service.py       # grant_defaults, update_loadout, get_loadouts_for_users
└── router.py        # 3 endpoint
```

기존 `app/users/`·`app/records/` 모듈 패턴 준수. 도메인 경계는 `users.id`(UUID)에만 의존.

## 6. REST API

| 메서드 | 경로 | 인증 | 응답 |
|---|---|---|---|
| GET | `/cosmetics/catalog` | 불요 | `[CosmeticOut]` 전체 카탈로그 (8 row) |
| GET | `/me/cosmetics` | 필요 | `{ owned: [cosmetic_id], loadout: { card_back, card_face, table_theme, title } }` (각 값은 cosmetic_id) |
| PUT | `/me/cosmetics/loadout` | 필요 | 갱신된 loadout 반환 |

### PUT 요청 본문

```json
{
  "card_back": "<uuid>",
  "card_face": "<uuid>",
  "table_theme": "<uuid>",
  "title": "<uuid>"
}
```

4 슬롯 모두 필수. 부분 갱신은 의도적으로 막아 race·복잡도 회피.

### PUT 갱신 검증 (service)

1. 4 cosmetic_id를 한 쿼리로 fetch
2. 각각 존재 확인
3. 각 cosmetic.category가 요청 슬롯 키와 일치 검증
4. 4 모두 user inventory에 있음을 검증 (composite FK가 강제하지만 422 응답 위해 service에서도 확인)
5. UPSERT 4 row (PK conflict on (user_id, category))
6. 어느 단계든 실패 시 전체 롤백, 422 응답

## 7. 서비스 함수 명세

### `grant_defaults(session, user_id) -> None`

신규 가입·기존 user 백필 양쪽에서 호출. **Idempotent**.

1. 모든 카탈로그 cosmetic을 inventory에 INSERT ... ON CONFLICT DO NOTHING (`source='grant'`)
2. category별 `is_default=TRUE` cosmetic을 loadout에 INSERT ... ON CONFLICT DO NOTHING (이미 선택한 게 있으면 보존)

1차 정책상 inventory는 카탈로그와 1:1로 채워진다. sub-project 4에서 신규 추가 아이템은 grant_defaults가 부여하지 않도록 분기 추가 예정.

### `update_loadout(session, user_id, payload) -> LoadoutOut`

위 § 6의 검증 절차 그대로. 모든 단계가 같은 트랜잭션.

### `get_loadouts_for_users(session, user_ids) -> dict[UUID, dict[str, str]]`

N+1 방지. 게임 시작 시 `app/api/ws.py`에서 호출.

- 입력: `[uuid]`
- 출력: `{ user_id: { card_back: code, card_face: code, table_theme: code, title: code } }`
- loadout row가 없는 user(이론적으로 없음 — grant_defaults가 보장)는 카테고리별 default cosmetic의 code로 fallback

내부적으로 `cosmetics` JOIN `user_cosmetic_loadout` 한 쿼리.

## 8. 통합 지점

### `app/auth/oauth.py`

신규 user INSERT 직후, 같은 트랜잭션에서 `cosmetics.service.grant_defaults(session, new_user.id)` 호출. 실패 시 회원가입 전체 롤백.

### `app/api/ws.py`

게임 시작 메시지 작성 지점에서:

1. 참가 user_id 목록을 모은다
2. `cosmetics.service.get_loadouts_for_users(session, user_ids)` 호출 (1 쿼리)
3. 게임 시작 message payload에 `cosmetics` 키 추가:

```jsonc
{
  "type": "game_start",
  "players": [
    {
      "user_id": "...",
      "nickname": "...",
      "seat_idx": 0,
      "cosmetics": {
        "card_back": "back.navy",
        "card_face": "face.classic",
        "table_theme": "table.green",
        "title": "title.beginner"
      }
    }
  ]
}
```

값은 cosmetic.`code` 문자열 (UUID 아님). 프론트가 모르는 `code`이면 카테고리별 default로 fallback.

### 기존 user 데이터 마이그레이션

별도 Alembic 마이그레이션에서 모든 기존 user에게 `grant_defaults` 효과를 SQL로 적용 (idempotent INSERT ... ON CONFLICT DO NOTHING).

## 9. 프론트엔드 (1차 PR 포함)

### 신규 파일

- `frontend/src/api/cosmetics.ts` — `getCatalog()`, `getMyCosmetics()`, `updateLoadout(payload)` 3 함수
- `frontend/src/store/cosmeticsStore.ts` — Zustand. `catalog`, `loadout`, `setLoadout()`. 게임·연습 화면에서 자기 loadout을 읽을 단일 출처
- `frontend/src/components/MyPage/CosmeticsSection.tsx` — 4 카테고리 카드, 각 카드에 옵션 2개 표시 + 현재 선택 강조 + "저장" 버튼 → PUT 1회

### 수정

- `frontend/src/pages/MyPage.tsx` — 기존 "추가 예정" 안내 일부 자리에 `CosmeticsSection` 삽입

### 1차 PR 비포함 (후속)

- 카드 face/back·테이블·title 실제 시각 컴포넌트 (`frontend/src/components/cardSkins/` 확장, `tables/`, `titles/` 신규 디렉터리 등)
- 게임 화면에서 상대 코스메틱 시각 렌더링 — payload는 도착하지만 화면은 변하지 않음

## 10. 마이그레이션 순서

별도 파일로 분리 (롤백 단위 명확화):

1. `cosmetic_category` ENUM + `cosmetics` 테이블 + 시드 8 row
2. `user_cosmetic_inventory` 테이블
3. `user_cosmetic_loadout` 테이블 (composite FK 포함)
4. 기존 모든 user backfill (idempotent INSERT ... ON CONFLICT DO NOTHING)

순서 의존: 1 → 2 → 3 → 4. 4 마이그레이션은 데이터 변경만.

## 11. 테스트 범위 (CLAUDE.md TDD 정책)

### 강제 — 백엔드 도메인 로직

`tests/test_cosmetics_service.py`:

- `grant_defaults`
  - 신규 user에 카탈로그 모두 inventory 추가 + category별 default를 loadout에 부여
  - 두 번 호출 시 idempotent — loadout 보존 (선택 바꾼 후 재호출해도 변하지 않음)
- `update_loadout`
  - 정상 갱신 happy path
  - 비소유 cosmetic_id → 422
  - category 불일치 (예: title 슬롯에 card_back 아이템) → 422
  - 부분 갱신 시도 (3 필드만 전송) → 422 (Pydantic 단계)
  - 트랜잭션 롤백 검증 (4번째 검증 실패 시 처음 3 row가 반영 안 됨)
- `get_loadouts_for_users`
  - 다중 user 일괄 fetch — 4 user 입력 시 4 dict 반환
  - 단일 쿼리 보장 — SQLAlchemy `before_cursor_execute` 이벤트 리스너로 SELECT 카운트 1회 검증 (loop 또는 N+1 회귀 방지)
  - 빈 입력 시 빈 dict 반환

### 권장 — 라우터 통합

`tests/test_cosmetics_api.py`:

- `GET /cosmetics/catalog` happy path (8 row 반환, category·code·name 포함)
- `GET /me/cosmetics`
  - 인증 정상 (owned 8, loadout 4 카테고리)
  - 401 미인증
- `PUT /me/cosmetics/loadout`
  - 인증 정상 (갱신된 loadout 반환)
  - 422 비소유
  - 422 category 불일치

### 권장 — ws 통합

기존 ws 테스트 확장 또는 `tests/test_ws_game_start.py`:

- 2 user 게임 시작 시 message payload에 `players[].cosmetics`가 포함되며 각각의 loadout code가 반영됨

### 면제

- `CosmeticsSection` 시각 렌더링
- 프론트 store (yagni)

## 12. 롤백 전략

- 마이그레이션 단위 downgrade 가능 (4 → 3 → 2 → 1)
- 운영 중 문제 발생 시 `cosmetics` 라우터를 라우터 등록에서 제외하는 방식이 첫 번째 안전판. 테이블은 그대로 둠

## 13. 미결·보류 항목

- 카드 face/back·table·title 실제 시각 컴포넌트 — 후속 PR
- 카탈로그 캐시 전략 (ETag·Cache-Control) — 트래픽 관찰 후
- `name` 다국어 — 1차 한국어 단일. i18n은 보류
- 운영자 어드민 (Item row 신규 추가) — 1차는 SQL/마이그레이션, 어드민 UI는 후속
- `rarity` / `asset_bundle_ref` / `release_season_id` 컬럼 — 해당 sub-project 진입 시 ADD
- GameEvent 기반 in-game 연출 (score_effect, effect_pack) — sub-project 2
- 소유 분기 (가챠·상점) — sub-project 4
- 시즌 한정 / 패스 — sub-project 5
- 결제 인프라 / 등급분류 / Footer 문구 교체 — 결제 도입 시점 후속 spec
