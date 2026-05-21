# 코스메틱 시각 렌더링 구현 plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 2.5단계 sub-project #1.5 — 4 카테고리 코스메틱(card_back, card_face, table_theme, title)을 게임/연습 화면에 실제 시각으로 적용. 본인+상대 동시, 연습 봇은 default.

**Architecture:** `cosmetics/` 디렉터리에 카테고리별 registry + variant 컴포넌트(CSS/SVG 프로그래매틱). `usePlayerCosmetics(playerId)` 훅이 본인=store / 상대=GameState / 미등록=default 우선순위로 resolve. 기존 `useCardSkin()`은 `usePlayerCardSkin(playerId)`로 교체.

**Tech Stack:** React + TypeScript + Zustand + CSS/SVG. 이미지 에셋·게임 엔진·신규 백엔드 없음.

**Spec:** `docs/superpowers/specs/2026-05-21-cosmetics-visual-rendering-design.md`

---

## File Structure

### 신규 (frontend/src/cosmetics/)
- `defaults.ts` — DEFAULT_CODES 상수
- `types.ts` — Variant 인터페이스
- `registry/cardBacks.ts` — CARD_BACKS + resolveCardBack
- `registry/cardFaces.ts` — CARD_FACES + resolveCardFace
- `registry/tableThemes.ts` — TABLE_THEMES + resolveTableTheme
- `registry/titles.ts` — TITLES + resolveTitle
- `components/NavyBack.tsx`
- `components/OceanBack.tsx`
- `components/ClassicFace.tsx` (현재 default.tsx의 Face 이전)
- `components/ModernFace.tsx`
- `components/ClassicEmptySlot.tsx` (현재 default.tsx의 EmptySlot 이전; face와 분리)
- `components/TableSurface.tsx`
- `components/TitleBadge.tsx`
- `useResolved.ts` — usePlayerCosmetics, usePlayerCardSkin

### 수정
- `frontend/src/components/Card.tsx` — useCardSkin → usePlayerCardSkin(playerId), playerId prop 추가
- `frontend/src/components/PlayerBoard.tsx` — Card/CardBack/EmptySlot 호출 시 playerId 전달 + 헤더에 TitleBadge
- `frontend/src/components/Hand.tsx` — CardView 호출 시 myPlayerId 전달
- `frontend/src/components/OfcTable.tsx` — TableSurface로 felt 영역 감싸기
- `frontend/src/components/ReplayBoard.tsx` — CardView/EmptySlot에 ownerId 전달
- `frontend/src/components/ResultModal.tsx` — 닉네임 옆 TitleBadge
- `frontend/src/components/MyPage/CosmeticsSection.tsx` — 텍스트 버튼 → 시각 프리뷰 버튼
- `frontend/src/pages/Game.tsx` — 마운트 시 cosmeticsStore.hydrate()
- `frontend/src/pages/Practice.tsx` — 동일
- `frontend/src/pages/Tutorial.tsx`, `FantasyTutorial.tsx`, `Login.tsx`, `NicknameSetup.tsx` — CardView에 fallback playerId 전달 또는 cardSkins shim 유지

### 폐기 또는 thin shim
- `frontend/src/components/cardSkins/default.tsx` — 내용 cosmetics/components/로 이전 후 삭제
- `frontend/src/components/cardSkins/index.ts` — useCardSkin shim으로 단축 (Login·Tutorial 등 비게임 화면 호환)
- `frontend/src/components/cardSkins/types.ts` — CardSkin 인터페이스. 폐기 또는 유지

### 신규 테스트
- `frontend/src/cosmetics/registry/__tests__/resolvers.test.ts` — 4 카테고리 resolve 함수 단위
- `frontend/src/cosmetics/__tests__/useResolved.test.tsx` — self/opponent/unknown 3 경로

---

## Task 0: Feature branch 생성 + 디렉터리 골격

**Files:**
- Create: `frontend/src/cosmetics/` 디렉터리 (빈 파일 5개)

- [ ] **Step 1: feature branch 생성**

```bash
git checkout -b feat/cosmetics-visual-rendering
```

- [ ] **Step 2: 디렉터리 + 빈 골격 파일 생성**

```bash
mkdir -p frontend/src/cosmetics/registry frontend/src/cosmetics/components
```

빈 파일 7개 생성 (touch 또는 placeholder export):

`frontend/src/cosmetics/defaults.ts`:
```ts
// DEFAULT_CODES — Task 1에서 정의
export {};
```

`frontend/src/cosmetics/types.ts`:
```ts
// Variant 인터페이스 — Task 1에서 정의
export {};
```

`frontend/src/cosmetics/registry/cardBacks.ts`:
```ts
// CARD_BACKS + resolveCardBack — Task 2에서 정의
export {};
```

`frontend/src/cosmetics/registry/cardFaces.ts`:
```ts
// Task 3에서 정의
export {};
```

`frontend/src/cosmetics/registry/tableThemes.ts`:
```ts
// Task 4에서 정의
export {};
```

`frontend/src/cosmetics/registry/titles.ts`:
```ts
// Task 5에서 정의
export {};
```

`frontend/src/cosmetics/useResolved.ts`:
```ts
// usePlayerCosmetics, usePlayerCardSkin — Task 7에서 정의
export {};
```

- [ ] **Step 3: 빌드 확인**

Run: `cd frontend && npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/cosmetics/
git commit -m "feat(cosmetics-visual): 디렉터리 골격"
```

---

## Task 1: DEFAULT_CODES + Variant 타입

**Files:**
- Modify: `frontend/src/cosmetics/defaults.ts`
- Modify: `frontend/src/cosmetics/types.ts`

- [ ] **Step 1: defaults.ts**

```ts
export const DEFAULT_CODES = {
  card_back: "back.navy",
  card_face: "face.classic",
  table_theme: "table.green",
  title: "title.beginner",
} as const;

export type CosmeticCategory = keyof typeof DEFAULT_CODES;
```

- [ ] **Step 2: types.ts**

```ts
import type { ReactElement } from "react";
import type { Card } from "../api/types";

export type CardSize = "sm" | "md";

export interface CardBackVariant {
  code: string;
  name: string;
  Component: (props: { size: CardSize }) => ReactElement;
}

export interface CardFaceVariant {
  code: string;
  name: string;
  Face: (props: { card: Card; size: CardSize }) => ReactElement;
  EmptySlot: (props: { size: CardSize; highlighted: boolean }) => ReactElement;
}

export interface TableThemeVariant {
  code: string;
  name: string;
  /** OfcTable 내부 felt 영역에 적용할 inline style + className */
  surfaceStyle: React.CSSProperties;
  surfaceClass?: string;
}

export interface TitleVariant {
  code: string;
  name: string;
  /** 표시 텍스트 */
  text: string;
  /** 배지 inline style */
  style: React.CSSProperties;
}
```

