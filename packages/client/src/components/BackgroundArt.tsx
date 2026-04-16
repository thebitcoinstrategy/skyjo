/**
 * Decorative SVG background art for the home and game screens.
 * Chocolate-themed: chocolate bars, cocoa swirls, sparkles, card silhouettes.
 */

import { useEffect, useRef, forwardRef } from 'react';
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
    const risers = ref.current.querySelectorAll('.bg-rise');
    const drifters = ref.current.querySelectorAll('.bg-drift');
    const pulses = ref.current.querySelectorAll('.bg-pulse');
    const spinners = ref.current.querySelectorAll('.bg-spin');

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

    // Rising elements (float up slowly then reset)
    risers.forEach((el, i) => {
      const startY = parseFloat((el as HTMLElement).dataset.startY || '110');
      gsap.fromTo(el,
        { y: startY + '%', opacity: 0 },
        {
          y: '-15%',
          opacity: 0.08,
          duration: 12 + i * 4,
          repeat: -1,
          ease: 'none',
          delay: i * 2.5,
          onRepeat: () => {
            gsap.set(el, { x: `${(Math.random() - 0.5) * 30}px` });
          },
        }
      );
    });

    // Drifting sideways
    drifters.forEach((el, i) => {
      gsap.to(el, {
        x: `+=${(i % 2 === 0 ? 1 : -1) * (15 + i * 5)}`,
        y: `+=${3 + i * 2}`,
        rotation: `+=${(i % 2 === 0 ? 8 : -8)}`,
        duration: 6 + i * 2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: i * 1.3,
      });
    });

    // Pulsing glow elements
    pulses.forEach((el, i) => {
      gsap.to(el, {
        scale: 1.2,
        opacity: 0.12,
        duration: 2 + i * 0.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: i * 0.8,
      });
    });

    // Slow spinners
    spinners.forEach((el, i) => {
      gsap.to(el, {
        rotation: 360,
        duration: 20 + i * 8,
        repeat: -1,
        ease: 'none',
      });
    });

    return () => {
      [cards, sparkles, floaters, risers, drifters, pulses, spinners].forEach(list =>
        list.forEach((el) => gsap.killTweensOf(el))
      );
    };
  }, []);

  if (variant === 'home') return <HomeBackground ref={ref} />;
  return <GameBackground ref={ref} />;
}

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
function ChocolateDrip({ className, style, height = 50 }: { className?: string; style?: React.CSSProperties; height?: number }) {
  const w = height * 0.6;
  return (
    <svg className={className} style={style} width={w} height={height} viewBox="0 0 30 50">
      <path
        d="M5 0 Q5 15 10 20 Q15 25 15 35 Q15 45 10 48 Q8 50 5 48 Q0 45 0 35 Q0 25 5 20 Q10 15 5 0Z"
        fill="#5d4037"
        opacity={0.2}
      />
    </svg>
  );
}

/* Chocolate truffle */
function Truffle({ className, style, size = 24 }: { className?: string; style?: React.CSSProperties; size?: number }) {
  return (
    <svg className={className} style={style} width={size} height={size} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="#4e342e" opacity={0.4} />
      <circle cx="12" cy="12" r="8" fill="#6d4c41" opacity={0.3} />
      <ellipse cx="12" cy="9" rx="5" ry="3" fill="#8d6e63" opacity={0.2} />
      <path d="M7 12 Q12 8 17 12" stroke="#a1887f" strokeWidth="0.5" fill="none" opacity={0.3} />
    </svg>
  );
}

/* Whipped cream swirl */
function CreamSwirl({ className, style, size = 40 }: { className?: string; style?: React.CSSProperties; size?: number }) {
  return (
    <svg className={className} style={style} width={size} height={size} viewBox="0 0 40 40" fill="none">
      <path d="M20 5 Q30 8 28 18 Q26 28 16 26 Q6 24 8 14 Q10 4 20 5" stroke="#f5c16c" strokeWidth="0.8" opacity={0.15} />
      <path d="M20 10 Q26 12 25 18 Q24 24 18 23 Q12 22 13 16 Q14 10 20 10" stroke="#f5c16c" strokeWidth="0.5" opacity={0.1} />
      <circle cx="20" cy="17" r="2" fill="#f5c16c" opacity={0.1} />
    </svg>
  );
}

