import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import type { CardValue } from '@skyjo/shared';

interface DrawnCardProps {
  value: CardValue;
  onDiscard?: () => void;
  canDiscard: boolean;
}

function getColor(value: number): string {
  if (value <= -1) return 'text-blue-600';
  if (value === 0) return 'text-yellow-600';
  if (value <= 4) return 'text-green-600';
  if (value <= 8) return 'text-orange-500';
  return 'text-red-600';
}

export default function DrawnCard({ value, onDiscard, canDiscard }: DrawnCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    // Entrance animation
    gsap.fromTo(
      ref.current,
      { y: -40, scale: 0.5, opacity: 0, rotateZ: -10 },
      { y: 0, scale: 1, opacity: 1, rotateZ: 0, duration: 0.5, ease: 'back.out(1.7)' }
    );
  }, []);

  // Gentle floating animation
  useEffect(() => {
    if (!ref.current) return;
    gsap.to(ref.current, {
      y: -3,
      duration: 1.2,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });
    return () => { if (ref.current) gsap.killTweensOf(ref.current); };
  }, []);

  return (
    <div ref={ref} className="flex flex-col items-center gap-1">
      <div className="w-16 h-24 rounded-xl bg-white border-2 border-gold flex items-center justify-center shadow-xl shadow-gold/30">
        <span className={`text-2xl font-black ${getColor(value)} drop-shadow-sm`}>
          {value}
        </span>
      </div>
      {canDiscard && onDiscard && (
        <button
          onClick={onDiscard}
          className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full text-xs text-white/60 hover:text-white/90 transition-all active:scale-90"
        >
          Discard
        </button>
      )}
    </div>
  );
}
