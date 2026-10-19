import { useState, useEffect, useRef, useCallback } from 'react';
import type { RoomState, RoomSettings } from '@stop/shared';
import { soundManager } from '../utils/audio.js';

const SESSION_STORAGE_KEY = 'stop_game_session';

interface SavedSession {
  code: string;
  name: string;
  avatarId: string;
  playerId?: string;
}

export function useGameSocket() {
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [stoppedByPlayer, setStoppedByPlayer] = useState<{ id: string; name: string } | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<string>('');

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCreatingHostRef = useRef<boolean>(false);
  const pendingQueueRef = useRef<string[]>([]);

  const connect = useCallback(() => {
    if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const defaultWsUrl = window.location.port === '3000'
      ? `ws://${window.location.hostname}:3001/ws`
      : `${protocol}//${window.location.host}/ws`;
    const wsUrl = import.meta.env?.VITE_WS_URL || defaultWsUrl;

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setErrorMessage(null);
        // Flush any pending events sent before connection was open
        while (pendingQueueRef.current.length > 0) {
          const queued = pendingQueueRef.current.shift();
          if (queued) ws.send(queued);
        }

        // Auto-reconnect if session exists in sessionStorage (e.g. on page reload F5)
        try {
          const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
          if (raw) {
            const saved: SavedSession = JSON.parse(raw);
            if (saved.code && saved.name) {
              ws.send(JSON.stringify({
                event: 'room:join',
                payload: {
                  code: saved.code,
                  name: saved.name,
                  avatarId: saved.avatarId || 'garabato-feliz',
                  playerId: saved.playerId,
                },
              }));
            }
          }
        } catch {}
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          switch (data.event) {
            case 'player:init':
              if (data.payload?.playerId) {
                setCurrentPlayerId(data.payload.playerId);
                try {
                  const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
                  const prev = raw ? JSON.parse(raw) : {};
                  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
                    ...prev,
                    playerId: data.payload.playerId,
                  }));
                } catch {}
              }
              break;

            case 'room:state':
              setRoomState(data.payload);
              if (isCreatingHostRef.current && data.payload?.hostId) {
                setCurrentPlayerId(data.payload.hostId);
                isCreatingHostRef.current = false;
              }
              try {
                const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
                const prev = raw ? JSON.parse(raw) : {};
                sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
                  ...prev,
                  code: data.payload.code,
                }));
              } catch {}

              // Solo mostrar STOP si la sala sigue en PLAYING
              if (data.payload?.status === 'PLAYING' && data.payload?.currentRound?.stoppedBy) {
                setStoppedByPlayer(data.payload.currentRound.stoppedBy);
              } else {
                setStoppedByPlayer(null);
              }
              break;

            case 'room:kicked':
              try {
                sessionStorage.removeItem(SESSION_STORAGE_KEY);
              } catch {}
              pendingQueueRef.current = [];
              setRoomState(null);
              setCurrentPlayerId('');
              setStoppedByPlayer(null);
              setErrorMessage(data.payload?.message || 'Has sido expulsado de la sala por el anfitrión.');
              soundManager.playBuzzer();
              break;

            case 'room:error':
              setErrorMessage(data.payload.message);
              soundManager.playBuzzer();
              if (data.payload.message?.includes('No se encontró')) {
                try {
                  sessionStorage.removeItem(SESSION_STORAGE_KEY);
                } catch {}
                setRoomState(null);
              }
              break;

            case 'round:stop_triggered':
              setStoppedByPlayer(data.payload.stoppedBy);
              soundManager.playStop();
              break;

            case 'sound:play':
              const sound = data.payload?.sound;
              if (sound === 'tick') soundManager.playTick();
              else if (sound === 'stop') soundManager.playStop();
              else if (sound === 'paper') soundManager.playPaper();
              else if (sound === 'cheer') soundManager.playCheer();
              else if (sound === 'pop') soundManager.playPop();
              else if (sound === 'buzzer') soundManager.playBuzzer();
              break;

            default:
              break;
          }
        } catch (err) {
          console.error('Error parseando mensaje WS:', err);
        }
      };

      ws.onclose = () => {
        if (socketRef.current !== ws) return;
        setIsConnected(false);
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          if (socketRef.current === ws || !socketRef.current) {
            connect();
          }
        }, 2000);
      };

      ws.onerror = () => {
        if (socketRef.current !== ws) return;
        setIsConnected(false);
      };
    } catch (err) {
      console.error('Fallo al inicializar WebSocket:', err);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (socketRef.current) {
        const activeWs = socketRef.current;
        socketRef.current = null;
        activeWs.onopen = null;
        activeWs.onmessage = null;
        activeWs.onerror = null;
        activeWs.onclose = null;
        activeWs.close();
      }
    };
  }, [connect]);

  const sendEvent = useCallback((event: string, payload: unknown = {}) => {
    const msg = JSON.stringify({ event, payload });
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(msg);
    } else {
      pendingQueueRef.current.push(msg);
    }
  }, []);

  const createRoom = useCallback((name: string, avatarId: string) => {
    isCreatingHostRef.current = true;
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ name, avatarId, code: '' }));
    } catch {}
    sendEvent('room:create', { name, avatarId });
  }, [sendEvent]);

  const joinRoom = useCallback((code: string, name: string, avatarId: string) => {
    isCreatingHostRef.current = false;
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ code, name, avatarId }));
    } catch {}
    sendEvent('room:join', { code, name, avatarId });
  }, [sendEvent]);

  const leaveRoom = useCallback(() => {
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {}
    setRoomState(null);
    setCurrentPlayerId('');
    setStoppedByPlayer(null);
    sendEvent('room:leave');
  }, [sendEvent]);

  const kickPlayer = useCallback((targetPlayerId: string) => {
    sendEvent('room:kick_player', { targetPlayerId });
  }, [sendEvent]);

  const updateSettings = useCallback((settings: Partial<RoomSettings>) => {
    sendEvent('room:update_settings', { settings });
  }, [sendEvent]);

  const startGame = useCallback(() => {
    sendEvent('game:start');
  }, [sendEvent]);

  const submitAnswers = useCallback((answers: Record<string, string>) => {
    sendEvent('round:submit_answers', { answers });
  }, [sendEvent]);

  const triggerStop = useCallback(() => {
    sendEvent('round:trigger_stop');
  }, [sendEvent]);

  const castVote = useCallback((voteId: string, accept: boolean) => {
    sendEvent('vote:cast', { voteId, accept });
  }, [sendEvent]);

  const voteAbsurd = useCallback((nominationId: string) => {
    sendEvent('absurd:vote', { nominationId });
  }, [sendEvent]);

  const nextRound = useCallback(() => {
    sendEvent('recap:next_round');
  }, [sendEvent]);

  const restartGame = useCallback(() => {
    sendEvent('game:restart');
  }, [sendEvent]);

  return {
    roomState,
    errorMessage,
    isConnected,
    stoppedByPlayer,
    currentPlayerId,
    dismissStop: () => setStoppedByPlayer(null),
    clearError: () => setErrorMessage(null),
    createRoom,
    joinRoom,
    leaveRoom,
    kickPlayer,
    updateSettings,
    startGame,
    submitAnswers,
    triggerStop,
    castVote,
    voteAbsurd,
    nextRound,
    restartGame,
  };
}