/* Coffee cup silhouette */
function CoffeeCup({ className, style, size = 32 }: { className?: string; style?: React.CSSProperties; size?: number }) {
  return (
    <svg className={className} style={style} width={size} height={size * 1.1} viewBox="0 0 32 35" fill="none">
      <path d="M4 10 L6 30 Q6 33 16 33 Q26 33 26 30 L28 10Z" fill="#5d4037" opacity={0.3} />
      <path d="M28 14 Q34 14 34 20 Q34 26 28 26" stroke="#5d4037" strokeWidth="1.5" opacity={0.2} />
      <ellipse cx="16" cy="10" rx="12" ry="3" fill="#6d4c41" opacity={0.3} />
      {/* Steam wisps */}
      <path d="M11 6 Q12 2 11 0" stroke="#a1887f" strokeWidth="0.6" opacity={0.15} />
      <path d="M16 5 Q17 1 16 -1" stroke="#a1887f" strokeWidth="0.6" opacity={0.15} />
      <path d="M21 6 Q22 2 21 0" stroke="#a1887f" strokeWidth="0.6" opacity={0.15} />
    </svg>
  );
}

/* Skyjo card silhouette with S logo */
function CardSilhouette({ className, style, size = 48 }: { className?: string; style?: React.CSSProperties; size?: number }) {
  const h = size * 1.35;
  return (
    <svg className={className} style={style} width={size} height={h} viewBox="0 0 48 65" fill="none">
      <rect width="48" height="65" rx="6" fill="white" opacity={0.04} />
      <rect x="3" y="3" width="42" height="59" rx="4" stroke="white" strokeWidth="0.5" opacity={0.03} />
      <text x="24" y="38" textAnchor="middle" fontSize="18" fontWeight="900" fill="white" opacity={0.04}>S</text>
    </svg>
  );
}

/* Gold coin */
function GoldCoin({ className, style, size = 20 }: { className?: string; style?: React.CSSProperties; size?: number }) {
  return (
    <svg className={className} style={style} width={size} height={size} viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="9" fill="#f5c16c" opacity={0.1} />
      <circle cx="10" cy="10" r="7" fill="none" stroke="#f5c16c" strokeWidth="0.5" opacity={0.15} />
      <text x="10" y="14" textAnchor="middle" fontSize="8" fontWeight="900" fill="#f5c16c" opacity={0.12}>$</text>
    </svg>
  );
}

