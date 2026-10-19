import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { DoodleAvatar } from './DoodleAvatar.js';

interface StopOverlayProps {
  stoppedBy: { id: string; name: string } | null;
  avatarId?: string;
  onDismiss?: () => void;
}

export const StopOverlay: React.FC<StopOverlayProps> = ({
  stoppedBy,
  avatarId,
  onDismiss,
}) => {
  useEffect(() => {
    if (!stoppedBy) return;
    const timer = setTimeout(() => {
      onDismiss?.();
    }, 3500);
    return () => clearTimeout(timer);
  }, [stoppedBy, onDismiss]);

  if (!stoppedBy) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.25 } }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/60 backdrop-blur-sm select-none"
    >
      <motion.div
        initial={{ scale: 0.82, y: 24, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.88, y: -16, opacity: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 280 }}
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-md w-full notebook-sheet border-4 border-ink-900 rounded-3xl p-6 sm:p-8 text-center shadow-sketch-xl overflow-hidden"
      >
        {/* Cinta washi tape decorativa en la parte superior */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-32 h-6 bg-red-400/80 border border-ink-900 shadow-sketch-sm rotate-1 z-10" />

        {/* Sello de caucho STOP con animación de impacto elástica y limpia */}
        <motion.div
          initial={{ scale: 1.5, opacity: 0, rotate: -10 }}
          animate={{ scale: 1, opacity: 1, rotate: -3 }}
          transition={{ delay: 0.1, type: 'spring', damping: 14, stiffness: 340 }}
          className="rubber-stamp bg-red-100 border-4 border-red-700 px-6 py-2.5 rounded-2xl inline-block shadow-sketch mb-3 mt-2"
        >
          <span className="font-hand font-black text-5xl sm:text-6xl text-red-600 tracking-widest block leading-none">
            ¡¡STOOOP!!
          </span>
        </motion.div>

        {/* Post-it de quién gritó Stop con su avatar doodle */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-center gap-3.5 bg-yellow-200 border-2 border-ink-900 rounded-2xl p-3 shadow-sketch-sm my-3 rotate-1"
        >
          {avatarId ? (
            <DoodleAvatar avatarId={avatarId} size="md" />
          ) : (
            <span className="text-3xl">🛑</span>
          )}
          <div className="text-left min-w-0">
            <span className="block font-hand text-xs font-bold text-ink-600 uppercase tracking-wider">
              Gritado por
            </span>
            <span className="font-hand text-2xl font-black text-ink-900 leading-tight truncate block">
              {stoppedBy.name}
            </span>
          </div>
        </motion.div>

        <p className="font-hand text-xl font-bold text-ink-800 mt-2">
          ✏️ ¡Lápices arriba! Congelando cuadernos...
        </p>

        {/* Barra de progreso / cuenta regresiva hacia calificaciones */}
        <div className="mt-5 w-full bg-paper-200 border-2 border-ink-900 rounded-full h-3 overflow-hidden p-0.5">
          <motion.div
            className="bg-red-500 h-full rounded-full"
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: 3.5, ease: 'linear' }}
          />
        </div>
        <span className="block mt-1.5 font-hand text-xs font-bold text-ink-500">
          Revisando las palabras de la ronda...
        </span>
      </motion.div>
    </motion.div>
  );
};
