import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import type { CardValue } from '@skyjo/shared';

interface DiscardPileProps {
  topCard: CardValue | null;
  active: boolean;
  onClick: () => void;
}

function getDiscardStyle(value: number): { bg: string; text: string; glow: string } {
  if (value <= -2) return { bg: 'from-blue-500 to-blue-700', text: 'text-white', glow: 'shadow-blue-500/30' };
  if (value === -1) return { bg: 'from-sky-400 to-sky-600', text: 'text-white', glow: 'shadow-sky-500/30' };
  if (value === 0) return { bg: 'from-yellow-400 to-amber-500', text: 'text-white', glow: 'shadow-yellow-500/30' };
  if (value <= 4) return { bg: 'from-emerald-400 to-emerald-600', text: 'text-white', glow: 'shadow-emerald-500/30' };
  if (value <= 8) return { bg: 'from-orange-400 to-orange-600', text: 'text-white', glow: 'shadow-orange-500/30' };
  return { bg: 'from-red-500 to-red-700', text: 'text-white', glow: 'shadow-red-500/30' };
}

export default function DiscardPile({ topCard, active, onClick }: DiscardPileProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const prevCard = useRef(topCard);

  useEffect(() => {
    if (prevCard.current !== topCard && ref.current && topCard !== null) {
      gsap.fromTo(ref.current, { scale: 1.15, rotateZ: 4 }, { scale: 1, rotateZ: 0, duration: 0.4, ease: 'back.out(1.8)' });
    }
    prevCard.current = topCard;
  }, [topCard]);

  useEffect(() => {
    if (!glowRef.current) return;
    if (active) {
      gsap.to(glowRef.current, { opacity: 1, duration: 0.3 });
    } else {
      gsap.to(glowRef.current, { opacity: 0, duration: 0.2 });
    }
  }, [active]);

  const handleClick = () => {
    if (!active || !ref.current) return;
    gsap.fromTo(ref.current, { scale: 0.92 }, { scale: 1, duration: 0.35, ease: 'back.out(2.5)' });
    onClick();
  };

  const style = topCard !== null ? getDiscardStyle(topCard) : null;

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        ref={ref}
        onClick={handleClick}
        disabled={!active}
        className={`relative w-[3.2rem] h-[4.2rem] rounded-md flex items-center justify-center ${
          active ? 'cursor-pointer hover:scale-[1.03] transition-transform' : 'cursor-default'
        }`}
      >
        <div
          ref={glowRef}
          className="absolute inset-[-5px] rounded-xl opacity-0 pile-glow-active pointer-events-none"
        />

        {topCard !== null ? (
          <div className={`absolute inset-0 rounded-md overflow-hidden shadow-xl ${style!.glow}`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${style!.bg}`} />
            <div className="absolute inset-[1px] rounded-sm border border-white/25" />
            <span className="absolute top-0.5 left-1 text-[7px] font-bold text-white/70">{topCard}</span>
            <span className="absolute bottom-0.5 right-1 text-[7px] font-bold text-white/70 rotate-180">{topCard}</span>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                <span
                  className={`text-lg font-black ${style!.text} drop-shadow-md`}
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
                >
                  {topCard}
                </span>
              </div>
            </div>
            <div
              className="absolute inset-x-0 top-0 bg-gradient-to-b from-white/25 to-transparent pointer-events-none"
              style={{ height: '35%' }}
            />
          </div>
        ) : (
          <div className="absolute inset-0 rounded-md border-2 border-dashed border-white/15 flex items-center justify-center bg-white/[0.03]">
            <span className="text-white/20 text-[8px] font-medium">Ablage</span>
          </div>
        )}
      </button>

      {active && topCard !== null && (
        <div className="text-[8px] font-bold text-gold uppercase tracking-widest">Nehmen</div>
      )}
    </div>
  );
}
