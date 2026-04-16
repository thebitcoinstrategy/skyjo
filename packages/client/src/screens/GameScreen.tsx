import { useGameStore } from '../stores/gameStore';
import { useConnectionStore } from '../stores/connectionStore';
import { socket } from '../socket/client';
import Card from '../components/Card/Card';
import type { VisibleCardSlot } from '@skyjo/shared';

export default function GameScreen() {
  const gameState = useGameStore((s) => s.gameState);
  const playerId = useConnectionStore((s) => s.playerId);

  if (!gameState || !playerId) {
    return (
      <div className="h-full flex items-center justify-center bg-felt-dark text-white">
        Loading...
      </div>
    );
  }

  const myIndex = gameState.players.findIndex((p) => p.id === playerId);
  const me = gameState.players[myIndex];
  const opponents = gameState.players.filter((p) => p.id !== playerId);
  const isMyTurn = gameState.currentPlayerIndex === myIndex;
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  const handleDrawFromPile = () => {
    if (!isMyTurn || gameState.turnPhase !== 'draw') return;
    socket.emit('draw-from-pile');
  };

  const handleDrawFromDiscard = () => {
    if (!isMyTurn || gameState.turnPhase !== 'draw') return;
    socket.emit('draw-from-discard');
  };

  const handleCardClick = (cardIndex: number) => {
    if (!isMyTurn) return;

    // Initial flip phase
    if (gameState.phase === 'flipping_initial' && me.initialFlipsRemaining > 0) {
      if (!me.cards[cardIndex].faceUp) {
        socket.emit('flip-initial-card', { cardIndex });
      }
      return;
    }

    // Place drawn card
    if (gameState.turnPhase === 'place_or_discard' || gameState.turnPhase === 'place_discard') {
      socket.emit('place-drawn-card', { cardIndex });
      return;
    }

    // Flip after discarding
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

  // Get instruction text
  const getInstruction = (): string => {
    if (gameState.phase === 'flipping_initial') {
      if (me.initialFlipsRemaining > 0) {
        return `Flip ${me.initialFlipsRemaining} card${me.initialFlipsRemaining > 1 ? 's' : ''}`;
      }
      return 'Waiting for others to flip...';
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

  const renderCardGrid = (
    cards: VisibleCardSlot[],
    small: boolean,
    onCardClick?: (i: number) => void
  ) => {
    // Cards are in column-major order: determine actual grid dimensions
    const totalCards = cards.length;
    const rows = 4;
    const cols = Math.ceil(totalCards / rows);

    return (
      <div
        className="grid gap-1"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
        }}
      >
        {/* Render in row-major order for CSS grid */}
        {Array.from({ length: rows }, (_, row) =>
          Array.from({ length: cols }, (_, col) => {
            const cardIdx = col * rows + row;
            if (cardIdx >= totalCards) return null;
            const card = cards[cardIdx];
            return (
              <Card
                key={`${col}-${row}`}
                value={card.value}
                faceUp={card.faceUp}
                small={small}
                onClick={onCardClick ? () => onCardClick(cardIdx) : undefined}
                interactive={!!onCardClick}
              />
            );
          })
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-felt-dark via-felt to-felt-dark overflow-hidden">
      {/* Opponents */}
      <div className="flex-none px-2 pt-2 pb-1">
        <div className="flex gap-2 overflow-x-auto">
          {opponents.map((opp) => {
            const oppIndex = gameState.players.findIndex((p) => p.id === opp.id);
            const isActive = gameState.currentPlayerIndex === oppIndex;
            return (
              <div
                key={opp.id}
                className={`flex-shrink-0 p-2 rounded-xl transition-all ${
                  isActive ? 'bg-gold/20 ring-2 ring-gold' : 'bg-white/5'
                }`}
              >
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-sm">{opp.avatar}</span>
                  <span className="text-white/70 text-xs font-medium truncate max-w-[60px]">
                    {opp.nickname}
                  </span>
                  <span className="text-white/40 text-xs ml-auto">{opp.score}</span>
                </div>
                {renderCardGrid(opp.cards, true)}
              </div>
            );
          })}
        </div>
      </div>

      {/* Center area: draw pile, discard pile, drawn card */}
      <div className="flex-1 flex items-center justify-center gap-6 px-4">
        {/* Draw pile */}
        <button
          onClick={handleDrawFromPile}
          disabled={!isMyTurn || gameState.turnPhase !== 'draw'}
          className={`relative w-16 h-24 rounded-xl border-2 flex items-center justify-center transition-all ${
            isMyTurn && gameState.turnPhase === 'draw'
              ? 'border-gold bg-card-back shadow-lg shadow-gold/20 hover:scale-105 active:scale-95 cursor-pointer'
              : 'border-white/20 bg-card-back/80 opacity-60 cursor-default'
          }`}
        >
          <span className="text-white/60 text-xs font-medium">{gameState.drawPileCount}</span>
        </button>

        {/* Discard pile */}
        <button
          onClick={handleDrawFromDiscard}
          disabled={!isMyTurn || gameState.turnPhase !== 'draw' || gameState.discardTop === null}
          className={`relative w-16 h-24 rounded-xl border-2 flex items-center justify-center transition-all ${
            isMyTurn && gameState.turnPhase === 'draw' && gameState.discardTop !== null
              ? 'border-gold bg-card-white shadow-lg shadow-gold/20 hover:scale-105 active:scale-95 cursor-pointer'
              : 'border-white/20 bg-card-white/90 cursor-default'
          }`}
        >
          {gameState.discardTop !== null && (
            <span
              className={`text-2xl font-bold ${
                gameState.discardTop < 0
                  ? 'text-blue-600'
                  : gameState.discardTop === 0
                  ? 'text-yellow-600'
                  : gameState.discardTop <= 4
                  ? 'text-green-600'
                  : gameState.discardTop <= 8
                  ? 'text-orange-500'
                  : 'text-red-600'
              }`}
            >
              {gameState.discardTop}
            </span>
          )}
        </button>

        {/* Drawn card */}
        {gameState.drawnCard !== null && (
          <div className="flex flex-col items-center gap-1">
            <div className="w-16 h-24 rounded-xl bg-card-white border-2 border-gold flex items-center justify-center shadow-lg shadow-gold/30">
              <span
                className={`text-2xl font-bold ${
                  gameState.drawnCard < 0
                    ? 'text-blue-600'
                    : gameState.drawnCard === 0
                    ? 'text-yellow-600'
                    : gameState.drawnCard <= 4
                    ? 'text-green-600'
                    : gameState.drawnCard <= 8
                    ? 'text-orange-500'
                    : 'text-red-600'
                }`}
              >
                {gameState.drawnCard}
              </span>
            </div>
            {isMyTurn && gameState.turnPhase === 'place_or_discard' && (
              <button
                onClick={handleDiscard}
                className="text-xs text-white/50 hover:text-white/80 transition-colors"
              >
                Discard
              </button>
            )}
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="flex-none text-center py-1">
        <span
          className={`text-sm font-medium ${
            isMyTurn || (gameState.phase === 'flipping_initial' && me.initialFlipsRemaining > 0)
              ? 'text-gold'
              : 'text-white/40'
          }`}
        >
          {getInstruction()}
        </span>
        {gameState.phase === 'final_round' && (
          <span className="text-orange-400 text-xs ml-2">
            Final Round! ({gameState.finalRoundTurnsLeft} turns left)
          </span>
        )}
      </div>

      {/* My hand */}
      <div
        className={`flex-none px-4 pb-4 pt-2 ${
          isMyTurn || (gameState.phase === 'flipping_initial' && me.initialFlipsRemaining > 0)
            ? 'bg-gold/5 border-t border-gold/20'
            : 'border-t border-white/5'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{me.avatar}</span>
            <span className="text-white font-medium text-sm">{me.nickname}</span>
          </div>
          <span className="text-white/60 text-sm font-mono">Score: {me.score}</span>
        </div>
        {renderCardGrid(
          me.cards,
          false,
          isMyTurn || (gameState.phase === 'flipping_initial' && me.initialFlipsRemaining > 0)
            ? handleCardClick
            : undefined
        )}
      </div>
    </div>
  );
}