const HomeBackground = forwardRef<HTMLDivElement>((_props, ref) => (
  <div ref={ref} className="absolute inset-0 pointer-events-none overflow-hidden">

    {/* ═══ LARGE FLOATING CHOCOLATE BARS ═══ */}
    <div className="bg-drift absolute opacity-[0.08]" style={{ top: '5%', left: '2%', transform: 'rotate(-12deg)' }}>
      <ChocolateBar size={80} />
    </div>
    <div className="bg-drift absolute opacity-[0.06]" style={{ top: '60%', right: '3%', transform: 'rotate(10deg)' }}>
      <ChocolateBar size={70} />
    </div>
    <div className="bg-drift absolute opacity-[0.05]" style={{ top: '82%', left: '5%', transform: 'rotate(-6deg)' }}>
      <ChocolateBar size={55} />
    </div>
    <div className="bg-drift absolute opacity-[0.07]" style={{ top: '35%', right: '8%', transform: 'rotate(15deg)' }}>
      <ChocolateBar size={50} />
    </div>
    <div className="bg-drift absolute opacity-[0.04]" style={{ top: '25%', left: '8%', transform: 'rotate(20deg)' }}>
      <ChocolateBar size={45} />
    </div>

    {/* ═══ RISING COCOA BEANS (float up continuously) ═══ */}
    {[
      { left: '8%', delay: 0 },
      { left: '22%', delay: 3 },
      { left: '45%', delay: 1.5 },
      { left: '65%', delay: 4.5 },
      { left: '80%', delay: 2 },
      { left: '92%', delay: 5.5 },
      { left: '35%', delay: 7 },
      { left: '55%', delay: 8.5 },
    ].map((pos, i) => (
      <div
        key={`bean-${i}`}
        className="bg-rise absolute"
        data-start-y="110"
        style={{ left: pos.left, bottom: '-5%', animationDelay: `${pos.delay}s` }}
      >
        <CocoaBean size={12 + (i % 3) * 4} />
      </div>
    ))}

    {/* ═══ FLOATING COCOA BEANS (static position, gentle bob) ═══ */}
    <div className="bg-float absolute opacity-[0.09]" style={{ top: '18%', right: '12%', transform: 'rotate(25deg)' }}>
      <CocoaBean size={18} />
    </div>
    <div className="bg-float absolute opacity-[0.07]" style={{ top: '48%', left: '4%', transform: 'rotate(-20deg)' }}>
      <CocoaBean size={16} />
    </div>
    <div className="bg-float absolute opacity-[0.08]" style={{ top: '33%', right: '5%', transform: 'rotate(15deg)' }}>
      <CocoaBean size={20} />
    </div>
    <div className="bg-float absolute opacity-[0.05]" style={{ top: '72%', left: '30%', transform: 'rotate(-30deg)' }}>
      <CocoaBean size={14} />
    </div>
    <div className="bg-float absolute opacity-[0.06]" style={{ top: '90%', right: '40%', transform: 'rotate(40deg)' }}>
      <CocoaBean size={15} />
    </div>

    {/* ═══ TRUFFLES ═══ */}
    <div className="bg-float absolute opacity-[0.08]" style={{ top: '15%', left: '60%', transform: 'rotate(10deg)' }}>
      <Truffle size={28} />
    </div>
    <div className="bg-float absolute opacity-[0.06]" style={{ top: '75%', right: '15%', transform: 'rotate(-15deg)' }}>
      <Truffle size={22} />
    </div>
    <div className="bg-drift absolute opacity-[0.05]" style={{ top: '50%', left: '85%', transform: 'rotate(30deg)' }}>
      <Truffle size={20} />
    </div>

    {/* ═══ CREAM SWIRLS ═══ */}
    <div className="bg-spin absolute opacity-[0.08]" style={{ top: '20%', left: '40%' }}>
      <CreamSwirl size={50} />
    </div>
    <div className="bg-spin absolute opacity-[0.06]" style={{ top: '65%', right: '30%' }}>
      <CreamSwirl size={35} />
    </div>
    <div className="bg-spin absolute opacity-[0.05]" style={{ top: '88%', left: '60%' }}>
      <CreamSwirl size={45} />
    </div>

    {/* ═══ COFFEE CUPS ═══ */}
    <div className="bg-float absolute opacity-[0.06]" style={{ top: '42%', left: '12%', transform: 'rotate(-5deg)' }}>
      <CoffeeCup size={30} />
    </div>
    <div className="bg-float absolute opacity-[0.05]" style={{ top: '8%', right: '25%', transform: 'rotate(8deg)' }}>
      <CoffeeCup size={26} />
    </div>

    {/* ═══ CHOCOLATE DRIPS FROM TOP ═══ */}
    <div className="absolute opacity-[0.10]" style={{ top: '-2px', left: '10%' }}>
      <ChocolateDrip height={60} />
    </div>
    <div className="absolute opacity-[0.08]" style={{ top: '-2px', left: '25%' }}>
      <ChocolateDrip height={45} />
    </div>
    <div className="absolute opacity-[0.07]" style={{ top: '-2px', right: '18%', transform: 'scaleX(-1)' }}>
      <ChocolateDrip height={55} />
    </div>
    <div className="absolute opacity-[0.06]" style={{ top: '-2px', left: '55%' }}>
      <ChocolateDrip height={40} />
    </div>
    <div className="absolute opacity-[0.05]" style={{ top: '-2px', right: '8%' }}>
      <ChocolateDrip height={50} />
    </div>
    <div className="absolute opacity-[0.09]" style={{ top: '-2px', left: '75%', transform: 'scaleX(-1)' }}>
      <ChocolateDrip height={35} />
    </div>
    <div className="absolute opacity-[0.04]" style={{ top: '-2px', left: '42%' }}>
      <ChocolateDrip height={48} />
    </div>

    {/* ═══ CARD SILHOUETTES ═══ */}
    <svg className="bg-card absolute opacity-[0.04]" style={{ top: '8%', left: '78%' }} width="48" height="64" viewBox="0 0 48 64" fill="white">
      <rect width="48" height="64" rx="6" />
    </svg>
    <svg className="bg-card absolute opacity-[0.03]" style={{ top: '45%', right: '2%' }} width="40" height="54" viewBox="0 0 40 54" fill="white">
      <rect width="40" height="54" rx="5" />
    </svg>
    <svg className="bg-card absolute opacity-[0.03]" style={{ top: '55%', left: '1%' }} width="36" height="48" viewBox="0 0 36 48" fill="white">
      <rect width="36" height="48" rx="4" />
    </svg>
    <div className="bg-card absolute" style={{ top: '70%', left: '65%', transform: 'rotate(12deg)' }}>
      <CardSilhouette size={38} />
    </div>
    <div className="bg-card absolute" style={{ top: '3%', left: '50%', transform: 'rotate(-8deg)' }}>
      <CardSilhouette size={32} />
    </div>

    {/* ═══ GOLD COINS ═══ */}
    <div className="bg-float absolute opacity-[0.10]" style={{ top: '28%', left: '75%' }}>
      <GoldCoin size={22} />
    </div>
    <div className="bg-float absolute opacity-[0.08]" style={{ top: '58%', left: '20%' }}>
      <GoldCoin size={18} />
    </div>
    <div className="bg-drift absolute opacity-[0.06]" style={{ top: '85%', right: '35%' }}>
      <GoldCoin size={16} />
    </div>

    {/* ═══ GOLD SPARKLE STARS — lots of them ═══ */}
    {[
      { top: '4%', left: '15%', s: 12 },
      { top: '8%', right: '30%', s: 8 },
      { top: '12%', left: '50%', s: 10 },
      { top: '17%', right: '8%', s: 7 },
      { top: '22%', left: '25%', s: 9 },
      { top: '28%', right: '45%', s: 11 },
      { top: '33%', left: '70%', s: 6 },
      { top: '38%', left: '5%', s: 8 },
      { top: '42%', right: '20%', s: 10 },
      { top: '48%', left: '55%', s: 7 },
      { top: '52%', right: '60%', s: 9 },
      { top: '58%', left: '35%', s: 12 },
      { top: '63%', right: '10%', s: 8 },
      { top: '68%', left: '80%', s: 6 },
      { top: '73%', right: '50%', s: 10 },
      { top: '78%', left: '15%', s: 7 },
      { top: '83%', right: '25%', s: 9 },
      { top: '88%', left: '45%', s: 11 },
      { top: '92%', right: '70%', s: 8 },
      { top: '96%', left: '60%', s: 6 },
    ].map((pos, i) => (
      <svg
        key={`star-${i}`}
        className="bg-sparkle absolute"
        style={{ top: pos.top, left: (pos as { left?: string }).left, right: (pos as { right?: string }).right, opacity: 0.15 + (i % 4) * 0.05 }}
        width={pos.s}
        height={pos.s}
        viewBox="0 0 10 10"
      >
        <path d="M5 0L5.6 4L10 5L5.6 6L5 10L4.4 6L0 5L4.4 4Z" fill="#f5c16c" />
      </svg>
    ))}

    {/* ═══ PULSING GLOW ORBS ═══ */}
    <div className="bg-pulse absolute rounded-full" style={{
      top: '20%', left: '50%', transform: 'translate(-50%, -50%)',
      width: 100, height: 100,
      background: 'radial-gradient(circle, rgba(245,193,108,0.06) 0%, transparent 70%)',
    }} />
    <div className="bg-pulse absolute rounded-full" style={{
      top: '70%', left: '30%', transform: 'translate(-50%, -50%)',
      width: 80, height: 80,
      background: 'radial-gradient(circle, rgba(245,193,108,0.05) 0%, transparent 70%)',
    }} />
    <div className="bg-pulse absolute rounded-full" style={{
      top: '50%', right: '10%',
      width: 60, height: 60,
      background: 'radial-gradient(circle, rgba(139,90,43,0.06) 0%, transparent 70%)',
    }} />

    {/* ═══ DECORATIVE RINGS ═══ */}
    <svg className="bg-spin absolute opacity-[0.04]" style={{ top: '30%', left: '50%', transform: 'translate(-50%, -50%)' }} width="350" height="350" viewBox="0 0 350 350" fill="none">
      <circle cx="175" cy="175" r="130" stroke="#f5c16c" strokeWidth="0.5" />
      <circle cx="175" cy="175" r="155" stroke="#f5c16c" strokeWidth="0.3" />
      <circle cx="175" cy="175" r="110" stroke="#8d6e63" strokeWidth="0.4" strokeDasharray="4 8" />
      <circle cx="175" cy="175" r="80" stroke="#f5c16c" strokeWidth="0.2" strokeDasharray="2 6" />
    </svg>

    <svg className="absolute opacity-[0.03]" style={{ top: '75%', left: '50%', transform: 'translate(-50%, -50%)' }} width="200" height="200" viewBox="0 0 200 200" fill="none">
      <circle cx="100" cy="100" r="80" stroke="#8d6e63" strokeWidth="0.5" strokeDasharray="3 5" />
      <circle cx="100" cy="100" r="60" stroke="#f5c16c" strokeWidth="0.3" />
    </svg>

    {/* ═══ CHOCOLATE SWIRL PATTERNS ═══ */}
    <svg className="bg-spin absolute opacity-[0.04]" style={{ bottom: '8%', right: '8%' }} width="90" height="90" viewBox="0 0 80 80" fill="none">
      <path d="M40 10 Q60 20 50 40 Q40 60 20 50 Q0 40 10 20 Q20 0 40 10" stroke="#d4a04a" strokeWidth="1" />
      <path d="M40 20 Q50 25 47 37 Q44 50 30 47 Q16 44 19 30 Q22 16 40 20" stroke="#d4a04a" strokeWidth="0.7" />
      <circle cx="40" cy="35" r="3" fill="#d4a04a" opacity={0.3} />
    </svg>
    <svg className="bg-spin absolute opacity-[0.03]" style={{ top: '10%', left: '15%' }} width="60" height="60" viewBox="0 0 80 80" fill="none">
      <path d="M40 10 Q60 20 50 40 Q40 60 20 50 Q0 40 10 20 Q20 0 40 10" stroke="#8d6e63" strokeWidth="0.8" />
      <path d="M40 20 Q50 25 47 37 Q44 50 30 47 Q16 44 19 30 Q22 16 40 20" stroke="#8d6e63" strokeWidth="0.5" />
    </svg>

    {/* ═══ DIAGONAL SHIMMER LINES ═══ */}
    <svg className="absolute inset-0 w-full h-full opacity-[0.02]" preserveAspectRatio="none">
      <line x1="0" y1="20%" x2="100%" y2="60%" stroke="#f5c16c" strokeWidth="0.5" />
      <line x1="0" y1="50%" x2="100%" y2="90%" stroke="#f5c16c" strokeWidth="0.3" />
      <line x1="0" y1="80%" x2="100%" y2="30%" stroke="#8d6e63" strokeWidth="0.4" />
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
