import { useEffect, useRef } from 'react';
import { useConnectionStore } from './stores/connectionStore';
import { useGameStore } from './stores/gameStore';
import { useSocket } from './hooks/useSocket';
import { useSound } from './hooks/useSound';
import { socket } from './socket/client';
import HomeScreen from './screens/HomeScreen';
import LobbyScreen from './screens/LobbyScreen';
import GameScreen from './screens/GameScreen';
import RoundScoringScreen from './screens/RoundScoringScreen';
import ResultsScreen from './screens/ResultsScreen';
import AudioControls from './components/AudioControls';

export default function App() {
  const screen = useConnectionStore((s) => s.screen);
  const gamePhase = useGameStore((s) => s.gameState?.phase);
  const scoringDone = useGameStore((s) => s.scoringDone);
  const roundEndData = useGameStore((s) => s.roundEndData);
  const prevScreen = useRef(screen);

  useSocket();
  useSound();

  // Push browser history when screen changes so the back button
  // navigates within the app instead of leaving the PWA.
  useEffect(() => {
    if (screen !== prevScreen.current) {
      prevScreen.current = screen;
      window.history.pushState({ screen }, '', '');
    }
  }, [screen]);

  // Seed initial history entry on mount; clear ?room= param so it doesn't persist
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has('room')) {
      url.searchParams.delete('room');
      window.history.replaceState({ screen: 'home' }, '', url.pathname);
    } else {
      window.history.replaceState({ screen: 'home' }, '', '');
    }
  }, []);

  // Handle browser back button
  useEffect(() => {
    const handlePopState = () => {
      // Always push a new entry so the user can never fully exhaust
      // the history stack (which would exit the PWA).
      window.history.pushState({ screen: 'back' }, '', '');

      const currentScreen = useConnectionStore.getState().screen;

      if (currentScreen === 'game') {
        // During a game, back does nothing — prevents accidental exit
        return;
      }

      if (currentScreen === 'lobby') {
        // Leave lobby and go home
        socket.disconnect();
        socket.connect();
        useConnectionStore.getState().reset();
        useGameStore.getState().reset();
      }

      // Already on home — back does nothing (stays in app)
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const renderScreen = () => {
    if (screen === 'home') return <HomeScreen />;
    if (screen === 'lobby') return <LobbyScreen />;
    if (screen === 'game') {
      if (gamePhase === 'round_over' || gamePhase === 'game_over') {
        // Show counting animation first, then results
        if (!scoringDone && roundEndData) {
          return <RoundScoringScreen />;
        }
        return <ResultsScreen />;
      }
      return <GameScreen />;
    }
    return <HomeScreen />;
  };

  return (
    <>
      <AudioControls />
      {renderScreen()}
    </>
  );
}
