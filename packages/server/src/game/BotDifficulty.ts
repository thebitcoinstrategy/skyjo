export type BotTier = 'easy' | 'medium' | 'hard';

/**
 * Adaptive difficulty system.
 * Tracks human player's win rate and adjusts bot tier.
 */
export class BotDifficulty {
  private results: boolean[] = []; // true = human won
  private currentTier: BotTier = 'medium';
  private maxHistory = 10;

  getTier(): BotTier {
    return this.currentTier;
  }

  recordResult(humanWon: boolean): void {
    this.results.push(humanWon);
    if (this.results.length > this.maxHistory) {
      this.results.shift();
    }
    this.adjustDifficulty();
  }

  private adjustDifficulty(): void {
    if (this.results.length < 3) return; // Need at least 3 games

    const wins = this.results.filter(Boolean).length;
    const winRate = wins / this.results.length;

    if (winRate > 0.6) {
      // Human winning too much, increase difficulty
      if (this.currentTier === 'easy') this.currentTier = 'medium';
      else if (this.currentTier === 'medium') this.currentTier = 'hard';
    } else if (winRate < 0.3) {
      // Human losing too much, decrease difficulty
      if (this.currentTier === 'hard') this.currentTier = 'medium';
      else if (this.currentTier === 'medium') this.currentTier = 'easy';
    }
  }

  /** Mistake probability for the current tier */
  getMistakeRate(): number {
    switch (this.currentTier) {
      case 'easy': return 0.30;
      case 'medium': return 0.10;
      case 'hard': return 0.02;
    }
  }
}
