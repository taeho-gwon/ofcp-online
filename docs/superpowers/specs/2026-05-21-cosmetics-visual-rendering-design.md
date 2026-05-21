# 코스메틱 시각 렌더링 설계

- 작성일: 2026-05-21
- 단계: 2.5단계 sub-project #1.5 (sub-project #1 카탈로그+Inventory+Loadout의 후속 PR)
- 범위: 마이페이지에서 저장된 4 카테고리 코스메틱(card_back, card_face, table_theme, title)을 실제 게임/연습 화면에 시각으로 적용

## 1. 배경과 위치

sub-project #1에서 카탈로그·인벤토리·로드아웃·REST API·ws 메시지 payload·마이페이지 저장 UI까지 데이터 파이프라인을 완성했다. 단 **시각 적용은 의도적으로 비포함**(spec § 의도적 비포함 / 후속 PR)으로 두었다. 본 spec은 그 시각 적용을 다룬다.

5 sub-project 로드맵상 별도 번호가 아닌 **#1의 시각화 후속**으로 분류하므로 sub-project #1.5라고 명명. sub-project #2(GameEvent), #3(재화), #4(상점/가챠), #5(시즌/패스)와 평행 트랙이 아니라 #1을 완성하는 작업이다.

## 2. 1차 PR 범위

### 포함

- 4 카테고리 시각 컴포넌트 (card_back, card_face, table_theme, title) — 시드된 각 2 code 모두 렌더링
- 컴포넌트는 모두 CSS/SVG 프로그래매틱 (이미지 에셋 X)
- 게임/연습 화면에서 본인 + 상대 코스메틱 동시 표시 ("각자 본인 설정 적용" 원칙)
- 연습 모드 상대는 항상 default 자상
- MyPage 인라인 프리뷰 (선택 옵션 버튼이 실제 시각 미니어처로 표시)
- TDD: `usePlayerCosmetics` resolve 로직 + registry 순수 함수 단위 테스트

### 의도적 비포함 (후속 PR / 다른 sub-project)

- 이미지 에셋(PNG/SVG 파일) — 모두 CSS/SVG. 추후 마이그레이션은 컴포넌트 내부 교체만
- 게임 엔진(PixiJS/Three.js) — sub-project #2(GameEvent)에서 연출 요구사항 정해진 뒤 재검토
- 코스메틱 미리보기 모달·갤러리 페이지 — MyPage 인라인 프리뷰만
- 새 카테고리 추가(캐릭터·이모트·보이스 등) — sub-project #2~5
- 코스메틱 잠금·획득 UX — sub-project #4(상점/가챠)
- `rarity` / `asset_bundle_ref` / `release_season_id` 컬럼 — 해당 sub-project 진입 시 ADD
- 카드 face 변형의 게임 룰 영향 — face는 시각만, rank/suit 자체 표시는 동일

## 3. 핵심 결정 요약

| 결정 | 선택 | 이유 |
|---|---|---|
| 자산 수준 | CSS/SVG 프로그래매틱 | 디자이너 없음, 빠른 구현, 후속 이미지 에셋 마이그레이션 가능 |
| 렌더링 기술 | React 컴포넌트 (game engine 비도입) | OFC는 정적 카드 게임이라 React로 충분. PixiJS 등은 sub-project #2 연출 요구사항이 명확해진 뒤 재결정 |
| 적용 주체 | 각자 본인 설정 | 내 face/back은 내 카드에, 상대 face/back은 상대 카드에. table·title도 player별로 자기 것 표시 |
| 연습 모드 봇 | 항상 default | 구현·고민 최소화. 봇 코스메틱은 yagni |
| title 위치 | 닉네임 위 작은 배지 | 면적 소비 작고 모든 표시 지점(PlayerBoard 헤더·ResultModal·로비)에 일관 적용 |
| table_theme 범위 | OfcTable 컴포넌트만 | felt 영역. 페이지 배경은 토큰 그대로. 스코프 명확 |
| 데이터 우선순위 | 본인=store, 상대=ws state, 미등록=default | 단일 우선순위 체인 |

## 4. 아키텍처

### 4.1 디렉터리

