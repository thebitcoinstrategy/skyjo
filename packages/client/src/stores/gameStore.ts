import { create } from 'zustand';
import type { VisibleGameState, AnimationEventPayload, RoundEndPayload, GameEndPayload } from '@skyjo/shared';

interface GameStoreState {
  gameState: VisibleGameState | null;
  animationQueue: AnimationEventPayload[];
  roundEndData: RoundEndPayload | null;
  gameEndData: GameEndPayload | null;

  setGameState: (state: VisibleGameState) => void;
  pushAnimation: (event: AnimationEventPayload) => void;
  shiftAnimation: () => AnimationEventPayload | undefined;
  setRoundEndData: (data: RoundEndPayload | null) => void;
  setGameEndData: (data: GameEndPayload | null) => void;
  reset: () => void;
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  gameState: null,
  animationQueue: [],
  roundEndData: null,
  gameEndData: null,

  setGameState: (gameState) => set({ gameState }),
  pushAnimation: (event) =>
    set((s) => ({ animationQueue: [...s.animationQueue, event] })),
  shiftAnimation: () => {
    const queue = get().animationQueue;
    if (queue.length === 0) return undefined;
    const [first, ...rest] = queue;
    set({ animationQueue: rest });
    return first;
  },
  setRoundEndData: (roundEndData) => set({ roundEndData }),
  setGameEndData: (gameEndData) => set({ gameEndData }),
  reset: () =>
    set({
      gameState: null,
      animationQueue: [],
      roundEndData: null,
      gameEndData: null,
    }),
}));
