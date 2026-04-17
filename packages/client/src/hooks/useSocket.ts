import { useEffect } from 'react';
import { socket } from '../socket/client';
import { useConnectionStore } from '../stores/connectionStore';
import { useGameStore } from '../stores/gameStore';
import { useStatsStore } from '../stores/statsStore';

// Persist session info for reconnection
function saveSession(playerId: string, roomCode: string) {
  try {
    sessionStorage.setItem('skyjo_playerId', playerId);
    sessionStorage.setItem('skyjo_roomCode', roomCode);
  } catch { /* ignore */ }
}

function clearSession() {
  try {
    sessionStorage.removeItem('skyjo_playerId');
    sessionStorage.removeItem('skyjo_roomCode');
  } catch { /* ignore */ }
}

function getSession(): { playerId: string; roomCode: string } | null {
  try {
    const playerId = sessionStorage.getItem('skyjo_playerId');
    const roomCode = sessionStorage.getItem('skyjo_roomCode');
    if (playerId && roomCode) return { playerId, roomCode };
  } catch { /* ignore */ }
  return null;
}

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

    socket.on('connect', () => {
      setConnected(true);

      // Attempt rejoin if we have a saved session and we're not on home screen
      const session = getSession();
      const currentScreen = useConnectionStore.getState().screen;
      if (session && currentScreen !== 'home') {
        console.log('[socket] Attempting rejoin:', session);
        socket.emit('rejoin-room', session);
      }
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('room-created', (payload) => {
      setPlayerId(payload.playerId);
      setRoomCode(payload.roomCode);
      setLobby(payload.lobby);
      setScreen('lobby');
      setError(null);
      saveSession(payload.playerId, payload.roomCode);
    });

    socket.on('room-joined', (payload) => {
      setPlayerId(payload.playerId);
      setRoomCode(payload.roomCode);
      setLobby(payload.lobby);
      setScreen('lobby');
      setError(null);
      saveSession(payload.playerId, payload.roomCode);
    });

    socket.on('rejoined', (payload) => {
      console.log('[socket] Rejoined room:', payload.roomCode);
      setPlayerId(payload.playerId);
      setRoomCode(payload.roomCode);
      setLobby(payload.lobby);
      setGameState(payload.gameState);
      setScreen('game');
      setError(null);
      saveSession(payload.playerId, payload.roomCode);
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
      // Save session when game starts (playerId was set during room creation/join)
      const { playerId, roomCode } = useConnectionStore.getState();
      if (playerId && roomCode) saveSession(playerId, roomCode);
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
      // Record local round stats for the human player (not bots)
      const { playerId } = useConnectionStore.getState();
      const state = useGameStore.getState().gameState;
      const me = state?.players.find((p) => p.id === playerId);
      if (me && !me.isBot && playerId && data.roundScores[playerId] !== undefined) {
        useStatsStore.getState().recordRound(me.nickname, data.roundScores[playerId]);
      }
    });

    socket.on('game-ended', (data) => {
      setGameEndData(data);
      const { playerId } = useConnectionStore.getState();
      const state = useGameStore.getState().gameState;
      const me = state?.players.find((p) => p.id === playerId);
      if (me && !me.isBot && playerId) {
        useStatsStore.getState().recordGame(me.nickname, data.winnerId === playerId);
      }
    });

    socket.on('error', (payload) => {
      setError(payload.message);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, []);

  // Clear session when user goes back to home screen
  useEffect(() => {
    const unsub = useConnectionStore.subscribe((state) => {
      if (state.screen === 'home') {
        clearSession();
      }
    });
    return unsub;
  }, []);
}