```
frontend/src/
  cosmetics/
    registry/
      cardBacks.ts          # CARD_BACKS: Record<code, CardBackComponent>
      cardFaces.ts          # CARD_FACES: Record<code, CardFaceComponent>
      tableThemes.ts        # TABLE_THEMES: Record<code, TableTheme>
      titles.ts             # TITLES: Record<code, TitleStyle>
    components/
      CardBackPattern.tsx   # 파라미터화: color, pattern
      CardFaceFrame.tsx     # 파라미터화: frame style
      TableSurface.tsx      # OfcTable 내부 felt
      TitleBadge.tsx        # 닉네임 위 작은 배지
    useResolved.ts          # usePlayerCosmetics(playerId): { CardBack, CardFace, table, title }
    defaults.ts             # DEFAULT_CODES: { card_back: 'back.navy', ... }
```

### 4.2 컴포넌트 인터페이스

```ts
// registry/cardBacks.ts
export interface CardBackVariant {
  code: string;          // 'back.navy'
  name: string;          // '네이비'
  Component: (props: { size: CardSize }) => ReactElement;
}
export const CARD_BACKS: Record<string, CardBackVariant> = {
  'back.navy': { code: 'back.navy', name: '네이비', Component: NavyBack },
  'back.ocean': { code: 'back.ocean', name: '오션', Component: OceanBack },
};

// 동일 패턴: CARD_FACES, TABLE_THEMES, TITLES
```

```ts
// useResolved.ts
export interface ResolvedCosmetics {
  CardBack: CardBackVariant['Component'];
  CardFace: CardFaceVariant['Component'];
  table: TableThemeVariant;
  title: TitleVariant;
}

export function usePlayerCosmetics(playerId: string): ResolvedCosmetics;
```

### 4.3 Resolve 우선순위

`usePlayerCosmetics(playerId)` 내부 로직:

1. `playerId === myPlayerId` (auth.user.id)이면 → `cosmeticsStore.loadout` 사용
2. 그렇지 않으면 → `gameState.players[].cosmetics` (ws에서 받은 code map)
3. 둘 다 없거나 미등록 코드면 → `DEFAULT_CODES[category]` 사용
4. resolve 결과를 useMemo로 캐시

### 4.4 소비자 변경 요약

- `Card.tsx`: 현재 `useCardSkin()` → `usePlayerCardSkin(card.ownerId)` 형태로 교체. `ownerId`는 카드 prop 또는 부모(Hand/PlayerBoard)가 전달.
- `OfcTable.tsx`: 내부 felt area를 `<TableSurface theme={myTable} />`로 교체. 내 table_theme 적용.
- `PlayerBoard.tsx`: 헤더에 `<TitleBadge style={playerTitle} />` 추가. 해당 player의 title.
- `ResultModal.tsx`: 닉네임 옆에 동일 `TitleBadge` 추가.
- `cardSkins/` 폴더: 시각은 `cosmetics/components/`로 이전. CardSkin 타입은 thin shim으로 유지하거나 폐기 결정은 plan 단계.

### 4.5 Loadout hydrate 시점

- `MyPage` 마운트 시 (현재 구현) ✓
- `Game.tsx`·`Practice.tsx` 마운트 시 — 신규 추가. 게임 직접 진입한 경우(마이페이지를 안 거친 경우)에도 본인 loadout이 store에 있어야 함.
- 로그인 직후 → 로그인 컴포넌트는 변경 X, 게임 진입 페이지가 책임짐 (지연 로딩 OK, 첫 frame은 default fallback)

### 4.6 Fallback 처리

- 미등록 code(`back.future_dlc` 같은 신규 코드): 해당 카테고리 default code로 resolve. console.warn 1회 (개발 편의).
- ws state 메시지 미도착 frame: 상대 cosmetics가 비어있으므로 default 적용. 메시지 도착하면 자연스레 교체.
- 본인 loadout 미로드 frame: 동일하게 default 적용. hydrate 완료 시 교체.

## 5. 각 alt 코스메틱 시각 명세

CSS/SVG 변형. raw 색 사용 (cardSkins 관례).

### 5.1 card_back
- `back.navy` (default): 다이아몬드 격자 패턴, 단색 #1a2a52 배경. 가운데 작은 흰색 다이아몬드 logo.
- `back.ocean`: 같은 다이아몬드 격자 패턴, #0a5b8a → #1a8cc4 linear-gradient 배경. 흰 logo 동일.

