import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import type { CardValue } from '@skyjo/shared';
import CardIllustration from './CardIllustration';

interface DrawnCardProps {
  value: CardValue;
  canDiscard: boolean;
}

function getStyle(value: number): { bg: string; text: string; glow: string } {
  if (value <= -2) return { bg: 'from-blue-500 to-blue-700', text: 'text-white', glow: 'shadow-blue-400/50' };
  if (value === -1) return { bg: 'from-sky-400 to-sky-600', text: 'text-white', glow: 'shadow-sky-400/50' };
  if (value === 0) return { bg: 'from-yellow-400 to-amber-500', text: 'text-white', glow: 'shadow-yellow-400/50' };
  if (value <= 4) return { bg: 'from-emerald-400 to-emerald-600', text: 'text-white', glow: 'shadow-emerald-400/50' };
  if (value <= 8) return { bg: 'from-orange-400 to-orange-600', text: 'text-white', glow: 'shadow-orange-400/50' };
  return { bg: 'from-red-500 to-red-700', text: 'text-white', glow: 'shadow-red-400/50' };
}

export default function DrawnCard({ value, canDiscard }: DrawnCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(
      ref.current,
      { y: -30, scale: 0.3, opacity: 0 },
      { y: 0, scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(1.7)' }
    );
  }, []);

  // Gentle floating bob to make it feel "held"
  useEffect(() => {
    if (!cardRef.current) return;
    gsap.to(cardRef.current, {
      y: -3,
      rotation: 1.5,
      duration: 0.8,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });
    return () => { gsap.killTweensOf(cardRef.current); };
  }, []);

  const style = getStyle(value);

  return (
    <div ref={ref} className="flex flex-col items-center gap-1.5">
      {/* Card with hand */}
      <div className="relative">
        {/* Glow behind card */}
        <div className="absolute inset-[-8px] rounded-2xl pile-glow-active pointer-events-none" />

        {/* Hand emoji */}
        <div className="absolute -bottom-2 -right-3 z-20 text-2xl drop-shadow-lg" style={{ transform: 'rotate(15deg)' }}>
          🤚
        </div>

        {/* The card itself */}
        <div
          ref={cardRef}
          className={`w-[3.5rem] h-[4.6rem] rounded-lg overflow-hidden shadow-2xl ${style.glow} ring-2 ring-gold/70 relative card-shine`}
          style={{ transform: 'rotate(-3deg)' }}
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${style.bg}`} />
          <div className="absolute inset-[1px] rounded-[5px] border border-white/25" />
          <span className="absolute top-0.5 left-1 text-[7px] font-bold text-white/70">{value}</span>
          <span className="absolute bottom-0.5 right-1 text-[7px] font-bold text-white/70 rotate-180">{value}</span>
          <div className="absolute inset-0 flex items-end justify-end p-0.5 overflow-hidden">
            <CardIllustration value={value} size="normal" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-[1px]">
              <span
                className={`text-xl font-black ${style.text} drop-shadow-md`}
                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}
              >
                {value}
              </span>
            </div>
          </div>
          <div
            className="absolute inset-x-0 top-0 bg-gradient-to-b from-white/25 to-transparent pointer-events-none"
            style={{ height: '35%' }}
          />
          <div className="absolute inset-0 rounded-lg shadow-[inset_0_0_10px_rgba(255,215,0,0.2)]" />
        </div>
      </div>

      {/* Instruction */}
      <span className="text-[9px] text-gold/70 font-semibold tracking-wide">
        {canDiscard ? 'Tauschen oder Ablegen' : 'In dein Deck ziehen'}
      </span>
    </div>
  );
}
