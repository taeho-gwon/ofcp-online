import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type {
  BoardEvaluation,
  Card,
  GameState,
  HandEvaluation,
  PlayerState,
  WsClientMsg,
} from "../api/types";
import { CardView } from "../components/Card";
import { OfcTable, type OfcSession } from "../components/OfcTable";
import { Button } from "../components/ui";
import { evaluate, HandRank, isFoulBoard } from "../lib/handEval";
import {
  handLabel,
  royaltyBottom,
  royaltyMiddle,
  royaltyTop,
} from "../lib/royalty";
import { useAuthStore } from "../store/authStore";

const PAGE_MAX_WIDTH = 1200;

const heroTitleStyle = {
  fontSize: "var(--fs-display)",
  fontWeight: 700,
  letterSpacing: "var(--tracking-tight)",
  margin: 0,
  lineHeight: 1.1,
};

const heroSubtitleStyle = {
  fontSize: "var(--fs-body-lg)",
  color: "var(--text-secondary)",
  margin: "10px 0 0",
};

const SUITS = [1, 2, 3, 4];
const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
const PRACTICE_ID = "self";
const PRACTICE_NICK = "연습";
// 연습은 1라운드씩 반복하므로 max_rounds 의미 없음. 0으로 두면 ResultModal이
// 'R N/M' 표시 대신 단순 '라운드 결과' 헤딩으로 갈음한다.
const PRACTICE_MAX_ROUNDS = 0;

interface Board {
  top: Card[];
  middle: Card[];
  bottom: Card[];
}

interface PracticeState {
  phase: GameState["phase"];
  turnIdx: number; // 1=first, 2..5=normal
  deck: Card[];
  hand: Card[];
  committed: Board;
  discarded: Card[];
  cumulativeScore: number;
  lastRoundDelta: number | null;
}

const emptyBoard = (): Board => ({ top: [], middle: [], bottom: [] });

