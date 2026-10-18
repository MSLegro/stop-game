import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface StopOverlayProps {
  stoppedBy: { id: string; name: string } | null;
  onDismiss?: () => void;
}

export const StopOverlay: React.FC<StopOverlayProps> = ({ stoppedBy, onDismiss }) => {
  useEffect(() => {
    if (!stoppedBy) return;
    const timer = setTimeout(() => {
      onDismiss?.();
    }, 2800);
    return () => clearTimeout(timer);
  }, [stoppedBy, onDismiss]);

  if (!stoppedBy) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/60 backdrop-blur-sm select-none"
      >
        <motion.div
          initial={{ scale: 0.2, rotate: -20, opacity: 0 }}
          animate={{
            scale: [0.2, 1.25, 1],
            rotate: [-20, 5, -2],
            opacity: 1,
          }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{
            duration: 0.5,
            times: [0, 0.7, 1],
            type: 'spring',
            stiffness: 300,
            damping: 15,
          }}
          onClick={(e) => e.stopPropagation()}
          className="relative max-w-lg w-full bg-red-500 border-4 border-ink-900 rounded-3xl p-8 sm:p-12 text-center shadow-sketch-xl overflow-hidden"
        >
          {/* Estrellas cómicas decorativas */}
          <div className="absolute top-2 left-4 text-yellow-300 text-3xl animate-bounce">
            ★
          </div>
          <div className="absolute bottom-2 right-4 text-yellow-300 text-4xl animate-pulse">
            💥
          </div>

          <h2 className="font-hand font-black text-6xl sm:text-7xl text-white tracking-widest drop-shadow-[4px_4px_0px_#18181b]">
            ¡¡STOOOP!!
          </h2>

          <div className="mt-4 p-3 bg-yellow-300 border-2 border-ink-900 rounded-2xl shadow-sketch-sm inline-block">
            <span className="font-hand text-xl font-bold text-ink-900">
              Gritado por: <span className="text-red-700 underline">{stoppedBy.name}</span>
            </span>
          </div>

          <p className="mt-4 font-hand text-lg text-white font-medium">
            ¡Lápices arriba! Congelando cuadernos y revisando palabras...
          </p>

          <div className="mt-6">
            <motion.button
              type="button"
              onClick={() => onDismiss?.()}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-2.5 rounded-2xl bg-white border-3 border-ink-900 font-hand font-black text-lg text-ink-900 shadow-sketch hover:bg-yellow-100 transition-all cursor-pointer"
            >
              Continuar a Calificaciones →
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
