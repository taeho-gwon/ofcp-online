import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { GameSocket } from "../api/ws";
import type { Card, PlayerState, Row, WsClientMsg } from "../api/types";
import { ROW_CAPACITY } from "../api/types";
import { useGameStore } from "../store/gameStore";
import { Hand } from "../components/Hand";
import { PlayerBoard } from "../components/PlayerBoard";
import {
  ActionBar,
  getRequiredDiscard,
  getRequiredPlace,
} from "../components/ActionBar";
import { useMatchupAnimation } from "../components/useMatchupAnimation";
import { ResultModal } from "../components/ResultModal";
import { RulesModal } from "../components/RulesModal";
import { isFoulBoard } from "../lib/handEval";

export function Game() {
  const { gameId } = useParams<{ gameId: string }>();
  const [search] = useSearchParams();
  const playerId = search.get("player") ?? "";
  const navigate = useNavigate();

  const gameState = useGameStore((s) => s.gameState);
  const connected = useGameStore((s) => s.connected);
  const selectedRow = useGameStore((s) => s.selectedRow);
  const placed = useGameStore((s) => s.placed);
  const setGameState = useGameStore((s) => s.setGameState);
  const commitPendingState = useGameStore((s) => s.commitPendingState);
  const setConnected = useGameStore((s) => s.setConnected);
  const setError = useGameStore((s) => s.setError);
  const selectRow = useGameStore((s) => s.selectRow);
  const placeCard = useGameStore((s) => s.placeCard);
  const unplace = useGameStore((s) => s.unplace);
  const clearPending = useGameStore((s) => s.clearPending);

  const socketRef = useRef<GameSocket | null>(null);
  const [animationDone, setAnimationDone] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);

  useEffect(() => {
    if (!gameId || !playerId) return;
    const sock = new GameSocket(gameId, playerId, {
      onOpen: () => setConnected(true),
      onClose: () => setConnected(false),
      onMessage: (msg) => {
        if (msg.type === "state") {
          setGameState(msg.data);
        } else if (msg.type === "error") {
          setError(msg.data.message);
          toast.error(msg.data.message);
        }
      },
    });
    socketRef.current = sock;
    return () => {
      sock.close();
      socketRef.current = null;
    };
  }, [gameId, playerId, setConnected, setGameState, setError]);

  const handleAnimationDone = () => {
    setAnimationDone(true);
    setModalOpen(true);
  };

  // 결과 phase 동안 gameState는 스토어에 의해 결과 시점에 고정 유지된다(다음 라운드
  // state는 pendingState로 보류됨). matchups가 있으면 그대로 애니메이션을 돌린다.
  const inResultPhase =
    gameState?.phase === "done" || gameState?.phase === "game_over";

  const anim = useMatchupAnimation(
    inResultPhase && !animationDone ? (gameState?.matchups ?? null) : null,
    handleAnimationDone,
  );

  const me = useMemo(
    () => gameState?.players.find((p) => p.player_id === playerId) ?? null,
    [gameState, playerId],
  );

  const isFantasyPhase = gameState?.phase === "fantasy_turn";
  const isBoardComplete = (p: PlayerState): boolean =>
    p.board.top_count + p.board.middle_count + p.board.bottom_count >= 13;
  const myFlIncomplete =
    !!me && me.is_fantasy && !isBoardComplete(me);
  const isMyTurn =
    !!gameState &&
    (isFantasyPhase
      ? myFlIncomplete
      : gameState.current_player_id === playerId);
  const handCount = me?.hand.length ?? 0;

  const pendingFlPlayers = useMemo(() => {
    if (!gameState || !isFantasyPhase) return [];
    return gameState.players.filter(
      (p) => p.is_fantasy && !isBoardComplete(p),
    );
  }, [gameState, isFantasyPhase]);

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

  const rowUsed = (row: Row): number => {
    if (!me) return 0;
    return me.board[row].length + pendingByRow[row].length;
  };

  const handleRowSelect = (row: Row) => {
    if (!isMyTurn) return;
    selectRow(selectedRow === row ? null : row);
  };

  const handleHandPlace = (idx: number) => {
    if (!isMyTurn || selectedRow === null) return;
    if (rowUsed(selectedRow) >= ROW_CAPACITY[selectedRow]) {
      toast.error(`${selectedRow} 줄이 가득 찼습니다.`);
      return;
    }
    placeCard(idx);
  };

  const handlePendingClick = (handIdx: number) => {
    unplace(handIdx);
  };

  const handleConfirm = () => {
    if (!gameState || !me) return;
    if (!isMyTurn) return;

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
      msg = { action: "first_turn", player_id: playerId, placements };
    } else if (phase === "normal_turn") {
      msg = {
        action: "normal_turn",
        player_id: playerId,
        placements,
        discard: missing[0],
      };
    } else if (phase === "fantasy_turn") {
      if (
        isFoulBoard(placements.top, placements.middle, placements.bottom)
      ) {
        toast.error("Foul 보드입니다. 탑 ≤ 미들 ≤ 바텀이 되도록 다시 배치하세요.");
        return;
      }
      msg = {
        action: "fantasy_turn",
        player_id: playerId,
        placements,
        discards: missing,
      };
    } else {
      return;
    }

    socketRef.current?.send(msg);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setAnimationDone(false);
    // 보류된 다음 라운드 state가 있으면 이제 적용. 없으면(GAME_OVER 등) 그대로.
    commitPendingState();
  };

  if (!gameId || !playerId) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        잘못된 게임 링크입니다.
      </div>
    );
  }

  const showSkipHint = anim.active;

  return (
    <div
      className="min-h-screen bg-slate-100 p-4 flex flex-col gap-3"
      onClick={showSkipHint ? anim.skip : undefined}
    >
      <header className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="text-xs text-slate-500 hover:underline"
        >
          ← 새 방
        </button>
        <div className="flex items-center gap-3 text-sm">
          {gameState && (
            <div className="flex items-center gap-2">
              {gameState.is_game_over ? (
                <span className="px-2 py-0.5 rounded bg-slate-800 text-white text-xs font-semibold">
                  GAME OVER
                </span>
              ) : (
                <>
                  {gameState.is_bonus_round && (
                    <span className="px-2 py-0.5 rounded bg-fuchsia-100 text-fuchsia-700 text-xs font-semibold">
                      ★ FantasyLand
                    </span>
                  )}
                  <span className="font-mono text-slate-700">
                    R {gameState.round_number}
                    <span className="text-slate-400">/{gameState.max_rounds}</span>
                  </span>
                </>
              )}
              <span className="text-slate-300">·</span>
              <span className="font-mono text-xs text-slate-500">{gameId}</span>
            </div>
          )}
          <span className="text-xs">
            {connected ? (
              <span className="text-emerald-600">● 연결됨</span>
            ) : (
              <span className="text-rose-600">● 연결 끊김</span>
            )}
          </span>
          <button
            type="button"
            onClick={() => setRulesOpen(true)}
            className="text-xs px-2 py-0.5 rounded border border-slate-300 hover:bg-slate-100 text-slate-600"
            title="룰 보기"
          >
            룰
          </button>
        </div>
        <div className="text-sm text-slate-700">
          {gameState ? (
            gameState.is_game_over ? (
              <span className="text-slate-500">종료</span>
            ) : isFantasyPhase ? (
              <>
                <span className="font-semibold">FantasyLand 배치 중</span>
                <span className="text-slate-400 ml-1">
                  ({pendingFlPlayers.length}명 대기)
                </span>
              </>
            ) : (
              <>
                <span className="font-semibold">{gameState.current_player_id}</span>
                <span className="text-slate-400 ml-1">의 차례</span>
              </>
            )
          ) : (
            "로딩..."
          )}
        </div>
      </header>

      {gameState && (
        <section className="flex justify-center">
          <ActionBar
            phase={gameState.phase}
            isMyTurn={isMyTurn}
            hasPending={placed.length > 0 || selectedRow !== null}
            onConfirm={handleConfirm}
            onCancel={clearPending}
            onShowResult={
              inResultPhase && animationDone
                ? () => setModalOpen(true)
                : undefined
            }
          />
        </section>
      )}

      {me && (
        <section className="flex justify-center">
          <Hand
            hand={me.hand}
            placedIdxSet={placedIdxSet}
            enabled={isMyTurn}
            rowSelected={selectedRow !== null}
            onPlace={handleHandPlace}
            onUnplace={unplace}
          />
        </section>
      )}

      {showSkipHint && (
        <div className="text-center text-xs text-slate-400 -mt-1">
          화면을 클릭하면 건너뛸 수 있어요
        </div>
      )}

      <main className="flex-1 flex items-start justify-center">
        {!gameState ? (
          <div className="text-slate-400">게임 상태를 불러오는 중...</div>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${gameState.players.length}, minmax(0, 1fr))` }}>
            {gameState.players.map((p, idx) => {
              const isMe = p.player_id === playerId;
              return (
                <PlayerBoard
                  key={p.player_id}
                  player={p}
                  label={p.player_id}
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
                  onPendingClick={isMe ? handlePendingClick : undefined}
                  animOverlay={anim.overlaysByPlayer[p.player_id] ?? null}
                />
              );
            })}
          </div>
        )}
      </main>

      {rulesOpen && <RulesModal onClose={() => setRulesOpen(false)} />}

      {modalOpen && gameState && gameState.matchups && (
        <ResultModal
          players={gameState.players}
          matchups={gameState.matchups}
          myPlayerId={playerId}
          roundNumber={gameState.round_number}
          maxRounds={gameState.max_rounds}
          isBonusRound={gameState.is_bonus_round}
          isGameOver={gameState.is_game_over}
          onClose={handleCloseModal}
          onNewRoom={() => navigate("/")}
        />
      )}
    </div>
  );
}
