import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import type { CardValue } from '@skyjo/shared';

interface DiscardPileProps {
  topCard: CardValue | null;
  active: boolean;
  onClick: () => void;
}

function getDiscardColor(value: number): string {
  if (value <= -1) return 'text-blue-600';
  if (value === 0) return 'text-yellow-600';
  if (value <= 4) return 'text-green-600';
  if (value <= 8) return 'text-orange-500';
  return 'text-red-600';
}

export default function DiscardPile({ topCard, active, onClick }: DiscardPileProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const prevCard = useRef(topCard);

  // Animate when a new card lands on the discard pile
  useEffect(() => {
    if (prevCard.current !== topCard && ref.current) {
      gsap.fromTo(
        ref.current,
        { scale: 1.15, rotateZ: 3 },
        { scale: 1, rotateZ: 0, duration: 0.4, ease: 'back.out(1.5)' }
      );
    }
    prevCard.current = topCard;
  }, [topCard]);

  useEffect(() => {
    if (!glowRef.current) return;
    if (active) {
      gsap.to(glowRef.current, {
        opacity: 0.6,
        scale: 1.05,
        duration: 0.8,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    } else {
      gsap.killTweensOf(glowRef.current);
      gsap.to(glowRef.current, { opacity: 0, scale: 1, duration: 0.2 });
    }
  }, [active]);

  const handleClick = () => {
    if (!active || !ref.current) return;
    gsap.fromTo(ref.current, { scale: 0.9 }, { scale: 1, duration: 0.3, ease: 'back.out(2)' });
    onClick();
  };

  return (
    <button
      ref={ref}
      onClick={handleClick}
      disabled={!active}
      className={`relative w-16 h-24 rounded-xl flex items-center justify-center ${
        active ? 'cursor-pointer' : 'cursor-default'
      }`}
    >
      {/* Glow effect */}
      <div
        ref={glowRef}
        className="absolute inset-[-4px] rounded-xl bg-gold/30 blur-sm opacity-0"
      />
      {topCard !== null ? (
        <div className="absolute inset-0 rounded-xl bg-white border-2 border-gray-200 shadow-lg flex items-center justify-center">
          <span className={`text-2xl font-black ${getDiscardColor(topCard)} drop-shadow-sm`}>
            {topCard}
          </span>
        </div>
      ) : (
        <div className="absolute inset-0 rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center">
          <span className="text-white/20 text-xs">Discard</span>
        </div>
      )}
    </button>
  );
}
