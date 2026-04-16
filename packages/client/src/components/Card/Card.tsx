import { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';
import type { CardValue } from '@skyjo/shared';
import CardIllustration from '../CardIllustration';

interface CardProps {
  value: CardValue | null;
  faceUp: boolean;
  small?: boolean;
  tiny?: boolean;
  onClick?: () => void;
  interactive?: boolean;
  highlight?: boolean;
  dealDelay?: number;
  dropTarget?: boolean;
  skipFlipAnimation?: boolean;
}

interface CardStyle {
  bg: string;
  ring: string;
  text: string;
  glow: string;
}

function getCardStyle(value: number): CardStyle {
  if (value <= -2)
    return { bg: 'from-blue-500 to-blue-700', ring: 'ring-blue-400/50', text: 'text-white', glow: 'shadow-blue-500/40' };
  if (value === -1)
    return { bg: 'from-sky-400 to-sky-600', ring: 'ring-sky-400/50', text: 'text-white', glow: 'shadow-sky-500/40' };
  if (value === 0)
    return { bg: 'from-yellow-400 to-amber-500', ring: 'ring-yellow-400/50', text: 'text-white', glow: 'shadow-yellow-500/40' };
  if (value <= 4)
    return { bg: 'from-emerald-400 to-emerald-600', ring: 'ring-emerald-400/50', text: 'text-white', glow: 'shadow-emerald-500/40' };
  if (value <= 8)
    return { bg: 'from-orange-400 to-orange-600', ring: 'ring-orange-400/50', text: 'text-white', glow: 'shadow-orange-500/40' };
  return { bg: 'from-red-500 to-red-700', ring: 'ring-red-400/50', text: 'text-white', glow: 'shadow-red-500/40' };
}

export default function Card({
  value,
  faceUp,
  small,
  tiny,
  onClick,
  interactive,
  highlight,
  dealDelay,
  dropTarget,
  skipFlipAnimation,
}: CardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const prevFaceUp = useRef(faceUp);
  const [isDealt, setIsDealt] = useState(dealDelay === undefined);
  const currentRotation = useRef(faceUp ? 180 : 0);

  useEffect(() => {
    if (innerRef.current) {
      gsap.set(innerRef.current, { rotateY: faceUp ? 180 : 0 });
      currentRotation.current = faceUp ? 180 : 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (dealDelay !== undefined && containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { scale: 0, rotateZ: -15, opacity: 0 },
        {
          scale: 1,
          rotateZ: 0,
          opacity: 1,
          duration: 0.4,
          delay: dealDelay,
          ease: 'back.out(1.7)',
          onComplete: () => setIsDealt(true),
        }
      );
    }
  }, [dealDelay]);

  useEffect(() => {
    if (prevFaceUp.current === faceUp) return;
    prevFaceUp.current = faceUp;
    if (!innerRef.current || !containerRef.current) return;

    const targetY = faceUp ? 180 : 0;

    // When skipFlipAnimation is set, just snap to final state (e.g. placing a drawn card)
    if (skipFlipAnimation) {
      gsap.set(innerRef.current, { rotateY: targetY });
      currentRotation.current = targetY;
      return;
    }

    const isTiny = tiny || small;
    const lift = isTiny ? -3 : -8;
    const scaleUp = isTiny ? 1.05 : 1.12;
    const tl = gsap.timeline();

    tl.to(containerRef.current, {
      y: lift,
      scale: scaleUp,
      duration: 0.18,
      ease: 'power2.out',
    });

    tl.to(
      innerRef.current,
      {
        rotateY: targetY,
        duration: 0.4,
        ease: 'power2.inOut',
      },
      '-=0.08'
    );

    tl.to(
      containerRef.current,
      {
        y: 0,
        scale: 1,
        duration: 0.3,
        ease: 'bounce.out',
      },
      '-=0.1'
    );

    currentRotation.current = targetY;
  }, [faceUp, small, tiny, skipFlipAnimation]);

  // Three size tiers:
  // tiny: opponent cards (very compact, just colored rectangles with number)
  // small: (unused currently, kept for flexibility)
  // normal: player's own cards
  let w: string, fontSize: string, cornerSize: string;
  let centerSize: string, logoBoxSize: string, logoText: string;

  if (tiny) {
    w = 'w-5 h-7';
    fontSize = 'text-[8px]';
    cornerSize = 'text-[4px]';
    centerSize = 'w-3 h-3';
    logoBoxSize = 'w-3 h-4 rounded-[1px]';
    logoText = 'text-[3px]';
  } else if (small) {
    w = 'w-7 h-[2.4rem]';
    fontSize = 'text-[10px]';
    cornerSize = 'text-[5px]';
    centerSize = 'w-4 h-4';
    logoBoxSize = 'w-4 h-5 rounded-[2px]';
    logoText = 'text-[4px]';
  } else {
    w = 'w-[3.2rem] h-[4.2rem]';
    fontSize = 'text-lg';
    cornerSize = 'text-[7px]';
    centerSize = 'w-7 h-7';
    logoBoxSize = 'w-7 h-9 rounded-md';
    logoText = 'text-[6px]';
  }

  const style = value !== null ? getCardStyle(value) : null;
  const isCompact = tiny || small;

  return (
    <div
      ref={containerRef}
      className={`card-perspective ${!isDealt ? 'opacity-0' : ''} ${
        dropTarget ? 'drop-target-active' : ''
      }`}
      style={{ width: 'fit-content' }}
    >
      <button
        onClick={onClick}
        disabled={!interactive}
        className={`${w} relative ${
          interactive
            ? 'cursor-pointer hover:brightness-110 active:scale-95 transition-all duration-150'
            : 'cursor-default'
        } ${
          highlight ? `ring-2 ring-gold ${isCompact ? '' : 'ring-offset-1 ring-offset-felt'} rounded-md` : ''
        }`}
        style={{ perspective: '600px' }}
      >
        <div
          ref={innerRef}
          className="w-full h-full relative"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* ═══ BACK FACE ═══ */}
          <div
            className={`absolute inset-0 rounded-md overflow-hidden ${isCompact ? 'shadow-sm' : 'shadow-lg'} ${
              interactive && !faceUp ? 'hover:shadow-xl hover:shadow-gold/20' : ''
            }`}
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800" />
            {!tiny && <div className="absolute inset-[2px] rounded-sm border border-blue-400/30" />}
            {!isCompact && (
              <div
                className="absolute inset-0 opacity-15"
                style={{
                  backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.1) 4px, rgba(255,255,255,0.1) 5px)`,
                }}
              />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className={`${logoBoxSize} bg-gradient-to-b from-blue-500/60 to-indigo-700/60 border border-blue-400/40 flex items-center justify-center`}
              >
                <span className={`${logoText} font-black text-blue-200/80 tracking-wider`}>
                  SKYJO
                </span>
              </div>
            </div>
            {!isCompact && (
              <div
                className="absolute inset-x-0 top-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"
                style={{ height: '40%' }}
              />
            )}
          </div>

          {/* ═══ FRONT FACE ═══ */}
          <div
            className={`absolute inset-0 rounded-md overflow-hidden ${isCompact ? 'shadow-sm' : 'shadow-lg'} ${
              style && !isCompact ? style.glow : ''
            } ${interactive && faceUp ? 'hover:shadow-xl' : ''}`}
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${style?.bg ?? 'from-gray-200 to-gray-300'}`} />
            {!tiny && <div className="absolute inset-[1px] rounded-sm border border-white/25" />}
            {value !== null && !isCompact && (
              <>
                <span className={`absolute top-0.5 left-1 ${cornerSize} font-bold text-white/70`}>{value}</span>
                <span className={`absolute bottom-0.5 right-1 ${cornerSize} font-bold text-white/70 rotate-180`}>{value}</span>
              </>
            )}
            {value !== null && (
              <>
                {/* Background illustration */}
                <div className="absolute inset-0 flex items-end justify-end p-0.5 overflow-hidden">
                  <CardIllustration value={value} size={tiny ? 'tiny' : small ? 'small' : 'normal'} />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className={`${centerSize} rounded-full bg-white/20 flex items-center justify-center backdrop-blur-[1px]`}
                  >
                    <span
                      className={`font-black ${fontSize} ${style?.text ?? 'text-gray-800'} drop-shadow-sm`}
                    >
                      {value}
                    </span>
                  </div>
                </div>
              </>
            )}
            {!isCompact && (
              <div
                className="absolute inset-x-0 top-0 bg-gradient-to-b from-white/25 to-transparent pointer-events-none"
                style={{ height: '35%' }}
              />
            )}
          </div>
        </div>
      </button>
    </div>
  );
}
