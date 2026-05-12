import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { Card, GameState, PlayerState, Row, WsClientMsg } from "../api/types";
import { ROW_CAPACITY } from "../api/types";
import { isFoulBoard } from "../lib/handEval";
import { displayName } from "../lib/displayName";
import {
  ActionBar,
  getRequiredDiscard,
  getRequiredPlace,
} from "./ActionBar";
import { Hand } from "./Hand";
import { PlayerBoard } from "./PlayerBoard";
import { ResultModal } from "./ResultModal";
import { useMatchupAnimation } from "./useMatchupAnimation";

/**
 * 게임/연습 양 모드가 OfcTable에 공급하는 어댑터 인터페이스.
 *
 * 멀티(useMultiplayerSession 등): WS로 state 받고 confirm은 액션 메시지 발송.
 * 연습(usePracticeSession 등): 로컬 reducer로 state 갱신, confirm은 그 reducer 호출.
 *
 * OfcTable은 어느 쪽인지 알 필요가 없다.
 */
export interface OfcSession {
  gameState: GameState | null;
  myPlayerId: string;
  // 멀티에서만 의미 있는 표시 정보. 연습은 항상 true.
  connected: boolean;
  // 사용자가 턴 종료를 눌렀을 때 호출. placements/discards는 OfcTable이 pending에서 구성.
  confirm: (msg: WsClientMsg) => void;
  // 결과 모달의 "계속" 버튼이 눌렸을 때.
  // - 멀티: pendingState commit (다음 라운드 state로 진입)
  // - 연습: 새 라운드 시작
  resultClose: () => void;
  // 결과 모달의 "새 방으로" 버튼(GAME_OVER 시) — 게임 only.
  newRoom?: () => void;
}

interface Props {
  session: OfcSession;
}

interface PlacedSlot {
  handIdx: number;
  row: Row;
}

function isBoardComplete(p: PlayerState): boolean {
  return p.board.top_count + p.board.middle_count + p.board.bottom_count >= 13;
}

function isResultPhase(gs: GameState | null): boolean {
  return !!gs && (gs.phase === "done" || gs.phase === "game_over");
}

