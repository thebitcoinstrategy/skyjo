import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import type { CardValue } from '@skyjo/shared';

interface DrawPileProps {
  count: number;
  active: boolean;
  onClick: () => void;
  revealedCard?: { value: CardValue; nickname: string; avatar: string } | null;
}

function getCardBg(v: number): string {
  if (v <= -2) return 'from-blue-500 to-blue-700';
  if (v === -1) return 'from-sky-400 to-sky-600';
  if (v === 0) return 'from-yellow-400 to-amber-500';
  if (v <= 4) return 'from-emerald-400 to-emerald-600';
  if (v <= 8) return 'from-orange-400 to-orange-600';
  return 'from-red-500 to-red-700';
}

export default function DrawPile({ count, active, onClick, revealedCard }: DrawPileProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!glowRef.current || !labelRef.current) return;
    if (active) {
      gsap.to(glowRef.current, { opacity: 1, duration: 0.3, ease: 'power2.out' });
      gsap.to(labelRef.current, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' });
    } else {
      gsap.to(glowRef.current, { opacity: 0, duration: 0.2 });
      gsap.to(labelRef.current, { opacity: 0, y: 4, duration: 0.2 });
    }
  }, [active]);

  // Animate revealed card in
  useEffect(() => {
    if (revealedCard && revealRef.current) {
      gsap.fromTo(
        revealRef.current,
        { scale: 0.5, opacity: 0, y: 8 },
        { scale: 1, opacity: 1, y: 0, duration: 0.3, ease: 'back.out(1.5)' }
      );
    }
  }, [revealedCard]);

  const handleClick = () => {
    if (!active || !ref.current) return;
    gsap.fromTo(ref.current, { scale: 0.92 }, { scale: 1, duration: 0.35, ease: 'back.out(2.5)' });
    onClick();
  };

  // Dynamic 3D stack: more cards = taller stack
  const maxCards = 150;
  const stackRatio = Math.min(count / maxCards, 1);
  // Stack layers: 2-8 layers depending on how many cards remain
  const layers = Math.max(2, Math.min(8, Math.ceil(stackRatio * 8)));
  const layerOffset = 2.0; // px per layer (vertical)

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        <button
          ref={ref}
          onClick={handleClick}
          disabled={!active}
          className={`relative w-[3.2rem] h-[4.2rem] flex items-center justify-center transition-all duration-200 ${
            active ? 'cursor-pointer hover:scale-[1.03]' : 'cursor-default opacity-50'
          }`}
          style={{ marginBottom: layers * layerOffset }}
        >
          <div
            ref={glowRef}
            className="absolute inset-[-5px] rounded-xl opacity-0 pile-glow-active pointer-events-none"
          />

          {/* 3D stack layers — rendered bottom to top */}
          {Array.from({ length: layers }, (_, i) => {
            const depth = layers - i;
            const offsetX = depth * 1.5;
            const offsetY = depth * layerOffset;
            const brightness = Math.max(0.3, 0.85 - depth * 0.08);
            return (
              <div
                key={i}
                className="absolute inset-0 rounded-md"
                style={{
                  transform: `translate(${offsetX}px, ${offsetY}px)`,
                  background: `linear-gradient(135deg, rgb(${Math.round(37 * brightness)},${Math.round(50 * brightness)},${Math.round(120 * brightness)}) 0%, rgb(${Math.round(25 * brightness)},${Math.round(25 * brightness)},${Math.round(90 * brightness)}) 100%)`,
                  zIndex: i,
                  borderRight: '1.5px solid rgba(10,10,40,0.6)',
                  borderBottom: '1.5px solid rgba(10,10,40,0.6)',
                  borderTop: '0.5px solid rgba(100,130,200,0.2)',
                  borderLeft: '0.5px solid rgba(100,130,200,0.15)',
                }}
              />
            );
          })}

          {/* Top card */}
          <div className="absolute inset-0 rounded-md overflow-hidden shadow-xl" style={{ zIndex: layers + 1 }}>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800" />
            <div className="absolute inset-[2px] rounded-sm border border-blue-400/30" />
            <div
              className="absolute inset-0 opacity-15"
              style={{
                backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.1) 4px, rgba(255,255,255,0.1) 5px)`,
              }}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
              <div className="w-7 h-5 rounded-sm bg-gradient-to-b from-blue-500/50 to-indigo-700/50 border border-blue-400/40 flex items-center justify-center">
                <span className="text-[6px] font-black text-blue-200/90 tracking-wider">SKYJO</span>
              </div>
              <span className="text-blue-300/60 text-[8px] font-mono font-bold">{count}</span>
            </div>
            <div
              className="absolute inset-x-0 top-0 bg-gradient-to-b from-white/12 to-transparent pointer-events-none"
              style={{ height: '40%' }}
            />
          </div>
        </button>

        {/* Revealed card overlay (when opponent/bot draws) */}
        {revealedCard && (
          <div
            ref={revealRef}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ zIndex: layers + 10 }}
          >
            <div className="w-[3.2rem] h-[4.2rem] rounded-md overflow-hidden shadow-2xl ring-2 ring-gold/70 relative">
              <div className={`absolute inset-0 bg-gradient-to-br ${getCardBg(revealedCard.value)}`} />
              <div className="absolute inset-[1px] rounded-sm border border-white/25" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-[1px]">
                  <span className="text-lg font-black text-white drop-shadow-md">{revealedCard.value}</span>
                </div>
              </div>
              <div
                className="absolute inset-x-0 top-0 bg-gradient-to-b from-white/25 to-transparent pointer-events-none"
                style={{ height: '35%' }}
              />
            </div>
          </div>
        )}
      </div>

      <div
        ref={labelRef}
        className="text-[8px] font-bold text-gold uppercase tracking-widest opacity-0 translate-y-1"
      >
        Ziehen
      </div>
    </div>
  );
}
