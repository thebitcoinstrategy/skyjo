import type { GameState, PlayerState, CardSlot, CardValue } from '@skyjo/shared';
import { getColumnIndices, COLS, ROWS, findMatchingColumn } from '@skyjo/shared';
import type { BotTier } from './BotDifficulty.js';

interface BotAction {
  type: 'flip-initial' | 'draw-from-pile' | 'draw-from-discard' | 'place-drawn-card' | 'discard-drawn-card' | 'flip-card';
  cardIndex?: number;
}

/**
 * Bot AI that makes decisions based on difficulty tier.
 */
export class Bot {
  /**
   * Decide the bot's next action given the current game state.
   * May return multiple sequential actions (e.g., draw then place).
   */
  static decide(
    state: GameState,
    botPlayerId: string,
    tier: BotTier,
    mistakeRate: number
  ): BotAction[] {
    const player = state.players.find((p) => p.id === botPlayerId);
    if (!player) return [];

    // Random mistake override — make a random move instead
    if (Math.random() < mistakeRate) {
      return Bot.decideRandom(state, player);
    }

    switch (tier) {
      case 'easy': return Bot.decideEasy(state, player);
      case 'medium': return Bot.decideMedium(state, player);
      case 'hard': return Bot.decideHard(state, player);
    }
  }

  // ── Initial Flip ──

  static decideInitialFlip(player: PlayerState, tier: BotTier): number {
    const faceDownIndices = player.cards
      .map((c, i) => (!c.faceUp ? i : -1))
      .filter((i) => i >= 0);

    if (faceDownIndices.length === 0) return -1;

    // All tiers just pick randomly for initial flips
    return faceDownIndices[Math.floor(Math.random() * faceDownIndices.length)];
  }

  // ── Easy: Random-ish decisions ──

  private static decideEasy(state: GameState, player: PlayerState): BotAction[] {
    if (state.turnPhase === 'draw') {
      // Always draw from pile (doesn't think about discard)
      return [{ type: 'draw-from-pile' }];
    }

    if (state.turnPhase === 'place_or_discard' || state.turnPhase === 'place_discard') {
      // Random placement
      const idx = Math.floor(Math.random() * player.cards.length);
      return [{ type: 'place-drawn-card', cardIndex: idx }];
    }

    if (state.turnPhase === 'must_flip') {
      const faceDown = player.cards
        .map((c, i) => (!c.faceUp ? i : -1))
        .filter((i) => i >= 0);
      if (faceDown.length > 0) {
        return [{ type: 'flip-card', cardIndex: faceDown[Math.floor(Math.random() * faceDown.length)] }];
      }
    }

    return [];
  }

  // ── Medium: Basic strategy ──

  private static decideMedium(state: GameState, player: PlayerState): BotAction[] {
    if (state.turnPhase === 'draw') {
      const discardTop = state.discardPile[state.discardPile.length - 1];

      // Draw from discard if it's a low value card (< 5)
      if (discardTop !== undefined && discardTop < 5) {
        return [{ type: 'draw-from-discard' }];
      }

      return [{ type: 'draw-from-pile' }];
    }

    if (state.turnPhase === 'place_or_discard') {
      const drawnCard = state.drawnCard!;

      // If drawn card is high (>= 8), just discard it
      if (drawnCard >= 8) {
        return [{ type: 'discard-drawn-card' }];
      }

      // Replace the face-up card with the highest value, or a face-down card
      const bestTarget = Bot.findBestReplacement(player.cards, drawnCard, false);
      if (bestTarget >= 0) {
        return [{ type: 'place-drawn-card', cardIndex: bestTarget }];
      }

      return [{ type: 'discard-drawn-card' }];
    }

    if (state.turnPhase === 'place_discard') {
      const drawnCard = state.drawnCard!;
      const bestTarget = Bot.findBestReplacement(player.cards, drawnCard, false);
      return [{ type: 'place-drawn-card', cardIndex: bestTarget >= 0 ? bestTarget : 0 }];
    }

    if (state.turnPhase === 'must_flip') {
      const faceDown = player.cards
        .map((c, i) => (!c.faceUp ? i : -1))
        .filter((i) => i >= 0);
      if (faceDown.length > 0) {
        return [{ type: 'flip-card', cardIndex: faceDown[Math.floor(Math.random() * faceDown.length)] }];
      }
    }

    return [];
  }

