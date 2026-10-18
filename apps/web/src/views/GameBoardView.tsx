import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RoomState } from '@stop/shared';
import { DEFAULT_CATEGORIES, validateWordLocal } from '@stop/shared';
import { soundManager } from '../utils/audio.js';
import { Clock, Zap, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

interface GameBoardViewProps {
  roomState: RoomState;
  currentPlayerId: string;
  onSubmitAnswers: (answers: Record<string, string>) => void;
  onTriggerStop: () => void;
  isStopped?: boolean;
}

export const GameBoardView: React.FC<GameBoardViewProps> = ({
  roomState,
  currentPlayerId,
  onSubmitAnswers,
  onTriggerStop,
  isStopped = false,
}) => {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number>(roomState.settings.roundDurationSeconds);
  const [hasTriggeredStop, setHasTriggeredStop] = useState(false);
  const lastTickTime = useRef<number>(0);

  const round = roomState.currentRound;
  const isRoundStopped = Boolean(isStopped || round?.stoppedBy || hasTriggeredStop);
  const letter = round?.letter || 'A';
  const me = roomState.players.find((p) => p.id === currentPlayerId);
  const modifier = me?.currentModifier;
  const allowsAnyLetter = modifier?.id === 'LETTER_SWAP';

  // Reset local state when a new round begins
  useEffect(() => {
    setHasTriggeredStop(false);
    setAnswers({});
  }, [round?.roundNumber]);

  // Synchronized countdown timer using absolute server timestamp `endsAt`
  useEffect(() => {
    if (!round) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const remainingMs = Math.max(0, round.endsAt - now);
      const remainingSec = Math.ceil(remainingMs / 1000);

      setTimeLeft(remainingSec);

      // Play tick sound when under 10 seconds remaining (at most once per second)
      if (remainingSec <= 10 && remainingSec > 0 && now - lastTickTime.current > 900) {
        lastTickTime.current = now;
        soundManager.playTick();
      }
    }, 250);

    return () => clearInterval(interval);
  }, [round]);

  // Sync answers with server as player types (only if round is active)
  const handleAnswerChange = (categoryId: string, val: string) => {
    if (isRoundStopped) return;
    const updated = { ...answers, [categoryId]: val };
    setAnswers(updated);
    onSubmitAnswers(updated);
  };

  const activeCategories = DEFAULT_CATEGORIES.filter((c) =>
    roomState.settings.categories.includes(c.id)
  );

  const filledCount = activeCategories.filter((c) => (answers[c.id] || '').trim().length > 0).length;
  const totalCount = activeCategories.length;
  const hasAllFieldsFilled = totalCount > 0 && filledCount === totalCount;

  const handleStopClick = () => {
    if (isRoundStopped) return;
    if (!hasAllFieldsFilled) {
      soundManager.playBuzzer();
      return;
    }
    setHasTriggeredStop(true);
    soundManager.playStop();
    onSubmitAnswers(answers);
    onTriggerStop();
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-20">
      {/* Barra de Estado Superior: Letra, Temporizador y Comodín */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white/90 backdrop-blur-sm p-4 rounded-3xl border-3 border-ink-900 shadow-sketch">
        {/* Sello de Goma: Letra Sorteada */}
        <motion.div
          initial={{ scale: 2, rotate: -25, opacity: 0 }}
          animate={{ scale: 1, rotate: -4, opacity: 1 }}
          transition={{ type: 'spring', damping: 10, stiffness: 200 }}
          className="flex items-center gap-3"
        >
          <div className="rubber-stamp bg-red-50 px-4 py-2 text-center">
            <span className="block text-xs font-hand font-bold tracking-widest text-red-600">
              LETRA
            </span>
            <span className="text-5xl sm:text-6xl font-hand font-black text-red-600 leading-none">
              {letter}
            </span>
          </div>
          <div>
            <span className="font-hand text-xs font-bold text-ink-500 uppercase">
              Ronda {round?.roundNumber} de {roomState.settings.totalRounds}
            </span>
            <span className="block font-hand text-lg font-bold text-ink-900">
              ¡Todas las palabras con '{letter}'!
            </span>
          </div>
        </motion.div>

        {/* Tarjeta de Comodín Secreto (si está activo el modo caos) */}
        {modifier && (
          <motion.div
            initial={{ scale: 0.8, rotate: 3 }}
            animate={{ scale: 1, rotate: 2 }}
            whileHover={{ scale: 1.05 }}
            className="bg-purple-100 border-2 border-purple-900 rounded-2xl p-3 shadow-sketch-sm flex items-center gap-2.5"
          >
            <span className="text-2xl">{modifier.icon}</span>
            <div>
              <span className="block font-hand font-black text-purple-900 text-sm leading-tight">
                {modifier.title}
              </span>
              <span className="font-hand text-xs text-purple-700 max-w-[200px] block leading-tight">
                {modifier.description}
              </span>
            </div>
          </motion.div>
        )}

        {/* Cronómetro Sincronizado */}
        <div
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl border-3 border-ink-900 font-hand text-2xl font-black transition-all ${
            timeLeft <= 10
              ? 'bg-red-500 text-white animate-juicy-pulse shadow-sketch'
              : timeLeft <= 20
              ? 'bg-yellow-300 text-ink-900 shadow-sketch-sm'
              : 'bg-paper-100 text-ink-900 shadow-sketch-sm'
          }`}
        >
          <Clock size={24} className={timeLeft <= 10 ? 'animate-spin' : ''} />
          <span>{timeLeft}s</span>
        </div>
      </div>

      {/* Hoja de Cuaderno Principal: Categorías y Respuestas */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="notebook-sheet rounded-3xl p-6 sm:p-8 border-3 border-ink-900 relative"
      >
        {/* Washi Tape lateral decorativa */}
        <div className="absolute top-4 -right-4 w-28 h-7 washi-tape-pink rotate-12 flex items-center justify-center font-hand text-ink-900 font-bold text-xs select-none">
          NO BORRAR
        </div>

        {/* Banner de STOP activo */}
        {isRoundStopped && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mb-6 p-3 rounded-2xl bg-red-100 border-3 border-ink-900 shadow-sketch-sm flex items-center justify-center gap-3 text-red-900 font-hand text-lg font-bold text-center"
          >
            <span className="text-2xl animate-bounce">🛑</span>
            <span>
              {round?.stoppedBy
                ? `¡${round.stoppedBy.name} gritó STOP! Lápices arriba, congelando respuestas...`
                : '¡STOP Activado! Lápices arriba, congelando respuestas...'}
            </span>
          </motion.div>
        )}

        <div className="space-y-5">
          {activeCategories.map((cat, idx) => {
            const rawVal = answers[cat.id] || '';
            const validation = validateWordLocal(rawVal, letter, allowsAnyLetter);
            const hasText = rawVal.trim().length > 0;

            return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pb-4 border-b-2 border-blue-200/80"
              >
                {/* Etiqueta de Categoría */}
                <div className="sm:w-1/3 flex items-center gap-2">
                  <span className="text-2xl">{cat.icon}</span>
                  <span className="font-hand font-bold text-xl text-ink-900">
                    {cat.label}
                  </span>
                </div>

                {/* Campo de Entrada de Lápiz */}
                <div className="flex-1 relative flex items-center">
                  <input
                    type="text"
                    value={rawVal}
                    disabled={isRoundStopped}
                    placeholder={isRoundStopped ? 'Tiempo terminado' : cat.placeholder}
                    onChange={(e) => handleAnswerChange(cat.id, e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl border-2 border-ink-900 font-hand text-2xl font-bold shadow-sketch-sm transition-all ${
                      isRoundStopped
                        ? 'bg-gray-100/90 text-gray-500 cursor-not-allowed select-none opacity-80'
                        : 'bg-white/80 text-blue-900 focus:outline-none focus:ring-4 focus:ring-yellow-300 placeholder:text-ink-500/50'
                    }`}
                  />

                  {/* Indicador Visual de Validación Local */}
                  <div className="absolute right-3">
                    {hasText && (
                      validation.isValid ? (
                        <CheckCircle2 size={22} className="text-green-600 fill-green-100" />
                      ) : (
                        <div className="group relative">
                          <AlertCircle size={22} className="text-yellow-600 fill-yellow-100" />
                          <span className="hidden group-hover:block absolute right-0 bottom-full mb-1 w-48 p-2 rounded-xl bg-ink-900 text-white font-hand text-xs shadow-sketch z-20">
                            {validation.reason}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Botón Gigante de ¡STOP! */}
        <div className="mt-10 pt-6 flex flex-col items-center justify-center">
          {/* Contador / Indicador de casillas completadas */}
          {!isRoundStopped && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-center gap-2 font-hand text-sm sm:text-base font-bold px-4 py-1.5 rounded-full border-2 border-ink-900 shadow-sketch-sm mb-4 transition-all ${
                hasAllFieldsFilled
                  ? 'bg-green-100 text-green-900 border-green-900'
                  : 'bg-yellow-100 text-ink-900'
              }`}
            >
              <span>{hasAllFieldsFilled ? '✅' : '✏️'}</span>
              <span>
                {hasAllFieldsFilled
                  ? '¡Todas las casillas llenas!'
                  : `Casillas completadas: ${filledCount} de ${totalCount}`}
              </span>
            </motion.div>
          )}

          <motion.button
            type="button"
            onClick={handleStopClick}
            disabled={isRoundStopped || !hasAllFieldsFilled}
            whileHover={isRoundStopped || !hasAllFieldsFilled ? {} : { scale: 1.08, rotate: -2 }}
            whileTap={isRoundStopped || !hasAllFieldsFilled ? {} : { scale: 0.92 }}
            className={`w-44 h-44 sm:w-52 sm:h-52 rounded-full border-4 border-ink-900 font-hand text-4xl sm:text-5xl font-black flex flex-col items-center justify-center gap-1 transition-all ${
              isRoundStopped
                ? 'bg-gray-400 text-white opacity-60 cursor-not-allowed select-none shadow-sketch-sm'
                : !hasAllFieldsFilled
                ? 'bg-amber-100/90 text-ink-900 border-dashed opacity-80 cursor-not-allowed shadow-sketch-sm'
                : 'bg-red-500 hover:bg-red-600 animate-juicy-pulse text-white cursor-pointer shadow-sketch-xl'
            }`}
          >
            <span className="tracking-widest">¡STOP!</span>
            <span className="text-xs sm:text-sm font-hand font-bold uppercase tracking-normal text-center px-4 leading-tight">
              {isRoundStopped
                ? (round?.stoppedBy ? `¡${round.stoppedBy.name} hizo Stop!` : '¡Detenido!')
                : !hasAllFieldsFilled
                ? `Faltan ${totalCount - filledCount} por llenar`
                : '¡LISTO! ¡Basta para todos!'}
            </span>
          </motion.button>
          <span className="font-hand text-ink-600 font-medium text-sm mt-3 text-center max-w-sm">
            {isRoundStopped
              ? 'La ronda ha finalizado. Evaluando respuestas...'
              : !hasAllFieldsFilled
              ? `Debes llenar todas las casillas (${filledCount}/${totalCount}) antes de poder cantar STOP.`
              : '¡Completaste tu hoja! Presiona el botón para congelar a los demás.'}
          </span>
        </div>
      </motion.div>
    </div>
  );
};
