import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { RoomState, RoomSettings } from '@stop/shared';
import { DEFAULT_CATEGORIES } from '@stop/shared';
import { DoodleAvatar } from '../components/DoodleAvatar.js';
import { soundManager } from '../utils/audio.js';
import { Crown, Copy, Check, Play, Settings, Clock, Zap, Layers } from 'lucide-react';

interface WaitingRoomViewProps {
  roomState: RoomState;
  currentPlayerId: string;
  onUpdateSettings: (settings: Partial<RoomSettings>) => void;
  onStartGame: () => void;
}

export const WaitingRoomView: React.FC<WaitingRoomViewProps> = ({
  roomState,
  currentPlayerId,
  onUpdateSettings,
  onStartGame,
}) => {
  const [copied, setCopied] = useState(false);
  const isHost = roomState.hostId === currentPlayerId || (roomState.players.length === 1 && Boolean(roomState.players[0]?.isHost));

  const handleCopyCode = () => {
    soundManager.playPop();
    navigator.clipboard.writeText(roomState.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleCategory = (catId: string) => {
    if (!isHost) return;
    soundManager.playPop();
    const current = roomState.settings.categories;
    let next: string[];
    if (current.includes(catId)) {
      if (current.length <= 3) return; // Keep at least 3 categories
      next = current.filter((c) => c !== catId);
    } else {
      next = [...current, catId];
    }
    onUpdateSettings({ categories: next });
  };

  const handleToggleChaos = () => {
    if (!isHost) return;
    soundManager.playPop();
    onUpdateSettings({ chaosModifiersEnabled: !roomState.settings.chaosModifiersEnabled });
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Banner Superior con Post-It del Código PIN */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Post-it amarillo con PIN */}
        <motion.div
          initial={{ rotate: -3, scale: 0.9 }}
          animate={{ rotate: -2, scale: 1 }}
          whileHover={{ scale: 1.04, rotate: 0 }}
          className="bg-yellow-200 border-3 border-ink-900 rounded-2xl p-4 shadow-sketch flex items-center gap-4 cursor-pointer"
          onClick={handleCopyCode}
        >
          <div>
            <span className="block font-hand text-xs font-bold text-ink-700 uppercase tracking-wider">
              Código de Sala (PIN)
            </span>
            <span className="font-hand text-4xl font-black text-red-600 tracking-widest">
              {roomState.code}
            </span>
          </div>
          <button
            type="button"
            className="p-2.5 rounded-xl bg-white border-2 border-ink-900 shadow-sketch-sm hover:bg-yellow-100 transition-all"
            title="Copiar código PIN"
          >
            {copied ? <Check className="text-green-600" size={22} /> : <Copy className="text-ink-900" size={22} />}
          </button>
        </motion.div>

        {/* Indicador de Jugadores Conectados */}
        <div className="font-hand text-xl bg-paper-100 border-2 border-ink-900 px-5 py-2.5 rounded-2xl shadow-sketch-sm flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>
          <span>
            {roomState.players.length} {roomState.players.length === 1 ? 'jugador en la sala' : 'jugadores en la sala'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Columna Izquierda: Jugadores en la Sala */}
        <div className="md:col-span-2 notebook-sheet rounded-3xl p-6 border-3 border-ink-900">
          <h2 className="font-hand text-2xl font-bold text-ink-900 mb-4 flex items-center gap-2">
            <span>✏️ Jugadores en la Libreta</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {roomState.players.map((player) => {
              const isCurrent = player.id === currentPlayerId;
              return (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.02 }}
                  className={`p-3.5 rounded-2xl border-2 border-ink-900 flex items-center gap-3 transition-all ${
                    isCurrent ? 'bg-yellow-100/90 shadow-sketch-sm' : 'bg-white'
                  }`}
                >
                  <DoodleAvatar avatarId={player.avatarId} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-hand text-xl font-bold text-ink-900 truncate">
                        {player.name}
                      </span>
                      {player.isHost && (
                        <span title="Anfitrión" className="inline-flex">
                          <Crown size={16} className="text-yellow-600 fill-yellow-400 shrink-0" />
                        </span>
                      )}
                    </div>
                    <span className="font-hand text-xs text-ink-500">
                      {isCurrent ? '(Tú)' : player.isHost ? 'Anfitrión' : 'Listo'}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Botón de Inicio si es Host */}
          <div className="mt-8 pt-4 border-t-2 border-dashed border-ink-700/30 flex justify-center">
            {isHost ? (
              <motion.button
                type="button"
                onClick={() => {
                  soundManager.playPaper();
                  onStartGame();
                }}
                whileHover={{ scale: 1.05, rotate: -1 }}
                whileTap={{ scale: 0.95 }}
                className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-red-500 text-white font-hand text-2xl font-black border-3 border-ink-900 shadow-sketch hover:bg-red-600 flex items-center justify-center gap-3 cursor-pointer"
              >
                <Play size={26} className="fill-white" />
                <span>¡Empezar Partida Ahora!</span>
              </motion.button>
            ) : (
              <div className="text-center font-hand text-lg text-ink-700 flex items-center gap-2">
                <span className="animate-spin text-2xl">⏳</span>
                <span>Esperando a que el anfitrión inicie la ronda...</span>
              </div>
            )}
          </div>
        </div>

        {/* Columna Derecha: Configuración de la Partida */}
        <div className="bg-white rounded-3xl p-6 border-3 border-ink-900 shadow-sketch space-y-5">
          <h2 className="font-hand text-2xl font-bold text-ink-900 flex items-center gap-2">
            <Settings size={22} />
            <span>Reglas de Partida</span>
          </h2>

          {/* Tiempo por Ronda */}
          <div>
            <label className="block font-hand font-semibold text-ink-900 text-base mb-1.5 flex items-center gap-1.5">
              <Clock size={16} />
              <span>Tiempo por ronda: {roomState.settings.roundDurationSeconds} seg</span>
            </label>
            {isHost ? (
              <div className="flex gap-2">
                {[45, 60, 90].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => {
                      soundManager.playPop();
                      onUpdateSettings({ roundDurationSeconds: sec });
                    }}
                    className={`flex-1 py-1.5 rounded-xl font-hand font-bold text-sm border-2 border-ink-900 ${
                      roomState.settings.roundDurationSeconds === sec
                        ? 'bg-yellow-300 shadow-sketch-sm'
                        : 'bg-paper-200 hover:bg-paper-300'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            ) : (
              <div className="font-hand text-sm text-ink-700 bg-paper-100 p-2 rounded-xl border border-ink-900">
                {roomState.settings.roundDurationSeconds} segundos
              </div>
            )}
          </div>

          {/* Rondas Totales */}
          <div>
            <label className="block font-hand font-semibold text-ink-900 text-base mb-1.5 flex items-center gap-1.5">
              <Layers size={16} />
              <span>Número de rondas: {roomState.settings.totalRounds}</span>
            </label>
            {isHost ? (
              <div className="flex gap-2">
                {[3, 5, 7].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      soundManager.playPop();
                      onUpdateSettings({ totalRounds: num });
                    }}
                    className={`flex-1 py-1.5 rounded-xl font-hand font-bold text-sm border-2 border-ink-900 ${
                      roomState.settings.totalRounds === num
                        ? 'bg-yellow-300 shadow-sketch-sm'
                        : 'bg-paper-200 hover:bg-paper-300'
                    }`}
                  >
                    {num} Rondas
                  </button>
                ))}
              </div>
            ) : (
              <div className="font-hand text-sm text-ink-700 bg-paper-100 p-2 rounded-xl border border-ink-900">
                {roomState.settings.totalRounds} rondas
              </div>
            )}
          </div>

          {/* Modo Caos / Comodines */}
          <div className="p-3 bg-purple-50 rounded-2xl border-2 border-ink-900">
            <div className="flex items-center justify-between">
              <span className="font-hand font-bold text-ink-900 flex items-center gap-1.5 text-base">
                <Zap size={18} className="text-purple-600 fill-purple-300" />
                <span>Modo Caos (Comodines)</span>
              </span>
              {isHost ? (
                <button
                  type="button"
                  onClick={handleToggleChaos}
                  className={`px-3 py-1 rounded-xl font-hand font-black text-xs border-2 border-ink-900 ${
                    roomState.settings.chaosModifiersEnabled
                      ? 'bg-green-400 text-ink-900 shadow-sketch-sm'
                      : 'bg-gray-200 text-ink-500'
                  }`}
                >
                  {roomState.settings.chaosModifiersEnabled ? 'ACTIVADO' : 'OFF'}
                </button>
              ) : (
                <span className="font-hand font-bold text-xs">
                  {roomState.settings.chaosModifiersEnabled ? 'Activado' : 'Desactivado'}
                </span>
              )}
            </div>
            <p className="font-hand text-xs text-ink-700 mt-1">
              Otorga ventajas secretas (2x puntos, cambio de letra, escudo anti-cero).
            </p>
          </div>

          {/* Categorías de Juego */}
          <div>
            <label className="block font-hand font-bold text-ink-900 text-base mb-2">
              Categorías ({roomState.settings.categories.length})
            </label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {DEFAULT_CATEGORIES.map((cat) => {
                const isSelected = roomState.settings.categories.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    disabled={!isHost}
                    className={`w-full p-2 rounded-xl border-2 border-ink-900 font-hand text-sm font-semibold flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-yellow-200 text-ink-900 shadow-sketch-sm'
                        : 'bg-paper-100 text-ink-500 border-dashed opacity-60'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </span>
                    <span>{isSelected ? '✓' : '+'}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
