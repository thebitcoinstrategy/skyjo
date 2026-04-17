import { useRef, useState, useCallback, useEffect, forwardRef } from 'react';
import { gsap } from 'gsap';
import { useGameStore } from '../stores/gameStore';
import { useConnectionStore } from '../stores/connectionStore';
import { useAnimationQueue } from '../hooks/useAnimationQueue';
import { socket } from '../socket/client';
import PlayerHand from '../components/PlayerHand/PlayerHand';
import DrawPile from '../components/DrawPile';
import DiscardPile from '../components/DiscardPile';
import DrawnCard from '../components/DrawnCard';
import TurnIndicator from '../components/TurnIndicator';
import type { AnimationEventPayload, CardValue } from '@skyjo/shared';
import BackgroundArt from '../components/BackgroundArt';
import { soundManager } from '../audio/SoundManager';

/* ── Drag ghost ── */
function DragGhost({ value, x, y }: { value: CardValue | null; x: number; y: number }) {
  function getStyle(v: number): string {
    if (v <= -2) return 'from-blue-500 to-blue-700';
    if (v === -1) return 'from-sky-400 to-sky-600';
    if (v === 0) return 'from-yellow-400 to-amber-500';
    if (v <= 4) return 'from-emerald-400 to-emerald-600';
    if (v <= 8) return 'from-orange-400 to-orange-600';
    return 'from-red-500 to-red-700';
  }

  // Card back (value unknown yet — drawing from pile)
  if (value === null) {
    return (
      <div
        className="fixed w-[3.2rem] h-[4.2rem] rounded-md overflow-hidden shadow-2xl ring-2 ring-gold/80 pointer-events-none z-50 opacity-90"
        style={{ left: x - 26, top: y - 34 }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[6px] font-black text-blue-200/80 tracking-wider">SKYJO</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed w-[3.2rem] h-[4.2rem] rounded-md overflow-hidden shadow-2xl ring-2 ring-gold/80 pointer-events-none z-50 opacity-90"
      style={{ left: x - 26, top: y - 34 }}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${getStyle(value)}`} />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-black text-white drop-shadow-md">{value}</span>
      </div>
    </div>
  );
}

/* ── Flying card (animates from source to destination) ── */
const FlyingCard = forwardRef<HTMLDivElement, {
  value: CardValue;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  endScale?: number;
  onDone?: () => void;
}>(({ value, startX, startY, endX, endY, endScale = 0.45, onDone }, ref) => {
  const innerRef = useRef<HTMLDivElement>(null);

  function getStyle(v: number): string {
    if (v <= -2) return 'from-blue-500 to-blue-700';
    if (v === -1) return 'from-sky-400 to-sky-600';
    if (v === 0) return 'from-yellow-400 to-amber-500';
    if (v <= 4) return 'from-emerald-400 to-emerald-600';
    if (v <= 8) return 'from-orange-400 to-orange-600';
    return 'from-red-500 to-red-700';
  }

  // Offset for end position depends on scale — center the card at destination
  const endOffsetX = 26 * endScale;
  const endOffsetY = 34 * endScale;

  useEffect(() => {
    if (!innerRef.current) return;
    const tl = gsap.timeline({ onComplete: onDone });
    tl.fromTo(
      innerRef.current,
      {
        left: startX - 26,
        top: startY - 34,
        scale: 1,
        opacity: 1,
      },
      {
        left: endX - endOffsetX,
        top: endY - endOffsetY,
        scale: endScale,
        duration: 0.35,
        ease: 'power2.inOut',
      }
    );
    // Fade overlaps with the end of the movement (starts at 75% through)
    tl.to(innerRef.current, {
      opacity: 0,
      duration: 0.12,
      ease: 'power2.in',
    }, '-=0.12');
  }, [startX, startY, endX, endY, endScale, endOffsetX, endOffsetY, onDone]);

  return (
    <div ref={ref}>
      <div
        ref={innerRef}
        className="fixed w-[3.2rem] h-[4.2rem] rounded-md overflow-hidden shadow-2xl ring-2 ring-gold/80 pointer-events-none z-50"
        style={{ left: startX - 26, top: startY - 34, willChange: 'transform, opacity' }}
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${getStyle(value)}`} />
        <div className="absolute inset-[1px] rounded-sm border border-white/25" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-lg font-black text-white drop-shadow-md">{value}</span>
          </div>
        </div>
      </div>
    </div>
  );
});
FlyingCard.displayName = 'FlyingCard';

