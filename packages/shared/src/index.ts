// ==========================================
// TIPOS DE IDENTIDAD Y SALA
// ==========================================

export type RoomStatus = 'LOBBY' | 'PLAYING' | 'VOTING' | 'ROUND_RECAP' | 'GAME_OVER';

export interface Player {
  id: string;
  name: string;
  avatarId: string;
  isHost: boolean;
  score: number;
  isReady: boolean;
  isOnline: boolean;
  currentModifier?: ChaosModifier | null;
}

export type ChaosModifierType = 'DOUBLE_POINTS' | 'LETTER_SWAP' | 'SHIELD' | 'POINT_STEAL';

export interface ChaosModifier {
  id: ChaosModifierType;
  title: string;
  description: string;
  icon: string;
}

export const CHAOS_MODIFIERS: Record<ChaosModifierType, ChaosModifier> = {
  DOUBLE_POINTS: {
    id: 'DOUBLE_POINTS',
    title: 'Doble Puntuación ⚡',
    description: 'Duplica los puntos obtenidos en tu palabra más votada.',
    icon: '⚡',
  },
  LETTER_SWAP: {
    id: 'LETTER_SWAP',
    title: 'Comodín de Letra 🔀',
    description: 'Te permite usar cualquier letra inicial en una categoría.',
    icon: '🔀',
  },
  SHIELD: {
    id: 'SHIELD',
    title: 'Escudo Escolar 🛡️',
    description: 'Protege contra el 0: garantiza 50 puntos si la palabra es rechazada.',
    icon: '🛡️',
  },
  POINT_STEAL: {
    id: 'POINT_STEAL',
    title: 'Robo de Apuntes 🎒',
    description: 'Roba 25 puntos adicionales al jugador con más aciertos.',
    icon: '🎒',
  },
};

export interface GameCategory {
  id: string;
  label: string;
  icon: string;
  placeholder: string;
}

export const DEFAULT_CATEGORIES: GameCategory[] = [
  { id: 'nombre', label: 'Nombre o Apellido', icon: '👤', placeholder: 'ej. Andrea' },
  { id: 'cosa', label: 'Cosa u Objeto', icon: '📦', placeholder: 'ej. Anillo' },
  { id: 'animal', label: 'Animal', icon: '🐾', placeholder: 'ej. Águila' },
  { id: 'lugar', label: 'País, Ciudad o Lugar', icon: '🌍', placeholder: 'ej. Argentina' },
  { id: 'comida', label: 'Fruta o Comida', icon: '🍎', placeholder: 'ej. Arroz' },
  { id: 'color_profesion', label: 'Color o Profesión', icon: '🎨', placeholder: 'ej. Azul / Arquitecto' },
];

export interface RoomSettings {
  roundDurationSeconds: number; // default: 60
  totalRounds: number; // default: 3
  categories: string[];
  chaosModifiersEnabled: boolean;
}

export interface RoundInfo {
  roundNumber: number;
  letter: string;
  startedAt: number; // epoch ms
  endsAt: number; // epoch ms
  durationSeconds: number;
  stoppedBy?: {
    id: string;
    name: string;
  };
}

export type AnswerStatus = 'VALID_UNIQUE' | 'VALID_DUPLICATE' | 'NEEDS_VOTE' | 'INVALID' | 'VOTED_VALID' | 'VOTED_INVALID';

export interface EvaluatedAnswer {
  category: string;
  rawWord: string;
  normalizedWord: string;
  status: AnswerStatus;
  points: number;
  voteId?: string;
  reason?: string;
}

export interface PlayerRoundResult {
  playerId: string;
  playerName: string;
  avatarId: string;
  answers: Record<string, EvaluatedAnswer>;
  roundPoints: number;
  bonusPoints: number;
  totalRoundPoints: number;
  modifierUsed?: ChaosModifierType | null;
}

export interface VoteCandidate {
  id: string;
  playerId: string;
  playerName: string;
  category: string;
  word: string;
  upvotes: string[]; // player IDs
  downvotes: string[]; // player IDs
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
}

export interface AbsurdNomination {
  id: string;
  playerId: string;
  playerName: string;
  category: string;
  word: string;
  votes: string[]; // player IDs
}

