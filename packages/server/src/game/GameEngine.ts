import {
  type GameState,
  type VisibleGameState,
  type VisiblePlayerState,
  type VisibleCardSlot,
  type PlayerState,
  type CardValue,
  type CardSlot,
  type RoundEndPayload,
  CARDS_PER_PLAYER,
  INITIAL_FLIPS,
  END_SCORE,
  createShuffledDeck,
  findMatchingColumn,
  removeColumn,
  allCardsFaceUp,
  calculateRoundScores,
  calculateTotalScore,
} from '@skyjo/shared';

type ActionResult =
  | { ok: true; columnEliminated?: number }
  | { ok: false; error: string };

interface PlayerInfo {
  id: string;
  nickname: string;
  avatar: string;
  isBot: boolean;
}

export class GameEngine {
  state: GameState;
  private playerInfos: PlayerInfo[];

  constructor(playerInfos: PlayerInfo[]) {
    this.playerInfos = playerInfos;
    this.state = {
      phase: 'waiting',
      turnPhase: null,
      players: [],
      currentPlayerIndex: 0,
      drawPile: [],
      discardPile: [],
      drawnCard: null,
      roundNumber: 0,
      triggeringPlayerIndex: null,
      finalRoundTurnsLeft: 0,
    };
  }

  startRound(): void {
    const deck = createShuffledDeck();

    const players: PlayerState[] = this.playerInfos.map((info) => {
      const cards: CardSlot[] = [];
      for (let i = 0; i < CARDS_PER_PLAYER; i++) {
        cards.push({ value: deck.pop()!, faceUp: false });
      }
      return {
        id: info.id,
        nickname: info.nickname,
        avatar: info.avatar,
        cards,
        score: this.state.players.find((p) => p.id === info.id)?.score ?? 0,
        roundScores: this.state.players.find((p) => p.id === info.id)?.roundScores ?? [],
        connected: true,
        isBot: info.isBot,
        initialFlipsRemaining: INITIAL_FLIPS,
      };
    });

    // Place one card face-up on discard pile
    const firstDiscard = deck.pop()!;

    this.state = {
      phase: 'flipping_initial',
      turnPhase: null,
      players,
      currentPlayerIndex: 0,
      drawPile: deck,
      discardPile: [firstDiscard],
      drawnCard: null,
      roundNumber: this.state.roundNumber + 1,
      triggeringPlayerIndex: null,
      finalRoundTurnsLeft: 0,
    };
  }

  flipInitialCard(playerId: string, cardIndex: number): ActionResult {
    if (this.state.phase !== 'flipping_initial') {
      return { ok: false, error: 'Not in initial flip phase' };
    }

    const player = this.state.players.find((p) => p.id === playerId);
    if (!player) return { ok: false, error: 'Player not found' };
    if (player.initialFlipsRemaining <= 0) {
      return { ok: false, error: 'No flips remaining' };
    }
    if (cardIndex < 0 || cardIndex >= player.cards.length) {
      return { ok: false, error: 'Invalid card index' };
    }
    if (player.cards[cardIndex].faceUp) {
      return { ok: false, error: 'Card already face up' };
    }

    player.cards[cardIndex].faceUp = true;
    player.initialFlipsRemaining--;

    // Check if all players have finished flipping
    const allDone = this.state.players.every(
      (p) => p.initialFlipsRemaining === 0
    );
    if (allDone) {
      this.state.phase = 'playing';
      this.state.turnPhase = 'draw';
      // The player with the highest visible total goes first
      this.state.currentPlayerIndex = this.findHighestVisibleScorePlayer();
    }

    return { ok: true };
  }

  drawFromPile(playerId: string): ActionResult {
    const check = this.validateTurn(playerId, 'draw');
    if (!check.ok) return check;

    if (this.state.drawPile.length === 0) {
      this.reshuffleDiscardIntoDraw();
    }

    this.state.drawnCard = this.state.drawPile.pop()!;
    this.state.turnPhase = 'place_or_discard';
    return { ok: true };
  }

  drawFromDiscard(playerId: string): ActionResult {
    const check = this.validateTurn(playerId, 'draw');
    if (!check.ok) return check;

    if (this.state.discardPile.length === 0) {
      return { ok: false, error: 'Discard pile is empty' };
    }

    this.state.drawnCard = this.state.discardPile.pop()!;
    this.state.turnPhase = 'place_discard';
    return { ok: true };
  }

