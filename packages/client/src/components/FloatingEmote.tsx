import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

interface Props {
  char: string;
  x: number;
  y: number;
  onDone: () => void;
}

export default function FloatingEmote({ char, x, y, onDone }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const tl = gsap.timeline({ onComplete: onDone });
    tl.fromTo(
      ref.current,
      { scale: 0.2, opacity: 0, y: 0 },
      { scale: 1.4, opacity: 1, y: -10, duration: 0.3, ease: 'back.out(2)' }
    );
    tl.to(ref.current, { scale: 1, duration: 0.15, ease: 'power2.out' });
    tl.to(ref.current, {
      y: -70,
      opacity: 0,
      duration: 1.1,
      ease: 'power2.in',
    }, '+=0.2');
  }, [onDone]);

  return (
    <div
      ref={ref}
      className="fixed pointer-events-none z-[90] text-4xl"
      style={{
        left: x - 20,
        top: y - 40,
        textShadow: '0 2px 8px rgba(0,0,0,0.6)',
      }}
    >
      {char}
    </div>
  );
}