  // ── Hard: Full strategy ──

  private static decideHard(state: GameState, player: PlayerState): BotAction[] {
    if (state.turnPhase === 'draw') {
      const discardTop = state.discardPile[state.discardPile.length - 1];

      // Check if the discard card could complete a column match
      if (discardTop !== undefined) {
        const colMatch = Bot.couldCompleteColumn(player.cards, discardTop);
        if (colMatch >= 0) {
          return [{ type: 'draw-from-discard' }];
        }

        // Draw from discard if low value
        if (discardTop <= 3) {
          return [{ type: 'draw-from-discard' }];
        }
      }

      return [{ type: 'draw-from-pile' }];
    }

    if (state.turnPhase === 'place_or_discard') {
      const drawnCard = state.drawnCard!;

      // Can we complete a column?
      const colMatch = Bot.couldCompleteColumn(player.cards, drawnCard);
      if (colMatch >= 0) {
        const indices = getColumnIndices(colMatch);
        const target = indices.find((i) => {
          const card = player.cards[i];
          return !card.faceUp || card.value !== drawnCard;
        });
        if (target !== undefined) {
          return [{ type: 'place-drawn-card', cardIndex: target }];
        }
      }

      // If the card is decent (low), replace the worst card
      if (drawnCard <= 5) {
        const worstIdx = Bot.findWorstCard(player.cards);
        if (worstIdx >= 0) {
          const worst = player.cards[worstIdx];
          if (worst.faceUp && worst.value > drawnCard) {
            return [{ type: 'place-drawn-card', cardIndex: worstIdx }];
          }
          if (!worst.faceUp) {
            // Expected value of face-down card is ~4.8, so replace if drawn < 5
            return [{ type: 'place-drawn-card', cardIndex: worstIdx }];
          }
        }
      }

      // Discard if card is high
      return [{ type: 'discard-drawn-card' }];
    }

    if (state.turnPhase === 'place_discard') {
      const drawnCard = state.drawnCard!;

      // Must place — find best replacement
      const colMatch = Bot.couldCompleteColumn(player.cards, drawnCard);
      if (colMatch >= 0) {
        const indices = getColumnIndices(colMatch);
        const target = indices.find((i) => !player.cards[i].faceUp || player.cards[i].value !== drawnCard);
        if (target !== undefined) {
          return [{ type: 'place-drawn-card', cardIndex: target }];
        }
      }

      const bestTarget = Bot.findBestReplacement(player.cards, drawnCard, true);
      return [{ type: 'place-drawn-card', cardIndex: bestTarget >= 0 ? bestTarget : 0 }];
    }

    if (state.turnPhase === 'must_flip') {
      // Flip a card in a column that has matching face-up cards (to potentially complete a column)
      const strategicFlip = Bot.findStrategicFlip(player.cards);
      if (strategicFlip >= 0) {
        return [{ type: 'flip-card', cardIndex: strategicFlip }];
      }

      // Otherwise, flip a random face-down card
      const faceDown = player.cards
        .map((c, i) => (!c.faceUp ? i : -1))
        .filter((i) => i >= 0);
      if (faceDown.length > 0) {
        return [{ type: 'flip-card', cardIndex: faceDown[Math.floor(Math.random() * faceDown.length)] }];
      }
    }

    return [];
  }

  // ── Random (for mistake moves) ──

