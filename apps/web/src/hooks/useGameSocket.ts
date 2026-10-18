import { useState, useEffect, useRef, useCallback } from 'react';
import type { RoomState, RoomSettings } from '@stop/shared';
import { soundManager } from '../utils/audio.js';

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
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          switch (data.event) {
            case 'player:init':
              if (data.payload?.playerId) {
                setCurrentPlayerId(data.payload.playerId);
              }
              break;

            case 'room:state':
              setRoomState(data.payload);
              if (isCreatingHostRef.current && data.payload?.hostId) {
                setCurrentPlayerId(data.payload.hostId);
                isCreatingHostRef.current = false;
              }
              if (data.payload?.currentRound?.stoppedBy) {
                setStoppedByPlayer(data.payload.currentRound.stoppedBy);
              } else if (data.payload.status !== 'PLAYING') {
                setTimeout(() => {
                  setStoppedByPlayer(null);
                }, 1500);
              } else {
                setStoppedByPlayer(null);
              }
              break;

            case 'room:error':
              setErrorMessage(data.payload.message);
              soundManager.playBuzzer();
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
        setIsConnected(false);
        // Intentar reconectar después de 2 segundos
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 2000);
      };

      ws.onerror = () => {
        setIsConnected(false);
      };
    } catch (err) {
      console.error('Fallo al inicializar WebSocket:', err);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) socketRef.current.close();
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
    sendEvent('room:create', { name, avatarId });
  }, [sendEvent]);

  const joinRoom = useCallback((code: string, name: string, avatarId: string) => {
    isCreatingHostRef.current = false;
    sendEvent('room:join', { code, name, avatarId });
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
