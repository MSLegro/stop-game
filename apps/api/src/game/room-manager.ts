import { randomUUID } from 'crypto';
import type { WebSocket } from 'ws';
import {
  RoomState,
  RoomStatus,
  Player,
  RoomSettings,
  RoundInfo,
  VoteCandidate,
  PlayerRoundResult,
  AbsurdNomination,
  AbsurdWinner,
  ChaosModifierType,
  CHAOS_MODIFIERS,
  DEFAULT_CATEGORIES,
  validateWordLocal,
  normalizeWord,
  EvaluatedAnswer,
  MAX_PLAYERS_PER_ROOM,
} from '@stop/shared';
import { isWordInDictionary, registerWordInDictionary, getDb, schema } from '../db/index.js';

const AVAILABLE_LETTERS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
  'L', 'M', 'N', 'O', 'P', 'R', 'S', 'T', 'U', 'V',
];

interface ConnectedClient {
  ws: WebSocket;
  playerId: string;
  roomCode: string;
}

export class RoomManager {
  private rooms: Map<string, RoomState> = new Map();
  private clients: Map<string, ConnectedClient> = new Map(); // wsId -> client
  private socketToClient: Map<WebSocket, string> = new Map();
  private roundTimers: Map<string, NodeJS.Timeout> = new Map();
  private votingTimers: Map<string, NodeJS.Timeout> = new Map();
  private disconnectGraceTimers: Map<string, NodeJS.Timeout> = new Map(); // roomCode:playerId -> timer
  private kickedPlayers: Map<string, Set<string>> = new Map(); // roomCode -> Set of playerIds

  // Temporary player answers for current round: roomCode -> playerId -> answers
  private currentRoundAnswers: Map<string, Map<string, Record<string, string>>> = new Map();

  // Active voting context for early quorum resolution: roomCode -> context
  private activeVotingContext: Map<string, {
    playerEvaluations: Map<string, Record<string, EvaluatedAnswer>>;
    wordOccurrences: Map<string, Map<string, string[]>>;
  }> = new Map();

