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

  // Temporary player answers for current round: roomCode -> playerId -> answers
  private currentRoundAnswers: Map<string, Map<string, Record<string, string>>> = new Map();

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
        chaosModifiersEnabled: true,
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
    const wsId = this.socketToClient.get(ws);
    if (wsId) {
      this.clients.set(wsId, { ws, playerId: hostId, roomCode: code });
    }

    // Persist room to DB asynchronously
    this.persistRoom(room).catch(() => {});

    return room;
  }

  public joinRoom(ws: WebSocket, code: string, playerName: string, avatarId: string): RoomState | null {
    if (!code) return null;
    const room = this.rooms.get(code.trim().toUpperCase());
    if (!room) return null;

    // Check if player is reconnecting with same name
    let player = room.players.find((p) => p.name.toLowerCase() === playerName.trim().toLowerCase());
    let playerId: string;

    if (player) {
      player.isOnline = true;
      player.avatarId = avatarId || player.avatarId;
      playerId = player.id;
    } else {
      playerId = randomUUID();
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

    const wsId = this.socketToClient.get(ws);
    if (wsId) {
      this.clients.set(wsId, { ws, playerId, roomCode: room.code });
    }

    this.broadcastRoomState(room.code);
    return room;
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

    // Cancel timer
    if (this.roundTimers.has(roomCode)) {
      clearTimeout(this.roundTimers.get(roomCode)!);
      this.roundTimers.delete(roomCode);
    }

    if (room.currentRound) {
      room.currentRound.stoppedBy = stoppedBy || (isAutoTimeout ? { id: 'SYSTEM', name: '⏰ ¡Tiempo Agotado!' } : undefined);
    }

    // Notify clients of STOP trigger immediately for visual freeze & sound
    this.broadcastToRoom(roomCode, 'round:stop_triggered', {
      stoppedBy: room.currentRound?.stoppedBy || { id: 'SYSTEM', name: 'Alguien' },
    });
    this.broadcastSound(roomCode, 'stop');

    // Give 1.5 seconds for final socket answers flush, then evaluate
    setTimeout(async () => {
      await this.evaluateRound(room);
    }, 1500);
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
      const votingDurationMs = 15000; // 15 seconds social voting
      room.votingEndsAt = Date.now() + votingDurationMs;

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
