import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, AlertTriangle, ArrowLeft } from 'lucide-react';
import { soundManager } from '../utils/audio.js';

interface ConfirmLeaveModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmLeaveModal: React.FC<ConfirmLeaveModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    soundManager.playPaper();
    onConfirm();
  };

  const handleCancel = () => {
    soundManager.playPop();
    onCancel();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/60 backdrop-blur-sm select-none">
        <motion.div
          initial={{ scale: 0.85, opacity: 0, rotate: -2 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 350 }}
          className="relative max-w-md w-full notebook-sheet rounded-3xl p-6 sm:p-8 border-4 border-ink-900 shadow-sketch-xl text-center"
        >
          {/* Washi Tape */}
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-32 h-7 washi-tape-pink rotate-1 flex items-center justify-center font-hand text-ink-900 font-bold text-xs select-none">
            AVISO
          </div>

          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-100 border-3 border-ink-900 shadow-sketch-sm flex items-center justify-center text-amber-700">
            <Home size={32} />
          </div>

          <h3 className="font-hand font-black text-2xl sm:text-3xl text-ink-900 mb-2">
            ¿Deseas salir al menú principal?
          </h3>

          <p className="font-hand text-base text-ink-700 mb-6 leading-snug">
            Saldrás de la libreta actual. Podrás volver a entrar con el código PIN de la sala si la partida sigue abierta.
          </p>

          <div className="flex gap-3 justify-center">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 py-3 px-4 rounded-2xl bg-white border-2 border-ink-900 font-hand font-bold text-lg text-ink-900 shadow-sketch-sm hover:bg-paper-100 transition-all cursor-pointer"
            >
              Quedarme aquí
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 py-3 px-4 rounded-2xl bg-red-500 border-2 border-ink-900 font-hand font-black text-lg text-white shadow-sketch hover:bg-red-600 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Sí, salir</span>
              <ArrowLeft size={18} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