/* ── Displaced card: slide to center → flip → fly to discard ── */
const DisplacedCard = forwardRef<HTMLDivElement, {
  value: CardValue;
  wasFaceDown: boolean;
  startX: number;
  startY: number;
  startScale?: number;
  midX: number;
  midY: number;
  endX: number;
  endY: number;
  onDone: () => void;
}>(({ value, wasFaceDown, startX, startY, startScale = 1, midX, midY, endX, endY, onDone }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const flipInnerRef = useRef<HTMLDivElement>(null);

  function getStyle(v: number): string {
    if (v <= -2) return 'from-blue-500 to-blue-700';
    if (v === -1) return 'from-sky-400 to-sky-600';
    if (v === 0) return 'from-yellow-400 to-amber-500';
    if (v <= 4) return 'from-emerald-400 to-emerald-600';
    if (v <= 8) return 'from-orange-400 to-orange-600';
    return 'from-red-500 to-red-700';
  }

  useEffect(() => {
    if (!containerRef.current || !flipInnerRef.current) return;
    const tl = gsap.timeline({ onComplete: onDone });

    if (wasFaceDown) {
      // Step 1: Slide to center area to flip
      tl.to(containerRef.current, {
        left: midX - 26,
        top: midY - 34,
        scale: 1,
        duration: 0.35,
        ease: 'power2.inOut',
      });

      // Step 2: Flip face-up
      tl.to(containerRef.current, {
        scale: 1.1,
        duration: 0.1,
        ease: 'power2.out',
      });
      tl.to(flipInnerRef.current, {
        rotateY: 180,
        duration: 0.35,
        ease: 'power2.inOut',
      }, '-=0.05');
      tl.to(containerRef.current, {
        scale: 1,
        duration: 0.15,
        ease: 'power2.out',
      });
      // Brief pause to show the value
      tl.to({}, { duration: 0.15 });

      // Step 3: Fly to discard pile
      tl.to(containerRef.current, {
        left: endX - 26,
        top: endY - 34,
        duration: 0.35,
        ease: 'power2.inOut',
      });
    } else {
      // Already face-up — fly directly to discard pile
      tl.to(containerRef.current, {
        left: endX - 26,
        top: endY - 34,
        scale: 1,
        duration: 0.4,
        ease: 'power3.out',
      });
    }

    // Fade out
    tl.to(containerRef.current, {
      opacity: 0,
      duration: 0.12,
      ease: 'power2.in',
    });
  }, [wasFaceDown, midX, midY, endX, endY, onDone]);

  return (
    <div ref={ref}>
      <div
        ref={containerRef}
        className="fixed w-[3.2rem] h-[4.2rem] pointer-events-none z-50"
        style={{ left: startX - 26, top: startY - 34, scale: startScale, perspective: '600px', willChange: 'transform, opacity' }}
      >
        <div
          ref={flipInnerRef}
          className="w-full h-full relative"
          style={{
            transformStyle: 'preserve-3d',
            transform: wasFaceDown ? 'rotateY(0deg)' : 'rotateY(180deg)',
          }}
        >
          {/* Back face */}
          <div
            className="absolute inset-0 rounded-md overflow-hidden shadow-2xl ring-2 ring-gold/80"
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800" />
            <div className="absolute inset-[2px] rounded-sm border border-blue-400/30" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-7 h-9 rounded-md bg-gradient-to-b from-blue-500/60 to-indigo-700/60 border border-blue-400/40 flex items-center justify-center">
                <span className="text-[6px] font-black text-blue-200/80 tracking-wider">SKYJO</span>
              </div>
            </div>
          </div>
          {/* Front face */}
          <div
            className="absolute inset-0 rounded-md overflow-hidden shadow-2xl ring-2 ring-gold/80"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${getStyle(value)}`} />
            <div className="absolute inset-[1px] rounded-sm border border-white/25" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-lg font-black text-white drop-shadow-md">{value}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
DisplacedCard.displayName = 'DisplacedCard';

/* ── Celebration overlay for column eliminate ── */
const CelebrationOverlay = forwardRef<HTMLDivElement, { text: string }>(({ text }, ref) => {
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!innerRef.current) return;
    const tl = gsap.timeline();
    tl.fromTo(innerRef.current,
      { scale: 0, opacity: 0, rotateZ: -10, y: 30 },
      { scale: 1.2, opacity: 1, rotateZ: 0, y: 0, duration: 0.4, ease: 'back.out(2)' }
    );
    tl.to(innerRef.current,
      { scale: 1, duration: 0.2, ease: 'power2.out' }
    );
    // Pulse
    tl.to(innerRef.current,
      { scale: 1.08, duration: 0.3, ease: 'sine.inOut', yoyo: true, repeat: 3 }
    );
    // Fade out
    tl.to(innerRef.current,
      { opacity: 0, y: -20, scale: 0.8, duration: 0.4, ease: 'power2.in' },
      '+=0.2'
    );
  }, []);

  return (
    <div ref={ref} className="fixed inset-0 z-[70] pointer-events-none flex items-center justify-center">
      <div
        ref={innerRef}
        className="text-center"
        style={{ textShadow: '0 0 30px rgba(255,215,0,0.8), 0 0 60px rgba(255,215,0,0.4), 0 4px 8px rgba(0,0,0,0.5)' }}
      >
        <div className="text-4xl font-black text-gold tracking-wider">
          {text}
        </div>
        <div className="text-lg text-white/80 font-bold mt-1">
          Spalte eliminiert!
        </div>
      </div>
    </div>
  );
});
CelebrationOverlay.displayName = 'CelebrationOverlay';

export default function GameScreen() {
  const gameState = useGameStore((s) => s.gameState);
  const playerId = useConnectionStore((s) => s.playerId);
  const connected = useConnectionStore((s) => s.connected);
  const [isDealing] = useState(true);
  const myHandRef = useRef<HTMLDivElement>(null);
  const drawPileRef = useRef<HTMLDivElement>(null);
  const discardPileRef = useRef<HTMLDivElement>(null);
  const drawnCardAreaRef = useRef<HTMLDivElement>(null);

  // Drag state — use ref for immediate reads (avoids stale closures in pointer handlers)
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  const dropTargetRef = useRef<number | null>(null);
  const [overDiscard, setOverDiscard] = useState(false);
  const overDiscardRef = useRef(false);
  // Preview value for drag ghost before server confirms the drawn card
  const [dragPreviewValue, setDragPreviewValue] = useState<CardValue | null>(null);
  // Pending drop: if user drops before server confirms drawn card, queue the action
  const pendingDropRef = useRef<{ cardIndex: number } | 'discard' | null>(null);

  // Track placed card indices to skip flip animation (opponent and own cards)
  const [oppPlacedCards, setOppPlacedCards] = useState<Record<string, number>>({});

  // Track the card index we just placed (to skip flip animation on our own cards)
  const [justPlacedIndex, setJustPlacedIndex] = useState<number | null>(null);

  // Sparkle particles for eye candy
  const [sparkles, setSparkles] = useState<{ id: string; x: number; y: number; color: string }[]>([]);

  // Column eliminate celebration
  const [screenFlash, setScreenFlash] = useState(false);
  const [celebrationText, setCelebrationText] = useState<string | null>(null);
  const celebrationRef = useRef<HTMLDivElement>(null);

  // Revealed card shown on top of draw pile when opponent/bot draws
  const [revealedCard, setRevealedCard] = useState<{
    value: CardValue;
    nickname: string;
    avatar: string;
  } | null>(null);

  // Keep a ref in sync with revealedCard so animation callback can read it
  const revealedCardRef = useRef(revealedCard);
  revealedCardRef.current = revealedCard;

  // Track the last opponent draw (value + source) for flying card animations
  const lastOpponentDrawRef = useRef<{ value: CardValue; source: 'pile' | 'discard' } | null>(null);

  // Displaced card animation (old card slides to center → flips → flies to discard)
  const [displacedCard, setDisplacedCard] = useState<{
    value: CardValue;
    wasFaceDown: boolean;
    startX: number;
    startY: number;
    startScale?: number;
    midX: number;
    midY: number;
    endX: number;
    endY: number;
  } | null>(null);
  const displacedCardRef = useRef<HTMLDivElement>(null);
  const displacedCardResolveRef = useRef<(() => void) | null>(null);

  // Flying card animation (card moves from draw pile to opponent's deck or discard)
  const [flyingCard, setFlyingCard] = useState<{
    value: CardValue;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    endScale?: number;
  } | null>(null);
  const flyingCardRef = useRef<HTMLDivElement>(null);
  const flyingCardResolveRef = useRef<(() => void) | null>(null);

  // ── Round-end card reveal: stagger-flip face-down cards one by one ──
  const revealingCards = useGameStore((s) => s.revealingCards);
  const preRevealSnapshot = useGameStore((s) => s.preRevealSnapshot);
  const setRevealingCards = useGameStore((s) => s.setRevealingCards);
  const [revealedSet, setRevealedSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!revealingCards || !preRevealSnapshot || !gameState) return;

    // Build list of all face-down cards: { playerId, cardIndex }
    const toReveal: { pid: string; idx: number }[] = [];
    for (const player of gameState.players) {
      const snapshot = preRevealSnapshot[player.id];
      if (!snapshot) continue;
      for (let i = 0; i < snapshot.length; i++) {
        if (snapshot[i]) toReveal.push({ pid: player.id, idx: i });
      }
    }

    if (toReveal.length === 0) {
      setRevealingCards(false);
      return;
    }

    // Stagger reveal with 150ms between each card
    const delay = 200; // initial pause
    const interval = 150;
    const timers: ReturnType<typeof setTimeout>[] = [];

    toReveal.forEach((item, i) => {
      timers.push(setTimeout(() => {
        setRevealedSet((prev) => {
          const next = new Set(prev);
          next.add(`${item.pid}:${item.idx}`);
          return next;
        });
        soundManager.play('card-flip');
      }, delay + i * interval));
    });

    // After all revealed, transition to scoring screen
    timers.push(setTimeout(() => {
      setRevealingCards(false);
      setRevealedSet(new Set());
    }, delay + toReveal.length * interval + 600));

    return () => timers.forEach(clearTimeout);
  }, [revealingCards, preRevealSnapshot, gameState, setRevealingCards]);

  // Override cards during round-end reveal: keep face-down cards hidden until stagger timer reveals them
  const getRevealCards = useCallback((playerId: string, cards: import('@skyjo/shared').VisibleCardSlot[]) => {
    if (!revealingCards || !preRevealSnapshot) return cards;
    const snapshot = preRevealSnapshot[playerId];
    if (!snapshot) return cards;
    return cards.map((card, i) => {
      if (snapshot[i] && !revealedSet.has(`${playerId}:${i}`)) {
        // This card was face-down and hasn't been revealed yet — keep it face-down
        return { ...card, faceUp: false };
      }
      return card;
    });
  }, [revealingCards, preRevealSnapshot, revealedSet]);

  // Ref for canPlaceCard — must be declared here (before early return) to satisfy hooks rules
  const canPlaceRef = useRef(false);

  // Animation queue handler — own-player effects only, opponents just get timing delays
  const handleAnimation = useCallback(async (event: AnimationEventPayload) => {
    const isMe = event.playerId === playerId;

    switch (event.type) {
      case 'flip-card': {
        // Card component handles the flip animation itself via faceUp prop change
        soundManager.play('card-flip');
        await new Promise((r) => setTimeout(r, isMe ? 600 : 700));
        break;
      }
      case 'column-eliminate': {
        soundManager.play('column-eliminate');
        if (isMe) {
          // === MEGA CELEBRATION ===

          // 1. Screen flash
          setScreenFlash(true);
          setTimeout(() => setScreenFlash(false), 400);

          // 2. Celebration text
          setCelebrationText('SPALTE WEG! 🎉');
          setTimeout(() => setCelebrationText(null), 2500);

          // 3. TTS celebration
          try {
            const phrases = ['Spalte weg!', 'Fantastisch!', 'Super gemacht!', 'Unglaublich!', 'Perfekt!'];
            const phrase = phrases[Math.floor(Math.random() * phrases.length)];
            const utterance = new SpeechSynthesisUtterance(phrase);
            utterance.lang = 'de-DE';
            utterance.rate = 1.0;
            utterance.volume = 0.9;
            utterance.pitch = 1.3;
            const voices = speechSynthesis.getVoices();
            const germanVoice = voices.find((v) => v.lang.startsWith('de'));
            if (germanVoice) utterance.voice = germanVoice;
            speechSynthesis.cancel();
            speechSynthesis.speak(utterance);
          } catch { /* TTS not available */ }

          // 4. Hand glow burst (multiple pulses)
          if (myHandRef.current) {
            const tl = gsap.timeline();
            tl.fromTo(myHandRef.current,
              { boxShadow: '0 0 60px 20px rgba(255, 215, 0, 0.8)' },
              { boxShadow: '0 0 20px 5px rgba(255, 215, 0, 0.3)', duration: 0.3, ease: 'power2.out' }
            );
            tl.to(myHandRef.current,
              { boxShadow: '0 0 50px 15px rgba(255, 215, 0, 0.7)', duration: 0.2, ease: 'power2.in' }
            );
            tl.to(myHandRef.current,
              { boxShadow: '0 0 0px 0px rgba(255, 215, 0, 0)', duration: 0.8, ease: 'power2.out' }
            );

            // 5. Massive confetti explosion — 60 particles in multiple waves
            const rect = myHandRef.current.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top;
            const colors = ['#ffd700', '#ff6b6b', '#48dbfb', '#ff9ff3', '#54a0ff', '#ff4757', '#2ed573', '#ffa502', '#ffffff', '#e056fd'];

            // Wave 1 — big burst
            const wave1 = Array.from({ length: 30 }, (_, i) => ({
              id: `cel-${Date.now()}-w1-${i}`,
              x: cx + (Math.random() - 0.5) * window.innerWidth * 0.8,
              y: cy + (Math.random() - 0.5) * rect.height - Math.random() * 100,
              color: colors[i % colors.length],
            }));
            setSparkles(prev => [...prev, ...wave1]);

            // Wave 2 — delayed scatter
            setTimeout(() => {
              const wave2 = Array.from({ length: 20 }, (_, i) => ({
                id: `cel-${Date.now()}-w2-${i}`,
                x: cx + (Math.random() - 0.5) * window.innerWidth,
                y: cy + (Math.random() - 0.5) * 200 - Math.random() * 50,
                color: colors[(i + 3) % colors.length],
              }));
              setSparkles(prev => [...prev, ...wave2]);
              setTimeout(() => {
                setSparkles(prev => prev.filter(s => !wave2.some(w => w.id === s.id)));
              }, 1200);
            }, 300);

            // Wave 3 — final sparkles
            setTimeout(() => {
              const wave3 = Array.from({ length: 15 }, (_, i) => ({
                id: `cel-${Date.now()}-w3-${i}`,
                x: cx + (Math.random() - 0.5) * window.innerWidth * 0.6,
                y: cy - Math.random() * 150,
                color: colors[(i + 5) % colors.length],
              }));
              setSparkles(prev => [...prev, ...wave3]);
              setTimeout(() => {
                setSparkles(prev => prev.filter(s => !wave3.some(w => w.id === s.id)));
              }, 1200);
            }, 600);

            // Clean up wave 1
            setTimeout(() => {
              setSparkles(prev => prev.filter(s => !wave1.some(w => w.id === s.id)));
            }, 1500);
          }
        }
        await new Promise((r) => setTimeout(r, 2200));
        break;
      }
      case 'draw-from-pile': {
        soundManager.play('draw');
        if (!isMe) {
          const gs = useGameStore.getState().gameState;
          const drawer = gs?.players.find((p) => p.id === event.playerId);
          const drawnValue = event.data.value as CardValue | undefined;
          if (drawer && drawnValue !== undefined) {
            lastOpponentDrawRef.current = { value: drawnValue, source: 'pile' };
            setRevealedCard({
              value: drawnValue,
              nickname: drawer.nickname,
              avatar: drawer.avatar,
            });
            // Wait for flip animation, then keep showing until next event clears it
            await new Promise((r) => setTimeout(r, 800));
          } else {
            await new Promise((r) => setTimeout(r, 200));
          }
        } else {
          await new Promise((r) => setTimeout(r, 200));
        }
        break;
      }
      case 'draw-from-discard': {
        soundManager.play('draw');
        if (!isMe) {
          const drawnValue = event.data.value as CardValue | undefined;
          if (drawnValue !== undefined) {
            lastOpponentDrawRef.current = { value: drawnValue, source: 'discard' };
          }
        }
        // Card was already visible on discard pile — no revealed card overlay needed
        await new Promise((r) => setTimeout(r, isMe ? 200 : 400));
        break;
      }
      case 'place-card': {
        soundManager.play('card-drag');
        // Mark this card index to skip flip animation (card is being placed, not flipped)
        if (!isMe) {
          setOppPlacedCards((prev) => ({ ...prev, [event.playerId]: event.data.cardIndex as number }));
        }
        const replaced = event.data.replacedCard as { value: number; faceUp: boolean } | undefined;
        const oppDraw = lastOpponentDrawRef.current;
        if (!isMe && oppDraw) {
          // Source: draw pile or discard pile, depending on where opponent drew from
          const sourceEl = oppDraw.source === 'pile' ? drawPileRef.current : discardPileRef.current;
          const playerContainer = document.querySelector(`[data-player-id="${event.playerId}"]`);
          const targetCard = playerContainer?.querySelector(`[data-card-index="${event.data.cardIndex}"]`);

          if (sourceEl && targetCard) {
            const sourceRect = sourceEl.getBoundingClientRect();
            const targetRect = targetCard.getBoundingClientRect();

            // Step 1: Fly drawn card from source pile to opponent's deck
            setRevealedCard(null);
            await new Promise<void>((resolve) => {
              flyingCardResolveRef.current = () => {
                setFlyingCard(null);
                resolve();
              };
              setFlyingCard({
                value: oppDraw.value,
                startX: sourceRect.left + sourceRect.width / 2,
                startY: sourceRect.top + sourceRect.height / 2,
                endX: targetRect.left + targetRect.width / 2,
                endY: targetRect.top + targetRect.height / 2,
              });
            });

            // Step 2: Animate displaced card out of opponent's deck → center → flip → discard
            const discardEl = discardPileRef.current;
            const midEl = drawnCardAreaRef.current;
            const updatedCard = playerContainer?.querySelector(`[data-card-index="${event.data.cardIndex}"]`);
            const cardEl2 = updatedCard || targetCard;

            if (replaced && discardEl && midEl) {
              const cardRect2 = cardEl2.getBoundingClientRect();
              const discardRect = discardEl.getBoundingClientRect();
              const midRect = midEl.getBoundingClientRect();

              // Partially apply state: update deck but keep old discard top
              for (let i = 0; i < 30; i++) {
                if (useGameStore.getState().pendingGameState) break;
                await new Promise((r) => setTimeout(r, 15));
              }
              const store = useGameStore.getState();
              const pending = store.pendingGameState;
              if (pending && store.gameState) {
                const oldDiscardTop = store.gameState.discardTop;
                useGameStore.setState({
                  gameState: { ...pending, discardTop: oldDiscardTop },
                  pendingGameState: null,
                });
              }

              await new Promise<void>((resolve) => {
                displacedCardResolveRef.current = () => {
                  setDisplacedCard(null);
                  if (pending) {
                    useGameStore.setState((s) => ({
                      gameState: s.gameState ? { ...s.gameState, discardTop: pending.discardTop } : s.gameState,
                    }));
                  }
                  resolve();
                };
                setDisplacedCard({
                  value: replaced.value as CardValue,
                  wasFaceDown: !replaced.faceUp,
                  startX: cardRect2.left + cardRect2.width / 2,
                  startY: cardRect2.top + cardRect2.height / 2,
                  startScale: 0.4,
                  midX: midRect.left + midRect.width / 2,
                  midY: midRect.top + midRect.height / 2,
                  endX: discardRect.left + discardRect.width / 2,
                  endY: discardRect.top + discardRect.height / 2,
                });
              });
            }

            lastOpponentDrawRef.current = null;
          } else {
            setRevealedCard(null);
            lastOpponentDrawRef.current = null;
            await new Promise((r) => setTimeout(r, 300));
          }
        } else if (isMe) {
          // Animate displaced card: slide to center → flip → fly to discard
          const replaced = event.data.replacedCard as { value: number; faceUp: boolean } | undefined;
          const cardIndex = event.data.cardIndex as number;
          const cardEl = myHandRef.current?.querySelector(`[data-card-index="${cardIndex}"]`);
          const discardEl = discardPileRef.current;
          const midEl = drawnCardAreaRef.current;

          if (replaced && cardEl && discardEl && midEl) {
            const cardRect = cardEl.getBoundingClientRect();
            const discardRect = discardEl.getBoundingClientRect();
            const midRect = midEl.getBoundingClientRect();

            // Wait for game-state-update to arrive, then partially apply it:
            // show the new card in the deck immediately, but keep the old discard pile
            // so it only updates when the displaced card animation lands on it.
            for (let i = 0; i < 30; i++) {
              if (useGameStore.getState().pendingGameState) break;
              await new Promise((r) => setTimeout(r, 15));
            }
            const store = useGameStore.getState();
            const pending = store.pendingGameState;
            if (pending && store.gameState) {
              // Apply new state but preserve current discardTop
              const oldDiscardTop = store.gameState.discardTop;
              useGameStore.setState({
                gameState: { ...pending, discardTop: oldDiscardTop },
                pendingGameState: null,
              });
            }

            await new Promise<void>((resolve) => {
              displacedCardResolveRef.current = () => {
                setDisplacedCard(null);
                // Now apply the real discard top
                if (pending) {
                  useGameStore.setState((s) => ({
                    gameState: s.gameState ? { ...s.gameState, discardTop: pending.discardTop } : s.gameState,
                  }));
                }
                resolve();
              };
              setDisplacedCard({
                value: replaced.value as CardValue,
                wasFaceDown: !replaced.faceUp,
                startX: cardRect.left + cardRect.width / 2,
                startY: cardRect.top + cardRect.height / 2,
                midX: midRect.left + midRect.width / 2,
                midY: midRect.top + midRect.height / 2,
                endX: discardRect.left + discardRect.width / 2,
                endY: discardRect.top + discardRect.height / 2,
              });
            });
          } else {
            await new Promise((r) => setTimeout(r, 200));
          }
        } else {
          setRevealedCard(null);
          await new Promise((r) => setTimeout(r, 200));
        }
        break;
      }
      case 'discard-card': {
        soundManager.play('card-place');
        const oppDraw2 = lastOpponentDrawRef.current;
        if (!isMe && oppDraw2) {
          const sourceEl = oppDraw2.source === 'discard' ? discardPileRef.current : drawPileRef.current;
          const targetEl = discardPileRef.current;

          if (sourceEl && targetEl) {
            const sourceRect = sourceEl.getBoundingClientRect();
            const targetRect = targetEl.getBoundingClientRect();

            setRevealedCard(null);
            lastOpponentDrawRef.current = null;
            await new Promise<void>((resolve) => {
              flyingCardResolveRef.current = () => {
                setFlyingCard(null);
                resolve();
              };
              setFlyingCard({
                value: oppDraw2.value,
                startX: sourceRect.left + sourceRect.width / 2,
                startY: sourceRect.top + sourceRect.height / 2,
                endX: targetRect.left + targetRect.width / 2,
                endY: targetRect.top + targetRect.height / 2,
                endScale: 1,
              });
            });
          } else {
            setRevealedCard(null);
            lastOpponentDrawRef.current = null;
            await new Promise((r) => setTimeout(r, 300));
          }
        } else {
          if (!isMe) setRevealedCard(null);
          lastOpponentDrawRef.current = null;
          await new Promise((r) => setTimeout(r, 200));
        }
        break;
      }
      default: {
        // All other events — just a small delay for sequencing
        await new Promise((r) => setTimeout(r, 200));
      }
    }
  }, [playerId]);

  useAnimationQueue(handleAnimation);

  // Process pending drop when drawn card arrives from server
  useEffect(() => {
    if (!gameState?.drawnCard || !pendingDropRef.current) return;
    const pending = pendingDropRef.current;
    pendingDropRef.current = null;

    if (pending === 'discard') {
      socket.emit('discard-drawn-card');
    } else {
      setJustPlacedIndex(pending.cardIndex);
      socket.emit('place-drawn-card', { cardIndex: pending.cardIndex });
    }
  }, [gameState?.drawnCard]);

  // Clear justPlacedIndex after the game state has been applied
  // (the Card component reads skipFlipAnimation during the render where faceUp changes,
  // so we clear it on the next game state update after it was set)
  useEffect(() => {
    if (justPlacedIndex !== null) {
      setJustPlacedIndex(null);
    }
    if (Object.keys(oppPlacedCards).length > 0) {
      setOppPlacedCards({});
    }
  }, [gameState]);

  if (!gameState || !playerId) {
    return (
      <div className="h-full flex items-center justify-center bg-felt-dark">
        <div className="text-gold text-lg font-bold animate-pulse">Laden...</div>
      </div>
    );
  }

  const myIndex = gameState.players.findIndex((p) => p.id === playerId);
  const me = gameState.players[myIndex];
  const opponents = gameState.players.filter((p) => p.id !== playerId);
  const isMyTurn = gameState.currentPlayerIndex === myIndex;
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const canInteract = isMyTurn || (gameState.phase === 'flipping_initial' && me.initialFlipsRemaining > 0);
  const hasDrawnCard = gameState.drawnCard !== null;
  const canPlaceCard = isMyTurn && (gameState.turnPhase === 'place_or_discard' || gameState.turnPhase === 'place_discard');
  canPlaceRef.current = canPlaceCard;
  const canDiscard = isMyTurn && gameState.turnPhase === 'place_or_discard';

  const handleDrawFromPile = () => {
    if (isDraggingRef.current) return; // Already handled by drag
    if (!isMyTurn || gameState.turnPhase !== 'draw') return;
    socket.emit('draw-from-pile');
  };

  const handleDrawFromDiscard = () => {
    if (isDraggingRef.current) return; // Already handled by drag
    if (!isMyTurn || gameState.turnPhase !== 'draw') return;
    socket.emit('draw-from-discard');
  };

  // Drag directly from a pile — draw + start dragging in one gesture
  const handlePileDragStart = useCallback((e: React.PointerEvent, source: 'pile' | 'discard') => {
    e.preventDefault();
    e.stopPropagation();
    const gs = useGameStore.getState().gameState;
    if (!gs) return;
    const myIdx = gs.players.findIndex((p) => p.id === playerId);
    if (gs.currentPlayerIndex !== myIdx || gs.turnPhase !== 'draw') return;

    // Emit draw action
    if (source === 'pile') {
      socket.emit('draw-from-pile');
      setDragPreviewValue(null); // unknown card — show card back
    } else {
      socket.emit('draw-from-discard');
      setDragPreviewValue(gs.discardTop); // we know the value
    }

    // Start dragging immediately
    isDraggingRef.current = true;
    setIsDragging(true);
    setDragPos({ x: e.clientX, y: e.clientY });
  }, [playerId]);

  const handleCardClick = (cardIndex: number) => {
    if (gameState.phase === 'flipping_initial' && me.initialFlipsRemaining > 0) {
      if (!me.cards[cardIndex].faceUp) {
        socket.emit('flip-initial-card', { cardIndex });
      }
      return;
    }

    if (!isMyTurn) return;

    if (canPlaceCard && !isDragging) {
      setJustPlacedIndex(cardIndex);
      socket.emit('place-drawn-card', { cardIndex });
      return;
    }

    if (gameState.turnPhase === 'must_flip') {
      if (!me.cards[cardIndex].faceUp) {
        socket.emit('flip-card', { cardIndex });
      }
      return;
    }
  };

  // ── Drag & Drop (uses refs for immediate state in pointer handlers) ──
  // Drag from the already-visible drawn card
  const handleDragStart = useCallback((e: React.PointerEvent) => {
    if (!canPlaceRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const gs = useGameStore.getState().gameState;
    setDragPreviewValue(gs?.drawnCard ?? null);
    isDraggingRef.current = true;
    setIsDragging(true);
    setDragPos({ x: e.clientX, y: e.clientY });
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    setDragPos({ x: e.clientX, y: e.clientY });

    // Check if over a card slot or discard pile
    const elements = document.elementsFromPoint(e.clientX, e.clientY);
    const cardEl = elements.find((el) => el.getAttribute('data-card-index') !== null);
    if (cardEl) {
      const idx = Number(cardEl.getAttribute('data-card-index'));
      dropTargetRef.current = idx;
      overDiscardRef.current = false;
      setDropTarget(idx);
      setOverDiscard(false);
    } else {
      dropTargetRef.current = null;
      setDropTarget(null);
      // Check if over discard pile (walk up parents too)
      const isOver = elements.some((el) => {
        let node: Element | null = el;
        while (node) {
          if (node.getAttribute('data-discard-pile') !== null) return true;
          node = node.parentElement;
        }
        return false;
      });
      overDiscardRef.current = isOver;
      setOverDiscard(isOver);
    }
  }, []);

  const handlePointerUp = useCallback(() => {
    if (!isDraggingRef.current) return;
    const dt = dropTargetRef.current;
    const od = overDiscardRef.current;
    const gs = useGameStore.getState().gameState;
    const cardReady = gs?.drawnCard !== null && gs?.drawnCard !== undefined;

    if (dt !== null) {
      if (cardReady) {
        setJustPlacedIndex(dt);
        socket.emit('place-drawn-card', { cardIndex: dt });
      } else {
        // Server hasn't confirmed drawn card yet — queue the drop
        pendingDropRef.current = { cardIndex: dt };
      }
    } else if (od) {
      if (cardReady) {
        socket.emit('discard-drawn-card');
      } else {
        pendingDropRef.current = 'discard';
      }
    }

    isDraggingRef.current = false;
    dropTargetRef.current = null;
    overDiscardRef.current = false;
    setIsDragging(false);
    setDropTarget(null);
    setOverDiscard(false);
  }, []);

  const getInstruction = (): string => {
    if (gameState.phase === 'flipping_initial') {
      if (me.initialFlipsRemaining > 0) {
        return `Tippe ${me.initialFlipsRemaining} Karte${me.initialFlipsRemaining > 1 ? 'n' : ''} zum Aufdecken`;
      }
      return 'Warte auf andere...';
    }
    if (!isMyTurn) return `${currentPlayer.nickname} ist dran`;
    switch (gameState.turnPhase) {
      case 'draw': return 'Ziehe eine Karte in dein Deck';
      case 'place_or_discard': return 'Ziehe zum Ablegen oder Tauschen';
      case 'place_discard': return 'Ziehe zum Tauschen';
      case 'must_flip': return 'Tippe eine verdeckte Karte zum Aufdecken';
      default: return '';
    }
  };

  return (
    <div
      className="h-full flex flex-col overflow-hidden relative"
      style={{ touchAction: isDragging ? 'none' : 'auto' }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* ═══ BACKGROUND ═══ */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1b0f0a] via-felt to-[#1b0f0a]" />
      <div className="absolute inset-0 felt-texture" />
      <div className="absolute inset-0 felt-noise" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.4) 100%)' }}
      />
      <BackgroundArt variant="game" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />

      {/* ═══ CONNECTION STATUS ═══ */}
      <div className="absolute top-1.5 left-2 z-30 flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
        {!connected && (
          <span className="text-red-400 text-[10px] font-medium">Verbindung unterbrochen...</span>
        )}
      </div>

      {/* ═══ SCREEN FLASH (column eliminate) ═══ */}
      {screenFlash && (
        <div className="fixed inset-0 z-[60] pointer-events-none bg-gold/30 animate-flash" />
      )}

      {/* ═══ CELEBRATION TEXT (column eliminate) ═══ */}
      {celebrationText && (
        <CelebrationOverlay ref={celebrationRef} text={celebrationText} />
      )}

      {/* ═══ SPARKLE / CONFETTI PARTICLES ═══ */}
      {sparkles.map((s, i) => {
        const size = 8 + (i % 5) * 4;
        const isConfetti = i % 3 !== 0;
        return (
          <div
            key={s.id}
            className="sparkle-particle fixed pointer-events-none z-50"
            style={{ left: s.x, top: s.y }}
          >
            {isConfetti ? (
              <div
                className="rounded-sm"
                style={{
                  width: size,
                  height: size * 0.6,
                  backgroundColor: s.color,
                  transform: `rotate(${(i * 37) % 360}deg)`,
                }}
              />
            ) : (
              <svg width={size} height={size} viewBox="0 0 10 10">
                <path d="M5 0L5.8 3.5L10 5L5.8 5.8L5 10L4.2 5.8L0 5L4.2 3.5Z" fill={s.color} />
              </svg>
            )}
          </div>
        );
      })}

      {/* ═══ DRAG GHOST ═══ */}
      {isDragging && (
        <DragGhost value={gameState.drawnCard ?? dragPreviewValue} x={dragPos.x} y={dragPos.y} />
      )}

      {/* ═══ FLYING CARD (opponent place/discard animation) ═══ */}
      {flyingCard && (
        <FlyingCard
          ref={flyingCardRef}
          value={flyingCard.value}
          startX={flyingCard.startX}
          startY={flyingCard.startY}
          endX={flyingCard.endX}
          endY={flyingCard.endY}
          endScale={flyingCard.endScale}
          onDone={() => { flyingCardResolveRef.current?.(); flyingCardResolveRef.current = null; }}
        />
      )}

      {/* ═══ DISPLACED CARD (my card → center → flip → discard) ═══ */}
      {displacedCard && (
        <DisplacedCard
          ref={displacedCardRef}
          value={displacedCard.value}
          wasFaceDown={displacedCard.wasFaceDown}
          startX={displacedCard.startX}
          startY={displacedCard.startY}
          startScale={displacedCard.startScale}
          midX={displacedCard.midX}
          midY={displacedCard.midY}
          endX={displacedCard.endX}
          endY={displacedCard.endY}
          onDone={() => { displacedCardResolveRef.current?.(); displacedCardResolveRef.current = null; }}
        />
      )}

      {/* ═══ CONTENT ═══ */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Opponents area — scrollable when too many opponents */}
        <div className="shrink overflow-y-auto min-h-0 px-1.5 pt-1 pb-0.5" style={{ maxHeight: '35vh' }}>
          <div className="flex gap-1 flex-wrap justify-center">
            {opponents.map((opp) => {
              const oppIndex = gameState.players.findIndex((p) => p.id === opp.id);
              const isActive = gameState.currentPlayerIndex === oppIndex;
              return (
                <div
                  key={opp.id}
                  data-player-id={opp.id}
                  className={`p-1.5 rounded-xl transition-all duration-300 relative overflow-hidden ${
                    isActive
                      ? 'bg-gradient-to-b from-gold/15 to-gold/5 ring-1 ring-gold/40 shadow-md shadow-gold/10'
                      : 'bg-gradient-to-b from-[#3e2723]/60 to-[#2a1810]/60 border border-white/5'
                  }`}
                  style={{ minWidth: 0 }}
                >
                  {/* Subtle chocolate texture overlay */}
                  <div className="absolute inset-0 opacity-[0.03] rounded-xl" style={{
                    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.1) 4px, rgba(255,255,255,0.1) 5px)',
                  }} />
                  <div className="relative">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-base">{opp.avatar}</span>
                      <span className="text-white/80 text-[10px] font-semibold truncate max-w-[50px]">
                        {opp.nickname}
                      </span>
                      <span
                        className={`text-[10px] font-mono ml-auto font-bold ${
                          opp.score < 0 ? 'text-green-400' : opp.score > 0 ? 'text-red-400' : 'text-white/40'
                        }`}
                      >
                        {opp.score}
                      </span>
                    </div>
                    <PlayerHand cards={getRevealCards(opp.id, opp.cards)} tiny skipFlipForIndex={oppPlacedCards[opp.id] ?? null} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center area — piles + held card */}
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-3 relative">
          {/* Piles row */}
          <div className="flex items-center justify-center gap-4">
            <div
              ref={drawPileRef}
              onPointerDown={isMyTurn && gameState.turnPhase === 'draw' ? (e) => handlePileDragStart(e, 'pile') : undefined}
              style={{ touchAction: 'none' }}
            >
              <DrawPile
                count={gameState.drawPileCount}
                active={isMyTurn && gameState.turnPhase === 'draw'}
                onClick={handleDrawFromPile}
                revealedCard={revealedCard}
              />
            </div>

            {/* Discard pile */}
            <div
              ref={discardPileRef}
              data-discard-pile="true"
              style={{ touchAction: 'none' }}
              onPointerDown={isMyTurn && gameState.turnPhase === 'draw' && gameState.discardTop !== null ? (e) => handlePileDragStart(e, 'discard') : undefined}
              onClick={hasDrawnCard && canDiscard ? () => socket.emit('discard-drawn-card') : undefined}
            >
              <DiscardPile
                topCard={gameState.discardTop}
                active={!hasDrawnCard && (isMyTurn && gameState.turnPhase === 'draw' && gameState.discardTop !== null)}
                onClick={hasDrawnCard && canDiscard ? () => socket.emit('discard-drawn-card') : handleDrawFromDiscard}
              />
            </div>
          </div>

          {/* Drawn card — shown below piles, "held in hand" */}
          <div ref={drawnCardAreaRef} className="h-[5.5rem]">
            {hasDrawnCard && (
              <div
                onPointerDown={handleDragStart}
                style={{ touchAction: 'none', visibility: isDragging ? 'hidden' : 'visible' }}
                className="mt-2"
              >
                <DrawnCard
                  value={gameState.drawnCard!}
                  canDiscard={canDiscard}
                />
              </div>
            )}
          </div>
        </div>

        {/* Turn indicator */}
        <TurnIndicator
          text={getInstruction()}
          isMyTurn={canInteract}
          isFinalRound={gameState.phase === 'final_round'}
          turnsLeft={gameState.finalRoundTurnsLeft}
        />

        {/* My hand */}
        <div
          ref={myHandRef}
          className={`flex-none px-2 pb-2 pt-1.5 transition-all duration-300 rounded-t-xl ${
            canInteract
              ? 'bg-gradient-to-t from-gold/[0.08] via-gold/[0.04] to-transparent border-t border-gold/25'
              : 'bg-gradient-to-t from-black/10 to-transparent border-t border-white/5'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xl">{me.avatar}</span>
              <span className="text-white font-bold text-sm">{me.nickname}</span>
            </div>
            <span
              className={`text-xs font-mono font-black ${
                me.score < 0 ? 'text-green-400' : me.score > 0 ? 'text-red-400' : 'text-white/50'
              }`}
            >
              {me.score}
            </span>
          </div>
          <PlayerHand
            cards={getRevealCards(me.id, me.cards)}
            interactive={canInteract}
            onCardClick={canInteract ? handleCardClick : undefined}
            isDealing={isDealing}
            highlightAll={canPlaceCard}
            highlightFaceDown={isMyTurn && gameState.turnPhase === 'must_flip' || (gameState.phase === 'flipping_initial' && me.initialFlipsRemaining > 0)}
            dropTarget={dropTarget}
            skipFlipForIndex={justPlacedIndex}
          />
        </div>
      </div>
    </div>
  );
}
