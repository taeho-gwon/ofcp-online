# 코스메틱 백엔드 구조 설계

- 작성일: 2026-05-17
- 단계: 2단계 마무리 / 2.5단계(코스메틱) 진입 직전의 백엔드 토대 마련
- 범위: 백엔드 데이터 모델·API·신규 가입 흐름 연결, 프론트 마이페이지 수정 채널까지

## 1. 배경과 목표

[BACKLOG.md](../../BACKLOG.md)의 2.5단계 예고대로 코스메틱(카드 이미지·게임 보드·아바타 등)을 도입할 예정이다. 본 spec은 결제·시각 컴포넌트 자체는 다루지 않고, **사용자가 도메인별 코스메틱을 선택하고 그 선택이 게임에서 노출되도록 하는 백엔드 토대**를 만든다.

목표:

1. 도메인 4종(`card_face`, `card_back`, `board`, `score_effect`) 각각 기본 2개씩 총 8개 카탈로그 항목을 DB에 적재.
2. 신규·기존 사용자가 기본 항목을 자동 소유·선택한 상태로 시작.
3. 마이페이지에서 선택을 변경할 수 있는 REST API와 프론트 채널 마련.
4. 다른 플레이어의 선택을 게임 시작 시 노출(프론트 시각 적용은 후속 PR).

비목표 (의도적으로 제외):

- 결제·잠금 UX. 모든 카탈로그 항목을 모든 사용자가 자동 소유한다.
- 아바타 도메인. 추후 추가.
- 프론트 카드 face/back/board/score_effect 컴포넌트의 시각 정의. 별도 PR.

## 2. 핵심 결정 요약

| 결정 | 선택 | 이유 |
|---|---|---|
| 도메인 종류 | card_face, card_back, board, score_effect 4종 | 사용자 요구. 아바타는 추후. |
| 소유 모델 | 모두 자동 소유, 소유 테이블은 결제 도입 대비해 미리 생성 | 잠금 UX 미도입 단계 |
| 카탈로그 위치 | DB 전용 `cosmetics` 테이블 + seed 마이그레이션 | 운영 시점에 SQL/어드민으로 신규 추가 가능 |
| 테이블 구조 | 단일 `cosmetics` + `type` ENUM | 도메인별 메타데이터가 동일. 분리 시 ownership/selection이 polymorphic 또는 12 테이블로 비대 |
| 소유·선택 분리 | `user_cosmetic_ownerships` + `user_cosmetic_selections` (PK=user_id+type) | 의미 분리, FK로 무결성 보장, 결제 도입 시 ownership만 연결 |
| API 갱신 단위 | PUT 4 필드 묶음 (`PUT /me/cosmetics/selection`) | 마이페이지 "저장" UX와 직결, race·부분갱신 복잡도 회피 |
| 상대 노출 | 게임 시작 이벤트 payload에 `code` 문자열로 포함 | 프론트 레지스트리 키와 직접 매칭, 모르는 코드는 default fallback |

## 3. 데이터 모델

### ENUM

```sql
CREATE TYPE cosmetic_type AS ENUM ('card_face', 'card_back', 'board', 'score_effect');
```

