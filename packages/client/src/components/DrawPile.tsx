import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';

interface DrawPileProps {
  count: number;
  active: boolean;
  onClick: () => void;
}

export default function DrawPile({ count, active, onClick }: DrawPileProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

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
      className={`relative w-16 h-24 rounded-xl flex items-center justify-center transition-colors ${
        active ? 'cursor-pointer' : 'cursor-default opacity-60'
      }`}
    >
      {/* Glow effect */}
      <div
        ref={glowRef}
        className="absolute inset-[-4px] rounded-xl bg-gold/30 blur-sm opacity-0"
      />
      {/* Stack effect - multiple card backs */}
      <div className="absolute inset-0">
        <div className="absolute top-[2px] left-[2px] right-[-2px] bottom-[-2px] rounded-xl bg-blue-900 border border-blue-700" />
        <div className="absolute top-[1px] left-[1px] right-[-1px] bottom-[-1px] rounded-xl bg-blue-800 border border-blue-600" />
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 border-2 border-blue-500 shadow-lg flex items-center justify-center">
          <div className="text-center">
            <span className="text-blue-300/80 text-xs font-bold block">SKYJO</span>
            <span className="text-blue-300/50 text-[10px]">{count}</span>
          </div>
        </div>
      </div>
    </button>
  );
}
