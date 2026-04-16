import { useGameStore } from '../stores/gameStore';
import { useConnectionStore } from '../stores/connectionStore';
import { socket } from '../socket/client';

export default function ResultsScreen() {
  const gameState = useGameStore((s) => s.gameState);
  const roundEndData = useGameStore((s) => s.roundEndData);
  const gameEndData = useGameStore((s) => s.gameEndData);
  const playerId = useConnectionStore((s) => s.playerId);
  const lobby = useConnectionStore((s) => s.lobby);

  const isHost = lobby.find((p) => p.id === playerId)?.isHost ?? false;
  const isGameOver = gameState?.phase === 'game_over';

  if (!gameState) return null;

  // Sort players by total score (ascending = best)
  const sortedPlayers = [...gameState.players].sort((a, b) => a.score - b.score);
  const winnerId = sortedPlayers[0]?.id;
  const isWinner = winnerId === playerId;

  const handlePlayAgain = () => {
    socket.emit('play-again');
  };

  const handleLeave = () => {
    socket.disconnect();
    socket.connect();
    useConnectionStore.getState().reset();
    useGameStore.getState().reset();
  };

  return (
    <div className="h-full flex flex-col items-center p-6 bg-gradient-to-b from-felt-dark to-felt">
      <div className="mt-8 mb-6 text-center">
        <h2 className="text-3xl font-black text-gold">
          {isGameOver
            ? isWinner
              ? 'You Win!'
              : 'Game Over'
            : `Round ${gameState.roundNumber} Complete`}
        </h2>
        {isGameOver && !isWinner && (
          <p className="text-white/50 text-sm mt-1">
            {sortedPlayers[0]?.nickname} wins!
          </p>
        )}
      </div>

      {/* Scoreboard */}
      <div className="w-full max-w-xs flex-1">
        <div className="space-y-2">
          {sortedPlayers.map((player, rank) => {
            const roundScore = roundEndData?.roundScores[player.id];
            const isMe = player.id === playerId;
            return (
              <div
                key={player.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                  rank === 0
                    ? 'bg-gold/20 border-gold/40'
                    : isMe
                    ? 'bg-white/10 border-white/20'
                    : 'bg-white/5 border-white/5'
                }`}
              >
                <span className="text-white/40 font-bold w-6 text-center">
                  {rank + 1}
                </span>
                <span className="text-2xl">{player.avatar}</span>
                <div className="flex-1">
                  <span className={`font-medium ${isMe ? 'text-gold' : 'text-white'}`}>
                    {player.nickname}
                  </span>
                  {roundScore !== undefined && (
                    <span
                      className={`text-xs ml-2 ${
                        roundScore > 0 ? 'text-red-400' : roundScore < 0 ? 'text-green-400' : 'text-white/40'
                      }`}
                    >
                      {roundScore > 0 ? '+' : ''}{roundScore} this round
                    </span>
                  )}
                </div>
                <span className="text-white font-mono font-bold text-lg">
                  {player.score}
                </span>
              </div>
            );
          })}
        </div>

        {/* Round history */}
        {sortedPlayers[0]?.roundScores.length > 1 && (
          <div className="mt-4 p-3 rounded-xl bg-white/5">
            <p className="text-white/40 text-xs uppercase tracking-widest mb-2">Round History</p>
            <div className="space-y-1">
              {sortedPlayers.map((player) => (
                <div key={player.id} className="flex items-center gap-2 text-xs">
                  <span className="text-sm">{player.avatar}</span>
                  <span className="text-white/60 w-16 truncate">{player.nickname}</span>
                  <div className="flex gap-1 flex-1">
                    {player.roundScores.map((score, i) => (
                      <span
                        key={i}
                        className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                          score > 0
                            ? 'bg-red-500/20 text-red-300'
                            : score < 0
                            ? 'bg-green-500/20 text-green-300'
                            : 'bg-white/10 text-white/50'
                        }`}
                      >
                        {score}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="w-full max-w-xs space-y-2 pb-4">
        {isHost && !isGameOver && (
          <button
            onClick={handlePlayAgain}
            className="w-full py-3 rounded-xl bg-gold text-felt-dark font-bold text-lg shadow-lg hover:bg-gold-dark active:scale-95 transition-all"
          >
            Next Round
          </button>
        )}
        {isHost && isGameOver && (
          <button
            onClick={handlePlayAgain}
            className="w-full py-3 rounded-xl bg-gold text-felt-dark font-bold text-lg shadow-lg hover:bg-gold-dark active:scale-95 transition-all"
          >
            New Game
          </button>
        )}
        <button
          onClick={handleLeave}
          className="w-full py-2 text-white/40 text-sm hover:text-white/70 transition-colors"
        >
          Leave
        </button>
      </div>
    </div>
  );
}
