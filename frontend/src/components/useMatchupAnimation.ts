import { useEffect, useMemo, useRef, useState } from "react";
import type { Matchup, Row } from "../api/types";
import type { AnimOverlay } from "./PlayerBoard";

type Step =
  | { kind: "row"; row: Row; matchupIdx: number; aDelta: number }
  | { kind: "scoop"; matchupIdx: number; aDelta: number };

const STEP_MS: Record<Step["kind"], number> = {
  row: 900,
  scoop: 1000,
};

function rowTotal(m: Matchup, row: Row): number {
  switch (row) {
    case "top":
      return m.top_line_a + (m.top_royalty_a - m.top_royalty_b);
    case "middle":
      return m.middle_line_a + (m.middle_royalty_a - m.middle_royalty_b);
    case "bottom":
      return m.bottom_line_a + (m.bottom_royalty_a - m.bottom_royalty_b);
  }
}

function buildSteps(matchups: Matchup[]): Step[] {
  const out: Step[] = [];
  matchups.forEach((m, idx) => {
    (["top", "middle", "bottom"] as Row[]).forEach((row) => {
      const v = rowTotal(m, row);
      if (v !== 0) out.push({ kind: "row", row, matchupIdx: idx, aDelta: v });
    });
    if (m.scoop_a !== 0)
      out.push({ kind: "scoop", matchupIdx: idx, aDelta: m.scoop_a });
  });
  return out;
}

function formatDelta(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

function toneOf(n: number): "pos" | "neg" | "neutral" {
  if (n > 0) return "pos";
  if (n < 0) return "neg";
  return "neutral";
}

export interface AnimationState {
  overlaysByPlayer: Record<string, AnimOverlay | null>;
  skip: () => void;
  active: boolean;
}

export function useMatchupAnimation(
  matchups: Matchup[] | null | undefined,
  onDone: () => void,
): AnimationState {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const matchupsKey = useMemo(
    () => (matchups ? matchups.map((m) => `${m.a_id}-${m.b_id}`).join(",") : ""),
    [matchups],
  );

  const steps = useMemo(() => (matchups ? buildSteps(matchups) : []), [matchups]);

  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    setStepIdx(0);
  }, [matchupsKey]);

  useEffect(() => {
    if (!matchups || matchups.length === 0) return;
    if (steps.length === 0) {
      const t = setTimeout(() => onDoneRef.current(), 100);
      return () => clearTimeout(t);
    }
    if (stepIdx >= steps.length) {
      const t = setTimeout(() => onDoneRef.current(), 250);
      return () => clearTimeout(t);
    }
    const step = steps[stepIdx];
    const t = setTimeout(() => setStepIdx((i) => i + 1), STEP_MS[step.kind]);
    return () => clearTimeout(t);
  }, [stepIdx, steps, matchups]);

  const overlaysByPlayer: Record<string, AnimOverlay | null> = {};
  const active = !!matchups && matchups.length > 0 && stepIdx < steps.length;

  if (active) {
    const step = steps[stepIdx];
    const m = matchups![step.matchupIdx];
    const aDelta = step.aDelta;
    const bDelta = -aDelta;
    const key = `${step.matchupIdx}-${stepIdx}`;
    if (step.kind === "row") {
      overlaysByPlayer[m.a_id] = {
        position: step.row,
        text: formatDelta(aDelta),
        tone: toneOf(aDelta),
        animKey: `${key}-a`,
      };
      overlaysByPlayer[m.b_id] = {
        position: step.row,
        text: formatDelta(bDelta),
        tone: toneOf(bDelta),
        animKey: `${key}-b`,
      };
    } else {
      overlaysByPlayer[m.a_id] = {
        position: "center",
        text: `SCOOP\n${formatDelta(aDelta)}`,
        tone: toneOf(aDelta),
        animKey: `${key}-a`,
      };
      overlaysByPlayer[m.b_id] = {
        position: "center",
        text: `SCOOP\n${formatDelta(bDelta)}`,
        tone: toneOf(bDelta),
        animKey: `${key}-b`,
      };
    }
  }

  return {
    overlaysByPlayer,
    skip: () => setStepIdx(steps.length),
    active,
  };
}
