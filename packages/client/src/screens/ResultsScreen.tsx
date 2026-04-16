import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { useGameStore } from '../stores/gameStore';
import { useConnectionStore } from '../stores/connectionStore';
import { socket } from '../socket/client';
import Confetti from '../components/Confetti';

export default function ResultsScreen() {
  const gameState = useGameStore((s) => s.gameState);
  const roundEndData = useGameStore((s) => s.roundEndData);
  const playerId = useConnectionStore((s) => s.playerId);
  const lobby = useConnectionStore((s) => s.lobby);

  const titleRef = useRef<HTMLHeadingElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const isHost = lobby.find((p) => p.id === playerId)?.isHost ?? false;
  const isGameOver = gameState?.phase === 'game_over';

  // Entrance animations
  useEffect(() => {
    if (titleRef.current) {
      gsap.fromTo(titleRef.current, { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(1.7)' });
    }
    if (listRef.current) {
      const items = listRef.current.children;
      gsap.fromTo(
        items,
        { x: -30, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.4, stagger: 0.1, ease: 'power2.out', delay: 0.3 }
      );
    }
  }, []);

  if (!gameState) return null;

  const sortedPlayers = [...gameState.players].sort((a, b) => a.score - b.score);
  const winnerId = sortedPlayers[0]?.id;
  const isWinner = winnerId === playerId;

  const handlePlayAgain = () => socket.emit('play-again');

  const handleLeave = () => {
    socket.disconnect();
    socket.connect();
    useConnectionStore.getState().reset();
    useGameStore.getState().reset();
  };

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="h-full flex flex-col items-center p-6 relative overflow-hidden">
      <Confetti active={isWinner || (isGameOver && sortedPlayers[0]?.id === playerId)} />
      <div className="absolute inset-0 bg-gradient-to-b from-[#1b0f0a] via-felt to-[#1b0f0a]" />
      <div className="absolute inset-0 felt-texture" />
      <div className="absolute inset-0 felt-noise" />

      <div className="relative z-10 w-full max-w-xs flex flex-col h-full">
        {/* Title */}
        <div className="mt-6 mb-6 text-center">
          <h2 ref={titleRef} className="text-3xl font-black">
            {isGameOver ? (
              isWinner ? (
                <span className="text-gold drop-shadow-[0_2px_10px_rgba(255,215,0,0.3)]">Du gewinnst!</span>
              ) : (
                <span className="text-white/80">Spiel vorbei</span>
              )
            ) : (
              <span className="text-gold">Runde {gameState.roundNumber}</span>
            )}
          </h2>
          {isGameOver && !isWinner && (
            <p className="text-white/40 text-sm mt-1">
              {sortedPlayers[0]?.avatar} {sortedPlayers[0]?.nickname} gewinnt!
            </p>
          )}
        </div>

        {/* Scoreboard */}
        <div ref={listRef} className="flex-1 space-y-2">
          {sortedPlayers.map((player, rank) => {
            const roundScore = roundEndData?.roundScores[player.id];
            const isMe = player.id === playerId;
            return (
              <div
                key={player.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                  rank === 0
                    ? 'bg-gold/15 border-gold/30 shadow-lg shadow-gold/10'
                    : isMe
                    ? 'bg-white/8 border-white/15'
                    : 'bg-white/4 border-white/5'
                }`}
              >
                <span className="text-lg w-7 text-center">
                  {rank < 3 ? medals[rank] : <span className="text-white/20 text-sm font-mono">{rank + 1}</span>}
                </span>
                <span className="text-2xl">{player.avatar}</span>
                <div className="flex-1 min-w-0">
                  <span className={`font-semibold text-sm ${isMe ? 'text-gold' : 'text-white/90'}`}>
                    {player.nickname}
                  </span>
                  {roundScore !== undefined && (
                    <span
                      className={`text-[11px] ml-2 font-mono ${
                        roundScore > 0 ? 'text-red-400' : roundScore < 0 ? 'text-green-400' : 'text-white/30'
                      }`}
                    >
                      {roundScore > 0 ? '+' : ''}{roundScore}
                    </span>
                  )}
                </div>
                <span className={`font-mono font-black text-lg ${
                  player.score < 0 ? 'text-green-400' : player.score > 0 ? 'text-white' : 'text-white/50'
                }`}>
                  {player.score}
                </span>
              </div>
            );
          })}
        </div>

        {/* Round History */}
        {sortedPlayers[0]?.roundScores.length > 1 && (
          <div className="mt-4 p-3 rounded-xl bg-white/4 border border-white/5">
            <p className="text-white/30 text-[10px] uppercase tracking-[0.3em] mb-2">Rundenverlauf</p>
            <div className="space-y-1.5">
              {sortedPlayers.map((player) => (
                <div key={player.id} className="flex items-center gap-2 text-xs">
                  <span className="text-sm">{player.avatar}</span>
                  <div className="flex gap-1 flex-1 overflow-x-auto">
                    {player.roundScores.map((score, i) => (
                      <span
                        key={i}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0 ${
                          score > 0
                            ? 'bg-red-500/15 text-red-400'
                            : score < 0
                            ? 'bg-green-500/15 text-green-400'
                            : 'bg-white/5 text-white/30'
                        }`}
                      >
                        {score > 0 ? '+' : ''}{score}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2 pt-4 pb-2">
          {isHost && (
            <button
              onClick={handlePlayAgain}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-gold to-gold-dark text-felt-dark font-bold text-lg shadow-lg shadow-gold/20 active:scale-[0.97] transition-all"
            >
              {isGameOver ? 'Neues Spiel' : 'Naechste Runde'}
            </button>
          )}
          <button
            onClick={handleLeave}
            className="w-full py-2 text-white/20 text-sm hover:text-white/50 transition-colors"
          >
            Verlassen
          </button>
        </div>
      </div>
    </div>
  );
}
