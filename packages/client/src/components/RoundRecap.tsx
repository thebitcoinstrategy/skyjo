import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import type { RoundHighlights, VisiblePlayerState } from '@skyjo/shared';

interface RoundRecapProps {
  highlights: RoundHighlights;
  players: VisiblePlayerState[];
  onDone: () => void;
}

function nameFor(players: VisiblePlayerState[], id: string): string {
  const p = players.find((pl) => pl.id === id);
  return p ? `${p.avatar} ${p.nickname}` : '—';
}

export default function RoundRecap({ highlights, players, onDone }: RoundRecapProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const rows: { icon: string; label: string; value: string }[] = [];
  if (highlights.bestPlayer) {
    rows.push({
      icon: '🏆',
      label: 'Beste Runde',
      value: `${nameFor(players, highlights.bestPlayer.playerId)} (${highlights.bestPlayer.rawTotal})`,
    });
  }
  if (highlights.biggestPenalty) {
    rows.push({
      icon: '💥',
      label: 'Schlimmster Treffer',
      value: `${nameFor(players, highlights.biggestPenalty.playerId)} (${highlights.biggestPenalty.value})`,
    });
  }
  if (highlights.columnsEliminated > 0) {
    rows.push({
      icon: '🎯',
      label: 'Spalten entfernt',
      value: `${highlights.columnsEliminated}`,
    });
  }
  if (highlights.luckyFlips.length > 0) {
    rows.push({
      icon: '✨',
      label: 'Glückstreffer (−2)',
      value: highlights.luckyFlips.map((id) => nameFor(players, id)).join(', '),
    });
  }

  useEffect(() => {
    if (!cardRef.current) return;
    gsap.fromTo(
      cardRef.current,
      { scale: 0.85, opacity: 0, y: 20 },
      { scale: 1, opacity: 1, y: 0, duration: 0.4, ease: 'back.out(1.6)' }
    );
    const children = cardRef.current.querySelectorAll('[data-recap-row]');
    gsap.fromTo(
      children,
      { x: -10, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.3, stagger: 0.08, delay: 0.2, ease: 'power2.out' }
    );
  }, []);

  // Nothing to show? Skip immediately.
  useEffect(() => {
    if (rows.length === 0) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (rows.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-6">
      <div
        ref={cardRef}
        className="w-full max-w-sm rounded-2xl bg-gradient-to-b from-[#2a1810] to-[#1b0f0a] border border-gold/30 shadow-2xl shadow-black/60 p-5"
      >
        <div className="text-center mb-4">
          <p className="text-gold/60 text-[10px] tracking-[0.3em] uppercase font-bold">
            Rückblick
          </p>
          <h2 className="text-gold text-xl font-black mt-0.5">Runden-Highlights</h2>
        </div>

        <div className="space-y-2.5">
          {rows.map((r, i) => (
            <div
              key={i}
              data-recap-row
              className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 border border-white/10"
            >
              <span className="text-xl">{r.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-white/50 text-[10px] uppercase tracking-wider font-semibold">
                  {r.label}
                </p>
                <p className="text-white font-bold text-sm truncate">{r.value}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onDone}
          className="w-full mt-5 py-2.5 rounded-xl bg-gradient-to-r from-gold to-gold-dark text-felt-dark font-bold text-sm active:scale-[0.97] transition-all"
        >
          Weiter
        </button>
      </div>
    </div>
  );
}
