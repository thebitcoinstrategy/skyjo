import { useConnectionStore } from '../stores/connectionStore';
import { socket } from '../socket/client';

const BOT_NAMES = ['Robo Rex', 'Bot Betty', 'Chip', 'Sparky', 'Gizmo', 'Bolt', 'Pixel', 'Blip'];

export default function LobbyScreen() {
  const roomCode = useConnectionStore((s) => s.roomCode);
  const lobby = useConnectionStore((s) => s.lobby);
  const playerId = useConnectionStore((s) => s.playerId);
  const error = useConnectionStore((s) => s.error);

  const isHost = lobby.find((p) => p.id === playerId)?.isHost ?? false;
  const canStart = lobby.length >= 2;

  const handleStart = () => {
    socket.emit('start-game');
  };

  const handleAddBot = () => {
    const usedNames = lobby.filter((p) => p.isBot).map((p) => p.nickname);
    const name = BOT_NAMES.find((n) => !usedNames.includes(n)) || `Bot ${lobby.length}`;
    socket.emit('add-bot', { nickname: name });
  };

  const handleRemoveBot = (botId: string) => {
    socket.emit('remove-bot', { botId });
  };

  const handleCopyCode = async () => {
    if (roomCode) {
      try {
        await navigator.clipboard.writeText(roomCode);
      } catch {
        // fallback: do nothing
      }
    }
  };

  const handleLeave = () => {
    socket.disconnect();
    socket.connect();
    useConnectionStore.getState().reset();
  };

  return (
    <div className="h-full flex flex-col items-center p-6 bg-gradient-to-b from-felt-dark to-felt">
      {/* Room Code */}
      <div className="mt-8 mb-6 text-center">
        <p className="text-white/50 text-xs uppercase tracking-widest mb-2">Room Code</p>
        <button
          onClick={handleCopyCode}
          className="text-5xl font-mono font-black text-gold tracking-[0.3em] hover:text-gold-dark active:scale-95 transition-all"
        >
          {roomCode}
        </button>
        <p className="text-white/30 text-xs mt-1">Tap to copy</p>
      </div>

      {/* Players */}
      <div className="w-full max-w-xs flex-1">
        <p className="text-white/50 text-xs uppercase tracking-widest mb-3">
          Players ({lobby.length}/8)
        </p>
        <div className="space-y-2">
          {lobby.map((player) => (
            <div
              key={player.id}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/10 border border-white/10"
            >
              <span className="text-2xl">{player.avatar}</span>
              <span className="text-white font-medium flex-1">{player.nickname}</span>
              {player.isHost && (
                <span className="text-xs bg-gold/20 text-gold px-2 py-0.5 rounded-full">Host</span>
              )}
              {player.isBot && isHost && (
                <button
                  onClick={() => handleRemoveBot(player.id)}
                  className="text-red-400/60 hover:text-red-400 text-sm"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>

        {isHost && lobby.length < 8 && (
          <button
            onClick={handleAddBot}
            className="w-full mt-3 py-2 rounded-xl border-2 border-dashed border-white/20 text-white/40 hover:text-white/70 hover:border-white/40 transition-all text-sm"
          >
            + Add Bot
          </button>
        )}
      </div>

      {error && (
        <div className="mb-3 px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm text-center w-full max-w-xs">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="w-full max-w-xs space-y-2 pb-4">
        {isHost && (
          <button
            onClick={handleStart}
            disabled={!canStart}
            className="w-full py-3 rounded-xl bg-gold text-felt-dark font-bold text-lg shadow-lg hover:bg-gold-dark active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Start Game
          </button>
        )}
        <button
          onClick={handleLeave}
          className="w-full py-2 text-white/40 text-sm hover:text-white/70 transition-colors"
        >
          Leave Room
        </button>
      </div>
    </div>
  );
}
