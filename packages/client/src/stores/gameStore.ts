import { create } from 'zustand';
import type { VisibleGameState, VisibleCardSlot, AnimationEventPayload, RoundEndPayload, GameEndPayload } from '@skyjo/shared';

/** Per-player snapshot of which card indices were face-down before round end */
export type PreRevealSnapshot = Record<string, boolean[]>;

interface GameStoreState {
  gameState: VisibleGameState | null;
  animationQueue: AnimationEventPayload[];
  roundEndData: RoundEndPayload | null;
  gameEndData: GameEndPayload | null;

  // Pending state: buffered while animations are playing
  pendingGameState: VisibleGameState | null;
  animating: boolean;

  // Scoring animation: true after the counting animation completes
  scoringDone: boolean;

  // Round-end card reveal: keeps GameScreen visible while cards flip one by one
  revealingCards: boolean;
  preRevealSnapshot: PreRevealSnapshot | null;

  setGameState: (state: VisibleGameState) => void;
  pushAnimation: (event: AnimationEventPayload) => void;
  shiftAnimation: () => AnimationEventPayload | undefined;
  setAnimating: (v: boolean) => void;
  flushPending: () => void;
  setRoundEndData: (data: RoundEndPayload | null) => void;
  setGameEndData: (data: GameEndPayload | null) => void;
  setScoringDone: (done: boolean) => void;
  setRevealingCards: (v: boolean) => void;
  reset: () => void;
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  gameState: null,
  animationQueue: [],
  roundEndData: null,
  gameEndData: null,
  pendingGameState: null,
  animating: false,
  scoringDone: false,
  revealingCards: false,
  preRevealSnapshot: null,

  setGameState: (gameState) => {
    // Snapshot face-down cards before applying round_over state (all cards become face-up)
    const prev = get().gameState;
    if (gameState.phase === 'round_over' || gameState.phase === 'game_over') {
      if (prev && prev.phase !== 'round_over' && prev.phase !== 'game_over') {
        // Transitioning into round_over — snapshot which cards are face-down
        const snapshot: PreRevealSnapshot = {};
        for (const player of prev.players) {
          snapshot[player.id] = player.cards.map((c: VisibleCardSlot) => !c.faceUp);
        }
        // Only set revealingCards if there are face-down cards to reveal
        const hasHidden = Object.values(snapshot).some((arr) => arr.some(Boolean));
        if (hasHidden) {
          set({ preRevealSnapshot: snapshot, revealingCards: true });
        }
      }
    }
    if (get().animating) {
      set({ pendingGameState: gameState });
    } else {
      set({ gameState, pendingGameState: null });
    }
  },
  pushAnimation: (event) =>
    set((s) => ({ animationQueue: [...s.animationQueue, event], animating: true })),
  shiftAnimation: () => {
    const queue = get().animationQueue;
    if (queue.length === 0) return undefined;
    const [first, ...rest] = queue;
    set({ animationQueue: rest });
    return first;
  },
  setAnimating: (animating) => {
    set({ animating });
    // When animations finish, apply any buffered state
    if (!animating) {
      const pending = get().pendingGameState;
      if (pending) {
        set({ gameState: pending, pendingGameState: null });
      }
    }
  },
  flushPending: () => {
    const pending = get().pendingGameState;
    if (pending) {
      set({ gameState: pending, pendingGameState: null });
    }
  },
  setRoundEndData: (roundEndData) => {
    // Clear animation queue and animating flag so game state isn't stuck buffered.
    const pending = get().pendingGameState;
    set({
      roundEndData,
      scoringDone: false,
      animationQueue: [],
      animating: false,
      ...(pending ? { gameState: pending, pendingGameState: null } : {}),
    });
  },
  setGameEndData: (gameEndData) => {
    const pending = get().pendingGameState;
    set({
      gameEndData,
      animationQueue: [],
      animating: false,
      ...(pending ? { gameState: pending, pendingGameState: null } : {}),
    });
  },
  setScoringDone: (scoringDone) => set({ scoringDone }),
  setRevealingCards: (revealingCards) => set({ revealingCards, ...(!revealingCards ? { preRevealSnapshot: null } : {}) }),
  reset: () =>
    set({
      gameState: null,
      animationQueue: [],
      roundEndData: null,
      gameEndData: null,
      pendingGameState: null,
      animating: false,
      scoringDone: false,
      revealingCards: false,
      preRevealSnapshot: null,
    }),
}));
