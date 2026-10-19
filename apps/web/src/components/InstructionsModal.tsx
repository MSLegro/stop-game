import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, X, Sparkles, Award, Zap, AlertTriangle } from 'lucide-react';
import { soundManager } from '../utils/audio.js';

interface InstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstructionsModal: React.FC<InstructionsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleClose = () => {
    soundManager.playPop();
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-ink-900/60 backdrop-blur-sm select-none">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="relative max-w-xl w-full"
        >
          {/* Washi Tape Superior descansando sobre el borde (sin recorte de overflow) */}
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-44 h-8 washi-tape rotate-[-1.5deg] flex items-center justify-center font-hand text-ink-900 font-bold text-xs tracking-wider select-none z-30 shadow-sketch-sm">
            ★ GUÍA ESCOLAR ★
          </div>

          {/* Contenido scrolleable de la libreta */}
          <div className="notebook-sheet rounded-3xl p-6 sm:p-8 pt-8 border-4 border-ink-900 shadow-sketch-xl max-h-[82vh] overflow-y-auto relative">
            {/* Botón Cerrar */}
            <button
              type="button"
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 rounded-xl bg-white border-2 border-ink-900 shadow-sketch-sm hover:bg-red-50 text-ink-900 transition-all cursor-pointer z-20"
              title="Cerrar instrucciones"
            >
              <X size={20} />
            </button>

            {/* Encabezado */}
            <div className="text-center mt-2 mb-6">
              <h2 className="font-hand font-black text-3xl sm:text-4xl text-ink-900 flex items-center justify-center gap-2">
                <BookOpen size={32} className="text-blue-600" />
                <span>¿Cómo se Juega a Stop!?</span>
              </h2>
              <p className="font-hand text-base text-ink-600 mt-1">
                Las reglas oficiales de lápiz y papel explicadas para todos.
              </p>
            </div>

            <div className="space-y-5 font-hand text-ink-900">
              {/* 1. Objetivo */}
              <div className="p-3.5 bg-yellow-50 rounded-2xl border-2 border-ink-900 shadow-sketch-sm">
                <h3 className="font-bold text-xl text-ink-900 flex items-center gap-2 mb-1">
                  <span>🎯</span>
                  <span>1. El Objetivo del Juego</span>
                </h3>
                <p className="text-base text-ink-700 leading-snug">
                  En cada ronda se sortea una <strong>Letra Secreta</strong>. Debes escribir lo más rápido posible una palabra válida que comience con esa letra para cada categoría.
                </p>
              </div>

              {/* 2. Puntuación */}
              <div className="p-3.5 notebook-grid-subtle rounded-2xl border-2 border-ink-900 shadow-sketch-sm">
                <h3 className="font-bold text-xl text-ink-900 flex items-center gap-2 mb-2">
                  <Award size={22} className="text-yellow-600" />
                  <span>2. ¿Cómo se Ganan Puntos?</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-center">
                  <div className="p-2.5 rounded-xl bg-green-50 border border-green-800">
                    <span className="block text-2xl font-black text-green-700">100 pts</span>
                    <span className="text-xs text-green-900 font-semibold block leading-tight">
                      Palabra válida y única (nadie más la puso).
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-yellow-50 border border-yellow-800">
                    <span className="block text-2xl font-black text-yellow-700">50 pts</span>
                    <span className="text-xs text-yellow-900 font-semibold block leading-tight">
                      Palabra válida pero repetida por otro jugador.
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-800">
                    <span className="block text-2xl font-black text-red-600">0 pts</span>
                    <span className="text-xs text-red-900 font-semibold block leading-tight">
                      Casilla vacía o rechazada en la votación.
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. El ¡STOP! */}
              <div className="p-3.5 bg-red-50 rounded-2xl border-2 border-ink-900 shadow-sketch-sm">
                <h3 className="font-bold text-xl text-red-900 flex items-center gap-2 mb-1">
                  <span>🛑</span>
                  <span>3. ¡Gritar STOP!</span>
                </h3>
                <p className="text-base text-ink-700 leading-snug">
                  El botón gigante de ¡STOP! se activa en cuanto tengas <strong>al menos una palabra escrita</strong>. Al presionarlo, ¡lápices arriba! Se congelan los cuadernos de todos los jugadores de inmediato.
                </p>
              </div>

              {/* 4. Modo Caos y Comodines */}
              <div className="p-3.5 bg-purple-50 rounded-2xl border-2 border-ink-900 shadow-sketch-sm">
                <h3 className="font-bold text-xl text-purple-900 flex items-center gap-2 mb-2">
                  <Zap size={20} className="text-purple-600 fill-purple-300" />
                  <span>4. Comodines del Modo Caos</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-white/80 rounded-xl border border-purple-300">
                    <span className="font-bold text-sm text-purple-900 block">⚡ Doble Puntuación</span>
                    <span className="text-ink-600">Duplica los puntos obtenidos en tu palabra con mejor calificación.</span>
                  </div>
                  <div className="p-2 bg-white/80 rounded-xl border border-purple-300">
                    <span className="font-bold text-sm text-purple-900 block">🔀 Comodín de Letra</span>
                    <span className="text-ink-600">Te permite usar cualquier letra inicial en una categoría.</span>
                  </div>
                  <div className="p-2 bg-white/80 rounded-xl border border-purple-300">
                    <span className="font-bold text-sm text-purple-900 block">🛡️ Escudo Escolar</span>
                    <span className="text-ink-600">Garantiza 50 puntos de protección si una palabra es rechazada.</span>
                  </div>
                  <div className="p-2 bg-white/80 rounded-xl border border-purple-300">
                    <span className="font-bold text-sm text-purple-900 block">🎒 Robo de Apuntes</span>
                    <span className="text-ink-600">Roba 25 puntos adicionales al jugador con más aciertos.</span>
                  </div>
                </div>
              </div>

              {/* 5. Votación y Rincón de la Vergüenza */}
              <div className="p-3.5 bg-paper-100 rounded-2xl border-2 border-ink-900 shadow-sketch-sm">
                <h3 className="font-bold text-xl text-ink-900 flex items-center gap-2 mb-1">
                  <span>🎭</span>
                  <span>5. Rincón de la Vergüenza</span>
                </h3>
                <p className="text-base text-ink-700 leading-snug">
                  Si una palabra no está en el diccionario, la sala vota en vivo si es válida o inventada. Al final de la ronda, todos eligen la respuesta más cómica o absurda.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={handleClose}
                className="px-8 py-3 rounded-2xl bg-yellow-300 hover:bg-yellow-400 font-hand font-black text-xl text-ink-900 border-3 border-ink-900 shadow-sketch transition-all cursor-pointer"
              >
                ¡Entendido, a Jugar! ✏️
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
