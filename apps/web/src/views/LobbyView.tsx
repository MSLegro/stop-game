import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DOODLE_AVATARS } from '@stop/shared';
import { DoodleAvatar } from '../components/DoodleAvatar.js';
import { soundManager } from '../utils/audio.js';
import { Sparkles, Users, PlusCircle, ArrowRight } from 'lucide-react';

interface LobbyViewProps {
  onCreateRoom: (name: string, avatarId: string) => void;
  onJoinRoom: (code: string, name: string, avatarId: string) => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({ onCreateRoom, onJoinRoom }) => {
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('garabato-feliz');

  const handleTabChange = (newTab: 'create' | 'join') => {
    soundManager.playPop();
    setTab(newTab);
  };

  const handleAvatarSelect = (id: string) => {
    soundManager.playPop();
    setSelectedAvatar(id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    soundManager.playPaper();
    if (tab === 'create') {
      onCreateRoom(name.trim(), selectedAvatar);
    } else {
      if (!roomCode.trim()) return;
      onJoinRoom(roomCode.trim().toUpperCase(), name.trim(), selectedAvatar);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Portada de Cuaderno Escolar */}
      <motion.div
        initial={{ opacity: 0, y: 20, rotate: -1 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        transition={{ type: 'spring', damping: 15 }}
        className="notebook-sheet rounded-3xl p-6 sm:p-8 relative border-4 border-ink-900"
      >
        {/* Washi Tape decorativa superior */}
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-36 h-8 washi-tape rotate-[-2deg] flex items-center justify-center font-hand text-ink-900 font-bold tracking-wider text-sm select-none z-10">
          ★ TUTTI FRUTTI ★
        </div>

        {/* Título de la libreta */}
        <div className="text-center mt-3 mb-6">
          <motion.div
            className="inline-block"
            whileHover={{ scale: 1.05, rotate: 2 }}
            whileTap={{ scale: 0.95 }}
          >
            <h1 className="text-5xl sm:text-6xl font-hand font-extrabold tracking-tight text-ink-900 flex items-center justify-center gap-3">
              <span>¡STOP!</span>
              <span className="text-red-500 text-4xl sm:text-5xl">✏️</span>
            </h1>
          </motion.div>
          <p className="font-hand text-lg text-ink-700 mt-1">
            El clásico juego escolar de lápiz y papel, ahora multijugador en vivo.
          </p>
        </div>

        {/* Selector de Pestaña: Crear o Unirse */}
        <div className="flex gap-3 mb-6 p-1.5 bg-paper-300/80 rounded-2xl border-2 border-ink-900">
          <button
            type="button"
            onClick={() => handleTabChange('create')}
            className={`flex-1 py-2.5 px-3 rounded-xl font-hand text-lg font-bold flex items-center justify-center gap-2 transition-all ${
              tab === 'create'
                ? 'bg-yellow-300 text-ink-900 border-2 border-ink-900 shadow-sketch-sm'
                : 'text-ink-700 hover:text-ink-900'
            }`}
          >
            <PlusCircle size={20} />
            Crear Sala
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('join')}
            className={`flex-1 py-2.5 px-3 rounded-xl font-hand text-lg font-bold flex items-center justify-center gap-2 transition-all ${
              tab === 'join'
                ? 'bg-yellow-300 text-ink-900 border-2 border-ink-900 shadow-sketch-sm'
                : 'text-ink-700 hover:text-ink-900'
            }`}
          >
            <Users size={20} />
            Unirse con PIN
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Selección de Avatar Garabato */}
          <div>
            <label className="block font-hand font-bold text-lg text-ink-900 mb-2">
              1. Escoge tu personaje de boceto:
            </label>
            <div className="grid grid-cols-4 gap-3 p-3 bg-paper-200/90 rounded-2xl border-2 border-ink-900">
              {DOODLE_AVATARS.map((avatar) => {
                const isSelected = selectedAvatar === avatar.id;
                return (
                  <motion.button
                    key={avatar.id}
                    type="button"
                    onClick={() => handleAvatarSelect(avatar.id)}
                    whileHover={{ scale: 1.1, rotate: isSelected ? 0 : 3 }}
                    whileTap={{ scale: 0.9 }}
                    className={`relative p-2 rounded-2xl flex flex-col items-center transition-all ${
                      isSelected
                        ? 'bg-yellow-200 ring-4 ring-red-500 scale-105 shadow-sketch-sm'
                        : 'hover:bg-white'
                    }`}
                    title={avatar.name}
                  >
                    <DoodleAvatar avatarId={avatar.id} size="md" />
                    <span className="text-[11px] font-hand font-semibold text-ink-700 mt-1 truncate max-w-[65px] text-center">
                      {avatar.name.split(' ')[0]}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Nombre / Apodo */}
          <div>
            <label className="block font-hand font-bold text-lg text-ink-900 mb-1">
              2. Tu nombre o apodo en el cuaderno:
            </label>
            <input
              type="text"
              required
              maxLength={20}
              placeholder="ej. El Rayador Loco"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border-3 border-ink-900 bg-white font-hand text-xl text-ink-900 shadow-sketch-sm focus:outline-none focus:ring-4 focus:ring-yellow-300 transition-all placeholder:text-ink-500"
            />
          </div>

          {/* Código PIN si es Unirse */}
          <AnimatePresence initial={false}>
            {tab === 'join' && (
              <motion.div
                key="join-pin-field"
                initial={{ opacity: 0, height: 0, y: -6 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -6 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className="overflow-hidden p-1 -m-1"
              >
                <label className="block font-hand font-bold text-lg text-ink-900 mb-1">
                  3. Código PIN de 4 caracteres:
                </label>
                <input
                  type="text"
                  required
                  maxLength={4}
                  placeholder="ej. KZ79"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase())}
                  className="w-full px-4 py-3 rounded-2xl border-3 border-ink-900 bg-white font-hand text-2xl tracking-widest text-center uppercase text-red-600 font-extrabold shadow-sketch-sm focus:outline-none focus:ring-4 focus:ring-yellow-300 transition-all placeholder:text-ink-500 placeholder:tracking-normal"
                />
                {!name.trim() && (
                  <span className="block font-hand text-sm text-red-600 font-bold mt-1 text-center">
                    👆 Recuerda escribir tu apodo en el paso 2 arriba
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Botón de Acción Principal */}
          <motion.button
            type="submit"
            disabled={!name.trim() || (tab === 'join' && roomCode.length < 4)}
            whileHover={{ scale: 1.03, rotate: -1 }}
            whileTap={{ scale: 0.97 }}
            className={`w-full py-4 px-6 rounded-2xl border-3 border-ink-900 font-hand text-2xl font-black flex items-center justify-center gap-3 transition-all ${
              name.trim() && (tab === 'create' || roomCode.length === 4)
                ? 'bg-red-500 text-white shadow-sketch hover:bg-red-600 cursor-pointer'
                : 'bg-paper-300 text-ink-500 border-dashed cursor-not-allowed'
            }`}
          >
            {tab === 'create' ? (
              <>
                <Sparkles size={24} />
                <span>¡Crear Sala y Cuaderno!</span>
              </>
            ) : (
              <>
                <span>¡Entrar a la Sala!</span>
                <ArrowRight size={24} />
              </>
            )}
          </motion.button>
        </form>

        {/* Footer con toque lúdico */}
        <div className="mt-6 pt-4 border-t-2 border-dashed border-ink-700/30 text-center font-hand text-sm text-ink-700 flex items-center justify-center gap-2">
          <span>🎒 Modo Caos con Comodines</span>
          <span>•</span>
          <span>⚡ Votación Social en Vivo</span>
          <span>•</span>
          <span>🏆 Salón Absurdo</span>
        </div>
      </motion.div>
    </div>
  );
};
