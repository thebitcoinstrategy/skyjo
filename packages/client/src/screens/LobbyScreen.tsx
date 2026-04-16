import { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';
import { useConnectionStore } from '../stores/connectionStore';
import { socket } from '../socket/client';

const BOT_NAMES = ['Robo Rex', 'Bot Betty', 'Chip', 'Sparky', 'Gizmo', 'Bolt', 'Pixel', 'Blip'];

export default function LobbyScreen() {
  const roomCode = useConnectionStore((s) => s.roomCode);
  const lobby = useConnectionStore((s) => s.lobby);
  const playerId = useConnectionStore((s) => s.playerId);
  const error = useConnectionStore((s) => s.error);
  const [copied, setCopied] = useState(false);

  const codeRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const isHost = lobby.find((p) => p.id === playerId)?.isHost ?? false;
  const canStart = lobby.length >= 2;

  useEffect(() => {
    if (codeRef.current) {
      gsap.fromTo(codeRef.current, { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(1.7)' });
    }
  }, []);

  // Animate new players joining
  useEffect(() => {
    if (listRef.current) {
      const lastChild = listRef.current.lastElementChild;
      if (lastChild) {
        gsap.fromTo(lastChild, { x: -20, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3, ease: 'power2.out' });
      }
    }
  }, [lobby.length]);

  const handleStart = () => socket.emit('start-game');

  const handleAddBot = () => {
    const usedNames = lobby.filter((p) => p.isBot).map((p) => p.nickname);
    const name = BOT_NAMES.find((n) => !usedNames.includes(n)) || `Bot ${lobby.length}`;
    socket.emit('add-bot', { nickname: name });
  };

  const handleRemoveBot = (botId: string) => socket.emit('remove-bot', { botId });

  const handleCopyCode = async () => {
    if (!roomCode) return;
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      if (codeRef.current) {
        gsap.fromTo(codeRef.current, { scale: 1.1 }, { scale: 1, duration: 0.3, ease: 'back.out(2)' });
      }
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const handleLeave = () => {
    socket.disconnect();
    socket.connect();
    useConnectionStore.getState().reset();
  };

  return (
    <div className="h-full flex flex-col items-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0c331a] via-felt to-[#0c331a]" />

      <div className="relative z-10 w-full max-w-xs flex flex-col h-full">
        {/* Room Code */}
        <div className="mt-6 mb-6 text-center">
          <p className="text-white/30 text-[10px] uppercase tracking-[0.3em] mb-2 font-medium">Room Code</p>
          <button
            ref={codeRef}
            onClick={handleCopyCode}
            className="text-5xl font-mono font-black text-gold tracking-[0.3em] hover:text-yellow-400 active:scale-95 transition-all"
          >
            {roomCode}
          </button>
          <p className="text-white/20 text-[11px] mt-1.5 transition-all">
            {copied ? (
              <span className="text-green-400">Copied!</span>
            ) : (
              'Tap to copy'
            )}
          </p>
        </div>

        {/* Players */}
        <div className="flex-1">
          <p className="text-white/30 text-[10px] uppercase tracking-[0.3em] mb-3 font-medium">
            Players ({lobby.length}/8)
          </p>
          <div ref={listRef} className="space-y-2">
            {lobby.map((player) => (
              <div
                key={player.id}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/6 border border-white/6 hover:bg-white/10 transition-colors"
              >
                <span className="text-2xl">{player.avatar}</span>
                <span className="text-white font-medium flex-1 text-sm">{player.nickname}</span>
                {player.isHost && (
                  <span className="text-[10px] bg-gold/15 text-gold px-2.5 py-0.5 rounded-full font-semibold">
                    Host
                  </span>
                )}
                {player.isBot && (
                  <span className="text-[10px] bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded-full">
                    Bot
                  </span>
                )}
                {player.isBot && isHost && (
                  <button
                    onClick={() => handleRemoveBot(player.id)}
                    className="text-red-400/40 hover:text-red-400 text-xs p-1 transition-colors"
                  >
                    &times;
                  </button>
                )}
              </div>
            ))}
          </div>

          {isHost && lobby.length < 8 && (
            <button
              onClick={handleAddBot}
              className="w-full mt-3 py-2.5 rounded-xl border border-dashed border-white/10 text-white/25 hover:text-white/50 hover:border-white/25 transition-all text-sm active:scale-[0.98]"
            >
              + Add Bot
            </button>
          )}
        </div>

        {error && (
          <div className="mb-3 px-4 py-2.5 bg-red-500/15 border border-red-500/30 rounded-xl text-red-300 text-sm text-center">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2 pb-2">
          {isHost && (
            <button
              onClick={handleStart}
              disabled={!canStart}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-gold to-yellow-500 text-felt-dark font-bold text-lg shadow-lg shadow-gold/20 hover:shadow-gold/40 active:scale-[0.97] transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {canStart ? 'Start Game' : 'Need 2+ Players'}
            </button>
          )}
          {!isHost && (
            <div className="py-3 text-center text-white/30 text-sm">
              Waiting for host to start...
            </div>
          )}
          <button
            onClick={handleLeave}
            className="w-full py-2 text-white/20 text-sm hover:text-white/50 transition-colors"
          >
            Leave Room
          </button>
        </div>
      </div>
    </div>
  );
}