export function OfcTable({ session }: Props) {
  const { gameState, myPlayerId } = session;

  // pending 인터랙션 상태 — gameState.phase가 바뀌면 자동 reset.
  const [selectedRow, setSelectedRow] = useState<Row | null>(null);
  const [selectedCardIdx, setSelectedCardIdx] = useState<number | null>(null);
  const [placed, setPlaced] = useState<PlacedSlot[]>([]);
  const [animationDone, setAnimationDone] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // 새 state(턴 진행 / 라운드 진행 / 다른 사람 액션 결과)가 도착하면 pending 인터랙션 초기화.
  // gameState ref가 바뀔 때만 트리거 — 연습/게임 모두 같은 동작.
  useEffect(() => {
    setSelectedRow(null);
    setSelectedCardIdx(null);
    setPlaced([]);
    const phase = gameState?.phase;
    if (phase && phase !== "done" && phase !== "game_over") {
      setAnimationDone(false);
      setModalOpen(false);
    }
  }, [gameState]);

  const me = useMemo(
    () => gameState?.players.find((p) => p.player_id === myPlayerId) ?? null,
    [gameState, myPlayerId],
  );

  const isFantasyPhase = gameState?.phase === "fantasy_turn";
  const myFlIncomplete = !!me && me.is_fantasy && !isBoardComplete(me);
  const isMyTurn =
    !!gameState &&
    !isResultPhase(gameState) &&
    (isFantasyPhase
      ? myFlIncomplete
      : gameState.current_player_id === myPlayerId);
  const handCount = me?.hand.length ?? 0;
  const inResultPhase = isResultPhase(gameState);

  const placedIdxSet = useMemo(
    () => new Set(placed.map((p) => p.handIdx)),
    [placed],
  );

  const pendingByRow = useMemo(() => {
    const out: Record<Row, { card: Card; handIdx: number }[]> = {
      top: [],
      middle: [],
      bottom: [],
    };
    if (!me) return out;
    for (const slot of placed) {
      const card = me.hand[slot.handIdx];
      if (card) out[slot.row].push({ card, handIdx: slot.handIdx });
    }
    return out;
  }, [placed, me]);

  const anim = useMatchupAnimation(
    inResultPhase && !animationDone ? (gameState?.matchups ?? []) : null,
    () => {
      setAnimationDone(true);
      setModalOpen(true);
    },
  );

  const rowUsed = (row: Row): number => {
    if (!me) return 0;
    return me.board[row].length + pendingByRow[row].length;
  };

  const placePiece = (handIdx: number, row: Row) => {
    if (placed.some((p) => p.handIdx === handIdx)) return;
    setPlaced((cur) => [...cur, { handIdx, row }]);
    setSelectedRow(row);
    setSelectedCardIdx(null);
  };

  const unplace = (handIdx: number) =>
    setPlaced((cur) => cur.filter((p) => p.handIdx !== handIdx));

  const clearPending = () => {
    setSelectedRow(null);
    setSelectedCardIdx(null);
    setPlaced([]);
  };

  const handleRowSelect = (row: Row) => {
    if (!isMyTurn) return;
    if (selectedCardIdx !== null) {
      if (rowUsed(row) >= ROW_CAPACITY[row]) {
        toast.error(`${row} 줄이 가득 찼습니다.`);
        return;
      }
      placePiece(selectedCardIdx, row);
      return;
    }
    setSelectedRow(selectedRow === row ? null : row);
  };

  const handleHandPlace = (idx: number) => {
    if (!isMyTurn) return;
    if (selectedRow !== null) {
      if (rowUsed(selectedRow) >= ROW_CAPACITY[selectedRow]) {
        toast.error(`${selectedRow} 줄이 가득 찼습니다.`);
        return;
      }
      placePiece(idx, selectedRow);
      return;
    }
    setSelectedCardIdx(selectedCardIdx === idx ? null : idx);
  };

  const handleConfirm = () => {
    if (!gameState || !me || !isMyTurn) return;
    const phase = gameState.phase;
    const placeReq = getRequiredPlace(phase);
    const discardReq = getRequiredDiscard(phase, handCount);
    if (placed.length !== placeReq) {
      toast.error(`${placeReq}장을 배치해야 합니다. (현재 ${placed.length}장)`);
      return;
    }
    const placements: Record<Row, Card[]> = { top: [], middle: [], bottom: [] };
    for (const slot of placed) {
      const c = me.hand[slot.handIdx];
      if (c) placements[slot.row].push(c);
    }
    const missingIdx = me.hand
      .map((_, i) => i)
      .filter((i) => !placedIdxSet.has(i));
    const missing = missingIdx.map((i) => me.hand[i]);
    if (missing.length !== discardReq) {
      toast.error(
        `버려질 카드 수가 맞지 않습니다. (예상 ${discardReq}, 실제 ${missing.length})`,
      );
      return;
    }

    let msg: WsClientMsg;
    if (phase === "first_turn") {
      msg = { action: "first_turn", player_id: myPlayerId, placements };
    } else if (phase === "normal_turn") {
      msg = {
        action: "normal_turn",
        player_id: myPlayerId,
        placements,
        discard: missing[0],
      };
    } else if (phase === "fantasy_turn") {
      if (isFoulBoard(placements.top, placements.middle, placements.bottom)) {
        toast.error("Foul 보드입니다. 탑 ≤ 미들 ≤ 바텀이 되도록 다시 배치하세요.");
        return;
      }
      msg = {
        action: "fantasy_turn",
        player_id: myPlayerId,
        placements,
        discards: missing,
      };
    } else {
      return;
    }
    session.confirm(msg);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setAnimationDone(false);
    session.resultClose();
  };

  if (!gameState) {
    return <div className="text-slate-400">게임 상태를 불러오는 중...</div>;
  }

  const pendingFlPlayers =
    isFantasyPhase && gameState
      ? gameState.players.filter(
          (p) => p.is_fantasy && !isBoardComplete(p),
        )
      : [];

  const playersMeta = gameState.players_meta;

  return (
    <>
      <div className="text-sm text-slate-700 flex justify-center mb-1">
        {gameState.is_game_over ? (
          <span className="text-slate-500">종료</span>
        ) : isFantasyPhase ? (
          <>
            <span className="font-semibold">FantasyLand 배치 중</span>
            {pendingFlPlayers.length > 0 && (
              <span className="text-slate-400 ml-1">
                ({pendingFlPlayers.length}명 대기)
              </span>
            )}
          </>
        ) : (
          <>
            <span className="font-semibold">
              {displayName(gameState.current_player_id, playersMeta)}
            </span>
            <span className="text-slate-400 ml-1">의 차례</span>
          </>
        )}
      </div>

      <section className="flex justify-center">
        <ActionBar
          phase={gameState.phase}
          isMyTurn={isMyTurn}
          hasPending={
            placed.length > 0 ||
            selectedRow !== null ||
            selectedCardIdx !== null
          }
          onConfirm={handleConfirm}
          onCancel={clearPending}
          onShowResult={
            inResultPhase && animationDone ? () => setModalOpen(true) : undefined
          }
        />
      </section>

      {me && (
        <section className="flex justify-center">
          <Hand
            hand={me.hand}
            placedIdxSet={placedIdxSet}
            enabled={isMyTurn}
            selectedIdx={selectedCardIdx}
            onPlace={handleHandPlace}
            onUnplace={unplace}
          />
        </section>
      )}

      <main className="flex-1 flex items-start justify-center">
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: `repeat(${gameState.players.length}, minmax(0, 1fr))`,
          }}
        >
          {gameState.players.map((p, idx) => {
            const isMe = p.player_id === myPlayerId;
            return (
              <PlayerBoard
                key={p.player_id}
                player={p}
                label={displayName(p.player_id, playersMeta)}
                isMe={isMe}
                isCurrent={
                  isFantasyPhase
                    ? p.is_fantasy && !isBoardComplete(p)
                    : p.player_id === gameState.current_player_id
                }
                isDealer={idx === gameState.dealer_idx}
                pendingByRow={isMe ? pendingByRow : undefined}
                selectedRow={isMe ? selectedRow : undefined}
                onRowSelect={isMe && isMyTurn ? handleRowSelect : undefined}
                onPendingClick={isMe ? unplace : undefined}
                animOverlay={anim.overlaysByPlayer[p.player_id] ?? null}
              />
            );
          })}
        </div>
      </main>

      {modalOpen && gameState.matchups !== null && (
        <ResultModal
          players={gameState.players}
          matchups={gameState.matchups ?? []}
          myPlayerId={myPlayerId}
          playersMeta={playersMeta}
          roundNumber={gameState.round_number}
          maxRounds={gameState.max_rounds}
          isBonusRound={gameState.is_bonus_round}
          isGameOver={gameState.is_game_over}
          onClose={handleCloseModal}
          onNewRoom={session.newRoom}
        />
      )}
    </>
  );
}
