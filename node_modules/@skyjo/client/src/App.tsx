import { useConnectionStore } from './stores/connectionStore';
import HomeScreen from './screens/HomeScreen';
import LobbyScreen from './screens/LobbyScreen';
import GameScreen from './screens/GameScreen';
import ResultsScreen from './screens/ResultsScreen';
import { useGameStore } from './stores/gameStore';

export default function App() {
  const screen = useConnectionStore((s) => s.screen);
  const gamePhase = useGameStore((s) => s.gameState?.phase);

  if (screen === 'home') return <HomeScreen />;
  if (screen === 'lobby') return <LobbyScreen />;
  if (screen === 'game') {
    if (gamePhase === 'round_over' || gamePhase === 'game_over') {
      return <ResultsScreen />;
    }
    return <GameScreen />;
  }

  return <HomeScreen />;
}
