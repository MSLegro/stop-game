import React from 'react';
import { motion } from 'framer-motion';
import type { RoomState } from '@stop/shared';
import { DEFAULT_CATEGORIES } from '@stop/shared';
import { DoodleAvatar } from '../components/DoodleAvatar.js';
import { soundManager } from '../utils/audio.js';
import { Trophy, Flame, ArrowRight, Zap, Award } from 'lucide-react';

interface RecapViewProps {
  roomState: RoomState;
  currentPlayerId: string;
  onVoteAbsurd: (nominationId: string) => void;
  onNextRound: () => void;
}

export const RecapView: React.FC<RecapViewProps> = ({
  roomState,
  currentPlayerId,
  onVoteAbsurd,
  onNextRound,
}) => {
  const isHost = roomState.hostId === currentPlayerId;
  const currentRoundNum = roomState.currentRound?.roundNumber || 1;
  const isLastRound = currentRoundNum >= roomState.settings.totalRounds;
  const results = roomState.roundResults || [];

  const handleAbsurdVote = (id: string) => {
    soundManager.playPop();
    onVoteAbsurd(id);
  };

  const getCategoryLabel = (id: string) => {
    const c = DEFAULT_CATEGORIES.find((cat) => cat.id === id);
    return c ? c.label : id;
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 pb-16">
      {/* Cabecera de la Ronda */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-block bg-yellow-200 border-3 border-ink-900 rounded-3xl px-8 py-3 shadow-sketch"
        >
          <span className="font-hand text-xs font-black text-ink-700 uppercase tracking-widest block">
            Resumen de Calificaciones
          </span>
          <h2 className="font-hand text-4xl sm:text-5xl font-black text-ink-900">
            Ronda {currentRoundNum} (Letra: '{roomState.currentRound?.letter}')
          </h2>
        </motion.div>
      </div>

      {/* Salón de la Fama de Respuestas Absurdas: "El Rincón de la Vergüenza" */}
      <div className="bg-purple-100 rounded-3xl p-6 border-3 border-ink-900 shadow-sketch relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Flame className="text-red-500 fill-yellow-400" size={28} />
            <h3 className="font-hand text-3xl font-black text-ink-900">
              El Rincón de la Vergüenza
            </h3>
          </div>
          <span className="font-hand text-sm text-purple-900 font-semibold bg-purple-200 px-3 py-1 rounded-xl border border-purple-900">
            ¡Vota la respuesta más bizarra o graciosa!
          </span>
        </div>

        {/* Ganador actual del rincón absurdo */}
        {roomState.absurdWinner && (
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="mb-4 p-4 rounded-2xl bg-yellow-300 border-3 border-ink-900 shadow-sketch flex items-center gap-4"
          >
            <Award className="text-red-600 shrink-0" size={36} />
            <div>
              <span className="font-hand font-black text-lg text-red-600 block leading-tight">
                {roomState.absurdWinner.title} ({roomState.absurdWinner.totalVotes} votos)
              </span>
              <span className="font-hand font-bold text-2xl text-ink-900">
                "{roomState.absurdWinner.nomination.word}" ({getCategoryLabel(roomState.absurdWinner.nomination.category)})
              </span>
              <span className="font-hand text-sm text-ink-700 block">
                Por el ilustre estudiante: <strong>{roomState.absurdWinner.nomination.playerName}</strong>
              </span>
            </div>
          </motion.div>
        )}

        {/* Tarjetas de nominados */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {roomState.absurdNominations.map((nom) => {
            const hasVoted = nom.votes.includes(currentPlayerId);
            return (
              <motion.button
                key={nom.id}
                type="button"
                onClick={() => handleAbsurdVote(nom.id)}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className={`p-3 rounded-2xl border-2 border-ink-900 text-left transition-all ${
                  hasVoted
                    ? 'bg-yellow-300 shadow-sketch-sm ring-2 ring-red-500'
                    : 'bg-white hover:bg-yellow-50'
                }`}
              >
                <span className="font-hand text-xs font-bold text-ink-500 block truncate">
                  {getCategoryLabel(nom.category)} • {nom.playerName}
                </span>
                <span className="font-hand text-xl font-bold text-ink-900 block truncate mt-0.5">
                  "{nom.word}"
                </span>
                <span className="font-hand text-xs font-semibold text-purple-700 block mt-1">
                  👍 {nom.votes.length} {nom.votes.length === 1 ? 'voto cómico' : 'votos cómicos'}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Tabla Cuaderno de Calificaciones por Jugador */}
      <div className="notebook-sheet rounded-3xl p-6 sm:p-8 border-3 border-ink-900 space-y-6">
        <h3 className="font-hand text-3xl font-black text-ink-900 flex items-center gap-2">
          <span>📝 Puntuaciones de la Ronda</span>
        </h3>

        <div className="space-y-6">
          {results.map((res) => {
            const isMe = res.playerId === currentPlayerId;
            return (
              <div
                key={res.playerId}
                className={`p-5 rounded-2xl border-2 border-ink-900 ${
                  isMe ? 'bg-yellow-50/90 shadow-sketch-sm' : 'bg-white'
                }`}
              >
                {/* Cabecera de jugador y puntos totales */}
                <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b-2 border-dashed border-ink-700/20">
                  <div className="flex items-center gap-3">
                    <DoodleAvatar avatarId={res.avatarId} size="md" />
                    <div>
                      <span className="font-hand text-2xl font-bold text-ink-900">
                        {res.playerName} {isMe && '(Tú)'}
                      </span>
                      {res.modifierUsed && (
                        <span className="block font-hand text-xs text-purple-700 font-semibold">
                          ⚡ Comodín: {res.modifierUsed} (+{res.bonusPoints} pts extra)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-hand text-3xl font-black text-red-600">
                      +{res.totalRoundPoints} pts
                    </span>
                    <span className="block font-hand text-xs text-ink-500">
                      Total acumulado: {roomState.players.find((p) => p.id === res.playerId)?.score || 0} pts
                    </span>
                  </div>
                </div>

                {/* Desglose de Categorías */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  {roomState.settings.categories.map((catId) => {
                    const ans = res.answers[catId];
                    const pts = ans ? ans.points : 0;
                    const word = ans?.rawWord || '-';

                    return (
                      <div
                        key={catId}
                        className={`p-2 rounded-xl border text-center ${
                          pts === 100
                            ? 'bg-green-100 border-green-600 text-green-900'
                            : pts === 50
                            ? 'bg-blue-100 border-blue-600 text-blue-900'
                            : 'bg-red-50 border-red-300 text-red-700 opacity-70'
                        }`}
                      >
                        <span className="block font-hand text-[10px] font-bold uppercase truncate">
                          {getCategoryLabel(catId)}
                        </span>
                        <span className="block font-hand text-base font-bold truncate mt-0.5">
                          {word}
                        </span>
                        <span className="block font-hand text-xs font-black mt-0.5">
                          {pts > 0 ? `+${pts}` : '0'} pts
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Botón de Siguiente Ronda */}
        <div className="pt-4 border-t-2 border-dashed border-ink-700/30 flex justify-center">
          {isHost ? (
            <motion.button
              type="button"
              onClick={() => {
                soundManager.playPaper();
                onNextRound();
              }}
              whileHover={{ scale: 1.05, rotate: -1 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-3.5 rounded-2xl bg-red-500 text-white font-hand text-2xl font-black border-3 border-ink-900 shadow-sketch hover:bg-red-600 flex items-center gap-3 cursor-pointer"
            >
              <span>{isLastRound ? '¡Ver Podio Final!' : '¡Siguiente Ronda!'}</span>
              <ArrowRight size={24} />
            </motion.button>
          ) : (
            <div className="font-hand text-lg text-ink-700 flex items-center gap-2">
              <span className="animate-spin">⏳</span>
              <span>Esperando a que el anfitrión avance...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