function freshDeck(): Card[] {
  const deck: Card[] = [];
  for (const s of SUITS) for (const r of RANKS) deck.push({ rank: r, suit: s });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function startNewRound(prevScore: number): PracticeState {
  const deck = freshDeck();
  const hand = deck.splice(0, 5);
  return {
    phase: "first_turn",
    turnIdx: 1,
    deck,
    hand,
    committed: emptyBoard(),
    discarded: [],
    cumulativeScore: prevScore,
    lastRoundDelta: null,
  };
}

function fantasyEntryCards(top: Card[]): number | null {
  if (top.length !== 3) return null;
  const hv = evaluate(top);
  if (hv.rank === HandRank.THREE_OF_A_KIND) return 17;
  if (hv.rank === HandRank.ONE_PAIR) {
    const high = hv.tiebreakers[0];
    if (high === 14) return 16;
    if (high === 13) return 15;
    if (high === 12) return 14;
  }
  return null;
}

function rowEval(
  cards: Card[],
  isFoul: boolean,
  royaltyFn: (c: Card[], f: boolean) => number,
): HandEvaluation {
  const hv = evaluate(cards);
  return {
    rank: hv.rank,
    rank_label: "",
    label: handLabel(hv),
    royalty: royaltyFn(cards, isFoul),
  };
}

function buildEvaluation(board: Board): BoardEvaluation {
  const isFoul = isFoulBoard(board.top, board.middle, board.bottom);
  const top = rowEval(board.top, isFoul, royaltyTop);
  const middle = rowEval(board.middle, isFoul, royaltyMiddle);
  const bottom = rowEval(board.bottom, isFoul, royaltyBottom);
  return {
    top,
    middle,
    bottom,
    is_foul: isFoul,
    total_royalty: top.royalty + middle.royalty + bottom.royalty,
  };
}

function buildGameState(s: PracticeState): GameState {
  const showResult = s.phase === "done" || s.phase === "game_over";
  const evaluation = showResult ? buildEvaluation(s.committed) : null;
  const nextFl =
    showResult && evaluation && !evaluation.is_foul
      ? fantasyEntryCards(s.committed.top)
      : null;
  const me: PlayerState = {
    player_id: PRACTICE_ID,
    board: {
      top: s.committed.top,
      middle: s.committed.middle,
      bottom: s.committed.bottom,
      top_count: s.committed.top.length,
      middle_count: s.committed.middle.length,
      bottom_count: s.committed.bottom.length,
    },
    hand: s.hand,
    hand_count: s.hand.length,
    score: s.cumulativeScore,
    is_fantasy: false,
    next_fantasy_cards: nextFl,
    evaluation,
    last_round_delta: showResult ? s.lastRoundDelta : null,
  };
  return {
    game_id: "practice",
    phase: s.phase,
    dealer_idx: 0,
    current_player_idx: 0,
    current_player_id: PRACTICE_ID,
    round_number: 1,
    is_bonus_round: false,
    max_rounds: PRACTICE_MAX_ROUNDS,
    is_game_over: false,
    players: [me],
    matchups: showResult ? [] : null,
    players_meta: { [PRACTICE_ID]: PRACTICE_NICK },
  };
}

function applyAction(s: PracticeState, msg: WsClientMsg): PracticeState {
  if (msg.action === "first_turn") {
    const newCommitted: Board = {
      top: [...s.committed.top, ...msg.placements.top],
      middle: [...s.committed.middle, ...msg.placements.middle],
      bottom: [...s.committed.bottom, ...msg.placements.bottom],
    };
    const newDeck = [...s.deck];
    const dealt = newDeck.splice(0, 3);
    return {
      ...s,
      phase: "normal_turn",
      turnIdx: 2,
      deck: newDeck,
      hand: dealt,
      committed: newCommitted,
    };
  }
  if (msg.action === "normal_turn") {
    const newCommitted: Board = {
      top: [...s.committed.top, ...msg.placements.top],
      middle: [...s.committed.middle, ...msg.placements.middle],
      bottom: [...s.committed.bottom, ...msg.placements.bottom],
    };
    const newDiscarded = [...s.discarded, msg.discard];
    if (s.turnIdx >= 5) {
      const ev = buildEvaluation(newCommitted);
      const delta = ev.is_foul ? 0 : ev.total_royalty;
      return {
        ...s,
        phase: "done",
        hand: [],
        committed: newCommitted,
        discarded: newDiscarded,
        lastRoundDelta: delta,
        cumulativeScore: s.cumulativeScore + delta,
      };
    }
    const newDeck = [...s.deck];
    const dealt = newDeck.splice(0, 3);
    return {
      ...s,
      turnIdx: s.turnIdx + 1,
      deck: newDeck,
      hand: dealt,
      committed: newCommitted,
      discarded: newDiscarded,
    };
  }
  return s;
}

export function Practice() {
  const navigate = useNavigate();
  const authed = useAuthStore((a) => !!a.accessToken);
  const [s, setS] = useState<PracticeState>(() => startNewRound(0));

  const gameState = useMemo(() => buildGameState(s), [s]);

  const session: OfcSession = useMemo(
    () => ({
      gameState,
      myPlayerId: PRACTICE_ID,
      connected: true,
      confirm: (msg) => setS((prev) => applyAction(prev, msg)),
      resultClose: () => setS((prev) => startNewRound(prev.cumulativeScore)),
    }),
    [gameState],
  );

  const headerStatus =
    s.phase === "first_turn"
      ? "1턴 — 5장 모두 배치"
      : s.phase === "normal_turn"
        ? `${s.turnIdx}턴 — 2장 배치, 1장 자동 버림`
        : "라운드 종료";

  const placedCount =
    s.committed.top.length + s.committed.middle.length + s.committed.bottom.length;

  return (
    <div className="min-h-screen flex flex-col items-center p-6 pb-12">
      <div
        className="w-full flex flex-col gap-3"
        style={{ maxWidth: PAGE_MAX_WIDTH }}
      >
        <header className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 style={heroTitleStyle}>연습 모드</h1>
            <p style={heroSubtitleStyle}>
              {headerStatus} · 진행 {placedCount}/13 · 버림 {s.discarded.length}
              /4 · 누적 {s.cumulativeScore}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setS(startNewRound(0))}
            >
              처음부터
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate(authed ? "/" : "/login")}
            >
              ← {authed ? "로비" : "로그인"}
            </Button>
          </div>
        </header>

        <OfcTable session={session} />

        {s.discarded.length > 0 && s.phase !== "done" && (
          <div
            className="card mx-auto"
            style={{ maxWidth: 448, width: "100%", padding: 12 }}
          >
            <div
              style={{
                fontSize: "var(--fs-caption)",
                color: "var(--text-tertiary)",
                marginBottom: 4,
              }}
            >
              버린 카드
            </div>
            <div className="flex flex-wrap justify-center gap-1">
              {s.discarded.map((c, i) => (
                <CardView
                  key={`d-${i}-${c.rank}-${c.suit}`}
                  card={c}
                  size="sm"
                  faded
                  playerId=""
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