  placeDrawnCard(playerId: string, cardIndex: number): ActionResult {
    const player = this.state.players.find((p) => p.id === playerId);
    if (!player) return { ok: false, error: 'Player not found' };

    const currentPlayer = this.state.players[this.state.currentPlayerIndex];
    if (currentPlayer.id !== playerId) {
      return { ok: false, error: 'Not your turn' };
    }

    if (
      this.state.turnPhase !== 'place_or_discard' &&
      this.state.turnPhase !== 'place_discard'
    ) {
      return { ok: false, error: 'Cannot place card now' };
    }

    if (cardIndex < 0 || cardIndex >= player.cards.length) {
      return { ok: false, error: 'Invalid card index' };
    }

    if (this.state.drawnCard === null) {
      return { ok: false, error: 'No drawn card' };
    }

    // Replace the card at cardIndex
    const replacedCard = player.cards[cardIndex];
    this.state.discardPile.push(replacedCard.value);

    player.cards[cardIndex] = {
      value: this.state.drawnCard,
      faceUp: true,
    };

    this.state.drawnCard = null;

    // Check for column elimination
    const colEliminated = this.checkAndEliminateColumn(player);

    // Check if this player just flipped all cards -> trigger final round
    this.checkFinalRoundTrigger(player);

    // Advance turn
    this.advanceTurn();

    return { ok: true, columnEliminated: colEliminated };
  }

  discardDrawnCard(playerId: string): ActionResult {
    const currentPlayer = this.state.players[this.state.currentPlayerIndex];
    if (currentPlayer.id !== playerId) {
      return { ok: false, error: 'Not your turn' };
    }

    if (this.state.turnPhase !== 'place_or_discard') {
      return { ok: false, error: 'Cannot discard now (must place if drawn from discard)' };
    }

    if (this.state.drawnCard === null) {
      return { ok: false, error: 'No drawn card' };
    }

    this.state.discardPile.push(this.state.drawnCard);
    this.state.drawnCard = null;
    this.state.turnPhase = 'must_flip';

    return { ok: true };
  }

  flipCard(playerId: string, cardIndex: number): ActionResult {
    const player = this.state.players.find((p) => p.id === playerId);
    if (!player) return { ok: false, error: 'Player not found' };

    const currentPlayer = this.state.players[this.state.currentPlayerIndex];
    if (currentPlayer.id !== playerId) {
      return { ok: false, error: 'Not your turn' };
    }

    if (this.state.turnPhase !== 'must_flip') {
      return { ok: false, error: 'Cannot flip card now' };
    }

    if (cardIndex < 0 || cardIndex >= player.cards.length) {
      return { ok: false, error: 'Invalid card index' };
    }

    if (player.cards[cardIndex].faceUp) {
      return { ok: false, error: 'Card already face up' };
    }

    player.cards[cardIndex].faceUp = true;

    // Check for column elimination
    const colEliminated = this.checkAndEliminateColumn(player);

    // Check if this player just flipped all cards -> trigger final round
    this.checkFinalRoundTrigger(player);

    // Advance turn
    this.advanceTurn();

    return { ok: true, columnEliminated: colEliminated };
  }

  getVisibleState(forPlayerId: string): VisibleGameState {
    const players: VisiblePlayerState[] = this.state.players.map((p) => {
      const cards: VisibleCardSlot[] = p.cards.map((card) => {
        if (card.faceUp) {
          return { value: card.value, faceUp: true };
        }
        // Hidden cards show null value to everyone (even the owner)
        return { value: null, faceUp: false };
      });

      return {
        id: p.id,
        nickname: p.nickname,
        avatar: p.avatar,
        cards,
        score: p.score,
        roundScores: p.roundScores,
        connected: p.connected,
        isBot: p.isBot,
        initialFlipsRemaining: p.initialFlipsRemaining,
      };
    });

    const currentPlayer = this.state.players[this.state.currentPlayerIndex];

    return {
      phase: this.state.phase,
      turnPhase: this.state.turnPhase,
      players,
      currentPlayerIndex: this.state.currentPlayerIndex,
      drawPileCount: this.state.drawPile.length,
      discardTop:
        this.state.discardPile.length > 0
          ? this.state.discardPile[this.state.discardPile.length - 1]
          : null,
      drawnCard:
        currentPlayer?.id === forPlayerId ? this.state.drawnCard : null,
      roundNumber: this.state.roundNumber,
      triggeringPlayerIndex: this.state.triggeringPlayerIndex,
      finalRoundTurnsLeft: this.state.finalRoundTurnsLeft,
    };
  }