- [ ] **Step 3: 빌드**

Run: `cd frontend && npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/cosmetics/defaults.ts frontend/src/cosmetics/types.ts
git commit -m "feat(cosmetics-visual): DEFAULT_CODES + Variant 타입"
```

---

## Task 2: card_back 시각 컴포넌트 2개 + registry — TDD

**Files:**
- Create: `frontend/src/cosmetics/components/NavyBack.tsx`
- Create: `frontend/src/cosmetics/components/OceanBack.tsx`
- Create: `frontend/src/cosmetics/registry/__tests__/resolvers.test.ts`
- Modify: `frontend/src/cosmetics/registry/cardBacks.ts`

- [ ] **Step 1: 실패 테스트 작성**

`frontend/src/cosmetics/registry/__tests__/resolvers.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { CARD_BACKS, resolveCardBack } from "../cardBacks";

describe("resolveCardBack", () => {
  it("returns variant for known code", () => {
    const v = resolveCardBack("back.navy");
    expect(v.code).toBe("back.navy");
  });

  it("falls back to default for unknown code", () => {
    const v = resolveCardBack("back.future_dlc");
    expect(v.code).toBe("back.navy");
  });

  it("returns ocean variant", () => {
    const v = resolveCardBack("back.ocean");
    expect(v.code).toBe("back.ocean");
  });

  it("CARD_BACKS contains both seeds", () => {
    expect(Object.keys(CARD_BACKS).sort()).toEqual(["back.navy", "back.ocean"]);
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `cd frontend && npx vitest run cosmetics/registry/__tests__/resolvers.test.ts`
Expected: FAIL (import 실패 또는 빈 export).

> vitest 미설치 시 fallback: 테스트 파일은 작성해두고 Task 마지막에 setup 후 통합 실행. (대안: 순수 함수라 임시 node script `node --loader ... ` 검증도 가능. 이 plan은 vitest 있다고 가정 — `frontend/package.json`에서 확인.) 만약 vitest 없으면 Step 2 후 `cd frontend && npm install -D vitest @vitest/ui` 추가, package.json scripts에 `"test": "vitest"` 추가.

- [ ] **Step 3: NavyBack 컴포넌트**

`frontend/src/cosmetics/components/NavyBack.tsx`:
```tsx
import type { CardSize } from "../types";

const DIM: Record<CardSize, { w: number; h: number }> = {
  sm: { w: 56, h: 72 },
  md: { w: 80, h: 104 },
};

export function NavyBack({ size }: { size: CardSize }) {
  const { w, h } = DIM[size];
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{
        borderRadius: 6,
        background: "#1a2a52",
        display: "block",
      }}
    >
      <defs>
        <pattern
          id="navy-diamond"
          x={0}
          y={0}
          width={10}
          height={10}
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 5 0 L 10 5 L 5 10 L 0 5 z"
            fill="none"
            stroke="#3a4d80"
            strokeWidth={0.8}
          />
        </pattern>
      </defs>
      <rect x={2} y={2} width={w - 4} height={h - 4} fill="url(#navy-diamond)" />
      <path
        d={`M ${w / 2} ${h / 2 - 8} L ${w / 2 + 6} ${h / 2} L ${w / 2} ${h / 2 + 8} L ${w / 2 - 6} ${h / 2} z`}
        fill="#ffffff"
        opacity={0.9}
      />
    </svg>
  );
}
```

- [ ] **Step 4: OceanBack 컴포넌트**

`frontend/src/cosmetics/components/OceanBack.tsx`:
```tsx
import type { CardSize } from "../types";

const DIM: Record<CardSize, { w: number; h: number }> = {
  sm: { w: 56, h: 72 },
  md: { w: 80, h: 104 },
};

export function OceanBack({ size }: { size: CardSize }) {
  const { w, h } = DIM[size];
  const gradId = "ocean-grad";
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ borderRadius: 6, display: "block" }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0a5b8a" />
          <stop offset="100%" stopColor="#1a8cc4" />
        </linearGradient>
        <pattern
          id="ocean-diamond"
          x={0}
          y={0}
          width={10}
          height={10}
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 5 0 L 10 5 L 5 10 L 0 5 z"
            fill="none"
            stroke="#a8d8f0"
            strokeWidth={0.8}
            opacity={0.4}
          />
        </pattern>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill={`url(#${gradId})`} />
      <rect x={2} y={2} width={w - 4} height={h - 4} fill="url(#ocean-diamond)" />
      <path
        d={`M ${w / 2} ${h / 2 - 8} L ${w / 2 + 6} ${h / 2} L ${w / 2} ${h / 2 + 8} L ${w / 2 - 6} ${h / 2} z`}
        fill="#ffffff"
        opacity={0.9}
      />
    </svg>
  );
}
```

- [ ] **Step 5: cardBacks registry**

`frontend/src/cosmetics/registry/cardBacks.ts`:
```ts
import { NavyBack } from "../components/NavyBack";
import { OceanBack } from "../components/OceanBack";
import { DEFAULT_CODES } from "../defaults";
import type { CardBackVariant } from "../types";

export const CARD_BACKS: Record<string, CardBackVariant> = {
  "back.navy": { code: "back.navy", name: "네이비", Component: NavyBack },
  "back.ocean": { code: "back.ocean", name: "오션", Component: OceanBack },
};

export function resolveCardBack(code: string | null | undefined): CardBackVariant {
  if (code && CARD_BACKS[code]) return CARD_BACKS[code];
  return CARD_BACKS[DEFAULT_CODES.card_back];
}
```

- [ ] **Step 6: 테스트 통과 확인**

Run: `cd frontend && npx vitest run cosmetics/registry/__tests__/resolvers.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/cosmetics/components/NavyBack.tsx frontend/src/cosmetics/components/OceanBack.tsx frontend/src/cosmetics/registry/cardBacks.ts frontend/src/cosmetics/registry/__tests__/resolvers.test.ts
git commit -m "feat(cosmetics-visual): card_back navy/ocean + registry + TDD"
```

---

## Task 3: card_face 시각 컴포넌트 2개 + registry — TDD

**Files:**
- Create: `frontend/src/cosmetics/components/ClassicFace.tsx`
- Create: `frontend/src/cosmetics/components/ModernFace.tsx`
- Create: `frontend/src/cosmetics/components/ClassicEmptySlot.tsx`
- Modify: `frontend/src/cosmetics/registry/cardFaces.ts`
- Modify: `frontend/src/cosmetics/registry/__tests__/resolvers.test.ts`

- [ ] **Step 1: 실패 테스트 추가**

`frontend/src/cosmetics/registry/__tests__/resolvers.test.ts` 파일 끝에 추가:
```ts
import { CARD_FACES, resolveCardFace } from "../cardFaces";

