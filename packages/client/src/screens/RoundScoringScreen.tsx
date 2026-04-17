import { useRef, useEffect, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import { useGameStore } from '../stores/gameStore';
import { useConnectionStore } from '../stores/connectionStore';
import { soundManager } from '../audio/SoundManager';
import { ROWS } from '@skyjo/shared';
import Confetti from '../components/Confetti';
import RoundRecap from '../components/RoundRecap';
import { getReduceAnimations } from '../stores/settingsStore';

/** Card background color by value (matches Card.tsx getCardStyle) */
function getCardBg(value: number): string {
  if (value <= -2) return 'from-blue-500 to-blue-700';
  if (value === -1) return 'from-sky-400 to-sky-600';
  if (value === 0) return 'from-yellow-400 to-amber-500';
  if (value <= 4) return 'from-emerald-400 to-emerald-600';
  if (value <= 8) return 'from-orange-400 to-orange-600';
  return 'from-red-500 to-red-700';
}

export default function RoundScoringScreen() {
  const gameState = useGameStore((s) => s.gameState);
  const roundEndData = useGameStore((s) => s.roundEndData);
  const setScoringDone = useGameStore((s) => s.setScoringDone);
  const playerId = useConnectionStore((s) => s.playerId);

  // Track which cards have been revealed per player (by player index)
  const [revealedCards, setRevealedCards] = useState<Record<number, Set<number>>>({});
  // Running totals per player index
  const [runningTotals, setRunningTotals] = useState<Record<number, number>>({});
  // Phase of the animation
  const [phase, setPhase] = useState<'counting' | 'comparison' | 'closer'>('counting');
  const [showDoubled, setShowDoubled] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showRecap, setShowRecap] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const closerRef = useRef<HTMLDivElement>(null);
  const animationStarted = useRef(false);

  const players = gameState?.players ?? [];
  const closerPlayerId = roundEndData?.closerPlayerId;
  const wasDoubled = roundEndData?.wasDoubled ?? false;
  const playerCards = roundEndData?.playerCards ?? {};

  // Run the counting animation
  const runAnimation = useCallback(() => {
    if (!roundEndData || players.length === 0) return;

    // For each player, reveal cards one by one
    const cardValues = players.map((p) => playerCards[p.id] ?? []);
    const maxCards = Math.max(...cardValues.map((c) => c.length));

    const reduced = getReduceAnimations();
    let delay = reduced ? 0 : 500; // Initial delay
    const cardDelay = reduced ? 0 : 120; // ms between each card reveal

    // Reveal cards column by column (left to right, top to bottom)
    for (let cardIdx = 0; cardIdx < maxCards; cardIdx++) {
      const currentIdx = cardIdx;
      setTimeout(() => {
        setRevealedCards((prev) => {
          const next = { ...prev };
          players.forEach((_, pIdx) => {
            if (!next[pIdx]) next[pIdx] = new Set();
            const newSet = new Set(next[pIdx]);
            if (currentIdx < cardValues[pIdx].length) {
              newSet.add(currentIdx);
            }
            next[pIdx] = newSet;
          });
          return next;
        });

        // Update running totals
        setRunningTotals((prev) => {
          const next = { ...prev };
          players.forEach((_, pIdx) => {
            const vals = cardValues[pIdx];
            if (currentIdx < vals.length) {
              next[pIdx] = (next[pIdx] ?? 0) + vals[currentIdx];
            }
          });
          return next;
        });

        soundManager.play('card-count-tick');
      }, delay + cardIdx * cardDelay);
    }

    // After all cards revealed, move to comparison phase
    const totalDuration = delay + maxCards * cardDelay + (reduced ? 0 : 400);
    setTimeout(() => {
      setPhase('comparison');
    }, totalDuration);

    // After comparison, show closer result
    setTimeout(() => {
      setPhase('closer');
      if (wasDoubled) {
        soundManager.play('closer-lose');
      } else {
        soundManager.play('closer-win');
        setShowConfetti(true);
      }

      // Animate closer result
      setTimeout(() => {
        if (wasDoubled) {
          setShowDoubled(true);
        }
      }, reduced ? 0 : 300);
    }, totalDuration + (reduced ? 200 : 1200));
  }, [roundEndData, players, playerCards, wasDoubled]);

  useEffect(() => {
    if (!animationStarted.current && roundEndData) {
      animationStarted.current = true;
      runAnimation();
    }
  }, [roundEndData, runAnimation]);

  // Animate closer section entrance
  useEffect(() => {
    if (phase === 'closer' && closerRef.current) {
      gsap.fromTo(closerRef.current,
        { scale: 0.5, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.7)' }
      );
    }
  }, [phase]);

  const handleContinue = () => {
    if (roundEndData?.highlights && !showRecap) {
      setShowRecap(true);
      return;
    }
    setScoringDone(true);
  };

  if (!gameState || !roundEndData) return null;

  // Sort players by raw card total (ascending = best)
  const sortedPlayers = [...players].map((p, originalIdx) => ({
    player: p,
    originalIdx,
    rawTotal: (playerCards[p.id] ?? []).reduce((s, v) => s + v, 0),
    roundScore: roundEndData.roundScores[p.id] ?? 0,
  }));

  if (phase === 'comparison' || phase === 'closer') {
    // Order by final round score (includes doubling penalty). Lowest = best.
    sortedPlayers.sort((a, b) => a.roundScore - b.roundScore);
  }

  const closerPlayer = players.find((p) => p.id === closerPlayerId);
  const closerRawTotal = closerPlayer ? (playerCards[closerPlayer.id] ?? []).reduce((s, v) => s + v, 0) : 0;

  return (
    <div className="h-full flex flex-col items-center relative overflow-hidden">
      <Confetti active={showConfetti} />
      {showRecap && roundEndData.highlights && (
        <RoundRecap
          highlights={roundEndData.highlights}
          players={players}
          onDone={() => setScoringDone(true)}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1b0f0a] via-felt to-[#1b0f0a]" />
      <div className="absolute inset-0 felt-texture" />
      <div className="absolute inset-0 felt-noise" />

      <div ref={containerRef} className="relative z-10 w-full max-w-sm flex flex-col h-full px-4 pt-4 pb-2">
        {/* Title */}
        <div className="text-center mb-3">
          <h2 className="text-xl font-black text-gold">
            Runde {roundEndData.roundNumber} — Auswertung
          </h2>
        </div>

        {/* Player cards & counting */}
        <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
          {sortedPlayers.map(({ player, originalIdx, rawTotal, roundScore }) => {
            const cards = playerCards[player.id] ?? [];
            const numCols = Math.ceil(cards.length / ROWS);
            const revealed = revealedCards[originalIdx] ?? new Set<number>();
            const currentTotal = runningTotals[originalIdx] ?? 0;
            const isCloser = player.id === closerPlayerId;
            const isMe = player.id === playerId;
            const allRevealed = revealed.size >= cards.length;

            return (
              <div
                key={player.id}
                className={`rounded-xl border p-2.5 transition-all duration-500 ${
                  isCloser && phase === 'closer'
                    ? wasDoubled
                      ? 'bg-red-500/15 border-red-500/40 shadow-lg shadow-red-500/20'
                      : 'bg-gold/15 border-gold/40 shadow-lg shadow-gold/20'
                    : isMe
                    ? 'bg-white/8 border-white/15'
                    : 'bg-white/4 border-white/8'
                }`}
              >
                {/* Player header */}
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-lg">{player.avatar}</span>
                  <span className={`font-semibold text-sm ${isMe ? 'text-gold' : 'text-white/90'}`}>
                    {player.nickname}
                  </span>
                  {isCloser && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/50 ml-auto">
                      Schliesser
                    </span>
                  )}
                  {/* Running total */}
                  <span className={`ml-auto font-mono font-black text-lg transition-all duration-200 ${
                    allRevealed
                      ? rawTotal < 0 ? 'text-green-400' : rawTotal > 20 ? 'text-red-400' : 'text-white'
                      : 'text-white/60'
                  }`}>
                    {revealed.size > 0 ? currentTotal : '—'}
                  </span>
                </div>

                {/* Card grid */}
                <div className="flex gap-0.5 justify-center">
                  {Array.from({ length: numCols }, (_, col) => (
                    <div key={col} className="flex flex-col gap-0.5">
                      {Array.from({ length: ROWS }, (_, row) => {
                        const cardIdx = col * ROWS + row;
                        if (cardIdx >= cards.length) return null;
                        const cardValue = cards[cardIdx];
                        const isRevealed = revealed.has(cardIdx);

                        return (
                          <div
                            key={cardIdx}
                            className={`w-6 h-8 rounded-[3px] flex items-center justify-center text-[9px] font-bold transition-all duration-300 ${
                              isRevealed
                                ? `bg-gradient-to-br ${getCardBg(cardValue)} text-white shadow-sm`
                                : 'bg-gradient-to-br from-blue-600 to-indigo-800 text-transparent'
                            }`}
                            style={{
                              transform: isRevealed ? 'scale(1)' : 'scale(0.9)',
                              opacity: isRevealed ? 1 : 0.5,
                            }}
                          >
                            {isRevealed ? cardValue : ''}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* Doubled penalty display */}
                {isCloser && phase === 'closer' && wasDoubled && showDoubled && (
                  <div className="mt-2 text-center animate-pulse">
                    <span className="text-red-400 font-bold text-sm">
                      {closerRawTotal} × 2 = {closerRawTotal * 2}
                    </span>
                    <span className="ml-2 text-lg">😱</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Closer result banner */}
        {phase === 'closer' && closerPlayer && (
          <div ref={closerRef} className="mt-3 py-3 rounded-xl text-center">
            {wasDoubled ? (
              <div>
                <p className="text-2xl mb-1">💀</p>
                <p className="text-red-400 font-bold text-sm">
                  {closerPlayer.avatar} {closerPlayer.nickname} hat NICHT den niedrigsten Score!
                </p>
                <p className="text-red-300/60 text-xs mt-0.5">Punkte werden verdoppelt!</p>
              </div>
            ) : (
              <div>
                <p className="text-2xl mb-1">🎉</p>
                <p className="text-gold font-bold text-sm">
                  {closerPlayer.avatar} {closerPlayer.nickname} schliesst mit dem niedrigsten Score!
                </p>
              </div>
            )}
          </div>
        )}

        {/* Continue button */}
        {phase === 'closer' && (
          <div className="pt-2 pb-2">
            <button
              onClick={handleContinue}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-gold to-gold-dark text-felt-dark font-bold text-base shadow-lg shadow-gold/20 active:scale-[0.97] transition-all"
            >
              Weiter
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
