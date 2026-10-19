import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { RoomState } from '@stop/shared';
import { DEFAULT_CATEGORIES } from '@stop/shared';
import { soundManager } from '../utils/audio.js';
import { ThumbsUp, ThumbsDown, Clock, HelpCircle, Check, X } from 'lucide-react';

interface VotingViewProps {
  roomState: RoomState;
  currentPlayerId: string;
  onCastVote: (voteId: string, accept: boolean) => void;
}

export const VotingView: React.FC<VotingViewProps> = ({
  roomState,
  currentPlayerId,
  onCastVote,
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(30);

  useEffect(() => {
    if (!roomState.votingEndsAt) return;
    const interval = setInterval(() => {
      const remainingMs = Math.max(0, (roomState.votingEndsAt || 0) - Date.now());
      const sec = Math.ceil(remainingMs / 1000);
      setTimeLeft(sec);
    }, 250);
    return () => clearInterval(interval);
  }, [roomState.votingEndsAt]);

  const candidates = roomState.pendingVotes;

  const handleVote = (voteId: string, accept: boolean) => {
    soundManager.playPop();
    onCastVote(voteId, accept);
  };

  const getCategoryLabel = (id: string) => {
    const c = DEFAULT_CATEGORIES.find((cat) => cat.id === id);
    return c ? `${c.icon} ${c.label}` : id;
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Encabezado de Votación Relámpago */}
      <div className="notebook-sheet rounded-3xl p-6 border-3 border-ink-900 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="font-hand text-3xl font-black text-ink-900 flex items-center gap-2">
            <HelpCircle size={28} className="text-yellow-600" />
            <span>Votación Relámpago de la Sala</span>
          </h2>
          <p className="font-hand text-ink-700 text-base">
            Estas palabras no están en el diccionario oficial. ¿Se las valen o inventaron?
          </p>
        </div>

        {/* Cronómetro de votación */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-yellow-300 border-2 border-ink-900 shadow-sketch-sm font-hand text-2xl font-black text-ink-900">
          <Clock size={20} />
          <span>{timeLeft}s</span>
        </div>
      </div>

      {/* Lista de Tarjetas de Votación */}
      <div className="space-y-4">
        {candidates.map((cand) => {
          const isMyWord = cand.playerId === currentPlayerId;
          const hasUpvoted = cand.upvotes.includes(currentPlayerId);
          const hasDownvoted = cand.downvotes.includes(currentPlayerId);

          return (
            <motion.div
              key={cand.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl p-5 border-3 border-ink-900 shadow-sketch flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div>
                <span className="font-hand text-xs font-bold text-ink-500 uppercase tracking-wider block">
                  {getCategoryLabel(cand.category)} • Por: {cand.playerName} {isMyWord && '(Tú)'}
                </span>
                <span className="font-hand text-3xl font-black text-blue-900 tracking-wide block mt-1">
                  "{cand.word}"
                </span>
              </div>

              {/* Controles de Voto */}
              <div className="flex items-center gap-3">
                {isMyWord ? (
                  <span className="font-hand text-sm text-ink-500 italic bg-paper-100 px-3 py-1.5 rounded-xl border border-ink-900">
                    Tu palabra (no puedes votarte)
                  </span>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleVote(cand.id, true)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-hand font-bold text-lg border-2 border-ink-900 transition-all ${
                        hasUpvoted
                          ? 'bg-green-400 text-ink-900 shadow-sketch-sm scale-105'
                          : 'bg-paper-100 hover:bg-green-100 text-ink-700'
                      }`}
                    >
                      <ThumbsUp size={18} />
                      <span>¡Válida! ({cand.upvotes.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleVote(cand.id, false)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-hand font-bold text-lg border-2 border-ink-900 transition-all ${
                        hasDownvoted
                          ? 'bg-red-400 text-white shadow-sketch-sm scale-105'
                          : 'bg-paper-100 hover:bg-red-100 text-ink-700'
                      }`}
                    >
                      <ThumbsDown size={18} />
                      <span>Rechazar ({cand.downvotes.length})</span>
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
