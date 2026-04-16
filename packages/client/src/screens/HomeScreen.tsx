import { useState, useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { socket } from '../socket/client';
import { useConnectionStore } from '../stores/connectionStore';
import BackgroundArt from '../components/BackgroundArt';
import { APP_VERSION } from '../version';

const AVATARS = ['😎', '🦊', '🐸', '🦁', '🐼', '🐱', '🐶', '🦄', '🐙', '🎯', '⭐', '🔥', '💎', '🎲', '🃏', '🌟'];

export default function HomeScreen() {

  const [nickname, setNickname] = useState(() => {
    try { return localStorage.getItem('skyjo_nickname') ?? ''; } catch { return ''; }
  });
  const [avatar, setAvatar] = useState(() => {
    try {
      const saved = localStorage.getItem('skyjo_avatar');
      if (saved && AVATARS.includes(saved)) return saved;
    } catch { /* ignore */ }
    return AVATARS[Math.floor(Math.random() * AVATARS.length)];
  });
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState<'menu' | 'join'>('menu');
  const error = useConnectionStore((s) => s.error);

  const titleRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const canSubmit = nickname.trim().length >= 1;

  // Entrance animation
  useEffect(() => {
    if (titleRef.current) {
      gsap.fromTo(
        titleRef.current,
        { y: -30, opacity: 0, scale: 0.9 },
        { y: 0, opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(1.5)' }
      );
    }
    if (formRef.current) {
      gsap.fromTo(
        formRef.current,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, delay: 0.3, ease: 'power2.out' }
      );
    }
  }, []);

  const saveProfile = () => {
    try {
      localStorage.setItem('skyjo_nickname', nickname.trim());
      localStorage.setItem('skyjo_avatar', avatar);
    } catch { /* ignore */ }
  };

  const handleCreate = () => {
    if (!canSubmit) return;
    saveProfile();
    socket.emit('create-room', { nickname: nickname.trim(), avatar });
  };

  const handleJoin = () => {
    if (!canSubmit || roomCode.trim().length < 4) return;
    saveProfile();
    socket.emit('join-room', {
      roomCode: roomCode.trim().toUpperCase(),
      nickname: nickname.trim(),
      avatar,
    });
  };

  const handleSinglePlayer = () => {
    if (!canSubmit) return;
    saveProfile();
    socket.emit('start-single-player', { nickname: nickname.trim(), avatar, botCount: 3 });
  };

  const handleAvatarClick = (a: string, el: HTMLButtonElement) => {
    setAvatar(a);
    gsap.fromTo(el, { scale: 1.3 }, { scale: 1, duration: 0.3, ease: 'back.out(2)' });
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1b0f0a] via-felt to-[#1b0f0a]" />
      <div className="absolute inset-0 felt-texture" />
      <div className="absolute inset-0 felt-noise" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 40%, transparent 30%, rgba(0,0,0,0.35) 100%)' }}
      />
      <BackgroundArt variant="home" />

      {/* Version number */}
      <div className="absolute bottom-2 right-3 z-10 text-white/15 text-[10px] font-mono">
        v{APP_VERSION}
      </div>

      <div className="relative z-10 w-full max-w-xs flex flex-col items-center">
        {/* Title */}
        <div ref={titleRef} className="mb-6 text-center">
          <p className="text-gold text-2xl tracking-[0.3em] uppercase font-black mb-0 drop-shadow-[0_2px_8px_rgba(245,193,108,0.25)]">
            Kuschnik
          </p>
          <h1 className="text-7xl font-black tracking-tight title-shimmer drop-shadow-[0_2px_12px_rgba(245,193,108,0.4)] -mt-1">
            SKYJO
          </h1>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-gold/40" />
            <p className="text-white/40 text-[11px] tracking-[0.4em] uppercase font-medium">
              Kartenspiel
            </p>
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-gold/40" />
          </div>
        </div>

        <div ref={formRef}>
          {/* Avatar Picker */}
          <div className="mb-5">
            <div className="grid grid-cols-8 gap-1.5">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  onClick={(e) => handleAvatarClick(a, e.currentTarget)}
                  className={`w-10 h-10 text-xl rounded-xl flex items-center justify-center transition-all duration-200 ${
                    avatar === a
                      ? 'bg-gold/30 scale-110 shadow-lg shadow-gold/20 ring-2 ring-gold/50'
                      : 'bg-white/5 hover:bg-white/15 active:scale-90'
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
            placeholder="Dein Name"
            maxLength={15}
            className="w-full px-4 py-3 rounded-xl bg-white/8 text-white text-center text-lg placeholder-white/30 border-2 border-white/10 focus:border-gold/60 focus:bg-white/12 focus:outline-none transition-all mb-5"
          />

          {error && (
            <div className="mb-4 px-4 py-2.5 bg-red-500/15 border border-red-500/30 rounded-xl text-red-300 text-sm text-center">
              {error}
            </div>
          )}

          {mode === 'menu' ? (
            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleCreate}
                disabled={!canSubmit}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-gold to-gold-dark text-felt-dark font-bold text-lg shadow-lg shadow-gold/20 hover:shadow-gold/40 active:scale-[0.97] transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
              >
                Spiel erstellen
              </button>
              <button
                onClick={() => setMode('join')}
                disabled={!canSubmit}
                className="w-full py-3 rounded-xl bg-white/8 text-white font-bold text-lg border border-white/15 hover:bg-white/15 active:scale-[0.97] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Spiel beitreten
              </button>
              <button
                onClick={handleSinglePlayer}
                disabled={!canSubmit}
                className="w-full py-3 rounded-xl bg-transparent text-white/50 font-medium border border-white/8 hover:text-white/80 hover:border-white/20 active:scale-[0.97] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Gegen Bots spielen
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="ABCD"
                maxLength={4}
                autoFocus
                className="w-full px-4 py-3.5 rounded-xl bg-white/8 text-white text-center text-3xl tracking-[0.5em] font-mono font-bold placeholder-white/20 border-2 border-white/10 focus:border-gold/60 focus:outline-none transition-all uppercase"
              />
              <button
                onClick={handleJoin}
                disabled={!canSubmit || roomCode.trim().length < 4}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-gold to-gold-dark text-felt-dark font-bold text-lg shadow-lg shadow-gold/20 active:scale-[0.97] transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
              >
                Beitreten
              </button>
              <button
                onClick={() => setMode('menu')}
                className="w-full py-2 text-white/30 text-sm hover:text-white/60 transition-colors"
              >
                Zurueck
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
