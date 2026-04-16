import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';

interface TurnIndicatorProps {
  text: string;
  isMyTurn: boolean;
  isFinalRound: boolean;
  turnsLeft: number;
}

export default function TurnIndicator({ text, isMyTurn, isFinalRound, turnsLeft }: TurnIndicatorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(
      ref.current,
      { y: 5, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.3, ease: 'power2.out' }
    );
  }, [text]);

  useEffect(() => {
    if (!dotRef.current || !isMyTurn) return;
    gsap.to(dotRef.current, {
      scale: 1.5,
      opacity: 0.5,
      duration: 0.6,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });
    return () => { if (dotRef.current) gsap.killTweensOf(dotRef.current); };
  }, [isMyTurn]);

  return (
    <div
      ref={ref}
      className={`flex items-center justify-center gap-1.5 py-1 mx-3 rounded-lg transition-colors duration-300 ${
        isMyTurn
          ? 'bg-gold/10 border border-gold/20'
          : 'bg-transparent border border-transparent'
      }`}
    >
      {isMyTurn && (
        <span ref={dotRef} className="w-2.5 h-2.5 rounded-full bg-gold inline-block shadow-sm shadow-gold/50" />
      )}
      <span
        className={`text-xs font-bold tracking-wide ${
          isMyTurn ? 'text-gold' : 'text-white/40'
        }`}
      >
        {text}
      </span>
      {isFinalRound && (
        <span className="ml-1 px-2.5 py-0.5 bg-orange-500/20 border border-orange-500/30 rounded-full text-orange-400 text-[10px] font-bold animate-pulse">
          FINALE noch {turnsLeft}
        </span>
      )}
    </div>
  );
}
