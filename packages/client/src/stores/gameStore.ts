import { create } from 'zustand';
import type { VisibleGameState, AnimationEventPayload, RoundEndPayload, GameEndPayload } from '@skyjo/shared';

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

  setGameState: (state: VisibleGameState) => void;
  pushAnimation: (event: AnimationEventPayload) => void;
  shiftAnimation: () => AnimationEventPayload | undefined;
  setAnimating: (v: boolean) => void;
  flushPending: () => void;
  setRoundEndData: (data: RoundEndPayload | null) => void;
  setGameEndData: (data: GameEndPayload | null) => void;
  setScoringDone: (done: boolean) => void;
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

  setGameState: (gameState) => {
    if (get().animating) {
      // Buffer the state — only the latest matters
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
  setRoundEndData: (roundEndData) => set({ roundEndData, scoringDone: false }),
  setGameEndData: (gameEndData) => set({ gameEndData }),
  setScoringDone: (scoringDone) => set({ scoringDone }),
  reset: () =>
    set({
      gameState: null,
      animationQueue: [],
      roundEndData: null,
      gameEndData: null,
      pendingGameState: null,
      animating: false,
      scoringDone: false,
    }),
}));