  private static decideRandom(state: GameState, player: PlayerState): BotAction[] {
    if (state.turnPhase === 'draw') {
      if (Math.random() > 0.5 && state.discardPile.length > 0) {
        return [{ type: 'draw-from-discard' }];
      }
      return [{ type: 'draw-from-pile' }];
    }

    if (state.turnPhase === 'place_or_discard') {
      if (Math.random() > 0.5) {
        return [{ type: 'place-drawn-card', cardIndex: Math.floor(Math.random() * player.cards.length) }];
      }
      return [{ type: 'discard-drawn-card' }];
    }

    if (state.turnPhase === 'place_discard') {
      return [{ type: 'place-drawn-card', cardIndex: Math.floor(Math.random() * player.cards.length) }];
    }

    if (state.turnPhase === 'must_flip') {
      const faceDown = player.cards
        .map((c, i) => (!c.faceUp ? i : -1))
        .filter((i) => i >= 0);
      if (faceDown.length > 0) {
        return [{ type: 'flip-card', cardIndex: faceDown[Math.floor(Math.random() * faceDown.length)] }];
      }
    }

    return [];
  }

  // ── Helpers ──

  /** Find the best card index to replace with the drawn card */
  private static findBestReplacement(cards: CardSlot[], drawnValue: number, aggressive: boolean): number {
    let bestIdx = -1;
    let bestScore = -Infinity;

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      let score = 0;

      if (card.faceUp) {
        // Benefit = old value - new value (higher is better)
        score = card.value - drawnValue;
      } else if (aggressive) {
        // For "must place" situations, replacing face-down is okay
        // Expected face-down value is ~4.8
        score = 4.8 - drawnValue;
      } else {
        // Regular strategy: face-down could be anything
        score = 4.8 - drawnValue - 2; // penalty for uncertainty
      }

      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    return bestScore > 0 ? bestIdx : -1;
  }

  /** Find the face-up card with the highest value */
  private static findWorstCard(cards: CardSlot[]): number {
    let worstIdx = -1;
    let worstValue = -Infinity;

    for (let i = 0; i < cards.length; i++) {
      if (cards[i].faceUp && cards[i].value > worstValue) {
        worstValue = cards[i].value;
        worstIdx = i;
      }
    }

    // If no face-up cards found, return a random face-down one
    if (worstIdx < 0) {
      const faceDown = cards.map((c, i) => (!c.faceUp ? i : -1)).filter((i) => i >= 0);
      return faceDown.length > 0 ? faceDown[Math.floor(Math.random() * faceDown.length)] : 0;
    }

    return worstIdx;
  }

  /** Check if placing `value` could complete a column of 3 matching cards */
  private static couldCompleteColumn(cards: CardSlot[], value: CardValue): number {
    for (let col = 0; col < COLS; col++) {
      const indices = getColumnIndices(col);
      const colCards = indices.map((i) => cards[i]);
      const faceUpMatching = colCards.filter((c) => c.faceUp && c.value === value).length;

      // If 2 of 4 (for 4-row) match, placing this value could set up or complete elimination
      if (faceUpMatching >= ROWS - 1) {
        // Check if there's at least one slot to place it
        const hasTarget = colCards.some((c) => !c.faceUp || c.value !== value);
        if (hasTarget) return col;
      }
    }
    return -1;
  }

  /** Find a face-down card in a column that has matching face-up cards */
  private static findStrategicFlip(cards: CardSlot[]): number {
    for (let col = 0; col < COLS; col++) {
      const indices = getColumnIndices(col);
      const colCards = indices.map((i) => cards[i]);

      // Find the most common face-up value in this column
      const faceUpValues = colCards.filter((c) => c.faceUp).map((c) => c.value);
      if (faceUpValues.length < 2) continue;

      // If there are 2+ matching face-up values and a face-down card, flip it
      const valueCounts = new Map<number, number>();
      for (const v of faceUpValues) {
        valueCounts.set(v, (valueCounts.get(v) || 0) + 1);
      }

      for (const [, count] of valueCounts) {
        if (count >= 2) {
          // Found 2 matching — flip a face-down card in this column
          const faceDownIdx = indices.find((i) => !cards[i].faceUp);
          if (faceDownIdx !== undefined) return faceDownIdx;
        }
      }
    }

    return -1;
  }
}
