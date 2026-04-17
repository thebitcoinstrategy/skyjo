import { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';

interface RulesOverlayProps {
  onClose: () => void;
}

const SLIDES = [
  {
    title: 'Ziel',
    body: (
      <>
        <p className="text-white/80 text-sm leading-relaxed">
          Sammle die <span className="text-gold font-bold">niedrigste Punktzahl</span>. Jede Karte
          zaehlt ihren Wert. Minus-Karten sind Gold wert!
        </p>
        <div className="flex items-center justify-center gap-2 mt-4">
          {[-2, -1, 0, 5, 10, 12].map((v) => (
            <MiniCard key={v} value={v} />
          ))}
        </div>
      </>
    ),
  },
  {
    title: 'Dein Zug',
    body: (
      <>
        <p className="text-white/80 text-sm leading-relaxed">
          <span className="text-gold font-bold">1.</span> Ziehe eine Karte vom Stapel oder nimm die
          offene.
        </p>
        <p className="text-white/80 text-sm leading-relaxed mt-2">
          <span className="text-gold font-bold">2.</span> Tausche sie mit einer deiner Karten —
          oder wirf die gezogene ab und decke eine deiner Karten auf.
        </p>
        <p className="text-white/60 text-xs leading-relaxed mt-3">
          Drei gleiche Zahlen in einer Spalte? Die Spalte fliegt raus —{' '}
          <span className="text-gold">0 Punkte!</span>
        </p>
      </>
    ),
  },
  {
    title: 'Runde & Endspiel',
    body: (
      <>
        <p className="text-white/80 text-sm leading-relaxed">
          Wer zuerst alle seine Karten aufgedeckt hat, beendet die Runde. Alle anderen haben noch
          <span className="text-gold font-bold"> einen letzten Zug</span>.
        </p>
        <p className="text-white/80 text-sm leading-relaxed mt-3">
          Hat der Schliesser <span className="text-red-400 font-bold">nicht</span> den niedrigsten
          Stand? Seine Punkte werden <span className="text-red-400 font-bold">verdoppelt!</span>
        </p>
        <p className="text-white/60 text-xs leading-relaxed mt-3">
          Bei 100 Punkten oder mehr ist das Spiel zu Ende. Wer dann am wenigsten hat, gewinnt.
        </p>
      </>
    ),
  },
];

function MiniCard({ value }: { value: number }) {
  let bg = 'from-emerald-400 to-emerald-600';
  if (value <= -2) bg = 'from-blue-500 to-blue-700';
  else if (value === -1) bg = 'from-sky-400 to-sky-600';
  else if (value === 0) bg = 'from-yellow-400 to-amber-500';
  else if (value <= 4) bg = 'from-emerald-400 to-emerald-600';
  else if (value <= 8) bg = 'from-orange-400 to-orange-600';
  else bg = 'from-red-500 to-red-700';
  return (
    <div className={`w-7 h-9 rounded bg-gradient-to-br ${bg} flex items-center justify-center shadow-md`}>
      <span className="text-sm font-black text-white drop-shadow">{value}</span>
    </div>
  );
}

export default function RulesOverlay({ onClose }: RulesOverlayProps) {
  const [slide, setSlide] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        { scale: 0.92, opacity: 0, y: 20 },
        { scale: 1, opacity: 1, y: 0, duration: 0.3, ease: 'back.out(1.5)' }
      );
    }
  }, [slide]);

  const next = () => {
    if (slide < SLIDES.length - 1) setSlide(slide + 1);
    else onClose();
  };
  const prev = () => {
    if (slide > 0) setSlide(slide - 1);
  };

  const s = SLIDES[slide];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={cardRef}
        className="w-full max-w-sm rounded-2xl bg-gradient-to-b from-[#2a1810] to-[#1b0f0a] border border-gold/30 shadow-2xl shadow-black/60 p-5 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/80 text-lg flex items-center justify-center transition-all"
          aria-label="Schliessen"
        >
          ×
        </button>

        <div className="text-center mb-4">
          <p className="text-gold/60 text-[10px] tracking-[0.3em] uppercase font-bold mb-1">
            Regeln · {slide + 1} / {SLIDES.length}
          </p>
          <h2 className="text-gold text-xl font-black">{s.title}</h2>
        </div>

        <div className="min-h-[180px] mb-4">{s.body}</div>

        <div className="flex items-center justify-between gap-2 mt-2">
          <button
            onClick={prev}
            disabled={slide === 0}
            className="px-3 py-2 rounded-lg text-white/50 text-sm hover:text-white/80 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
          >
            Zurueck
          </button>
          <div className="flex gap-1.5">
            {SLIDES.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  i === slide ? 'bg-gold w-4' : 'bg-white/20'
                }`}
              />
            ))}
          </div>
          <button
            onClick={next}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-gold to-gold-dark text-felt-dark font-bold text-sm active:scale-95 transition-all"
          >
            {slide === SLIDES.length - 1 ? 'Verstanden' : 'Weiter'}
          </button>
        </div>
      </div>
    </div>
  );
}