describe("resolveCardFace", () => {
  it("returns classic for known code", () => {
    expect(resolveCardFace("face.classic").code).toBe("face.classic");
  });
  it("returns modern for known code", () => {
    expect(resolveCardFace("face.modern").code).toBe("face.modern");
  });
  it("falls back to default", () => {
    expect(resolveCardFace("face.unknown").code).toBe("face.classic");
  });
  it("CARD_FACES contains both seeds", () => {
    expect(Object.keys(CARD_FACES).sort()).toEqual([
      "face.classic",
      "face.modern",
    ]);
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `cd frontend && npx vitest run cosmetics/registry/__tests__/resolvers.test.ts`
Expected: 4 PASS (Task 2) + 4 FAIL.

- [ ] **Step 3: ClassicFace 컴포넌트 (현 default.tsx 이전)**

`frontend/src/cosmetics/components/ClassicFace.tsx`:
```tsx
/* eslint-disable react-refresh/only-export-components */
import {
  RANK_LABEL,
  SUIT_IS_RED,
  SUIT_LABEL,
  type Card,
} from "../../api/types";
import type { CardSize } from "../types";

interface Dim {
  width: number;
  height: number;
  cornerRank: number;
  cornerSuit: number;
  centerSuit: number;
  pad: number;
}

const DIM: Record<CardSize, Dim> = {
  sm: { width: 56, height: 72, cornerRank: 15, cornerSuit: 13, centerSuit: 28, pad: 5 },
  md: { width: 80, height: 104, cornerRank: 20, cornerSuit: 16, centerSuit: 42, pad: 6 },
};

export function ClassicFace({ card, size }: { card: Card; size: CardSize }) {
  const d = DIM[size];
  const red = SUIT_IS_RED[card.suit];
  const color = red ? "#c2185b" : "#1a1a1a";
  return (
    <svg
      width={d.width}
      height={d.height}
      viewBox={`0 0 ${d.width} ${d.height}`}
      style={{
        background: "#ffffff",
        borderRadius: 6,
        boxShadow: "0 0 0 1px #b3b3b3 inset",
        display: "block",
      }}
    >
      <text
        x={d.pad}
        y={d.pad + d.cornerRank}
        fontSize={d.cornerRank}
        fontWeight={700}
        fill={color}
      >
        {RANK_LABEL[card.rank]}
      </text>
      <text
        x={d.pad}
        y={d.pad + d.cornerRank + d.cornerSuit + 2}
        fontSize={d.cornerSuit}
        fill={color}
      >
        {SUIT_LABEL[card.suit]}
      </text>
      <text
        x={d.width / 2}
        y={d.height / 2 + d.centerSuit / 3}
        fontSize={d.centerSuit}
        fill={color}
        textAnchor="middle"
      >
        {SUIT_LABEL[card.suit]}
      </text>
    </svg>
  );
}
```

- [ ] **Step 4: ClassicEmptySlot 컴포넌트 (현 default.tsx 이전)**

`frontend/src/cosmetics/components/ClassicEmptySlot.tsx`:
```tsx
import type { CardSize } from "../types";

const DIM: Record<CardSize, { w: number; h: number }> = {
  sm: { w: 56, h: 72 },
  md: { w: 80, h: 104 },
};

export function ClassicEmptySlot({
  size,
  highlighted,
}: {
  size: CardSize;
  highlighted: boolean;
}) {
  const { w, h } = DIM[size];
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: 6,
        border: `2px dashed ${highlighted ? "#f59e0b" : "#cbd5e1"}`,
        background: highlighted ? "rgba(245, 158, 11, 0.08)" : "transparent",
        boxSizing: "border-box",
      }}
    />
  );
}
```

- [ ] **Step 5: ModernFace 컴포넌트**

`frontend/src/cosmetics/components/ModernFace.tsx`:
```tsx
/* eslint-disable react-refresh/only-export-components */
import {
  RANK_LABEL,
  SUIT_IS_RED,
  SUIT_LABEL,
  type Card,
} from "../../api/types";
import type { CardSize } from "../types";

interface Dim {
  width: number;
  height: number;
  rank: number;
  cornerSuit: number;
  centerSuit: number;
  pad: number;
}

const DIM: Record<CardSize, Dim> = {
  sm: { width: 56, height: 72, rank: 22, cornerSuit: 11, centerSuit: 26, pad: 5 },
  md: { width: 80, height: 104, rank: 30, cornerSuit: 14, centerSuit: 40, pad: 6 },
};

export function ModernFace({ card, size }: { card: Card; size: CardSize }) {
  const d = DIM[size];
  const red = SUIT_IS_RED[card.suit];
  const color = red ? "#e11d48" : "#0f172a";
  return (
    <svg
      width={d.width}
      height={d.height}
      viewBox={`0 0 ${d.width} ${d.height}`}
      style={{
        background: "#fafafa",
        borderRadius: 8,
        boxShadow: "0 0 0 1px #888 inset",
        display: "block",
      }}
    >
      <text
        x={d.pad}
        y={d.pad + d.rank}
        fontSize={d.rank}
        fontWeight={900}
        fontFamily="system-ui, -apple-system, sans-serif"
        fill={color}
      >
        {RANK_LABEL[card.rank]}
      </text>
      <text
        x={d.width - d.pad}
        y={d.pad + d.cornerSuit}
        fontSize={d.cornerSuit}
        fill={color}
        textAnchor="end"
      >
        {SUIT_LABEL[card.suit]}
      </text>
      <text
        x={d.width / 2}
        y={d.height - d.pad - 4}
        fontSize={d.centerSuit}
        fill={color}
        textAnchor="middle"
        opacity={0.9}
      >
        {SUIT_LABEL[card.suit]}
      </text>
    </svg>
  );
}
```

- [ ] **Step 6: cardFaces registry**

`frontend/src/cosmetics/registry/cardFaces.ts`:
```ts
import { ClassicEmptySlot } from "../components/ClassicEmptySlot";
import { ClassicFace } from "../components/ClassicFace";
import { ModernFace } from "../components/ModernFace";
import { DEFAULT_CODES } from "../defaults";
import type { CardFaceVariant } from "../types";

export const CARD_FACES: Record<string, CardFaceVariant> = {
  "face.classic": {
    code: "face.classic",
    name: "클래식",
    Face: ClassicFace,
    EmptySlot: ClassicEmptySlot,
  },
  "face.modern": {
    code: "face.modern",
    name: "모던",
    Face: ModernFace,
    EmptySlot: ClassicEmptySlot, // EmptySlot은 face와 무관하게 공통 사용
  },
};

export function resolveCardFace(code: string | null | undefined): CardFaceVariant {
  if (code && CARD_FACES[code]) return CARD_FACES[code];
  return CARD_FACES[DEFAULT_CODES.card_face];
}
```

- [ ] **Step 7: 테스트 통과**

Run: `cd frontend && npx vitest run cosmetics/registry/__tests__/resolvers.test.ts`
Expected: 8 PASS.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/cosmetics/components/ClassicFace.tsx frontend/src/cosmetics/components/ClassicEmptySlot.tsx frontend/src/cosmetics/components/ModernFace.tsx frontend/src/cosmetics/registry/cardFaces.ts frontend/src/cosmetics/registry/__tests__/resolvers.test.ts
git commit -m "feat(cosmetics-visual): card_face classic/modern + EmptySlot + registry + TDD"
```

---

## Task 4: table_theme + registry — TDD

**Files:**
- Create: `frontend/src/cosmetics/components/TableSurface.tsx`
- Modify: `frontend/src/cosmetics/registry/tableThemes.ts`
- Modify: `frontend/src/cosmetics/registry/__tests__/resolvers.test.ts`

- [ ] **Step 1: 실패 테스트 추가**

파일 끝에 추가:
```ts
import { TABLE_THEMES, resolveTableTheme } from "../tableThemes";

describe("resolveTableTheme", () => {
  it("returns green for known code", () => {
    expect(resolveTableTheme("table.green").code).toBe("table.green");
  });
  it("returns walnut for known code", () => {
    expect(resolveTableTheme("table.walnut").code).toBe("table.walnut");
  });
  it("falls back to default", () => {
    expect(resolveTableTheme("table.??").code).toBe("table.green");
  });
  it("TABLE_THEMES contains both seeds", () => {
    expect(Object.keys(TABLE_THEMES).sort()).toEqual([
      "table.green",
      "table.walnut",
    ]);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd frontend && npx vitest run cosmetics/registry/__tests__/resolvers.test.ts`
Expected: 8 PASS + 4 FAIL.

- [ ] **Step 3: TableSurface 컴포넌트**

`frontend/src/cosmetics/components/TableSurface.tsx`:
```tsx
import type { ReactNode } from "react";
import type { TableThemeVariant } from "../types";

export function TableSurface({
  theme,
  children,
}: {
  theme: TableThemeVariant;
  children: ReactNode;
}) {
  return (
    <div
      className={theme.surfaceClass}
      style={{
        borderRadius: 12,
        padding: 12,
        ...theme.surfaceStyle,
      }}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 4: tableThemes registry**

`frontend/src/cosmetics/registry/tableThemes.ts`:
```ts
import { DEFAULT_CODES } from "../defaults";
import type { TableThemeVariant } from "../types";

export const TABLE_THEMES: Record<string, TableThemeVariant> = {
  "table.green": {
    code: "table.green",
    name: "그린 펠트",
    surfaceStyle: {
      background:
        "radial-gradient(ellipse at center, #1f7a4a 0%, #145d36 70%, #0f4426 100%)",
      boxShadow: "inset 0 0 60px rgba(0, 0, 0, 0.4)",
    },
  },
  "table.walnut": {
    code: "table.walnut",
    name: "월넛",
    surfaceStyle: {
      background:
        "repeating-linear-gradient(90deg, #5c3a1f 0px, #6b4528 2px, #5c3a1f 4px), radial-gradient(ellipse at center, #6b4528 0%, #3d2614 100%)",
      backgroundBlendMode: "multiply",
      boxShadow: "inset 0 0 60px rgba(0, 0, 0, 0.4)",
    },
  },
};

export function resolveTableTheme(
  code: string | null | undefined,
): TableThemeVariant {
  if (code && TABLE_THEMES[code]) return TABLE_THEMES[code];
  return TABLE_THEMES[DEFAULT_CODES.table_theme];
}
```

- [ ] **Step 5: 통과 확인**

Run: `cd frontend && npx vitest run cosmetics/registry/__tests__/resolvers.test.ts`
Expected: 12 PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/cosmetics/components/TableSurface.tsx frontend/src/cosmetics/registry/tableThemes.ts frontend/src/cosmetics/registry/__tests__/resolvers.test.ts
git commit -m "feat(cosmetics-visual): table_theme green/walnut + TableSurface + TDD"
```

---

## Task 5: title + registry — TDD

**Files:**
- Create: `frontend/src/cosmetics/components/TitleBadge.tsx`
- Modify: `frontend/src/cosmetics/registry/titles.ts`
- Modify: `frontend/src/cosmetics/registry/__tests__/resolvers.test.ts`

- [ ] **Step 1: 실패 테스트 추가**

파일 끝:
```ts
import { TITLES, resolveTitle } from "../titles";

describe("resolveTitle", () => {
  it("returns beginner for known code", () => {
    expect(resolveTitle("title.beginner").code).toBe("title.beginner");
  });
  it("returns fl_demon for known code", () => {
    expect(resolveTitle("title.fl_demon").code).toBe("title.fl_demon");
  });
  it("falls back to default", () => {
    expect(resolveTitle("title.unknown").code).toBe("title.beginner");
  });
  it("TITLES contains both seeds", () => {
    expect(Object.keys(TITLES).sort()).toEqual([
      "title.beginner",
      "title.fl_demon",
    ]);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd frontend && npx vitest run cosmetics/registry/__tests__/resolvers.test.ts`
Expected: 12 PASS + 4 FAIL.

- [ ] **Step 3: TitleBadge 컴포넌트**

`frontend/src/cosmetics/components/TitleBadge.tsx`:
```tsx
import type { TitleVariant } from "../types";

export function TitleBadge({ variant }: { variant: TitleVariant }) {
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 10,
        lineHeight: 1.2,
        padding: "2px 6px",
        borderRadius: 4,
        fontWeight: 700,
        ...variant.style,
      }}
    >
      {variant.text}
    </span>
  );
}
```

- [ ] **Step 4: titles registry**

`frontend/src/cosmetics/registry/titles.ts`:
```ts
import { DEFAULT_CODES } from "../defaults";
import type { TitleVariant } from "../types";

export const TITLES: Record<string, TitleVariant> = {
  "title.beginner": {
    code: "title.beginner",
    name: "초보자",
    text: "초보자",
    style: {
      background: "#888",
      color: "#ffffff",
    },
  },
  "title.fl_demon": {
    code: "title.fl_demon",
    name: "판타지랜드 악마",
    text: "판타지랜드 악마",
    style: {
      background: "linear-gradient(90deg, #7b2ff7 0%, #f107a3 100%)",
      color: "#ffd700",
      boxShadow: "0 0 4px rgba(241, 7, 163, 0.5)",
    },
  },
};

export function resolveTitle(code: string | null | undefined): TitleVariant {
  if (code && TITLES[code]) return TITLES[code];
  return TITLES[DEFAULT_CODES.title];
}
```

- [ ] **Step 5: 통과**

Run: `cd frontend && npx vitest run cosmetics/registry/__tests__/resolvers.test.ts`
Expected: 16 PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/cosmetics/components/TitleBadge.tsx frontend/src/cosmetics/registry/titles.ts frontend/src/cosmetics/registry/__tests__/resolvers.test.ts
git commit -m "feat(cosmetics-visual): title beginner/fl_demon + TitleBadge + TDD"
```

---

## Task 6: usePlayerCosmetics 훅 — TDD

**Files:**
- Modify: `frontend/src/cosmetics/useResolved.ts`
- Create: `frontend/src/cosmetics/__tests__/useResolved.test.tsx`

- [ ] **Step 1: 실패 테스트 작성**

`frontend/src/cosmetics/__tests__/useResolved.test.tsx`:
```tsx
import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "../../store/authStore";
import { useCosmeticsStore } from "../../store/cosmeticsStore";
import { useGameStore } from "../../store/gameStore";
import { usePlayerCosmetics } from "../useResolved";

function setAuth(userId: string | null) {
  useAuthStore.setState({
    user: userId ? ({ id: userId, nickname: "x", email: "x", created_at: "" } as never) : null,
  });
}

function setLoadout(loadout: {
  card_back: string;
  card_face: string;
  table_theme: string;
  title: string;
} | null) {
  useCosmeticsStore.setState({
    loadout: loadout
      ? {
          card_back: "id-cb",
          card_face: "id-cf",
          table_theme: "id-tt",
          title: "id-ti",
        }
      : null,
    // resolveBy* 함수는 cosmetic id가 아닌 code를 본다. 이 테스트에서는 store가 code map을 부가로 갖도록 확장하거나 useResolved가 catalog를 lookup. 단순화: store에 codes 필드 추가 가정.
  });
}

afterEach(() => {
  setAuth(null);
  useGameStore.setState({ gameState: null });
});

describe("usePlayerCosmetics", () => {
  it("returns default fallback when nothing is set", () => {
    setAuth(null);
    const { result } = renderHook(() => usePlayerCosmetics("anyone"));
    expect(result.current.cardBack.code).toBe("back.navy");
    expect(result.current.cardFace.code).toBe("face.classic");
    expect(result.current.table.code).toBe("table.green");
    expect(result.current.title.code).toBe("title.beginner");
  });

  it("returns opponent cosmetics from gameState.players[].cosmetics", () => {
    useGameStore.setState({
      gameState: {
        players: [
          {
            player_id: "opp",
            cosmetics: {
              card_back: "back.ocean",
              card_face: "face.modern",
              table_theme: "table.walnut",
              title: "title.fl_demon",
            },
          },
        ],
      } as never,
    });

    const { result } = renderHook(() => usePlayerCosmetics("opp"));
    expect(result.current.cardBack.code).toBe("back.ocean");
    expect(result.current.cardFace.code).toBe("face.modern");
    expect(result.current.table.code).toBe("table.walnut");
    expect(result.current.title.code).toBe("title.fl_demon");
  });

  it("falls back when player not in gameState", () => {
    useGameStore.setState({
      gameState: { players: [] } as never,
    });
    const { result } = renderHook(() => usePlayerCosmetics("unknown_player"));
    expect(result.current.cardBack.code).toBe("back.navy");
  });
});
```

> 위 테스트는 `useGameStore`에 `gameState`가 있다고 가정. 만약 store 이름·shape가 다르면 Step 2에서 실제 store API에 맞춰 조정. plan 실행자는 `grep -rn "gameState\|useGameStore\|useMultiplayerSession" frontend/src/store` 로 store 위치를 먼저 확인하고 import + setState 신호에 맞춤.

> **본인 loadout 경로 테스트는 store schema 확인 후 별도 단계에서 추가**: useCosmeticsStore.loadout이 ID 기반인데 우리는 code가 필요. 본 plan은 "ws state는 code map, 본인 loadout은 id map → catalog로 lookup해 code로 변환" 흐름을 useResolved 내부에서 처리한다고 정의. 실 구현은 Step 3.

- [ ] **Step 2: 실패 확인**

Run: `cd frontend && npx vitest run cosmetics/__tests__/useResolved.test.tsx`
Expected: FAIL (import 실패).

- [ ] **Step 3: store schema 확인 + useResolved 구현**

먼저 store 확인:
```bash
grep -n "gameState\|interface\|export.*Store" frontend/src/store/*.ts
```

기존 cosmeticsStore의 loadout은 UUID id 기반. 본인 loadout으로 시각화하려면 id → catalog → code 변환이 필요. 또는 store에 `loadoutCodes` 필드 추가.

**Decision**: `cosmeticsStore`에 derive 함수 추가하지 말고, useResolved 내부에서 `store.catalog`(이미 hydrate 시 받음)를 lookup. 추가 변경 없음.

`frontend/src/cosmetics/useResolved.ts`:
```ts
import { useMemo } from "react";
import { useAuthStore } from "../store/authStore";
import { useCosmeticsStore } from "../store/cosmeticsStore";
import { useGameStore } from "../store/gameStore";
import { DEFAULT_CODES, type CosmeticCategory } from "./defaults";
import { resolveCardBack } from "./registry/cardBacks";
import { resolveCardFace } from "./registry/cardFaces";
import { resolveTableTheme } from "./registry/tableThemes";
import { resolveTitle } from "./registry/titles";
import type {
  CardBackVariant,
  CardFaceVariant,
  TableThemeVariant,
  TitleVariant,
} from "./types";

export interface ResolvedCosmetics {
  cardBack: CardBackVariant;
  cardFace: CardFaceVariant;
  table: TableThemeVariant;
  title: TitleVariant;
}

/**
 * playerId의 코스메틱을 resolve.
 * 우선순위:
 * 1) 본인(myId 일치) → cosmeticsStore.loadout(id) → catalog로 code 변환
 * 2) 상대 → gameState.players[].cosmetics(code map)
 * 3) 미등록·미도착 → DEFAULT_CODES
 */
export function usePlayerCosmetics(playerId: string): ResolvedCosmetics {
  const myId = useAuthStore((s) => s.user?.id ?? null);
  const loadout = useCosmeticsStore((s) => s.loadout);
  const catalog = useCosmeticsStore((s) => s.catalog);
  const gameState = useGameStore((s) => s.gameState);

  const codes = useMemo(() => {
    const map: Record<CosmeticCategory, string> = {
      card_back: DEFAULT_CODES.card_back,
      card_face: DEFAULT_CODES.card_face,
      table_theme: DEFAULT_CODES.table_theme,
      title: DEFAULT_CODES.title,
    };

    if (playerId && myId && playerId === myId && loadout && catalog.length > 0) {
      const idToCode = new Map(catalog.map((c) => [c.id, c.code]));
      map.card_back = idToCode.get(loadout.card_back) ?? map.card_back;
      map.card_face = idToCode.get(loadout.card_face) ?? map.card_face;
      map.table_theme = idToCode.get(loadout.table_theme) ?? map.table_theme;
      map.title = idToCode.get(loadout.title) ?? map.title;
      return map;
    }

    if (gameState?.players) {
      const p = gameState.players.find((pl) => pl.player_id === playerId);
      const c = (p as { cosmetics?: Partial<Record<CosmeticCategory, string>> })
        ?.cosmetics;
      if (c) {
        if (c.card_back) map.card_back = c.card_back;
        if (c.card_face) map.card_face = c.card_face;
        if (c.table_theme) map.table_theme = c.table_theme;
        if (c.title) map.title = c.title;
      }
    }

    return map;
  }, [playerId, myId, loadout, catalog, gameState]);

  return useMemo(
    () => ({
      cardBack: resolveCardBack(codes.card_back),
      cardFace: resolveCardFace(codes.card_face),
      table: resolveTableTheme(codes.table_theme),
      title: resolveTitle(codes.title),
    }),
    [codes],
  );
}

/**
 * 카드 시각만 필요할 때.
 */
export function usePlayerCardSkin(playerId: string) {
  const { cardBack, cardFace } = usePlayerCosmetics(playerId);
  return { Back: cardBack.Component, Face: cardFace.Face, EmptySlot: cardFace.EmptySlot };
}
```

- [ ] **Step 4: GameState.players 타입에 cosmetics 필드 추가**

`frontend/src/api/types.ts`의 `PlayerState`에 `cosmetics?` 필드를 옵셔널로 추가:

```bash
grep -n "interface PlayerState\|type PlayerState" frontend/src/api/types.ts
```

해당 인터페이스에 `cosmetics?: { card_back?: string; card_face?: string; table_theme?: string; title?: string }` 추가.

- [ ] **Step 5: 테스트 실행**

Run: `cd frontend && npx vitest run cosmetics/__tests__/useResolved.test.tsx`
Expected: 3 PASS.

> 실패하면 store import 경로·shape 차이 디버깅. 특히 `useGameStore` 경로. zustand 사용 패턴 확인.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/cosmetics/useResolved.ts frontend/src/cosmetics/__tests__/useResolved.test.tsx frontend/src/api/types.ts
git commit -m "feat(cosmetics-visual): usePlayerCosmetics + usePlayerCardSkin + TDD"
```

---

## Task 7: Card.tsx 리팩터 — playerId prop 추가

**Files:**
- Modify: `frontend/src/components/Card.tsx`

- [ ] **Step 1: Card.tsx 재작성**

`frontend/src/components/Card.tsx` 전체 교체:
```tsx
import type { Card as CardType } from "../api/types";
import { usePlayerCardSkin } from "../cosmetics/useResolved";

interface Props {
  card: CardType;
  /** 이 카드를 "소유한" 플레이어 id. 코스메틱 스킨 결정에 사용. */
  playerId: string;
  selected?: boolean;
  faded?: boolean;
  onClick?: () => void;
  size?: "sm" | "md";
}

export function CardView({
  card,
  playerId,
  selected = false,
  faded = false,
  onClick,
  size = "md",
}: Props) {
  const skin = usePlayerCardSkin(playerId);
  const clickable = !!onClick;
  const cls = [
    "card-view",
    clickable && "is-clickable",
    selected && "is-selected",
    faded && "is-faded",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button type="button" onClick={onClick} disabled={!clickable} className={cls}>
      <skin.Face card={card} size={size} />
    </button>
  );
}

interface SlotProps {
  playerId: string;
  onClick?: () => void;
  size?: "sm" | "md";
  highlighted?: boolean;
}

export function EmptySlot({
  playerId,
  onClick,
  size = "md",
  highlighted = false,
}: SlotProps) {
  const skin = usePlayerCardSkin(playerId);
  const clickable = !!onClick;
  const cls = ["card-slot", clickable && "is-clickable"].filter(Boolean).join(" ");
  return (
    <button type="button" onClick={onClick} disabled={!clickable} className={cls}>
      <skin.EmptySlot size={size} highlighted={highlighted} />
    </button>
  );
}

export function CardBack({
  playerId,
  size = "sm",
}: {
  playerId: string;
  size?: "sm" | "md";
}) {
  const skin = usePlayerCardSkin(playerId);
  return <skin.Back size={size} />;
}
```

- [ ] **Step 2: 빌드 — 타입 에러로 모든 호출처 발견**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -30`
Expected: 다수의 "Property 'playerId' is missing" 에러. 이게 다음 task에서 고칠 호출처 목록.

- [ ] **Step 3: 의도적으로 commit 하지 않음** — Task 8에서 호출처 수정 후 함께 commit

---

## Task 8: 모든 CardView/CardBack/EmptySlot 호출처에 playerId 전달

**Files:**
- Modify: `frontend/src/components/PlayerBoard.tsx`
- Modify: `frontend/src/components/Hand.tsx`
- Modify: `frontend/src/components/ReplayBoard.tsx`
- Modify: `frontend/src/pages/Login.tsx`
- Modify: `frontend/src/pages/NicknameSetup.tsx`
- Modify: `frontend/src/pages/Practice.tsx`
- Modify: `frontend/src/pages/Tutorial.tsx`
- Modify: `frontend/src/pages/FantasyTutorial.tsx`

- [ ] **Step 1: PlayerBoard.tsx — player.player_id 전달**

`PlayerBoard` 컴포넌트 안 `<CardView ...>` 3곳, `<CardBack ...>`, `<EmptySlot ...>` 모두에 `playerId={player.player_id}` 추가:

```tsx
{placed.map((c, i) => (
  <CardView key={`p-${i}`} card={c} size={size} playerId={player.player_id} />
))}
{Array.from({ length: hidden }).map((_, i) => (
  <CardBack key={`h-${i}`} size={size} playerId={player.player_id} />
))}
{pending.map((p) => (
  <CardView
    key={`pd-${p.handIdx}`}
    card={p.card}
    size={size}
    faded
    playerId={player.player_id}
    onClick={onPendingClick ? () => onPendingClick(p.handIdx) : undefined}
  />
))}
{Array.from({ length: empty }).map((_, i) => (
  <EmptySlot
    key={`e-${i}`}
    /* ...기존 props... */
    playerId={player.player_id}
  />
))}
```

- [ ] **Step 2: Hand.tsx — Hand 컴포넌트가 받는 myPlayerId를 prop으로 전달**

`grep -n "interface.*Props\|export function Hand" frontend/src/components/Hand.tsx`로 props 확인.

Hand는 본인 손패라 prop으로 받은 `myPlayerId` 또는 `playerId`를 CardView에 전달.
- 없다면 `playerId: string` prop 추가하고 `<CardView ... playerId={playerId} />`로 전달.
- Hand 호출처(OfcTable.tsx)도 수정해 `playerId={mySession.myPlayerId}` 전달.

- [ ] **Step 3: ReplayBoard.tsx — 어떤 player의 board인지 전달**

`grep -n "player\|CardView\|EmptySlot" frontend/src/components/ReplayBoard.tsx`로 컨텍스트 확인.

ReplayBoard는 특정 player의 보드를 그리므로 해당 player_id prop이 이미 있을 것. CardView·EmptySlot에 `playerId={prop}` 추가.

- [ ] **Step 4: 페이지 (Login, NicknameSetup, Practice, Tutorial, FantasyTutorial) — fallback "" 전달**

이들 화면은 멀티 게임이 아니라 데모 카드. 본인 코스메틱 적용해야 자연. 하지만 본인 코스메틱이 hydrate 안 됐을 수도 있으므로 `playerId=""`로 두면 default fallback 적용. 또는 `useAuthStore.getState().user?.id ?? ""`.

각 페이지의 CardView 호출에 `playerId=""`만 추가:

```tsx
<CardView card={c} size="md" playerId="" />
```

(default fallback이 적용되어 시각은 현재와 동일하게 classic face·navy back. 회귀 없음.)

- [ ] **Step 5: 빌드 — 에러 0**

Run: `cd frontend && npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 6: 빌드 + 실행 확인**

Run: `cd frontend && npm run build 2>&1 | tail -8`
Expected: 빌드 성공.

- [ ] **Step 7: Commit (Task 7+8 함께)**

```bash
git add frontend/src/components/Card.tsx frontend/src/components/PlayerBoard.tsx frontend/src/components/Hand.tsx frontend/src/components/ReplayBoard.tsx frontend/src/pages/Login.tsx frontend/src/pages/NicknameSetup.tsx frontend/src/pages/Practice.tsx frontend/src/pages/Tutorial.tsx frontend/src/pages/FantasyTutorial.tsx
git commit -m "feat(cosmetics-visual): Card/Hand/PlayerBoard/ReplayBoard에 playerId prop 추가"
```

---

## Task 9: PlayerBoard 헤더에 TitleBadge

**Files:**
- Modify: `frontend/src/components/PlayerBoard.tsx`

- [ ] **Step 1: TitleBadge 사용**

`PlayerBoard.tsx` 상단 import 추가:
```tsx
import { TitleBadge } from "../cosmetics/components/TitleBadge";
import { usePlayerCosmetics } from "../cosmetics/useResolved";
```

함수 안에서:
```tsx
const { title } = usePlayerCosmetics(player.player_id);
```

헤더 JSX에서 `{label}` 위 또는 옆에 배지 추가:
```tsx
<div className="flex flex-col gap-0.5 truncate">
  <TitleBadge variant={title} />
  <span className="flex items-center gap-1.5 font-semibold truncate">
    {/* 기존 닉네임·D·(나) 표시 */}
  </span>
</div>
```

기존 헤더 구조에 따라 조정. 디자인: 닉네임 한 줄 위에 작은 배지 한 줄.

- [ ] **Step 2: 빌드 + 시각 확인**

Run: `cd frontend && npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/PlayerBoard.tsx
git commit -m "feat(cosmetics-visual): PlayerBoard 헤더에 TitleBadge"
```

---

## Task 10: OfcTable felt 영역에 TableSurface

**Files:**
- Modify: `frontend/src/components/OfcTable.tsx`

- [ ] **Step 1: TableSurface로 게임 보드 영역 감싸기**

`OfcTable.tsx`에서 PlayerBoard들이 들어가는 컨테이너를 찾아 `<TableSurface theme={myTable}>` 으로 감싼다.

상단 import 추가:
```tsx
import { TableSurface } from "../cosmetics/components/TableSurface";
import { usePlayerCosmetics } from "../cosmetics/useResolved";
```

OfcTable 함수 내부에서 본인 player id로 table theme resolve:
```tsx
const { table } = usePlayerCosmetics(session.myPlayerId);
```

`<TableSurface theme={table}>...</TableSurface>`로 PlayerBoard 영역을 감싼다. Hand·ActionBar는 surface 밖. 정확한 JSX는 `grep -n "PlayerBoard\|<Hand\|<ActionBar" frontend/src/components/OfcTable.tsx` 결과를 보고 감싸는 위치 결정.

- [ ] **Step 2: 빌드 + 시각 확인**

Run: `cd frontend && npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/OfcTable.tsx
git commit -m "feat(cosmetics-visual): OfcTable felt 영역에 TableSurface"
```

---

## Task 11: ResultModal 닉네임 옆 TitleBadge

**Files:**
- Modify: `frontend/src/components/ResultModal.tsx`

- [ ] **Step 1: 닉네임 옆 TitleBadge 추가**

`grep -n "displayName(.*player" frontend/src/components/ResultModal.tsx`로 닉네임 표시 위치 5곳 확인.

각 위치에서 player_id로 title resolve 후 TitleBadge 출력:
```tsx
import { TitleBadge } from "../cosmetics/components/TitleBadge";
import { usePlayerCosmetics } from "../cosmetics/useResolved";

// 컴포넌트 내부에서 player_id별로 lookup. 5곳에서 inline으로:
function PlayerName({ playerId, playersMeta }: { playerId: string; playersMeta: PlayersMeta }) {
  const { title } = usePlayerCosmetics(playerId);
  return (
    <span className="inline-flex items-center gap-1.5">
      <TitleBadge variant={title} />
      <span>{displayName(playerId, playersMeta)}</span>
    </span>
  );
}
```

그리고 기존 5곳의 `{displayName(...)}`를 `<PlayerName playerId={...} playersMeta={playersMeta} />` 로 교체.

- [ ] **Step 2: 빌드**

Run: `cd frontend && npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ResultModal.tsx
git commit -m "feat(cosmetics-visual): ResultModal 닉네임 옆 TitleBadge"
```

---

## Task 12: Game/Practice 페이지 마운트 시 hydrate

**Files:**
- Modify: `frontend/src/pages/Game.tsx`
- Modify: `frontend/src/pages/Practice.tsx`

- [ ] **Step 1: useCosmeticsStore.hydrate 호출**

Game.tsx + Practice.tsx 둘 다 동일 패턴:

```tsx
import { useEffect } from "react";
import { useCosmeticsStore } from "../store/cosmeticsStore";

// 컴포넌트 내부:
const { loaded, hydrate } = useCosmeticsStore();
useEffect(() => {
  if (!loaded) hydrate().catch(() => {});
}, [loaded, hydrate]);
```

`.catch(() => {})`: 인증 없는 경우(Practice는 로그인 안 한 게스트도 가능) hydrate가 401일 수 있으므로 swallow. 그때는 store가 empty 상태로 머물고 default fallback이 적용됨.

- [ ] **Step 2: 빌드**

Run: `cd frontend && npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Game.tsx frontend/src/pages/Practice.tsx
git commit -m "feat(cosmetics-visual): Game/Practice 마운트 시 cosmeticsStore.hydrate"
```

---

## Task 13: MyPage CosmeticsSection 프리뷰

**Files:**
- Modify: `frontend/src/components/MyPage/CosmeticsSection.tsx`

- [ ] **Step 1: 옵션 버튼을 시각 프리뷰 + 라벨로 교체**

`CosmeticsSection.tsx`의 옵션 버튼 렌더링을 다음으로 변경:

```tsx
import { resolveCardBack } from "../../cosmetics/registry/cardBacks";
import { resolveCardFace } from "../../cosmetics/registry/cardFaces";
import { resolveTableTheme } from "../../cosmetics/registry/tableThemes";
import { resolveTitle } from "../../cosmetics/registry/titles";
import { TitleBadge } from "../../cosmetics/components/TitleBadge";

// catalog 항목별 미니어처 렌더 함수
function PreviewMini({ category, code }: { category: string; code: string }) {
  if (category === "card_back") {
    const v = resolveCardBack(code);
    return <v.Component size="sm" />;
  }
  if (category === "card_face") {
    const v = resolveCardFace(code);
    return (
      <v.Face card={{ rank: 14, suit: 0 }} size="sm" />
    );
  }
  if (category === "table_theme") {
    const v = resolveTableTheme(code);
    return (
      <div
        style={{
          width: 40,
          height: 30,
          borderRadius: 4,
          ...v.surfaceStyle,
        }}
      />
    );
  }
  if (category === "title") {
    const v = resolveTitle(code);
    return <TitleBadge variant={v} />;
  }
  return null;
}
```

그리고 옵션 버튼 JSX를 다음으로 교체 (`{item.name}` 위치):
```tsx
<Button
  key={item.id}
  type="button"
  variant={draft[key] === item.id ? "primary" : "secondary"}
  size="sm"
  onClick={() => setDraft((d) => ({ ...d, [key]: item.id }))}
>
  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
    <PreviewMini category={key} code={item.code} />
    <span>{item.name}</span>
  </span>
</Button>
```

- [ ] **Step 2: 빌드**

Run: `cd frontend && npm run build 2>&1 | tail -5`
Expected: 빌드 성공.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/MyPage/CosmeticsSection.tsx
git commit -m "feat(cosmetics-visual): MyPage CosmeticsSection 시각 프리뷰"
```

---

## Task 14: cardSkins/ 폴더 폐기 또는 thin shim

**Files:**
- Modify or delete: `frontend/src/components/cardSkins/default.tsx`
- Modify or delete: `frontend/src/components/cardSkins/index.ts`
- Modify or delete: `frontend/src/components/cardSkins/types.ts`

- [ ] **Step 1: useCardSkin 잔여 호출처 grep**

```bash
grep -rn "useCardSkin\|cardSkins\b" frontend/src/
```

Card.tsx는 이미 교체됨. 다른 호출처 0이면 폴더 전체 삭제. 만약 남아있으면 그것들도 usePlayerCardSkin으로 교체.

- [ ] **Step 2: 폴더 삭제 (전체 폐기)**

```bash
rm -rf frontend/src/components/cardSkins/
```

- [ ] **Step 3: 빌드 확인**

Run: `cd frontend && npm run build 2>&1 | tail -5`
Expected: 빌드 성공.

- [ ] **Step 4: Commit**

```bash
git add -A frontend/src/components/cardSkins/
git commit -m "refactor(cosmetics-visual): cardSkins/ 폴더 폐기 — cosmetics/로 흡수"
```

---

## Task 15: 최종 회귀 검증

**Files:** (수정 없음)

- [ ] **Step 1: 프론트 vitest 전체**

Run: `cd frontend && npx vitest run`
Expected: 모두 PASS.

- [ ] **Step 2: 프론트 빌드**

Run: `cd frontend && npm run build`
Expected: 에러 없음.

- [ ] **Step 3: 백엔드 회귀 (변경 없지만 안전망)**

Run: `uv run pytest -q`
Expected: 184 passed (sub-project #1 기준).

- [ ] **Step 4: 수동 e2e (선택)**

1. backend + frontend dev 서버 기동
2. dev-login 두 명 (서로 다른 브라우저)
3. 각자 마이페이지에서 alt 코스메틱 선택·저장 (시각 프리뷰 작동 확인)
4. 게임 시작 → OfcTable 배경·내 카드 face·상대 카드 back·title 배지가 각자 설정대로 표시되는지 확인

---

## Self-Review 체크

**Spec 커버리지**:
- § 2 1차 PR 범위 → Task 0~13 모두 매핑
- § 4.1 디렉터리 → Task 0 골격, Task 1~5 채움
- § 4.2 인터페이스 → Task 1
- § 4.3 resolve 우선순위 → Task 6
- § 4.4 소비자 변경 → Task 7~11
- § 4.5 hydrate 시점 → Task 12
- § 4.6 fallback → Task 6 resolve 함수 + DEFAULT_CODES
- § 5 각 alt 시각 명세 → Task 2(back), 3(face), 4(table), 5(title)
- § 7 테스트 → Task 2~6 TDD, Task 15 회귀

**Placeholder 스캔**:
- Task 6 Step 3·5의 store schema 확인 단계는 명시적 실행자 책임 + grep 명령 제공. 실제 store 이름이 다르면 import 경로만 조정.
- Task 8 Step 2·3에서 grep 명령 명시. 호출처 전수 발견은 빌드 에러로 강제.
- 그 외 TBD/TODO 없음.

**Type 일관성**:
- `CardSize`: Task 1에서 정의, Task 2·3에서 import해 동일 사용
- `Variant` 4종: Task 1 정의, Task 2~5 registry에서 같은 이름 사용
- `resolveCard*`/`resolveTableTheme`/`resolveTitle`: 시그니처 `(code: string | null | undefined) => Variant` 일관
- `usePlayerCosmetics` 반환: Task 6에서 정의, Task 9·10·11에서 같은 shape 사용
