import { useEffect, useRef } from 'react';
import { soundManager } from '../audio/SoundManager';
import { useGameStore } from '../stores/gameStore';
import { useConnectionStore } from '../stores/connectionStore';
import { useSettingsStore } from '../stores/settingsStore';
import type { VisibleGameState } from '@skyjo/shared';

/**
 * Wires game state changes to sound effects.
 * Listens to animation events and game state transitions.
 */
export function useSound() {
  const gameState = useGameStore((s) => s.gameState);
  const prevState = useRef<VisibleGameState | null>(null);
  const playerId = useConnectionStore((s) => s.playerId);
  const musicEnabled = useSettingsStore((s) => s.musicEnabled);
  const musicVolume = useSettingsStore((s) => s.musicVolume);

  // Initialize sound manager on first user interaction
  useEffect(() => {
    const handleInteraction = () => {
      soundManager.init();
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
    document.addEventListener('click', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);
    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  // Music control
  useEffect(() => {
    soundManager.setMusicEnabled(musicEnabled);
  }, [musicEnabled]);

  useEffect(() => {
    soundManager.updateMusicVolume(musicVolume);
  }, [musicVolume]);

  // Listen to animation events for sounds
  useEffect(() => {
    const unsub = useGameStore.subscribe((state, prevState) => {
      if (state.animationQueue.length > prevState.animationQueue.length) {
        const latest = state.animationQueue[state.animationQueue.length - 1];
        switch (latest.type) {
          case 'flip-card':
            soundManager.play('card-flip');
            break;
          case 'draw-from-pile':
          case 'draw-from-discard':
            soundManager.play('draw');
            break;
          case 'place-card':
            soundManager.play('card-place');
            break;
          case 'discard-card':
            soundManager.play('card-place');
            break;
          case 'column-eliminate':
            soundManager.play('column-eliminate');
            break;
          case 'deal':
            soundManager.play('card-shuffle');
            break;
          case 'round-end':
            soundManager.play('good-play');
            break;
          case 'game-end':
            soundManager.play('win-fanfare');
            break;
        }
      }
    });
    return unsub;
  }, []);

  // Play turn notification when it becomes our turn
  useEffect(() => {
    if (!gameState || !playerId || !prevState.current) {
      prevState.current = gameState;
      return;
    }

    const myIndex = gameState.players.findIndex((p) => p.id === playerId);
    const wasMyTurn = prevState.current.currentPlayerIndex === myIndex;
    const isMyTurn = gameState.currentPlayerIndex === myIndex;

    if (!wasMyTurn && isMyTurn && gameState.phase !== 'flipping_initial') {
      soundManager.play('turn-notify');
    }

    prevState.current = gameState;
  }, [gameState, playerId]);
}
