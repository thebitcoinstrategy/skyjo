/**
 * Decorative SVG background art for the home and game screens.
 * Chocolate-themed: chocolate bars, cocoa swirls, sparkles, card silhouettes.
 */

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

interface Props {
  variant: 'home' | 'game';
}

export default function BackgroundArt({ variant }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const cards = ref.current.querySelectorAll('.bg-card');
    const sparkles = ref.current.querySelectorAll('.bg-sparkle');
    const floaters = ref.current.querySelectorAll('.bg-float');

    // Floating elements - gentle drift
    cards.forEach((card, i) => {
      gsap.to(card, {
        y: `+=${8 + i * 3}`,
        x: `+=${(i % 2 === 0 ? 1 : -1) * (4 + i * 2)}`,
        rotation: `+=${(i % 2 === 0 ? 1 : -1) * 5}`,
        duration: 4 + i * 1.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: i * 0.7,
      });
    });

    // Float gently
    floaters.forEach((el, i) => {
      gsap.to(el, {
        y: `+=${5 + i * 2}`,
        rotation: `+=${(i % 2 === 0 ? 3 : -3)}`,
        duration: 3 + i * 1.2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: i * 0.4,
      });
    });

    // Sparkle twinkle
    sparkles.forEach((sparkle, i) => {
      gsap.to(sparkle, {
        opacity: 0,
        scale: 0.3,
        duration: 1.5 + i * 0.3,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: i * 0.5,
      });
    });

    return () => {
      cards.forEach((card) => gsap.killTweensOf(card));
      sparkles.forEach((sparkle) => gsap.killTweensOf(sparkle));
      floaters.forEach((el) => gsap.killTweensOf(el));
    };
  }, []);

  if (variant === 'home') return <HomeBackground ref={ref} />;
  return <GameBackground ref={ref} />;
}

import { forwardRef } from 'react';

/* Chocolate bar segment SVG */
function ChocolateBar({ className, style, size = 60 }: { className?: string; style?: React.CSSProperties; size?: number }) {
  const s = size;
  const rows = 2;
  const cols = 3;
  const cellW = s / cols;
  const cellH = (s * 0.7) / rows;
  return (
    <svg className={className} style={style} width={s} height={s * 0.7} viewBox={`0 0 ${s} ${s * 0.7}`}>
      <rect width={s} height={s * 0.7} rx={3} fill="#5d4037" opacity={0.6} />
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => (
          <rect
            key={`${r}-${c}`}
            x={c * cellW + 1.5}
            y={r * cellH + 1.5}
            width={cellW - 3}
            height={cellH - 3}
            rx={1.5}
            fill="#795548"
            opacity={0.5}
          />
        ))
      )}
      <rect width={s} height={s * 0.7} rx={3} fill="none" stroke="#8d6e63" strokeWidth={0.5} opacity={0.3} />
    </svg>
  );
}

/* Cocoa bean SVG */
function CocoaBean({ className, style, size = 20 }: { className?: string; style?: React.CSSProperties; size?: number }) {
  return (
    <svg className={className} style={style} width={size} height={size * 1.4} viewBox="0 0 20 28">
      <ellipse cx="10" cy="14" rx="8" ry="12" fill="#5d4037" opacity={0.4} />
      <path d="M10 3 C10 14 10 14 10 25" stroke="#8d6e63" strokeWidth="1" fill="none" opacity={0.3} />
      <path d="M5 8 Q10 12 15 8" stroke="#8d6e63" strokeWidth="0.6" fill="none" opacity={0.2} />
      <path d="M5 18 Q10 22 15 18" stroke="#8d6e63" strokeWidth="0.6" fill="none" opacity={0.2} />
    </svg>
  );
}

/* Chocolate drip SVG */
function ChocolateDrip({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="30" height="50" viewBox="0 0 30 50">
      <path
        d="M5 0 Q5 15 10 20 Q15 25 15 35 Q15 45 10 48 Q8 50 5 48 Q0 45 0 35 Q0 25 5 20 Q10 15 5 0Z"
        fill="#5d4037"
        opacity={0.15}
      />
    </svg>
  );
}