  getRoundScores(): RoundEndPayload {
    const triggerIdx = this.state.triggeringPlayerIndex ?? 0;
    const roundScores = calculateRoundScores(this.state.players, triggerIdx);

    const roundScoresMap: Record<string, number> = {};
    const totalScoresMap: Record<string, number> = {};

    this.state.players.forEach((p, i) => {
      p.roundScores.push(roundScores[i]);
      p.score += roundScores[i];
      roundScoresMap[p.id] = roundScores[i];
      totalScoresMap[p.id] = p.score;
    });

    // Check if game is over
    const maxScore = Math.max(...this.state.players.map((p) => p.score));
    if (maxScore >= END_SCORE) {
      this.state.phase = 'game_over';
    }

    return {
      roundScores: roundScoresMap,
      totalScores: totalScoresMap,
      roundNumber: this.state.roundNumber,
    };
  }

  // ── Private Helpers ──

  private validateTurn(
    playerId: string,
    expectedPhase: 'draw'
  ): ActionResult {
    if (this.state.phase !== 'playing' && this.state.phase !== 'final_round') {
      return { ok: false, error: 'Game is not in a playable phase' };
    }

    const currentPlayer = this.state.players[this.state.currentPlayerIndex];
    if (currentPlayer.id !== playerId) {
      return { ok: false, error: 'Not your turn' };
    }

    if (this.state.turnPhase !== expectedPhase) {
      return { ok: false, error: `Expected turn phase: ${expectedPhase}` };
    }

    return { ok: true };
  }

  private advanceTurn(): void {
    // Check if round is over (final round and everyone has had their turn)
    if (this.state.phase === 'final_round') {
      this.state.finalRoundTurnsLeft--;
      if (this.state.finalRoundTurnsLeft <= 0) {
        this.state.phase = 'round_over';
        this.state.turnPhase = null;
        // Flip all remaining face-down cards
        for (const player of this.state.players) {
          for (const card of player.cards) {
            card.faceUp = true;
          }
        }
        return;
      }
    }

    // Move to next player
    let nextIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length;

    // Skip disconnected non-bot players
    let attempts = 0;
    while (
      !this.state.players[nextIndex].connected &&
      !this.state.players[nextIndex].isBot &&
      attempts < this.state.players.length
    ) {
      nextIndex = (nextIndex + 1) % this.state.players.length;
      attempts++;
    }

    this.state.currentPlayerIndex = nextIndex;
    this.state.turnPhase = 'draw';
  }

  private checkFinalRoundTrigger(player: PlayerState): void {
    if (
      this.state.phase === 'playing' &&
      allCardsFaceUp(player.cards) &&
      this.state.triggeringPlayerIndex === null
    ) {
      const playerIndex = this.state.players.indexOf(player);
      this.state.triggeringPlayerIndex = playerIndex;
      this.state.phase = 'final_round';
      // Everyone else gets one more turn
      this.state.finalRoundTurnsLeft = this.state.players.length - 1;
    }
  }

  private checkAndEliminateColumn(player: PlayerState): number | undefined {
    const colIdx = findMatchingColumn(player.cards);
    if (colIdx >= 0) {
      // Move eliminated cards to discard
      const colCards = [];
      const startIdx = colIdx * 4;
      for (let r = 0; r < 4; r++) {
        colCards.push(player.cards[startIdx + r].value);
      }
      this.state.discardPile.push(...colCards);

      player.cards = removeColumn(player.cards, colIdx);
      return colIdx;
    }
    return undefined;
  }

  private findHighestVisibleScorePlayer(): number {
    let maxScore = -Infinity;
    let maxIndex = 0;

    this.state.players.forEach((player, index) => {
      const visibleScore = player.cards
        .filter((c) => c.faceUp)
        .reduce((sum, c) => sum + c.value, 0);
      if (visibleScore > maxScore) {
        maxScore = visibleScore;
        maxIndex = index;
      }
    });

    return maxIndex;
  }

  private reshuffleDiscardIntoDraw(): void {
    if (this.state.discardPile.length <= 1) return;

    // Keep the top card of the discard pile
    const topCard = this.state.discardPile.pop()!;
    const cardsToShuffle = [...this.state.discardPile];
    this.state.discardPile = [topCard];

    // Shuffle and add to draw pile
    for (let i = cardsToShuffle.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cardsToShuffle[i], cardsToShuffle[j]] = [cardsToShuffle[j], cardsToShuffle[i]];
    }

    this.state.drawPile = cardsToShuffle;
  }
}
