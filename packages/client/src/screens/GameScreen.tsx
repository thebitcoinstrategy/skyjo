import { useRef, useState, useCallback, useEffect } from 'react';
import { gsap } from 'gsap';
import { useGameStore } from '../stores/gameStore';
import { useConnectionStore } from '../stores/connectionStore';
import { useAnimationQueue } from '../hooks/useAnimationQueue';
import { socket } from '../socket/client';
import PlayerHand from '../components/PlayerHand/PlayerHand';
import DrawPile from '../components/DrawPile';
import DiscardPile from '../components/DiscardPile';
import DrawnCard from '../components/DrawnCard';
import TurnIndicator from '../components/TurnIndicator';
import type { AnimationEventPayload, CardValue } from '@skyjo/shared';
import BackgroundArt from '../components/BackgroundArt';

/* ── Drag ghost ── */
function DragGhost({ value, x, y }: { value: CardValue | null; x: number; y: number }) {
  function getStyle(v: number): string {
    if (v <= -2) return 'from-blue-500 to-blue-700';
    if (v === -1) return 'from-sky-400 to-sky-600';
    if (v === 0) return 'from-yellow-400 to-amber-500';
    if (v <= 4) return 'from-emerald-400 to-emerald-600';
    if (v <= 8) return 'from-orange-400 to-orange-600';
    return 'from-red-500 to-red-700';
  }

  // Card back (value unknown yet — drawing from pile)
  if (value === null) {
    return (
      <div
        className="fixed w-[3.2rem] h-[4.2rem] rounded-md overflow-hidden shadow-2xl ring-2 ring-gold/80 pointer-events-none z-50 opacity-90"
        style={{ left: x - 26, top: y - 34 }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[6px] font-black text-blue-200/80 tracking-wider">SKYJO</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed w-[3.2rem] h-[4.2rem] rounded-md overflow-hidden shadow-2xl ring-2 ring-gold/80 pointer-events-none z-50 opacity-90"
      style={{ left: x - 26, top: y - 34 }}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${getStyle(value)}`} />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-black text-white drop-shadow-md">{value}</span>
      </div>
    </div>
  );
}

export default function GameScreen() {
  const gameState = useGameStore((s) => s.gameState);
  const playerId = useConnectionStore((s) => s.playerId);
  const [isDealing] = useState(true);
  const myHandRef = useRef<HTMLDivElement>(null);
  const drawPileRef = useRef<HTMLDivElement>(null);
  const discardPileRef = useRef<HTMLDivElement>(null);

  // Drag state — use ref for immediate reads (avoids stale closures in pointer handlers)
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  const dropTargetRef = useRef<number | null>(null);
  const [overDiscard, setOverDiscard] = useState(false);
  const overDiscardRef = useRef(false);
  // Preview value for drag ghost before server confirms the drawn card
  const [dragPreviewValue, setDragPreviewValue] = useState<CardValue | null>(null);
  // Pending drop: if user drops before server confirms drawn card, queue the action
  const pendingDropRef = useRef<{ cardIndex: number } | 'discard' | null>(null);

  // Track the card index we just placed (to skip flip animation on our own cards)
  const [justPlacedIndex, setJustPlacedIndex] = useState<number | null>(null);

  // Sparkle particles for eye candy
  const [sparkles, setSparkles] = useState<{ id: string; x: number; y: number; color: string }[]>([]);

  // Revealed card shown on top of draw pile when opponent/bot draws
  const [revealedCard, setRevealedCard] = useState<{
    value: CardValue;
    nickname: string;
    avatar: string;
  } | null>(null);

  // Ref for canPlaceCard — must be declared here (before early return) to satisfy hooks rules
  const canPlaceRef = useRef(false);

  // Animation queue handler — own-player effects only, opponents just get timing delays
  const handleAnimation = useCallback(async (event: AnimationEventPayload) => {
    const isMe = event.playerId === playerId;

    switch (event.type) {
      case 'flip-card': {
        // Card component handles the flip animation itself via faceUp prop change
        await new Promise((r) => setTimeout(r, isMe ? 600 : 300));
        break;
      }
      case 'column-eliminate': {
        if (myHandRef.current && isMe) {
          gsap.fromTo(
            myHandRef.current,
            { boxShadow: '0 0 40px rgba(255, 215, 0, 0.6)' },
            { boxShadow: '0 0 0px rgba(255, 215, 0, 0)', duration: 1, ease: 'power2.out' }
          );
          // Spawn sparkle particles
          const rect = myHandRef.current.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const colors = ['#ffd700', '#ff6b6b', '#48dbfb', '#ff9ff3', '#54a0ff'];
          const newSparkles = Array.from({ length: 12 }, (_, i) => ({
            id: `sparkle-${Date.now()}-${i}`,
            x: cx + (Math.random() - 0.5) * rect.width,
            y: cy + (Math.random() - 0.5) * rect.height * 0.5,
            color: colors[i % colors.length],
          }));
          setSparkles(prev => [...prev, ...newSparkles]);
          setTimeout(() => {
            setSparkles(prev => prev.filter(s => !newSparkles.some(ns => ns.id === s.id)));
          }, 1000);
        }
        await new Promise((r) => setTimeout(r, 700));
        break;
      }
      case 'draw-from-pile':
      case 'draw-from-discard': {
        if (!isMe) {
          const gs = useGameStore.getState().gameState;
          const drawer = gs?.players.find((p) => p.id === event.playerId);
          const drawnValue = event.data.value as CardValue | undefined;
          if (drawer && drawnValue !== undefined) {
            setRevealedCard({
              value: drawnValue,
              nickname: drawer.nickname,
              avatar: drawer.avatar,
            });
            await new Promise((r) => setTimeout(r, 1200));
            setRevealedCard(null);
          } else {
            await new Promise((r) => setTimeout(r, 200));
          }
        } else {
          await new Promise((r) => setTimeout(r, 200));
        }
        break;
      }
      default: {
        // All other events (place, discard) — just a small delay for sequencing
        await new Promise((r) => setTimeout(r, 200));
      }
    }
  }, [playerId]);

  useAnimationQueue(handleAnimation);

  // Process pending drop when drawn card arrives from server
  useEffect(() => {
    if (!gameState?.drawnCard || !pendingDropRef.current) return;
    const pending = pendingDropRef.current;
    pendingDropRef.current = null;

    if (pending === 'discard') {
      socket.emit('discard-drawn-card');
    } else {
      setJustPlacedIndex(pending.cardIndex);
      socket.emit('place-drawn-card', { cardIndex: pending.cardIndex });
      setTimeout(() => setJustPlacedIndex(null), 100);
    }
  }, [gameState?.drawnCard]);

  if (!gameState || !playerId) {
    return (
      <div className="h-full flex items-center justify-center bg-felt-dark">
        <div className="text-gold text-lg font-bold animate-pulse">Laden...</div>
      </div>
    );
  }

  const myIndex = gameState.players.findIndex((p) => p.id === playerId);
  const me = gameState.players[myIndex];
  const opponents = gameState.players.filter((p) => p.id !== playerId);
  const isMyTurn = gameState.currentPlayerIndex === myIndex;
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const canInteract = isMyTurn || (gameState.phase === 'flipping_initial' && me.initialFlipsRemaining > 0);
  const hasDrawnCard = gameState.drawnCard !== null;
  const canPlaceCard = isMyTurn && (gameState.turnPhase === 'place_or_discard' || gameState.turnPhase === 'place_discard');
  canPlaceRef.current = canPlaceCard;
  const canDiscard = isMyTurn && gameState.turnPhase === 'place_or_discard';

  const handleDrawFromPile = () => {
    if (isDraggingRef.current) return; // Already handled by drag
    if (!isMyTurn || gameState.turnPhase !== 'draw') return;
    socket.emit('draw-from-pile');
  };

  const handleDrawFromDiscard = () => {
    if (isDraggingRef.current) return; // Already handled by drag
    if (!isMyTurn || gameState.turnPhase !== 'draw') return;
    socket.emit('draw-from-discard');
  };

  // Drag directly from a pile — draw + start dragging in one gesture
  const handlePileDragStart = useCallback((e: React.PointerEvent, source: 'pile' | 'discard') => {
    e.preventDefault();
    e.stopPropagation();
    const gs = useGameStore.getState().gameState;
    if (!gs) return;
    const myIdx = gs.players.findIndex((p) => p.id === playerId);
    if (gs.currentPlayerIndex !== myIdx || gs.turnPhase !== 'draw') return;

    // Emit draw action
    if (source === 'pile') {
      socket.emit('draw-from-pile');
      setDragPreviewValue(null); // unknown card — show card back
    } else {
      socket.emit('draw-from-discard');
      setDragPreviewValue(gs.discardTop); // we know the value
    }

    // Start dragging immediately
    isDraggingRef.current = true;
    setIsDragging(true);
    setDragPos({ x: e.clientX, y: e.clientY });
  }, [playerId]);

  const handleCardClick = (cardIndex: number) => {
    if (gameState.phase === 'flipping_initial' && me.initialFlipsRemaining > 0) {
      if (!me.cards[cardIndex].faceUp) {
        socket.emit('flip-initial-card', { cardIndex });
      }
      return;
    }

    if (!isMyTurn) return;

    if (canPlaceCard && !isDragging) {
      setJustPlacedIndex(cardIndex);
      socket.emit('place-drawn-card', { cardIndex });
      setTimeout(() => setJustPlacedIndex(null), 100);
      return;
    }

    if (gameState.turnPhase === 'must_flip') {
      if (!me.cards[cardIndex].faceUp) {
        socket.emit('flip-card', { cardIndex });
      }
      return;
    }
  };

  // ── Drag & Drop (uses refs for immediate state in pointer handlers) ──
  // Drag from the already-visible drawn card
  const handleDragStart = useCallback((e: React.PointerEvent) => {
    if (!canPlaceRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const gs = useGameStore.getState().gameState;
    setDragPreviewValue(gs?.drawnCard ?? null);
    isDraggingRef.current = true;
    setIsDragging(true);
    setDragPos({ x: e.clientX, y: e.clientY });
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    setDragPos({ x: e.clientX, y: e.clientY });

    // Check if over a card slot or discard pile
    const elements = document.elementsFromPoint(e.clientX, e.clientY);
    const cardEl = elements.find((el) => el.getAttribute('data-card-index') !== null);
    if (cardEl) {
      const idx = Number(cardEl.getAttribute('data-card-index'));
      dropTargetRef.current = idx;
      overDiscardRef.current = false;
      setDropTarget(idx);
      setOverDiscard(false);
    } else {
      dropTargetRef.current = null;
      setDropTarget(null);
      // Check if over discard pile (walk up parents too)
      const isOver = elements.some((el) => {
        let node: Element | null = el;
        while (node) {
          if (node.getAttribute('data-discard-pile') !== null) return true;
          node = node.parentElement;
        }
        return false;
      });
      overDiscardRef.current = isOver;
      setOverDiscard(isOver);
    }
  }, []);

  const handlePointerUp = useCallback(() => {
    if (!isDraggingRef.current) return;
    const dt = dropTargetRef.current;
    const od = overDiscardRef.current;
    const gs = useGameStore.getState().gameState;
    const cardReady = gs?.drawnCard !== null && gs?.drawnCard !== undefined;

    if (dt !== null) {
      if (cardReady) {
        setJustPlacedIndex(dt);
        socket.emit('place-drawn-card', { cardIndex: dt });
        setTimeout(() => setJustPlacedIndex(null), 100);
      } else {
        // Server hasn't confirmed drawn card yet — queue the drop
        pendingDropRef.current = { cardIndex: dt };
      }
    } else if (od) {
      if (cardReady) {
        socket.emit('discard-drawn-card');
      } else {
        pendingDropRef.current = 'discard';
      }
    }

    isDraggingRef.current = false;
    dropTargetRef.current = null;
    overDiscardRef.current = false;
    setIsDragging(false);
    setDropTarget(null);
    setOverDiscard(false);
  }, []);

  const getInstruction = (): string => {
    if (gameState.phase === 'flipping_initial') {
      if (me.initialFlipsRemaining > 0) {
        return `Tippe ${me.initialFlipsRemaining} Karte${me.initialFlipsRemaining > 1 ? 'n' : ''} zum Aufdecken`;
      }
      return 'Warte auf andere...';
    }
    if (!isMyTurn) return `${currentPlayer.nickname} ist dran`;
    switch (gameState.turnPhase) {
      case 'draw': return 'Ziehe eine Karte in dein Deck';
      case 'place_or_discard': return 'Ziehe zum Ablegen oder Tauschen';
      case 'place_discard': return 'Ziehe zum Tauschen';
      case 'must_flip': return 'Tippe eine verdeckte Karte zum Aufdecken';
      default: return '';
    }
  };

  return (
    <div
      className="h-full flex flex-col overflow-hidden relative"
      style={{ touchAction: isDragging ? 'none' : 'auto' }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* ═══ BACKGROUND ═══ */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1b0f0a] via-felt to-[#1b0f0a]" />
      <div className="absolute inset-0 felt-texture" />
      <div className="absolute inset-0 felt-noise" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.4) 100%)' }}
      />
      <BackgroundArt variant="game" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />

      {/* ═══ SPARKLE PARTICLES ═══ */}
      {sparkles.map((s) => (
        <div
          key={s.id}
          className="sparkle-particle fixed pointer-events-none z-50"
          style={{ left: s.x, top: s.y }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path d="M5 0L5.8 3.5L10 5L5.8 5.8L5 10L4.2 5.8L0 5L4.2 3.5Z" fill={s.color} />
          </svg>
        </div>
      ))}

      {/* ═══ DRAG GHOST ═══ */}
      {isDragging && (
        <DragGhost value={gameState.drawnCard ?? dragPreviewValue} x={dragPos.x} y={dragPos.y} />
      )}

      {/* ═══ CONTENT ═══ */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Opponents area — no scrolling, cards auto-shrink */}
        <div className="flex-none px-1.5 pt-1 pb-0.5">
          <div className="flex gap-1 flex-wrap justify-center">
            {opponents.map((opp) => {
              const oppIndex = gameState.players.findIndex((p) => p.id === opp.id);
              const isActive = gameState.currentPlayerIndex === oppIndex;
              return (
                <div
                  key={opp.id}
                  data-player-id={opp.id}
                  className={`p-1.5 rounded-xl transition-all duration-300 relative overflow-hidden ${
                    isActive
                      ? 'bg-gradient-to-b from-gold/15 to-gold/5 ring-1 ring-gold/40 shadow-md shadow-gold/10'
                      : 'bg-gradient-to-b from-[#3e2723]/60 to-[#2a1810]/60 border border-white/5'
                  }`}
                  style={{ minWidth: 0 }}
                >
                  {/* Subtle chocolate texture overlay */}
                  <div className="absolute inset-0 opacity-[0.03] rounded-xl" style={{
                    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.1) 4px, rgba(255,255,255,0.1) 5px)',
                  }} />
                  <div className="relative">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-base">{opp.avatar}</span>
                      <span className="text-white/80 text-[10px] font-semibold truncate max-w-[50px]">
                        {opp.nickname}
                      </span>
                      <span
                        className={`text-[10px] font-mono ml-auto font-bold ${
                          opp.score < 0 ? 'text-green-400' : opp.score > 0 ? 'text-red-400' : 'text-white/40'
                        }`}
                      >
                        {opp.score}
                      </span>
                    </div>
                    <PlayerHand cards={opp.cards} tiny />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center area — piles */}
        <div className="flex-1 flex items-center justify-center gap-4 px-3 relative">
          <div
            ref={drawPileRef}
            onPointerDown={isMyTurn && gameState.turnPhase === 'draw' ? (e) => handlePileDragStart(e, 'pile') : undefined}
            style={{ touchAction: 'none' }}
          >
            <DrawPile
              count={gameState.drawPileCount}
              active={isMyTurn && gameState.turnPhase === 'draw'}
              onClick={handleDrawFromPile}
              revealedCard={revealedCard}
            />
          </div>

          {/* Discard pile */}
          <div
            ref={discardPileRef}
            data-discard-pile="true"
            style={{ touchAction: 'none' }}
            onPointerDown={isMyTurn && gameState.turnPhase === 'draw' && gameState.discardTop !== null ? (e) => handlePileDragStart(e, 'discard') : undefined}
            onClick={hasDrawnCard && canDiscard ? () => socket.emit('discard-drawn-card') : undefined}
          >
            <DiscardPile
              topCard={gameState.discardTop}
              active={(isMyTurn && gameState.turnPhase === 'draw' && gameState.discardTop !== null) || overDiscard || (hasDrawnCard && canDiscard)}
              onClick={hasDrawnCard && canDiscard ? () => socket.emit('discard-drawn-card') : handleDrawFromDiscard}
            />
          </div>

          {/* Drawn card shown between piles */}
          {hasDrawnCard && !isDragging && (
            <div
              onPointerDown={handleDragStart}
              style={{ touchAction: 'none' }}
            >
              <DrawnCard
                value={gameState.drawnCard!}
                canDiscard={canDiscard}
              />
            </div>
          )}

        </div>

        {/* Turn indicator */}
        <TurnIndicator
          text={getInstruction()}
          isMyTurn={canInteract}
          isFinalRound={gameState.phase === 'final_round'}
          turnsLeft={gameState.finalRoundTurnsLeft}
        />

        {/* My hand */}
        <div
          ref={myHandRef}
          className={`flex-none px-2 pb-2 pt-1.5 transition-all duration-300 rounded-t-xl ${
            canInteract
              ? 'bg-gradient-to-t from-gold/[0.08] via-gold/[0.04] to-transparent border-t border-gold/25'
              : 'bg-gradient-to-t from-black/10 to-transparent border-t border-white/5'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xl">{me.avatar}</span>
              <span className="text-white font-bold text-sm">{me.nickname}</span>
            </div>
            <span
              className={`text-xs font-mono font-black ${
                me.score < 0 ? 'text-green-400' : me.score > 0 ? 'text-red-400' : 'text-white/50'
              }`}
            >
              {me.score}
            </span>
          </div>
          <PlayerHand
            cards={me.cards}
            interactive={canInteract}
            onCardClick={canInteract ? handleCardClick : undefined}
            isDealing={isDealing}
            highlightAll={canPlaceCard || (isMyTurn && gameState.turnPhase === 'must_flip')}
            dropTarget={dropTarget}
            skipFlipForIndex={justPlacedIndex}
          />
        </div>
      </div>
    </div>
  );
}
