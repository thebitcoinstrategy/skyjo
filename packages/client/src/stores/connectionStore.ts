import { create } from 'zustand';
import type { LobbyPlayer } from '@skyjo/shared';

export type Screen = 'home' | 'lobby' | 'game';

interface ConnectionState {
  screen: Screen;
  playerId: string | null;
  roomCode: string | null;
  lobby: LobbyPlayer[];
  connected: boolean;
  error: string | null;

  setScreen: (screen: Screen) => void;
  setPlayerId: (id: string) => void;
  setRoomCode: (code: string) => void;
  setLobby: (lobby: LobbyPlayer[]) => void;
  setConnected: (connected: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  screen: 'home',
  playerId: null,
  roomCode: null,
  lobby: [],
  connected: false,
  error: null,

  setScreen: (screen) => set({ screen }),
  setPlayerId: (playerId) => set({ playerId }),
  setRoomCode: (roomCode) => set({ roomCode }),
  setLobby: (lobby) => set({ lobby }),
  setConnected: (connected) => set({ connected }),
  setError: (error) => set({ error }),
  reset: () =>
    set({
      screen: 'home',
      playerId: null,
      roomCode: null,
      lobby: [],
      error: null,
    }),
}));
