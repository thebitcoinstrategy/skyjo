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
  const sfxEnabled = useSettingsStore((s) => s.sfxEnabled);
  const sfxVolume = useSettingsStore((s) => s.sfxVolume);

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

  // Sounds are now triggered from the animation handler in GameScreen
  // (synchronized with the visual animations instead of firing immediately on queue push)

  // Change music track when a new round starts
  useEffect(() => {
    if (!gameState || !prevState.current) return;
    const prevPhase = prevState.current.phase;
    const currPhase = gameState.phase;
    // New round: transition from round_over back to flipping_initial
    if (prevPhase === 'round_over' && currPhase === 'flipping_initial') {
      soundManager.changeTrack();
    }
  }, [gameState]);

  // Play turn notification and announce player name via TTS
  useEffect(() => {
    if (!gameState || !playerId || !prevState.current) {
      prevState.current = gameState;
      return;
    }

    const prevTurnIndex = prevState.current.currentPlayerIndex;
    const currTurnIndex = gameState.currentPlayerIndex;
    const myIndex = gameState.players.findIndex((p) => p.id === playerId);
    const wasMyTurn = prevTurnIndex === myIndex;
    const isMyTurn = currTurnIndex === myIndex;

    // Turn changed
    if (prevTurnIndex !== currTurnIndex && gameState.phase !== 'flipping_initial') {
      if (!wasMyTurn && isMyTurn) {
        soundManager.play('turn-notify');
      }

      // TTS: announce other players' names (skip own turn)
      const currentPlayer = gameState.players[currTurnIndex];
      if (currentPlayer && sfxEnabled && currTurnIndex !== myIndex) {
        try {
          const utterance = new SpeechSynthesisUtterance(currentPlayer.nickname);
          utterance.lang = 'de-DE';
          utterance.rate = 1.1;
          utterance.volume = Math.min(sfxVolume, 0.8);
          utterance.pitch = 1.0;
          // Pick a German voice if available
          const voices = speechSynthesis.getVoices();
          const germanVoice = voices.find((v) => v.lang.startsWith('de'));
          if (germanVoice) utterance.voice = germanVoice;
          speechSynthesis.cancel();
          speechSynthesis.speak(utterance);
        } catch {
          // TTS not available on this device
        }
      }
    }

    prevState.current = gameState;
  }, [gameState, playerId]);
}
