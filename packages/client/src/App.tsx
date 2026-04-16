import { useConnectionStore } from './stores/connectionStore';
import { useGameStore } from './stores/gameStore';
import { useSound } from './hooks/useSound';
import HomeScreen from './screens/HomeScreen';
import LobbyScreen from './screens/LobbyScreen';
import GameScreen from './screens/GameScreen';
import ResultsScreen from './screens/ResultsScreen';
import AudioControls from './components/AudioControls';

export default function App() {
  const screen = useConnectionStore((s) => s.screen);
  const gamePhase = useGameStore((s) => s.gameState?.phase);

  useSound();

  const renderScreen = () => {
    if (screen === 'home') return <HomeScreen />;
    if (screen === 'lobby') return <LobbyScreen />;
    if (screen === 'game') {
      if (gamePhase === 'round_over' || gamePhase === 'game_over') {
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
