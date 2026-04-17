import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import type { EmoteKind } from '@skyjo/shared';

export const EMOTES: { kind: EmoteKind; char: string }[] = [
  { kind: 'thumbs-up', char: '👍' },
  { kind: 'tada', char: '🎉' },
  { kind: 'sweat', char: '😅' },
  { kind: 'scream', char: '😱' },
  { kind: 'fire', char: '🔥' },
  { kind: 'think', char: '🤔' },
];

interface Props {
  onPick: (k: EmoteKind) => void;
  onClose: () => void;
}

export default function EmotePicker({ onPick, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      gsap.fromTo(
        ref.current,
        { scale: 0.7, opacity: 0, y: 10 },
        { scale: 1, opacity: 1, y: 0, duration: 0.22, ease: 'back.out(1.8)' }
      );
    }
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    // Defer to avoid catching the opening click
    const t = setTimeout(() => document.addEventListener('pointerdown', close), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener('pointerdown', close);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-40 flex gap-1 px-1.5 py-1.5 rounded-full bg-[#1b0f0a]/95 backdrop-blur border border-gold/30 shadow-xl shadow-black/50"
    >
      {EMOTES.map((e) => (
        <button
          key={e.kind}
          onClick={() => onPick(e.kind)}
          className="w-8 h-8 text-xl rounded-full hover:bg-white/10 active:scale-90 transition-all flex items-center justify-center"
        >
          {e.char}
        </button>
      ))}
    </div>
  );
}