const HomeBackground = forwardRef<HTMLDivElement>((_props, ref) => (
  <div ref={ref} className="absolute inset-0 pointer-events-none overflow-hidden">
    {/* Chocolate bars floating */}
    <div className="bg-float absolute opacity-[0.06]" style={{ top: '6%', left: '3%', transform: 'rotate(-12deg)' }}>
      <ChocolateBar size={70} />
    </div>
    <div className="bg-float absolute opacity-[0.05]" style={{ top: '65%', right: '5%', transform: 'rotate(8deg)' }}>
      <ChocolateBar size={55} />
    </div>
    <div className="bg-float absolute opacity-[0.04]" style={{ top: '80%', left: '8%', transform: 'rotate(-5deg)' }}>
      <ChocolateBar size={45} />
    </div>

    {/* Cocoa beans scattered */}
    <div className="bg-float absolute opacity-[0.07]" style={{ top: '18%', right: '12%', transform: 'rotate(25deg)' }}>
      <CocoaBean size={16} />
    </div>
    <div className="bg-float absolute opacity-[0.05]" style={{ top: '50%', left: '6%', transform: 'rotate(-20deg)' }}>
      <CocoaBean size={14} />
    </div>
    <div className="bg-float absolute opacity-[0.06]" style={{ top: '35%', right: '6%', transform: 'rotate(15deg)' }}>
      <CocoaBean size={18} />
    </div>
    <div className="bg-float absolute opacity-[0.04]" style={{ top: '72%', left: '35%', transform: 'rotate(-30deg)' }}>
      <CocoaBean size={12} />
    </div>

    {/* Chocolate drips from top */}
    <div className="absolute opacity-[0.08]" style={{ top: '-2px', left: '15%' }}>
      <ChocolateDrip />
    </div>
    <div className="absolute opacity-[0.06]" style={{ top: '-2px', right: '20%', transform: 'scaleX(-1)' }}>
      <ChocolateDrip />
    </div>
    <div className="absolute opacity-[0.05]" style={{ top: '-2px', left: '55%' }}>
      <ChocolateDrip />
    </div>

    {/* Floating card silhouettes */}
    <svg className="bg-card absolute opacity-[0.04]" style={{ top: '8%', left: '75%' }} width="48" height="64" viewBox="0 0 48 64" fill="white">
      <rect width="48" height="64" rx="6" />
    </svg>
    <svg className="bg-card absolute opacity-[0.03]" style={{ top: '45%', right: '3%' }} width="40" height="54" viewBox="0 0 40 54" fill="white">
      <rect width="40" height="54" rx="5" />
    </svg>
    <svg className="bg-card absolute opacity-[0.03]" style={{ top: '55%', left: '2%' }} width="36" height="48" viewBox="0 0 36 48" fill="white">
      <rect width="36" height="48" rx="4" />
    </svg>

    {/* Gold sparkle stars */}
    {[
      { top: '12%', left: '25%' },
      { top: '22%', right: '20%' },
      { top: '55%', left: '30%' },
      { top: '75%', right: '25%' },
      { top: '40%', left: '60%' },
      { top: '85%', left: '15%' },
      { top: '30%', left: '90%' },
      { top: '65%', right: '10%' },
      { top: '92%', left: '50%' },
      { top: '5%', left: '50%' },
    ].map((pos, i) => (
      <svg
        key={i}
        className="bg-sparkle absolute"
        style={{ ...pos, opacity: 0.2 + (i % 3) * 0.05 }}
        width="10"
        height="10"
        viewBox="0 0 10 10"
      >
        <path d="M5 0L5.6 4L10 5L5.6 6L5 10L4.4 6L0 5L4.4 4Z" fill="#f5c16c" />
      </svg>
    ))}

    {/* Large decorative chocolate rings */}
    <svg className="absolute opacity-[0.04]" style={{ top: '30%', left: '50%', transform: 'translate(-50%, -50%)' }} width="320" height="320" viewBox="0 0 320 320" fill="none">
      <circle cx="160" cy="160" r="120" stroke="#f5c16c" strokeWidth="0.5" />
      <circle cx="160" cy="160" r="145" stroke="#f5c16c" strokeWidth="0.3" />
      <circle cx="160" cy="160" r="100" stroke="#8d6e63" strokeWidth="0.4" strokeDasharray="4 8" />
    </svg>

    {/* Chocolate swirl pattern */}
    <svg className="absolute opacity-[0.03]" style={{ bottom: '10%', right: '10%' }} width="80" height="80" viewBox="0 0 80 80" fill="none">
      <path d="M40 10 Q60 20 50 40 Q40 60 20 50 Q0 40 10 20 Q20 0 40 10" stroke="#d4a04a" strokeWidth="1" />
      <path d="M40 20 Q50 25 47 37 Q44 50 30 47 Q16 44 19 30 Q22 16 40 20" stroke="#d4a04a" strokeWidth="0.7" />
    </svg>
  </div>
));

HomeBackground.displayName = 'HomeBackground';

const GameBackground = forwardRef<HTMLDivElement>((_props, ref) => (
  <div ref={ref} className="absolute inset-0 pointer-events-none overflow-hidden">
    {/* Subtle corner chocolate bars */}
    <div className="bg-card absolute opacity-[0.03]" style={{ top: '-5%', left: '-2%', transform: 'rotate(-15deg)' }}>
      <ChocolateBar size={50} />
    </div>
    <div className="bg-card absolute opacity-[0.025]" style={{ top: '-3%', right: '-1%', transform: 'rotate(12deg)' }}>
      <ChocolateBar size={40} />
    </div>
    <div className="bg-card absolute opacity-[0.02]" style={{ bottom: '-2%', left: '5%', transform: 'rotate(8deg)' }}>
      <ChocolateBar size={35} />
    </div>
    <div className="bg-card absolute opacity-[0.02]" style={{ bottom: '-3%', right: '8%', transform: 'rotate(-10deg)' }}>
      <ChocolateBar size={42} />
    </div>

    {/* Subtle cocoa beans */}
    <div className="bg-float absolute opacity-[0.025]" style={{ top: '3%', left: '40%', transform: 'rotate(20deg)' }}>
      <CocoaBean size={10} />
    </div>
    <div className="bg-float absolute opacity-[0.02]" style={{ bottom: '5%', right: '30%', transform: 'rotate(-15deg)' }}>
      <CocoaBean size={12} />
    </div>

    {/* Fewer, more subtle sparkles during gameplay */}
    {[
      { top: '5%', left: '15%' },
      { top: '10%', right: '12%' },
      { top: '88%', left: '20%' },
      { top: '92%', right: '18%' },
    ].map((pos, i) => (
      <svg
        key={i}
        className="bg-sparkle absolute"
        style={{ ...pos, opacity: 0.1 }}
        width="7"
        height="7"
        viewBox="0 0 7 7"
      >
        <path d="M3.5 0L3.9 2.9L7 3.5L3.9 4.1L3.5 7L3.1 4.1L0 3.5L3.1 2.9Z" fill="#f5c16c" />
      </svg>
    ))}
  </div>
));

GameBackground.displayName = 'GameBackground';
