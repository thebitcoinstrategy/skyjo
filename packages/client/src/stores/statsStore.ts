import { create } from 'zustand';

export interface PlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  roundsPlayed: number;
  bestRoundScore: number | null;
  worstRoundScore: number | null;
  currentWinStreak: number;
  longestWinStreak: number;
}

const EMPTY: PlayerStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  roundsPlayed: 0,
  bestRoundScore: null,
  worstRoundScore: null,
  currentWinStreak: 0,
  longestWinStreak: 0,
};

function storageKey(nickname: string): string {
  return `skyjo_stats_${nickname.trim().toLowerCase()}`;
}

function loadStats(nickname: string): PlayerStats {
  try {
    const raw = localStorage.getItem(storageKey(nickname));
    if (!raw) return { ...EMPTY };
    return { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    return { ...EMPTY };
  }
}

function saveStats(nickname: string, stats: PlayerStats): void {
  try {
    localStorage.setItem(storageKey(nickname), JSON.stringify(stats));
  } catch {
    // localStorage full or disabled
  }
}

interface StatsState {
  getStats: (nickname: string) => PlayerStats;
  recordRound: (nickname: string, roundScore: number) => void;
  recordGame: (nickname: string, won: boolean) => void;
  /** Bump for components that want to re-render on stat updates. */
  revision: number;
}

export const useStatsStore = create<StatsState>((set) => ({
  revision: 0,

  getStats: (nickname) => {
    if (!nickname.trim()) return { ...EMPTY };
    return loadStats(nickname);
  },

  recordRound: (nickname, roundScore) => {
    if (!nickname.trim()) return;
    const stats = loadStats(nickname);
    stats.roundsPlayed += 1;
    if (stats.bestRoundScore === null || roundScore < stats.bestRoundScore) {
      stats.bestRoundScore = roundScore;
    }
    if (stats.worstRoundScore === null || roundScore > stats.worstRoundScore) {
      stats.worstRoundScore = roundScore;
    }
    saveStats(nickname, stats);
    set((s) => ({ revision: s.revision + 1 }));
  },

  recordGame: (nickname, won) => {
    if (!nickname.trim()) return;
    const stats = loadStats(nickname);
    stats.gamesPlayed += 1;
    if (won) {
      stats.gamesWon += 1;
      stats.currentWinStreak += 1;
      if (stats.currentWinStreak > stats.longestWinStreak) {
        stats.longestWinStreak = stats.currentWinStreak;
      }
    } else {
      stats.currentWinStreak = 0;
    }
    saveStats(nickname, stats);
    set((s) => ({ revision: s.revision + 1 }));
  },
}));