export interface AbsurdWinner {
  nomination: AbsurdNomination;
  totalVotes: number;
  title: string;
}

export interface RoomState {
  code: string;
  status: RoomStatus;
  hostId: string;
  settings: RoomSettings;
  players: Player[];
  currentRound: RoundInfo | null;
  letterHistory: string[];
  pendingVotes: VoteCandidate[];
  votingEndsAt?: number;
  roundResults: PlayerRoundResult[] | null;
  absurdNominations: AbsurdNomination[];
  absurdWinner: AbsurdWinner | null;
}

// ==========================================
// UTILIDADES DE TEXTO Y NORMALIZACIÓN
// ==========================================

export function normalizeWord(word: string): string {
  if (!word) return '';
  return word
    .trim()
    .toLowerCase()
    .replace(/ñ/g, '__enie__')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/__enie__/g, 'ñ')
    .replace(/[^a-zñ0-9\s]/gi, '')
    .trim();
}

export function validateWordLocal(
  rawWord: string,
  expectedLetter: string,
  allowAnyLetter: boolean = false
): { isValid: boolean; normalized: string; reason?: string } {
  const normalized = normalizeWord(rawWord);
  if (!normalized || normalized.length < 2) {
    return { isValid: false, normalized, reason: 'Debe tener al menos 2 letras' };
  }

  if (allowAnyLetter) {
    return { isValid: true, normalized };
  }

  const firstLetter = normalized[0].toUpperCase();
  const target = expectedLetter.toUpperCase();

  if (firstLetter !== target) {
    return {
      isValid: false,
      normalized,
      reason: `Debe comenzar con la letra '${target}'`,
    };
  }

  return { isValid: true, normalized };
}

// ==========================================
// EVENTOS DE WEBSOCKET (CONTRATOS)
// ==========================================

export const MAX_PLAYERS_PER_ROOM = 8;

export type ClientToServerEvents = {
  'room:create': (data: { name: string; avatarId: string }) => void;
  'room:join': (data: { code: string; name: string; avatarId: string; playerId?: string }) => void;
  'room:leave': () => void;
  'room:kick_player': (data: { targetPlayerId: string }) => void;
  'room:update_settings': (data: { settings: Partial<RoomSettings> }) => void;
  'game:start': () => void;
  'round:submit_answers': (data: { answers: Record<string, string> }) => void;
  'round:trigger_stop': () => void;
  'vote:cast': (data: { voteId: string; accept: boolean }) => void;
  'absurd:vote': (data: { nominationId: string }) => void;
  'recap:next_round': () => void;
  'game:restart': () => void;
};

export type ServerToClientEvents = {
  'room:state': (state: RoomState) => void;
  'room:error': (data: { message: string }) => void;
  'room:kicked': (data: { message: string }) => void;
  'round:stop_triggered': (data: { stoppedBy: { id: string; name: string } }) => void;
  'sound:play': (data: { sound: 'tick' | 'stop' | 'paper' | 'cheer' | 'buzzer' | 'pop' }) => void;
};

export interface WsMessage<T = unknown> {
  event: string;
  payload: T;
}

// Avatares disponibles para bocetos
export interface DoodleAvatar {
  id: string;
  name: string;
  description: string;
}

export const DOODLE_AVATARS: DoodleAvatar[] = [
  { id: 'garabato-feliz', name: 'Carita Garabato', description: 'Siempre sonriente y despistado' },
  { id: 'gato-bigotes', name: 'Gatito de Tiza', description: 'Travieso y curioso' },
  { id: 'monstruo-ojo', name: 'Cíclope Escolar', description: 'Lo ve todo en el examen' },
  { id: 'alien-divertido', name: 'Alien de Plastilina', description: 'Viene de otra galaxia de letras' },
  { id: 'robot-carton', name: 'Robot de Cartón', description: 'Calculador pero torpe' },
  { id: 'tostada-kawaii', name: 'Tostada con Mantequilla', description: 'Crujiente y optimista' },
  { id: 'pulpo-tinta', name: 'Pulpo Manchado', description: 'Escribe 8 palabras a la vez' },
  { id: 'estrella-rock', name: 'Estrellita Rebelde', description: 'Siempre quiere el 100' },
];
