import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import type { RoomState } from '@stop/shared';
import { DoodleAvatar } from '../components/DoodleAvatar.js';
import { soundManager } from '../utils/audio.js';
import { Trophy, RotateCcw, Medal } from 'lucide-react';

interface GameOverViewProps {
  roomState: RoomState;
  currentPlayerId: string;
  onRestart: () => void;
}

export const GameOverView: React.FC<GameOverViewProps> = ({
  roomState,
  currentPlayerId,
  onRestart,
}) => {
  const isHost = roomState.hostId === currentPlayerId;

  // Sorted players by cumulative score descending
  const sortedPlayers = [...roomState.players].sort((a, b) => b.score - a.score);
  const first = sortedPlayers[0];
  const second = sortedPlayers[1];
  const third = sortedPlayers[2];

  useEffect(() => {
    soundManager.playCheer();

    // Disparar confeti festivo
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      colors: ['#ef4444', '#facc15', '#3b82f6', '#22c55e', '#a855f7'],
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
  }, []);

  return (
    <div className="w-full max-w-3xl mx-auto space-y-8 pb-16 text-center">
      {/* Título y Confeti */}
      <div>
        <motion.div
          initial={{ scale: 0, rotate: -15 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 12 }}
          className="inline-block bg-yellow-300 border-4 border-ink-900 rounded-3xl px-10 py-4 shadow-sketch-lg"
        >
          <h1 className="font-hand text-5xl sm:text-6xl font-black text-ink-900 flex items-center justify-center gap-3">
            <Trophy className="text-yellow-600 fill-yellow-400" size={44} />
            <span>¡PODIO FINAL!</span>
          </h1>
          <span className="font-hand text-lg text-ink-700 block mt-1">
            Los campeones indiscutibles del Tutti Frutti escolar
          </span>
        </motion.div>
      </div>

      {/* Podio Gráfico de 3 Lugares */}
      <div className="flex items-end justify-center gap-3 sm:gap-6 pt-10 px-4">
        {/* Segundo Lugar */}
        {second && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex-1 max-w-[150px] flex flex-col items-center"
          >
            <DoodleAvatar avatarId={second.avatarId} size="lg" className="mb-2" />
            <span className="font-hand font-bold text-lg text-ink-900 truncate max-w-full">
              {second.name}
            </span>
            <span className="font-hand text-sm font-black text-blue-700 mb-2">
              {second.score} pts
            </span>
            <div className="w-full h-32 bg-slate-200 border-3 border-ink-900 rounded-t-2xl shadow-sketch flex flex-col items-center justify-center">
              <span className="font-hand text-4xl font-black text-slate-700">2°</span>
              <span className="font-hand text-xs font-bold text-slate-600">Plata</span>
            </div>
          </motion.div>
        )}

        {/* Primer Lugar (Campeón) */}
        {first && (
          <motion.div
            initial={{ opacity: 0, y: 70 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex-1 max-w-[170px] flex flex-col items-center -mt-8"
          >
            <div className="relative">
              <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-3xl">👑</span>
              <DoodleAvatar avatarId={first.avatarId} size="xl" className="mb-2 ring-4 ring-yellow-400" />
            </div>
            <span className="font-hand font-black text-2xl text-ink-900 truncate max-w-full">
              {first.name}
            </span>
            <span className="font-hand text-base font-black text-red-600 mb-2">
              {first.score} pts
            </span>
            <div className="w-full h-44 bg-yellow-300 border-3 border-ink-900 rounded-t-2xl shadow-sketch-lg flex flex-col items-center justify-center">
              <span className="font-hand text-5xl font-black text-yellow-800">1°</span>
              <span className="font-hand text-sm font-bold text-yellow-900">¡CAMPEÓN!</span>
            </div>
          </motion.div>
        )}

        {/* Tercer Lugar */}
        {third && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex-1 max-w-[150px] flex flex-col items-center"
          >
            <DoodleAvatar avatarId={third.avatarId} size="lg" className="mb-2" />
            <span className="font-hand font-bold text-lg text-ink-900 truncate max-w-full">
              {third.name}
            </span>
            <span className="font-hand text-sm font-black text-amber-700 mb-2">
              {third.score} pts
            </span>
            <div className="w-full h-24 bg-amber-200 border-3 border-ink-900 rounded-t-2xl shadow-sketch flex flex-col items-center justify-center">
              <span className="font-hand text-3xl font-black text-amber-800">3°</span>
              <span className="font-hand text-xs font-bold text-amber-700">Bronce</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Tabla Completa de Calificaciones */}
      <div className="notebook-grid rounded-3xl p-6 border-3 border-ink-900 max-w-lg mx-auto">
        <h3 className="font-hand text-2xl font-black text-ink-900 mb-4">
          Tabla de Honor Completa
        </h3>
        <div className="space-y-2">
          {sortedPlayers.map((player, idx) => (
            <div
              key={player.id}
              className="flex items-center justify-between p-3 rounded-2xl bg-white border-2 border-ink-900"
            >
              <div className="flex items-center gap-3">
                <span className="font-hand font-black text-xl text-ink-500 w-6 text-center">
                  #{idx + 1}
                </span>
                <DoodleAvatar avatarId={player.avatarId} size="sm" />
                <span className="font-hand font-bold text-xl text-ink-900">
                  {player.name}
                </span>
              </div>
              <span className="font-hand text-2xl font-black text-red-600">
                {player.score} pts
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Botón de Jugar de Nuevo */}
      <div className="pt-4 flex justify-center">
        {isHost ? (
          <motion.button
            type="button"
            onClick={() => {
              soundManager.playPaper();
              onRestart();
            }}
            whileHover={{ scale: 1.05, rotate: -1 }}
            whileTap={{ scale: 0.95 }}
            className="px-10 py-4 rounded-2xl bg-green-500 text-white font-hand text-2xl font-black border-3 border-ink-900 shadow-sketch hover:bg-green-600 flex items-center gap-3 cursor-pointer"
          >
            <RotateCcw size={24} />
            <span>¡Jugar Otra Partida!</span>
          </motion.button>
        ) : (
          <p className="font-hand text-lg text-ink-700">
            Esperando a que el anfitrión inicie un nuevo cuaderno...
          </p>
        )}
      </div>
    </div>
  );
};
