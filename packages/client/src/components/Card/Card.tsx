import { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';
import type { CardValue } from '@skyjo/shared';

interface CardProps {
  value: CardValue | null;
  faceUp: boolean;
  small?: boolean;
  onClick?: () => void;
  interactive?: boolean;
  highlight?: boolean;
  dealDelay?: number; // staggered deal animation delay in seconds
}

function getCardColors(value: number): { bg: string; text: string; border: string } {
  if (value <= -2) return { bg: 'bg-gradient-to-br from-blue-100 to-blue-200', text: 'text-blue-700', border: 'border-blue-300' };
  if (value === -1) return { bg: 'bg-gradient-to-br from-sky-100 to-sky-200', text: 'text-sky-700', border: 'border-sky-300' };
  if (value === 0)  return { bg: 'bg-gradient-to-br from-yellow-100 to-yellow-200', text: 'text-yellow-700', border: 'border-yellow-300' };
  if (value <= 4)   return { bg: 'bg-gradient-to-br from-green-100 to-green-200', text: 'text-green-700', border: 'border-green-300' };
  if (value <= 8)   return { bg: 'bg-gradient-to-br from-orange-100 to-orange-200', text: 'text-orange-600', border: 'border-orange-300' };
  return { bg: 'bg-gradient-to-br from-red-100 to-red-200', text: 'text-red-700', border: 'border-red-300' };
}

export default function Card({ value, faceUp, small, onClick, interactive, highlight, dealDelay }: CardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const prevFaceUp = useRef(faceUp);
  const [isDealt, setIsDealt] = useState(dealDelay === undefined);

  // Deal animation on mount
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

  // Flip animation when faceUp changes
  useEffect(() => {
    if (prevFaceUp.current === faceUp) return;
    prevFaceUp.current = faceUp;

    if (!innerRef.current) return;

    const tl = gsap.timeline();
    const targetY = faceUp ? 180 : 0;

    tl.to(innerRef.current, {
      rotateY: targetY,
      duration: 0.5,
      ease: 'back.out(1.4)',
    });

    // Add a satisfying scale bounce
    tl.fromTo(
      containerRef.current,
      { scale: 1 },
      { scale: 1.1, duration: 0.15, ease: 'power2.out', yoyo: true, repeat: 1 },
      '-=0.3'
    );
  }, [faceUp]);

  const w = small ? 'w-7 h-10' : 'w-14 h-20';
  const fontSize = small ? 'text-[10px]' : 'text-xl';
  const patternSize = small ? 'w-4 h-6' : 'w-9 h-14';
  const colors = value !== null ? getCardColors(value) : null;

  return (
    <div
      ref={containerRef}
      className={`card-perspective ${!isDealt ? 'opacity-0' : ''}`}
      style={{ width: 'fit-content' }}
    >
      <button
        onClick={onClick}
        disabled={!interactive}
        className={`${w} relative cursor-default ${
          interactive ? 'cursor-pointer' : ''
        } ${highlight ? 'ring-2 ring-gold ring-offset-1 ring-offset-felt' : ''}`}
        style={{ perspective: '800px' }}
      >
        <div
          ref={innerRef}
          className="w-full h-full relative"
          style={{
            transformStyle: 'preserve-3d',
            transform: faceUp ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* Back face (default visible) */}
          <div
            className={`absolute inset-0 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 border-2 border-blue-500 flex items-center justify-center shadow-md ${
              interactive ? 'hover:shadow-lg hover:border-gold' : ''
            }`}
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
          >
            <div className={`${patternSize} rounded-sm border border-blue-400/40 bg-gradient-to-br from-blue-500/50 to-blue-700/50`}>
              <div className="w-full h-full flex items-center justify-center">
                <span className={`${small ? 'text-[6px]' : 'text-xs'} text-blue-300/60 font-bold`}>S</span>
              </div>
            </div>
          </div>

          {/* Front face (visible when flipped) */}
          <div
            className={`absolute inset-0 rounded-lg ${colors?.bg ?? 'bg-white'} border-2 ${colors?.border ?? 'border-gray-200'} flex items-center justify-center shadow-md ${
              interactive ? 'hover:shadow-lg' : ''
            }`}
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            {value !== null && (
              <span className={`font-black ${fontSize} ${colors?.text ?? ''} drop-shadow-sm`}>
                {value}
              </span>
            )}
          </div>
        </div>
      </button>
    </div>
  );
}