  // Generate 4-character room PIN
  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    do {
      code = '';
      for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.rooms.has(code));
    return code;
  }

  public registerSocket(ws: WebSocket): string {
    const id = randomUUID();
    this.socketToClient.set(ws, id);
    return id;
  }

  private migrateHost(room: RoomState): void {
    const newHost = room.players.find((p) => p.isOnline) || room.players[0];
    if (!newHost) return;

    room.players.forEach((p) => {
      p.isHost = (p.id === newHost.id);
    });
    room.hostId = newHost.id;

    for (const client of this.clients.values()) {
      if (client.roomCode === room.code && client.playerId === newHost.id) {
        this.sendToSocket(client.ws, 'player:init', {
          playerId: newHost.id,
          isHost: true,
        });
      }
    }
  }

  private destroyRoom(code: string): void {
    const room = this.rooms.get(code);
    if (!room) return;

    if (this.roundTimers.has(code)) {
      clearTimeout(this.roundTimers.get(code)!);
      this.roundTimers.delete(code);
    }
    if (this.votingTimers.has(code)) {
      clearTimeout(this.votingTimers.get(code)!);
      this.votingTimers.delete(code);
    }
    this.currentRoundAnswers.delete(code);
    this.activeVotingContext.delete(code);

    for (const [key, timer] of this.disconnectGraceTimers.entries()) {
      if (key.startsWith(`${code}:`)) {
        clearTimeout(timer);
        this.disconnectGraceTimers.delete(key);
      }
    }

    this.rooms.delete(code);
    this.kickedPlayers.delete(code);
    console.log(`🧹 [RoomManager] Sala ${code} eliminada de memoria (sin jugadores activos).`);
  }

  public leaveRoom(ws: WebSocket): void {
    const wsId = this.socketToClient.get(ws);
    if (!wsId) return;

    const client = this.clients.get(wsId);
    if (!client) {
      this.socketToClient.delete(ws);
      return;
    }

    const room = this.rooms.get(client.roomCode);
    if (!room) {
      this.clients.delete(wsId);
      this.socketToClient.delete(ws);
      return;
    }

    const playerId = client.playerId;
    const isDepartingHost = (room.hostId === playerId);

    // Cancel any disconnect grace timer
    const graceKey = `${room.code}:${playerId}`;
    if (this.disconnectGraceTimers.has(graceKey)) {
      clearTimeout(this.disconnectGraceTimers.get(graceKey)!);
      this.disconnectGraceTimers.delete(graceKey);
    }

    if (room.status === 'LOBBY') {
      room.players = room.players.filter((p) => p.id !== playerId);

      if (room.players.length === 0) {
        this.destroyRoom(room.code);
      } else {
        if (isDepartingHost) {
          this.migrateHost(room);
        }
        this.broadcastRoomState(room.code);
      }
    } else {
      const player = room.players.find((p) => p.id === playerId);
      if (player) {
        player.isOnline = false;
      }

      const onlinePlayers = room.players.filter((p) => p.isOnline);
      if (onlinePlayers.length === 0) {
        this.destroyRoom(room.code);
      } else {
        if (isDepartingHost) {
          this.migrateHost(room);
        }
        if (room.status === 'VOTING') {
          this.checkVotingCompletion(room);
        }
        this.broadcastRoomState(room.code);
      }
    }

    this.clients.delete(wsId);
    // Note: Do NOT delete from socketToClient here, because the WebSocket is still active
    // and the user may create or join another room right away.
  }

  public kickPlayer(ws: WebSocket, targetPlayerId: string): void {
    const client = this.getClientBySocket(ws);
    if (!client) return;

    const room = this.rooms.get(client.roomCode);
    if (!room) return;

    // Only host can kick players, and host cannot kick themselves
    if (room.hostId !== client.playerId) return;
    if (targetPlayerId === room.hostId) return;

    const targetPlayer = room.players.find((p) => p.id === targetPlayerId);
    if (!targetPlayer) return;

    // Notify kicked player through their socket if connected
    for (const [wsId, c] of this.clients.entries()) {
      if (c.roomCode === room.code && c.playerId === targetPlayerId) {
        this.sendToSocket(c.ws, 'room:kicked', {
          message: 'Has sido expulsado de la sala por el anfitrión.',
        });
        this.clients.delete(wsId);
      }
    }

    // Cancel any disconnect grace timer
    const graceKey = `${room.code}:${targetPlayerId}`;
    if (this.disconnectGraceTimers.has(graceKey)) {
      clearTimeout(this.disconnectGraceTimers.get(graceKey)!);
      this.disconnectGraceTimers.delete(graceKey);
    }

    // Track kicked player to prevent immediate re-joins
    if (!this.kickedPlayers.has(room.code)) {
      this.kickedPlayers.set(room.code, new Set());
    }
    this.kickedPlayers.get(room.code)!.add(targetPlayerId);

    // Remove player from room
    room.players = room.players.filter((p) => p.id !== targetPlayerId);

    // If game is in VOTING, recheck quorum
    if (room.status === 'VOTING') {
      this.checkVotingCompletion(room);
    }

    // Broadcast updated state and sound to remaining players
    this.broadcastRoomState(room.code);
    this.broadcastSound(room.code, 'pop');
    console.log(`👢 [RoomManager] Jugador "${targetPlayer.name}" expulsado de la sala ${room.code} por el anfitrión.`);
  }

  public unregisterSocket(ws: WebSocket): void {
    const wsId = this.socketToClient.get(ws);
    if (!wsId) return;

    const client = this.clients.get(wsId);
    if (client) {
      const room = this.rooms.get(client.roomCode);
      if (room) {
        const player = room.players.find((p) => p.id === client.playerId);
        if (player) {
          player.isOnline = false;
          this.broadcastRoomState(room.code);

          if (room.status === 'LOBBY') {
            const graceKey = `${room.code}:${player.id}`;
            if (this.disconnectGraceTimers.has(graceKey)) {
              clearTimeout(this.disconnectGraceTimers.get(graceKey)!);
            }
            // Período de gracia ágil de 800ms para F5 sin retrasar la salida
            const timer = setTimeout(() => {
              this.disconnectGraceTimers.delete(graceKey);
              const currentRoom = this.rooms.get(client.roomCode);
              if (!currentRoom || currentRoom.status !== 'LOBBY') return;
              const p = currentRoom.players.find((x) => x.id === client.playerId);
              if (p && !p.isOnline) {
                const wasHost = (currentRoom.hostId === p.id);
                currentRoom.players = currentRoom.players.filter((x) => x.id !== p.id);
                if (currentRoom.players.length === 0) {
                  this.destroyRoom(currentRoom.code);
                } else {
                  if (wasHost) {
                    this.migrateHost(currentRoom);
                  }
                  this.broadcastRoomState(currentRoom.code);
                }
              }
            }, 800);
            this.disconnectGraceTimers.set(graceKey, timer);
          } else {
            if (room.hostId === player.id) {
              const hasOnlineHost = room.players.some((p) => p.id === room.hostId && p.isOnline);
              if (!hasOnlineHost) {
                this.migrateHost(room);
                this.broadcastRoomState(room.code);
              }
            }
            if (room.status === 'VOTING') {
              this.checkVotingCompletion(room);
            }
          }
        }
      }
      this.clients.delete(wsId);
    }
    this.socketToClient.delete(ws);
  }

  public getClientBySocket(ws: WebSocket): ConnectedClient | undefined {
    const wsId = this.socketToClient.get(ws);
    return wsId ? this.clients.get(wsId) : undefined;
  }

  public createRoom(ws: WebSocket, hostName: string, avatarId: string): RoomState {
    const code = this.generateRoomCode();
    const hostId = randomUUID();

    const hostPlayer: Player = {
      id: hostId,
      name: hostName.trim() || 'Jugador 1',
      avatarId: avatarId || 'garabato-feliz',
      isHost: true,
      score: 0,
      isReady: true,
      isOnline: true,
    };

    const room: RoomState = {
      code,
      status: 'LOBBY',
      hostId,
      settings: {
        roundDurationSeconds: 60,
        totalRounds: 3,
        categories: DEFAULT_CATEGORIES.map((c) => c.id),
        chaosModifiersEnabled: false,
      },
      players: [hostPlayer],
      currentRound: null,
      letterHistory: [],
      pendingVotes: [],
      roundResults: null,
      absurdNominations: [],
      absurdWinner: null,
    };

    this.rooms.set(code, room);
    const wsId = this.socketToClient.get(ws) || this.registerSocket(ws);
    this.clients.set(wsId, { ws, playerId: hostId, roomCode: code });

    // Persist room to DB asynchronously
    this.persistRoom(room).catch(() => {});

    return room;
  }

  public joinRoom(
    ws: WebSocket,
    code: string,
    playerName: string,
    avatarId: string,
    preferredPlayerId?: string
  ): { room?: RoomState; error?: 'NOT_FOUND' | 'ROOM_FULL' } {
    if (!code) return { error: 'NOT_FOUND' };
    const room = this.rooms.get(code.trim().toUpperCase());
    if (!room) return { error: 'NOT_FOUND' };

    // Reject if player was kicked from this room
    const kicked = this.kickedPlayers.get(room.code);
    if (kicked && preferredPlayerId && kicked.has(preferredPlayerId)) {
      return { error: 'NOT_FOUND' };
    }

    // Check if player is reconnecting with preferredPlayerId or same name
    let player = room.players.find((p) =>
      (preferredPlayerId && p.id === preferredPlayerId) ||
      (playerName && p.name.toLowerCase() === playerName.trim().toLowerCase())
    );

    // If new player and room is already full, reject
    if (!player && room.players.length >= MAX_PLAYERS_PER_ROOM) {
      return { error: 'ROOM_FULL' };
    }

    let playerId: string;

    if (player) {
      player.isOnline = true;
      player.avatarId = avatarId || player.avatarId;
      playerId = player.id;

      // Cancel disconnect grace timer if exists
      const graceKey = `${room.code}:${playerId}`;
      if (this.disconnectGraceTimers.has(graceKey)) {
        clearTimeout(this.disconnectGraceTimers.get(graceKey)!);
        this.disconnectGraceTimers.delete(graceKey);
      }
    } else {
      playerId = preferredPlayerId || randomUUID();
      player = {
        id: playerId,
        name: playerName.trim() || `Jugador ${room.players.length + 1}`,
        avatarId: avatarId || 'garabato-feliz',
        isHost: false,
        score: 0,
        isReady: false,
        isOnline: true,
      };
      room.players.push(player);
    }

    const wsId = this.socketToClient.get(ws) || this.registerSocket(ws);
    this.clients.set(wsId, { ws, playerId, roomCode: room.code });

    this.broadcastRoomState(room.code);
    return { room };
  }

  public updateSettings(ws: WebSocket, settings: Partial<RoomSettings>): void {
    const client = this.getClientBySocket(ws);
    if (!client) return;
    const room = this.rooms.get(client.roomCode);
    if (!room || room.hostId !== client.playerId) return;

    room.settings = { ...room.settings, ...settings };
    this.broadcastRoomState(room.code);
  }

  public startGame(ws: WebSocket): void {
    const client = this.getClientBySocket(ws);
    if (!client) return;
    const room = this.rooms.get(client.roomCode);
    if (!room || room.hostId !== client.playerId) return;

    // Reset scores & letters for new game
    room.letterHistory = [];
    room.players.forEach((p) => {
      p.score = 0;
    });

    this.startNewRound(room, 1);
  }

  private startNewRound(room: RoomState, roundNumber: number): void {
    // Pick letter not used yet
    const available = AVAILABLE_LETTERS.filter((l) => !room.letterHistory.includes(l));
    const letter = available.length > 0
      ? available[Math.floor(Math.random() * available.length)]
      : AVAILABLE_LETTERS[Math.floor(Math.random() * AVAILABLE_LETTERS.length)];

    room.letterHistory.push(letter);

    // Assign Chaos Modifiers if enabled
    const modifierKeys: ChaosModifierType[] = ['DOUBLE_POINTS', 'LETTER_SWAP', 'SHIELD', 'POINT_STEAL'];
    room.players.forEach((p) => {
      if (room.settings.chaosModifiersEnabled) {
        const randMod = modifierKeys[Math.floor(Math.random() * modifierKeys.length)];
        p.currentModifier = CHAOS_MODIFIERS[randMod];
      } else {
        p.currentModifier = null;
      }
    });

    const now = Date.now();
    const durationMs = room.settings.roundDurationSeconds * 1000;

    room.status = 'PLAYING';
    room.currentRound = {
      roundNumber,
      letter,
      startedAt: now,
      endsAt: now + durationMs,
      durationSeconds: room.settings.roundDurationSeconds,
    };
    room.pendingVotes = [];
    room.roundResults = null;
    room.absurdNominations = [];
    room.absurdWinner = null;

    // Reset round answers
    this.currentRoundAnswers.set(room.code, new Map());

    // Clear previous timers
    if (this.roundTimers.has(room.code)) {
      clearTimeout(this.roundTimers.get(room.code)!);
    }

    // Set server absolute timeout: auto STOP when time reaches 0
    const timer = setTimeout(() => {
      this.triggerStop(room.code, undefined, true);
    }, durationMs);

    this.roundTimers.set(room.code, timer);

    this.broadcastRoomState(room.code);
    this.broadcastSound(room.code, 'paper');
  }

  public submitAnswers(ws: WebSocket, answers: Record<string, string>): void {
    const client = this.getClientBySocket(ws);
    if (!client) return;
    const room = this.rooms.get(client.roomCode);
    if (!room || room.status !== 'PLAYING') return;

    const roomAnswers = this.currentRoundAnswers.get(client.roomCode);
    if (roomAnswers) {
      roomAnswers.set(client.playerId, answers);
    }
  }

  public triggerStopFromPlayer(ws: WebSocket): void {
    const client = this.getClientBySocket(ws);
    if (!client) return;
    const room = this.rooms.get(client.roomCode);
    if (!room || room.status !== 'PLAYING') return;
    if (room.currentRound?.stoppedBy) return; // Ya se hizo STOP en esta ronda

    // Verificar que el jugador tenga al menos 1 campo con palabras
    const roomAnswers = this.currentRoundAnswers.get(client.roomCode);
    const playerAnswers = roomAnswers?.get(client.playerId) || {};
    const categories = room.settings.categories;

    const hasAnyField = categories.some((cat) => {
      const val = playerAnswers[cat];
      return typeof val === 'string' && val.trim().length > 0;
    });

    if (!hasAnyField) {
      this.sendToSocket(ws, 'room:error', {
        message: '¡Debes escribir al menos una palabra antes de decir STOP!',
      });
      this.sendToSocket(ws, 'sound:play', { sound: 'buzzer' });
      return;
    }

    const stoppingPlayer = room.players.find((p) => p.id === client.playerId);
    this.triggerStop(room.code, stoppingPlayer ? { id: stoppingPlayer.id, name: stoppingPlayer.name } : undefined, false);
  }

  public async triggerStop(
    roomCode: string,
    stoppedBy?: { id: string; name: string },
    isAutoTimeout: boolean = false
  ): Promise<void> {
    const room = this.rooms.get(roomCode);
    if (!room || room.status !== 'PLAYING') return;
    // Guard against multiple STOP calls in the same round
    if (room.currentRound?.stoppedBy) return;

    // Cancel timer
    if (this.roundTimers.has(roomCode)) {
      clearTimeout(this.roundTimers.get(roomCode)!);
      this.roundTimers.delete(roomCode);
    }

    if (room.currentRound) {
      room.currentRound.stoppedBy = stoppedBy || (isAutoTimeout ? { id: 'SYSTEM', name: '⏰ ¡Tiempo Agotado!' } : { id: 'SYSTEM', name: 'Alguien' });
    }

    // Broadcast room state immediately so room.currentRound.stoppedBy is synced across all clients
    this.broadcastRoomState(room.code);

    // Notify clients of STOP trigger immediately for visual freeze & sound
    this.broadcastToRoom(roomCode, 'round:stop_triggered', {
      stoppedBy: room.currentRound?.stoppedBy || { id: 'SYSTEM', name: 'Alguien' },
    });
    this.broadcastSound(roomCode, 'stop');

    // Give 3.5 seconds for visual freeze, celebration of who yelled STOP, and socket answers flush, then evaluate
    setTimeout(async () => {
      await this.evaluateRound(room);
    }, 3500);
  }

  private async evaluateRound(room: RoomState): Promise<void> {
    const playerEvaluations: Map<string, Record<string, EvaluatedAnswer>> = new Map();
    try {
      const roundLetter = room.currentRound?.letter || 'A';
      const roomAnswers = this.currentRoundAnswers.get(room.code) || new Map();
      const categories = room.settings.categories;

      const pendingVotes: VoteCandidate[] = [];

      // Map: category -> normalizedWord -> list of playerIds
      const wordOccurrences: Map<string, Map<string, string[]>> = new Map();

      // 1. Initial Pass: Local Validation & Grouping
      for (const player of room.players) {
      const answers = roomAnswers.get(player.id) || {};
      const evaluated: Record<string, EvaluatedAnswer> = {};
      const allowsAnyLetter = player.currentModifier?.id === 'LETTER_SWAP';

      for (const cat of categories) {
        const raw = (answers[cat] || '').trim();
        if (!raw) {
          evaluated[cat] = {
            category: cat,
            rawWord: '',
            normalizedWord: '',
            status: 'INVALID',
            points: 0,
            reason: 'Vacío',
          };
          continue;
        }

        const localVal = validateWordLocal(raw, roundLetter, allowsAnyLetter);
        if (!localVal.isValid) {
          evaluated[cat] = {
            category: cat,
            rawWord: raw,
            normalizedWord: localVal.normalized,
            status: 'INVALID',
            points: 0,
            reason: localVal.reason,
          };
          continue;
        }

        // Check against dictionary
        const inDict = await isWordInDictionary(cat, raw);
        if (inDict) {
          evaluated[cat] = {
            category: cat,
            rawWord: raw,
            normalizedWord: localVal.normalized,
            status: 'VALID_UNIQUE', // will adjust duplicates next
            points: 100,
          };
        } else {
          // Word not found in dictionary -> social voting candidate!
          const voteId = randomUUID();
          const candidate: VoteCandidate = {
            id: voteId,
            playerId: player.id,
            playerName: player.name,
            category: cat,
            word: raw,
            upvotes: [],
            downvotes: [],
            status: 'PENDING',
          };
          pendingVotes.push(candidate);

          evaluated[cat] = {
            category: cat,
            rawWord: raw,
            normalizedWord: localVal.normalized,
            status: 'NEEDS_VOTE',
            points: 0,
            voteId,
            reason: 'Pendiente de votación',
          };
        }

        // Register occurrence for duplicate checking
        if (!wordOccurrences.has(cat)) {
          wordOccurrences.set(cat, new Map());
        }
        const catMap = wordOccurrences.get(cat)!;
        const norm = localVal.normalized;
        if (!catMap.has(norm)) {
          catMap.set(norm, []);
        }
        catMap.get(norm)!.push(player.id);
      }

      playerEvaluations.set(player.id, evaluated);
    }

    // 2. Adjust for Duplicates
    for (const [cat, catMap] of wordOccurrences.entries()) {
      for (const [normWord, playerIds] of catMap.entries()) {
        if (playerIds.length > 1) {
          for (const pid of playerIds) {
            const ev = playerEvaluations.get(pid)?.[cat];
            if (ev && ev.status === 'VALID_UNIQUE') {
              ev.status = 'VALID_DUPLICATE';
              ev.points = 50;
            }
          }
        }
      }
    }

    room.pendingVotes = pendingVotes;

    // If there are words needing social vote, transition to VOTING phase
    if (pendingVotes.length > 0) {
      room.status = 'VOTING';
      // Mínimo 30 segundos, más 3 segundos por cada palabra extra a votar (máximo 60s)
      const votingDurationMs = Math.min(60000, Math.max(30000, 20000 + pendingVotes.length * 3000));
      room.votingEndsAt = Date.now() + votingDurationMs;

      this.activeVotingContext.set(room.code, { playerEvaluations, wordOccurrences });

      this.broadcastRoomState(room.code);
      this.broadcastSound(room.code, 'pop');

      const vTimer = setTimeout(() => {
        this.concludeVotingPhase(room, playerEvaluations, wordOccurrences);
      }, votingDurationMs);

      this.votingTimers.set(room.code, vTimer);
    } else {
      // Direct recap
      this.finalizeRoundScores(room, playerEvaluations);
    }
  } catch (err) {
    console.error('❌ [API] Error evaluando ronda:', err);
    this.finalizeRoundScores(room, playerEvaluations);
  }
}

  public castVote(ws: WebSocket, voteId: string, accept: boolean): void {
    const client = this.getClientBySocket(ws);
    if (!client) return;
    const room = this.rooms.get(client.roomCode);
    if (!room || room.status !== 'VOTING') return;

    const candidate = room.pendingVotes.find((v) => v.id === voteId);
    if (!candidate) return;

    // Prevent voting on own word
    if (candidate.playerId === client.playerId) return;

    // Remove previous vote from this player
    candidate.upvotes = candidate.upvotes.filter((id) => id !== client.playerId);
    candidate.downvotes = candidate.downvotes.filter((id) => id !== client.playerId);

    if (accept) {
      candidate.upvotes.push(client.playerId);
    } else {
      candidate.downvotes.push(client.playerId);
    }

    this.broadcastRoomState(room.code);
    this.checkVotingCompletion(room);
  }

  private checkVotingCompletion(room: RoomState): void {
    if (room.status !== 'VOTING' || room.pendingVotes.length === 0) return;
    const ctx = this.activeVotingContext.get(room.code);
    if (!ctx) return;

    const onlinePlayerIds = room.players.filter((p) => p.isOnline).map((p) => p.id);

    const allCompleted = room.pendingVotes.every((cand) => {
      const eligibleVoters = onlinePlayerIds.filter((pid) => pid !== cand.playerId);
      if (eligibleVoters.length === 0) return true;
      const votedPlayerIds = new Set([...cand.upvotes, ...cand.downvotes]);
      return eligibleVoters.every((pid) => votedPlayerIds.has(pid));
    });

    if (allCompleted) {
      this.concludeVotingPhase(room, ctx.playerEvaluations, ctx.wordOccurrences);
    }
  }

  private concludeVotingPhase(
    room: RoomState,
    playerEvaluations: Map<string, Record<string, EvaluatedAnswer>>,
    wordOccurrences: Map<string, Map<string, string[]>>
  ): void {
    if (this.votingTimers.has(room.code)) {
      clearTimeout(this.votingTimers.get(room.code)!);
      this.votingTimers.delete(room.code);
    }
    this.activeVotingContext.delete(room.code);

    // Evaluate each pending candidate
    for (const cand of room.pendingVotes) {
      const isAccepted = cand.upvotes.length >= cand.downvotes.length;
      cand.status = isAccepted ? 'ACCEPTED' : 'REJECTED';

      const playerEv = playerEvaluations.get(cand.playerId)?.[cand.category];
      if (playerEv) {
        if (isAccepted) {
          // Check if duplicate
          const catMap = wordOccurrences.get(cand.category);
          const others = catMap?.get(playerEv.normalizedWord) || [];
          const isDuplicate = others.length > 1;

          playerEv.status = 'VOTED_VALID';
          playerEv.points = isDuplicate ? 50 : 100;

          // Register in dictionary for future rounds
          registerWordInDictionary(cand.category, cand.word).catch(() => {});
        } else {
          playerEv.status = 'VOTED_INVALID';
          playerEv.points = 0;
          playerEv.reason = 'Rechazado por votación';
        }
      }
    }

    this.finalizeRoundScores(room, playerEvaluations);
  }

  private finalizeRoundScores(
    room: RoomState,
    playerEvaluations: Map<string, Record<string, EvaluatedAnswer>>
  ): void {
    const results: PlayerRoundResult[] = [];
    const absurdCandidates: AbsurdNomination[] = [];

    for (const player of room.players) {
      const answers = playerEvaluations.get(player.id) || {};
      let roundPoints = 0;
      let highestCategoryPoints = 0;

      for (const cat of room.settings.categories) {
        const item = answers[cat];
        if (item) {
          // SHIELD Modifier check: if 0 points, grant 50 points shield!
          if (player.currentModifier?.id === 'SHIELD' && item.points === 0 && item.rawWord.length > 1) {
            item.points = 50;
            item.reason = '🛡️ Salvado por Escudo Escolar';
          }

          roundPoints += item.points;
          if (item.points > highestCategoryPoints) {
            highestCategoryPoints = item.points;
          }

          // If answer is valid, rejected, or peculiar, add to absurd nominations
          if (item.rawWord.trim().length > 1) {
            absurdCandidates.push({
              id: randomUUID(),
              playerId: player.id,
              playerName: player.name,
              category: cat,
              word: item.rawWord,
              votes: [],
            });
          }
        }
      }

      let bonusPoints = 0;

      // Apply DOUBLE_POINTS modifier
      if (player.currentModifier?.id === 'DOUBLE_POINTS' && highestCategoryPoints > 0) {
        bonusPoints += highestCategoryPoints; // adds an extra 1x of highest category
      }

      // Apply POINT_STEAL modifier
      if (player.currentModifier?.id === 'POINT_STEAL') {
        bonusPoints += 25;
      }

      const totalRoundPoints = roundPoints + bonusPoints;
      player.score += totalRoundPoints;

      results.push({
        playerId: player.id,
        playerName: player.name,
        avatarId: player.avatarId,
        answers,
        roundPoints,
        bonusPoints,
        totalRoundPoints,
        modifierUsed: player.currentModifier?.id || null,
      });
    }

    room.status = 'ROUND_RECAP';
    room.roundResults = results;
    room.absurdNominations = absurdCandidates.slice(0, 8); // top nominations
    room.absurdWinner = null;

    this.broadcastRoomState(room.code);
    this.broadcastSound(room.code, 'cheer');
  }

  public voteAbsurd(ws: WebSocket, nominationId: string): void {
    const client = this.getClientBySocket(ws);
    if (!client) return;
    const room = this.rooms.get(client.roomCode);
    if (!room || room.status !== 'ROUND_RECAP') return;

    for (const nom of room.absurdNominations) {
      nom.votes = nom.votes.filter((id) => id !== client.playerId);
      if (nom.id === nominationId) {
        nom.votes.push(client.playerId);
      }
    }

    // Determine current absurd winner
    let maxVotes = 0;
    let topNom: AbsurdNomination | null = null;
    for (const nom of room.absurdNominations) {
      if (nom.votes.length > maxVotes) {
        maxVotes = nom.votes.length;
        topNom = nom;
      }
    }

    if (topNom && maxVotes > 0) {
      const titles = [
        '🏆 Rey del Rincón de la Vergüenza',
        '🎨 Genio Incomprendido',
        '💡 Respuesta más Creativa',
        '🎭 El Poeta del Absurdo',
      ];
      room.absurdWinner = {
        nomination: topNom,
        totalVotes: maxVotes,
        title: titles[Math.floor(Math.random() * titles.length)],
      };
    }

    this.broadcastRoomState(room.code);
  }

  public nextRound(ws: WebSocket): void {
    const client = this.getClientBySocket(ws);
    if (!client) return;
    const room = this.rooms.get(client.roomCode);
    if (!room || room.hostId !== client.playerId) return;

    const currentNum = room.currentRound?.roundNumber || 1;
    if (currentNum >= room.settings.totalRounds) {
      // Game Over
      room.status = 'GAME_OVER';
      this.broadcastRoomState(room.code);
      this.broadcastSound(room.code, 'cheer');
    } else {
      this.startNewRound(room, currentNum + 1);
    }
  }

  public restartGame(ws: WebSocket): void {
    const client = this.getClientBySocket(ws);
    if (!client) return;
    const room = this.rooms.get(client.roomCode);
    if (!room || room.hostId !== client.playerId) return;

    room.status = 'LOBBY';
    room.currentRound = null;
    room.roundResults = null;
    room.letterHistory = [];
    room.pendingVotes = [];
    room.absurdWinner = null;
    room.players.forEach((p) => {
      p.score = 0;
      p.currentModifier = null;
    });

    this.broadcastRoomState(room.code);
  }

  public broadcastRoomState(roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (!room) return;

    const payload = JSON.stringify({
      event: 'room:state',
      payload: room,
    });

    for (const client of this.clients.values()) {
      if (client.roomCode === roomCode && client.ws.readyState === client.ws.OPEN) {
        client.ws.send(payload);
      }
    }
  }

  public broadcastSound(roomCode: string, sound: 'tick' | 'stop' | 'paper' | 'cheer' | 'buzzer' | 'pop'): void {
    const payload = JSON.stringify({
      event: 'sound:play',
      payload: { sound },
    });

    for (const client of this.clients.values()) {
      if (client.roomCode === roomCode && client.ws.readyState === client.ws.OPEN) {
        client.ws.send(payload);
      }
    }
  }

  public broadcastToRoom(roomCode: string, event: string, payloadData: unknown): void {
    const payload = JSON.stringify({
      event,
      payload: payloadData,
    });

    for (const client of this.clients.values()) {
      if (client.roomCode === roomCode && client.ws.readyState === client.ws.OPEN) {
        client.ws.send(payload);
      }
    }
  }

  public sendToSocket(ws: WebSocket, event: string, payloadData: unknown): void {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ event, payload: payloadData }));
    }
  }

  private async persistRoom(room: RoomState): Promise<void> {
    try {
      const db = getDb();
      if (!db) return;
      await db.insert(schema.rooms).values({
        code: room.code,
        hostId: room.hostId,
        status: room.status,
        settings: room.settings,
        currentRound: room.currentRound?.roundNumber || 0,
        letterHistory: room.letterHistory,
      }).onConflictDoNothing();
    } catch {
      // Ignored
    }
  }
}
