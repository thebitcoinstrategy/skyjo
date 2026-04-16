import { useEffect } from 'react';
import { socket } from '../socket/client';
import { useConnectionStore } from '../stores/connectionStore';
import { useGameStore } from '../stores/gameStore';

export function useSocket() {
  const setConnected = useConnectionStore((s) => s.setConnected);
  const setScreen = useConnectionStore((s) => s.setScreen);
  const setPlayerId = useConnectionStore((s) => s.setPlayerId);
  const setRoomCode = useConnectionStore((s) => s.setRoomCode);
  const setLobby = useConnectionStore((s) => s.setLobby);
  const setError = useConnectionStore((s) => s.setError);

  const setGameState = useGameStore((s) => s.setGameState);
  const pushAnimation = useGameStore((s) => s.pushAnimation);
  const setRoundEndData = useGameStore((s) => s.setRoundEndData);
  const setGameEndData = useGameStore((s) => s.setGameEndData);

  useEffect(() => {
    socket.connect();

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('room-created', (payload) => {
      setPlayerId(payload.playerId);
      setRoomCode(payload.roomCode);
      setLobby(payload.lobby);
      setScreen('lobby');
      setError(null);
    });

    socket.on('room-joined', (payload) => {
      setPlayerId(payload.playerId);
      setRoomCode(payload.roomCode);
      setLobby(payload.lobby);
      setScreen('lobby');
      setError(null);
    });

    socket.on('player-joined', (payload) => {
      useConnectionStore.setState((s) => ({
        lobby: [...s.lobby, payload.player],
      }));
    });

    socket.on('player-left', (payload) => {
      useConnectionStore.setState((s) => ({
        lobby: s.lobby.filter((p) => p.id !== payload.playerId),
      }));
    });

    socket.on('lobby-update', (lobby) => {
      setLobby(lobby);
    });

    socket.on('game-started', (state) => {
      setGameState(state);
      setScreen('game');
    });

    socket.on('game-state-update', (state) => {
      setGameState(state);
      // Move to game screen if still in lobby
      if (useConnectionStore.getState().screen === 'lobby') {
        setScreen('game');
      }
    });

    socket.on('animation-event', (event) => {
      pushAnimation(event);
    });

    socket.on('round-ended', (data) => {
      setRoundEndData(data);
    });

    socket.on('game-ended', (data) => {
      setGameEndData(data);
    });

    socket.on('error', (payload) => {
      setError(payload.message);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, []);
}
