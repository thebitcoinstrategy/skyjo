import { useState } from 'react';
import { socket } from '../socket/client';
import { useSocket } from '../hooks/useSocket';
import { useConnectionStore } from '../stores/connectionStore';

const AVATARS = ['😎', '🦊', '🐸', '🦁', '🐼', '🐱', '🐶', '🦄', '🐙', '🎯', '⭐', '🔥', '💎', '🎲', '🃏', '🌟'];

export default function HomeScreen() {
  useSocket();

  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState<'menu' | 'join'>('menu');
  const error = useConnectionStore((s) => s.error);

  const canSubmit = nickname.trim().length >= 1;

  const handleCreate = () => {
    if (!canSubmit) return;
    socket.emit('create-room', { nickname: nickname.trim(), avatar });
  };

  const handleJoin = () => {
    if (!canSubmit || roomCode.trim().length < 4) return;
    socket.emit('join-room', {
      roomCode: roomCode.trim().toUpperCase(),
      nickname: nickname.trim(),
      avatar,
    });
  };

  const handleSinglePlayer = () => {
    if (!canSubmit) return;
    socket.emit('create-room', { nickname: nickname.trim(), avatar });
    // Bot adding will be handled once in lobby
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 bg-gradient-to-b from-felt-dark to-felt">
      {/* Title */}
      <div className="mb-8 text-center">
        <h1 className="text-6xl font-black text-gold tracking-tight drop-shadow-lg">
          SKYJO
        </h1>
        <p className="text-felt-light text-sm mt-1 tracking-widest uppercase">
          Card Game
        </p>
      </div>

      {/* Avatar Picker */}
      <div className="mb-4">
        <div className="grid grid-cols-8 gap-2">
          {AVATARS.map((a) => (
            <button
              key={a}
              onClick={() => setAvatar(a)}
              className={`w-10 h-10 text-xl rounded-lg flex items-center justify-center transition-all ${
                avatar === a
                  ? 'bg-gold scale-110 shadow-lg'
                  : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Nickname Input */}
      <input
        type="text"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        placeholder="Your name"
        maxLength={15}
        className="w-full max-w-xs px-4 py-3 rounded-xl bg-white/10 text-white text-center text-lg placeholder-white/40 border-2 border-white/20 focus:border-gold focus:outline-none mb-6"
      />

      {error && (
        <div className="mb-4 px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm text-center max-w-xs">
          {error}
        </div>
      )}

      {mode === 'menu' ? (
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={handleCreate}
            disabled={!canSubmit}
            className="w-full py-3 rounded-xl bg-gold text-felt-dark font-bold text-lg shadow-lg hover:bg-gold-dark active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Create Game
          </button>
          <button
            onClick={() => setMode('join')}
            disabled={!canSubmit}
            className="w-full py-3 rounded-xl bg-white/10 text-white font-bold text-lg border-2 border-white/20 hover:bg-white/20 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Join Game
          </button>
          <button
            onClick={handleSinglePlayer}
            disabled={!canSubmit}
            className="w-full py-3 rounded-xl bg-white/5 text-white/70 font-medium text-lg border border-white/10 hover:bg-white/10 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Play vs Bots
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="Room code"
            maxLength={4}
            className="w-full px-4 py-3 rounded-xl bg-white/10 text-white text-center text-2xl tracking-[0.5em] font-mono placeholder-white/40 border-2 border-white/20 focus:border-gold focus:outline-none uppercase"
          />
          <button
            onClick={handleJoin}
            disabled={!canSubmit || roomCode.trim().length < 4}
            className="w-full py-3 rounded-xl bg-gold text-felt-dark font-bold text-lg shadow-lg hover:bg-gold-dark active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Join
          </button>
          <button
            onClick={() => setMode('menu')}
            className="w-full py-2 text-white/50 text-sm hover:text-white/80 transition-colors"
          >
            Back
          </button>
        </div>
      )}
    </div>
  );
}