### 5.2 card_face
- `face.classic` (default): 현재 default.tsx 그대로. 둥근 직사각형, 모서리 rank/suit, 가운데 큰 suit symbol.
- `face.modern`: 굵은 sans-serif rank (좌상단), suit 우상단 작게, 가운데 suit symbol 더 크고 외곽선 강조.

### 5.3 table_theme
- `table.green` (default): #1a5d3a felt 텍스처 (CSS noise/grain), 가장자리에 약간의 vignette.
- `table.walnut`: #5c3a1f 우드 그레인 (CSS repeating-linear-gradient + radial-gradient 조합).

### 5.4 title
- `title.beginner` (default): 회색 배경(#888) + 흰 글씨, 폰트 12px, padding 2px 6px, border-radius 4px. 텍스트 "초보자".
- `title.fl_demon`: 보라(#7b2ff7) → 자홍(#f107a3) 그라디언트 배경 + 노란 글씨(#ffd700), 약간 광택(box-shadow). 텍스트 "판타지랜드 악마".

## 6. 데이터 모델 영향

**없음**. sub-project #1의 schema·테이블·시드 그대로. 추가 마이그레이션 0.

## 7. 테스트 전략

CLAUDE.md TDD 적용 범위 기준:

### 권장(작성)
- `usePlayerCosmetics(playerId)` resolve 로직: self/opponent/unknown-code 3 경로 (RTL `renderHook`)
- `resolveCardBack(code)` / `resolveCardFace` / `resolveTableTheme` / `resolveTitle` 순수 함수 (jest unit)
- Game.tsx/Practice.tsx mount 시 cosmeticsStore.hydrate 호출 확인 (mock 검증)

### 면제
- 컴포넌트 시각 렌더링 (CardBackPattern, TableSurface, TitleBadge 등) — 시각 검증이 더 효과적, 수동 e2e
- MyPage 프리뷰 시각 — 동일

### 회귀 검증
- 기존 useCardSkin() 폐기/대체 시 default(`back.navy` + `face.classic`)가 현재 default.tsx 시각과 동일한지 한 번 시각 비교

## 8. 1차 PR 비포함 (재차 명시)

- 이미지 에셋(PNG/SVG 파일) 도입
- 게임 엔진(PixiJS/Three.js) 도입
- 코스메틱 갤러리/미리보기 모달
- 새 카테고리(캐릭터·스킨·이모트·보이스·BGM·victory_pose·profile_frame) 추가
- 코스메틱 잠금/구매/획득 경로 UX
- `rarity`/`asset_bundle_ref`/`release_season_id` 컬럼
- 운영자 어드민 (코스메틱 추가는 SQL/마이그레이션으로)

## 9. 위험·미해결 요소

- **카드 ownerId 추적**: 현재 코드에 `Card`에 ownerId 필드가 명시적인지 plan에서 확인. 없으면 Hand/PlayerBoard가 children에 prop으로 주입.
- **useCardSkin 사용처**: 현재 Card.tsx 외 어디서 호출하는지 plan에서 전부 매핑. 한 곳이 빠지면 카드 일부가 옛 default로 렌더됨.
- **hydrate 중복 호출**: MyPage·Game·Practice 모두 hydrate 호출 시 중복 fetch — store의 `loaded` 플래그로 가드(현재 구조 그대로) 확인.

## 10. Self-review 체크

**Spec 커버리지**:
- 4 카테고리 모두 § 4, § 5에 명세
- 데이터 플로우 § 4.3 + § 4.5
- fallback § 4.6
- 테스트 § 7
- 의도적 비포함 § 8

**Placeholder 스캔**:
- "ownerId 필드 존재 여부" "useCardSkin 사용처 전수 매핑" — § 9에 위험으로 명시. plan 단계 첫 task에서 grep으로 확인 후 진행.
- 그 외 TBD/TODO 없음.

**Internal consistency**:
- "각자 본인 설정" 원칙과 fallback 우선순위 § 4.3 일치
- registry 4개와 § 5 시각 명세 1:1 매칭
- 비포함 § 2 § 8 일치

**Ambiguity**:
- "default 자상"의 의미 = `back.navy` + `face.classic` + `table.green` + `title.beginner`. § 4.6 + § 5에서 default code 명시.