### `cosmetics` — 카탈로그

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` | UUID PK | |
| `type` | cosmetic_type NOT NULL | |
| `code` | TEXT NOT NULL | 프론트 레지스트리 키 (예: `face_classic`) |
| `name` | TEXT NOT NULL | 표시명 (한국어) |
| `is_default` | BOOLEAN NOT NULL DEFAULT FALSE | |
| `sort_order` | INT NOT NULL DEFAULT 0 | 마이페이지 표시 순서 |
| `created_at` | TIMESTAMPTZ NOT NULL DEFAULT NOW() | |

제약:

- UNIQUE `(type, code)`
- 부분 UNIQUE INDEX `(type) WHERE is_default` — type별 default는 정확히 1개

### `user_cosmetic_ownerships`

| 컬럼 | 타입 |
|---|---|
| `user_id` | UUID FK users.id ON DELETE CASCADE |
| `cosmetic_id` | UUID FK cosmetics.id ON DELETE RESTRICT |
| `acquired_at` | TIMESTAMPTZ NOT NULL DEFAULT NOW() |
| PK | (user_id, cosmetic_id) |

### `user_cosmetic_selections`

| 컬럼 | 타입 |
|---|---|
| `user_id` | UUID FK users.id ON DELETE CASCADE |
| `type` | cosmetic_type NOT NULL |
| `cosmetic_id` | UUID FK cosmetics.id ON DELETE RESTRICT |
| `updated_at` | TIMESTAMPTZ NOT NULL DEFAULT NOW() |
| PK | (user_id, type) |

추가 제약 — 소유하지 않은 항목 선택 금지:

- 컴포지트 FK `(user_id, cosmetic_id)` → `user_cosmetic_ownerships(user_id, cosmetic_id)` (ON DELETE CASCADE)
- 그리고 cosmetic_id의 type이 selection.type과 일치해야 함 — 어플리케이션 서비스에서 검증 (DB CHECK는 복잡해서 생략)

### seed 데이터

| type | code | name | is_default | sort_order |
|---|---|---|---|---|
| card_face | face_classic | 클래식 | ✓ | 0 |
| card_face | face_modern | 모던 | | 1 |
| card_back | back_navy | 네이비 | ✓ | 0 |
| card_back | back_ocean | 오션 | | 1 |
| board | board_green | 그린 펠트 | ✓ | 0 |
| board | board_walnut | 월넛 | | 1 |
| score_effect | effect_minimal | 미니멀 | ✓ | 0 |
| score_effect | effect_confetti | 컨페티 | | 1 |

> 실제 `name`·`code`는 구현 단계에서 카드 스킨 디자이너와 합의 후 확정. 위는 placeholder가 아닌 실 후보.

## 4. 백엔드 모듈 구조

```
app/cosmetics/
├── __init__.py
├── models.py        # Cosmetic, UserCosmeticOwnership, UserCosmeticSelection
├── schemas.py       # Pydantic
├── repository.py    # 쿼리만
├── service.py       # 도메인 로직
└── router.py
```

`app/auth/oauth.py`의 신규 가입 분기에서 `cosmetics.service.grant_defaults(session, user)` 호출(같은 트랜잭션). 기존 사용자는 데이터 마이그레이션으로 일괄 처리.

## 5. REST API

| 메서드 | 경로 | 인증 | 응답 |
|---|---|---|---|
| GET | `/cosmetics/catalog` | 불요 | `[CosmeticOut]` (전체 카탈로그) |
| GET | `/me/cosmetics` | 필요 | `{owned: [cosmetic_id], selection: {card_face, card_back, board, score_effect}}` (각 값은 cosmetic_id) |
| PUT | `/me/cosmetics/selection` | 필요 | 갱신된 selection 반환. 요청 본문은 4 도메인 cosmetic_id 모두 필수 |

**갱신 검증 (service)**:

1. 4개 cosmetic_id 모두 존재
2. 각 cosmetic의 type이 요청 필드와 일치
3. 4개 모두 해당 user가 소유 중
4. selection UPSERT (PK conflict on user_id+type)
5. 어느 하나라도 실패 시 트랜잭션 롤백, 422 응답

## 6. 다른 플레이어 코스메틱 노출

게임 시작 시점(WebSocket `game_start` 또는 동등 이벤트)에 각 플레이어의 selection을 함께 실어 보낸다.

```jsonc
{
  "players": [
    {
      "user_id": "...",
      "nickname": "...",
      "cosmetics": {
        "card_face": "face_classic",
        "card_back": "back_navy",
        "board": "board_green",
        "score_effect": "effect_minimal"
      }
    }
  ]
}
```

- 값은 cosmetic.`code` 문자열(프론트 레지스트리 키와 동일).
- N+1 방지: `cosmetics.service.get_selections_for_users([user_id…])`가 한 쿼리로 일괄 fetch.
- 프론트가 모르는 `code`이면 default fallback.
- **이번 단계 범위는 백엔드 payload까지**. 프론트가 상대 코스메틱을 실제로 그리는 작업은 후속 PR.

## 7. 프론트엔드 마이페이지 연동

- 신규 파일: `frontend/src/api/cosmetics.ts` (catalog/me/selection 3 함수)
- 신규 스토어: `frontend/src/store/cosmeticsStore.ts` (Zustand) — 게임·연습 화면이 같은 출처에서 자기 selection 읽음
- 신규 컴포넌트: `frontend/src/components/MyPage/CosmeticsSection.tsx` (또는 동등 위치)
  - 도메인 4 카드. 각 카드에 옵션 2개 표시 + 현재 선택 강조
  - "저장" 버튼 → PUT 1회. 성공 시 store 갱신
- 기존 `MyPage.tsx`의 "추가 예정" 섹션 중 "카드 스킨·코스메틱" 항목 제거, `CosmeticsSection` 삽입
- 프론트 레지스트리 확장은 별도 PR:
  - `frontend/src/components/cardSkins/` — face 모던 추가, back 분리 또는 추가
  - `frontend/src/components/boards/`, `frontend/src/components/scoreEffects/` 신규 디렉터리 + 각 default·alt
  - 백엔드 seed `code`와 1:1 매칭

## 8. 테스트 범위 (CLAUDE.md TDD 정책)

**강제 — 백엔드 도메인 로직**

- `service.grant_defaults` — 신규 user에 default 4 ownership + 4 selection 부여, 기존 user에 두 번 호출 시 idempotent
- `service.update_selection` — 비소유 거부 / 타입 불일치 거부 / 정상 갱신 / 트랜잭션 롤백 검증
- `service.get_selections_for_users` — 다중 user 일괄 fetch, selection 없는 user 발생 안 함을 검증 (default seed 보장으로)

**권장 — 라우터 통합**

- `GET /cosmetics/catalog` happy path
- `GET /me/cosmetics`, `PUT /me/cosmetics/selection` happy path + 401(인증) + 422(비소유) 케이스

**면제** — `CosmeticsSection` 시각 렌더링, 카드 face/back/board/score_effect 컴포넌트

## 9. 마이그레이션 순서

별도 파일로 분리 (롤백 단위 명확화):

1. `cosmetic_type` ENUM 생성 + `cosmetics` 테이블 + seed 8 row
2. `user_cosmetic_ownerships` 테이블
3. `user_cosmetic_selections` 테이블 (composite FK 포함)
4. 데이터 마이그레이션: 기존 모든 user에게 default 4 ownership + 4 selection 부여 (idempotent)

신규 가입 시 동일 default 부여는 `app/auth/oauth.py` 코드 변경으로 처리(동일 PR).

## 10. 미결·보류 항목

- **아바타 도메인** — 추후 ENUM에 값 추가하고 seed 보강. 본 spec은 ENUM 알터를 고려해 마이그레이션 작성.
- **결제·가격** — 2.5단계 별도 spec. `cosmetics`에 `price_cents` 추가는 그때 마이그레이션으로.
- **상대 코스메틱 시각 적용 (프론트)** — 본 spec 범위 밖. 백엔드 payload만 보장.
- **카탈로그 캐시 전략** — `GET /cosmetics/catalog`는 변동이 적어 ETag·Cache-Control 가능. 1차 구현은 캐시 없이, 트래픽 관찰 후 결정.
- **`name`·`code` 최종 확정** — 카드 스킨 디자인 PR 시점에 확정.
