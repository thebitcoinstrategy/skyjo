import { useRef, useState, useCallback } from 'react';
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
import type { AnimationEventPayload } from '@skyjo/shared';

export default function GameScreen() {
  const gameState = useGameStore((s) => s.gameState);
  const playerId = useConnectionStore((s) => s.playerId);
  const [isDealing, setIsDealing] = useState(true);
  const myHandRef = useRef<HTMLDivElement>(null);

  // Animation queue handler
  const handleAnimation = useCallback(async (event: AnimationEventPayload) => {
    // Short delay for visual processing
    await new Promise((r) => setTimeout(r, 150));

    switch (event.type) {
      case 'flip-card': {
        // The Card component handles its own flip animation via the faceUp prop change
        await new Promise((r) => setTimeout(r, 500));
        break;
      }
      case 'column-eliminate': {
        // Flash the screen subtly for column elimination
        if (myHandRef.current) {
          gsap.fromTo(
            myHandRef.current,
            { boxShadow: '0 0 30px rgba(255, 215, 0, 0.5)' },
            { boxShadow: '0 0 0px rgba(255, 215, 0, 0)', duration: 0.8, ease: 'power2.out' }
          );
        }
        await new Promise((r) => setTimeout(r, 600));
        break;
      }
      case 'draw-from-pile':
      case 'draw-from-discard': {
        await new Promise((r) => setTimeout(r, 300));
        break;
      }
      case 'place-card':
      case 'discard-card': {
        await new Promise((r) => setTimeout(r, 400));
        break;
      }
      default: {
        await new Promise((r) => setTimeout(r, 200));
      }
    }
  }, []);

  useAnimationQueue(handleAnimation);

  if (!gameState || !playerId) {
    return (
      <div className="h-full flex items-center justify-center bg-felt-dark">
        <div className="text-gold text-lg font-bold animate-pulse">Loading...</div>
      </div>
    );
  }

  const myIndex = gameState.players.findIndex((p) => p.id === playerId);
  const me = gameState.players[myIndex];
  const opponents = gameState.players.filter((p) => p.id !== playerId);
  const isMyTurn = gameState.currentPlayerIndex === myIndex;
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  const canInteract = isMyTurn || (gameState.phase === 'flipping_initial' && me.initialFlipsRemaining > 0);

  const handleDrawFromPile = () => {
    if (!isMyTurn || gameState.turnPhase !== 'draw') return;
    socket.emit('draw-from-pile');
  };

  const handleDrawFromDiscard = () => {
    if (!isMyTurn || gameState.turnPhase !== 'draw') return;
    socket.emit('draw-from-discard');
  };

  const handleCardClick = (cardIndex: number) => {
    if (gameState.phase === 'flipping_initial' && me.initialFlipsRemaining > 0) {
      if (!me.cards[cardIndex].faceUp) {
        socket.emit('flip-initial-card', { cardIndex });
      }
      return;
    }

    if (!isMyTurn) return;

    if (gameState.turnPhase === 'place_or_discard' || gameState.turnPhase === 'place_discard') {
      socket.emit('place-drawn-card', { cardIndex });
      return;
    }

    if (gameState.turnPhase === 'must_flip') {
      if (!me.cards[cardIndex].faceUp) {
        socket.emit('flip-card', { cardIndex });
      }
      return;
    }
  };

  const handleDiscard = () => {
    if (!isMyTurn || gameState.turnPhase !== 'place_or_discard') return;
    socket.emit('discard-drawn-card');
  };

  const getInstruction = (): string => {
    if (gameState.phase === 'flipping_initial') {
      if (me.initialFlipsRemaining > 0) {
        return `Flip ${me.initialFlipsRemaining} card${me.initialFlipsRemaining > 1 ? 's' : ''}`;
      }
      return 'Waiting for others...';
    }
    if (!isMyTurn) return `${currentPlayer.nickname}'s turn`;
    switch (gameState.turnPhase) {
      case 'draw': return 'Draw a card';
      case 'place_or_discard': return 'Place card or discard';
      case 'place_discard': return 'Place the card';
      case 'must_flip': return 'Flip a face-down card';
      default: return '';
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden relative">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0c331a] via-felt to-[#0c331a]" />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Opponents area */}
        <div className="flex-none px-2 pt-2 pb-1">
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
            {opponents.map((opp) => {
              const oppIndex = gameState.players.findIndex((p) => p.id === opp.id);
              const isActive = gameState.currentPlayerIndex === oppIndex;
              return (
                <div
                  key={opp.id}
                  className={`flex-shrink-0 p-2 rounded-xl transition-all duration-300 ${
                    isActive
                      ? 'bg-gold/15 ring-2 ring-gold/60 shadow-lg shadow-gold/10'
                      : 'bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-sm">{opp.avatar}</span>
                    <span className="text-white/80 text-[11px] font-semibold truncate max-w-[60px]">
                      {opp.nickname}
                    </span>
                    <span className={`text-[11px] font-mono ml-auto ${opp.score < 0 ? 'text-green-400' : opp.score > 0 ? 'text-red-400' : 'text-white/40'}`}>
                      {opp.score}
                    </span>
                  </div>
                  <PlayerHand cards={opp.cards} small />
                </div>
              );
            })}
          </div>
        </div>

        {/* Center area */}
        <div className="flex-1 flex items-center justify-center gap-8 px-6">
          <DrawPile
            count={gameState.drawPileCount}
            active={isMyTurn && gameState.turnPhase === 'draw'}
            onClick={handleDrawFromPile}
          />

          <DiscardPile
            topCard={gameState.discardTop}
            active={isMyTurn && gameState.turnPhase === 'draw' && gameState.discardTop !== null}
            onClick={handleDrawFromDiscard}
          />

          {gameState.drawnCard !== null && (
            <DrawnCard
              value={gameState.drawnCard}
              onDiscard={handleDiscard}
              canDiscard={isMyTurn && gameState.turnPhase === 'place_or_discard'}
            />
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
          className={`flex-none px-4 pb-4 pt-3 transition-all duration-300 ${
            canInteract
              ? 'bg-gradient-to-t from-gold/10 to-transparent border-t border-gold/20'
              : 'border-t border-white/5'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">{me.avatar}</span>
              <span className="text-white font-semibold text-sm">{me.nickname}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-mono font-bold ${me.score < 0 ? 'text-green-400' : me.score > 0 ? 'text-red-400' : 'text-white/50'}`}>
                {me.score}
              </span>
            </div>
          </div>
          <PlayerHand
            cards={me.cards}
            interactive={canInteract}
            onCardClick={canInteract ? handleCardClick : undefined}
            isDealing={isDealing}
          />
        </div>
      </div>
    </div>
  );
}
