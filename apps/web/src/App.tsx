import React, { useState } from 'react';
import { useGameSocket } from './hooks/useGameSocket.js';
import { LobbyView } from './views/LobbyView.js';
import { WaitingRoomView } from './views/WaitingRoomView.js';
import { GameBoardView } from './views/GameBoardView.js';
import { VotingView } from './views/VotingView.js';
import { RecapView } from './views/RecapView.js';
import { GameOverView } from './views/GameOverView.js';
import { StopOverlay } from './components/StopOverlay.js';
import { soundManager, isSoundEnabled, setSoundEnabled } from './utils/audio.js';
import { Volume2, VolumeX, AlertCircle, Wifi, WifiOff } from 'lucide-react';

export const App: React.FC = () => {
  const {
    roomState,
    errorMessage,
    isConnected,
    stoppedByPlayer,
    currentPlayerId,
    dismissStop,
    clearError,
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
  } = useGameSocket();

  const [soundOn, setSoundOn] = useState(isSoundEnabled());

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) soundManager.playPop();
  };

  const handleCreateRoom = (name: string, avatarId: string) => {
    createRoom(name, avatarId);
  };

  const handleJoinRoom = (code: string, name: string, avatarId: string) => {
    joinRoom(code, name, avatarId);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 sm:p-6 relative">
      {/* Barra de Navegación / Header Minimalista Cuaderno */}
      <header className="w-full max-w-4xl mx-auto flex items-center justify-between py-2 mb-6">
        <div className="flex items-center gap-2">
          <span className="font-hand text-3xl font-black text-ink-900 tracking-tight">
            STOP!
          </span>
          <span className="text-xs font-hand font-bold bg-yellow-200 border border-ink-900 px-2 py-0.5 rounded-full shadow-sketch-sm">
            TUTTI FRUTTI
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Indicador de conexión */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border-2 border-ink-900 font-hand text-xs font-bold ${
              isConnected ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-900'
            }`}
            title={isConnected ? 'Conectado al servidor' : 'Reconectando...'}
          >
            {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>{isConnected ? 'EN LÍNEA' : 'DESCONECTADO'}</span>
          </div>

          {/* Toggle de Audio */}
          <button
            type="button"
            onClick={toggleSound}
            className="p-2 rounded-xl bg-white border-2 border-ink-900 shadow-sketch-sm hover:bg-yellow-100 transition-all text-ink-900"
            title={soundOn ? 'Silenciar sonidos' : 'Activar sonidos'}
          >
            {soundOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
        </div>
      </header>

      {/* Notificación de Error */}
      {errorMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4">
          <div className="bg-red-100 border-3 border-ink-900 rounded-2xl p-4 shadow-sketch flex items-center justify-between gap-3 text-red-900 font-hand text-lg">
            <div className="flex items-center gap-2">
              <AlertCircle size={22} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={clearError}
              className="px-3 py-1 rounded-xl bg-white border-2 border-ink-900 text-sm font-bold shadow-sketch-sm hover:bg-red-50"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Freeze Overlay en caso de STOP */}
      <StopOverlay stoppedBy={stoppedByPlayer} onDismiss={dismissStop} />

      {/* Contenido Principal según el Estado de la Sala */}
      <main className="flex-1 flex flex-col justify-center">
        {!roomState ? (
          <LobbyView onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} />
        ) : roomState.status === 'LOBBY' ? (
          <WaitingRoomView
            roomState={roomState}
            currentPlayerId={currentPlayerId}
            onUpdateSettings={updateSettings}
            onStartGame={startGame}
          />
        ) : roomState.status === 'PLAYING' ? (
          <GameBoardView
            roomState={roomState}
            currentPlayerId={currentPlayerId}
            onSubmitAnswers={submitAnswers}
            onTriggerStop={triggerStop}
            isStopped={Boolean(stoppedByPlayer || roomState.currentRound?.stoppedBy)}
          />
        ) : roomState.status === 'VOTING' ? (
          <VotingView
            roomState={roomState}
            currentPlayerId={currentPlayerId}
            onCastVote={castVote}
          />
        ) : roomState.status === 'ROUND_RECAP' ? (
          <RecapView
            roomState={roomState}
            currentPlayerId={currentPlayerId}
            onVoteAbsurd={voteAbsurd}
            onNextRound={nextRound}
          />
        ) : roomState.status === 'GAME_OVER' ? (
          <GameOverView
            roomState={roomState}
            currentPlayerId={currentPlayerId}
            onRestart={restartGame}
          />
        ) : null}
      </main>

      {/* Footer del cuaderno escolar */}
      <footer className="w-full text-center py-4 font-hand text-sm text-ink-500">
        Stop! • PWA Indie Game • Hecho con lápiz, papel, WebSockets y amor lúdico
      </footer>
    </div>
  );
};
