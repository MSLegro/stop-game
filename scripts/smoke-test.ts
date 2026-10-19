import { RoomManager } from '../apps/api/src/game/room-manager.js';
import { isWordInDictionary, inMemoryDictionary } from '../apps/api/src/db/index.js';
import { normalizeWord, validateWordLocal } from '../packages/shared/src/index.js';

async function runSmokeTest() {
  console.log('🧪 [Test] Running Stop Game Engine Smoke Test...');

  // 1. Text Normalization Test
  console.log('1. Probando normalización de texto...');
  const word1 = normalizeWord(' Árbol ');
  if (word1 !== 'arbol') throw new Error(`Fallo normalizando Árbol: ${word1}`);
  const word2 = normalizeWord('Ñandú');
  if (word2 !== 'ñandu') throw new Error(`Fallo normalizando Ñandú: ${word2}`);
  console.log('   ✓ Normalización correcta');

  // 2. Local Validation Test
  console.log('2. Probando validación algorítmica local...');
  const v1 = validateWordLocal('Argentina', 'A');
  if (!v1.isValid) throw new Error('Argentina debería ser válida con letra A');
  const v2 = validateWordLocal('Brasil', 'A');
  if (v2.isValid) throw new Error('Brasil no debería ser válida con letra A');
  const v3 = validateWordLocal('Brasil', 'A', true); // letter swap modifier
  if (!v3.isValid) throw new Error('Brasil debería ser válida con comodín de letra');
  console.log('   ✓ Validación algorítmica correcta');

  // 3. Dictionary In-Memory Cache Test
  console.log('3. Probando diccionario precargado en memoria...');
  const hasAna = await isWordInDictionary('nombre', 'Ana');
  if (!hasAna) throw new Error('Ana debería estar en diccionario de nombres');
  const hasAguila = await isWordInDictionary('animal', 'Águila');
  if (!hasAguila) throw new Error('Águila debería estar en diccionario de animales');
  const hasFake = await isWordInDictionary('cosa', 'XyzFakeWord123');
  if (hasFake) throw new Error('XyzFakeWord123 no debería existir');
  console.log(`   ✓ Diccionario operativo (${inMemoryDictionary.size} entradas precargadas)`);

  // 4. Room Manager Lifecycle Simulation
  console.log('4. Probando ciclo de vida de RoomManager...');
  const manager = new RoomManager();

  // Create fake sockets
  const fakeSocketHost = {
    readyState: 1, // OPEN
    send: (data: string) => {},
    on: () => {},
  } as any;

  const fakeSocketPlayer = {
    readyState: 1,
    send: (data: string) => {},
    on: () => {},
  } as any;

  manager.registerSocket(fakeSocketHost);
  const room = manager.createRoom(fakeSocketHost, 'Profe Manuel', 'garabato-feliz');
  if (!room.code || room.code.length !== 4) throw new Error('Código PIN inválido');
  if (room.settings.chaosModifiersEnabled !== false) throw new Error('Modo Caos debe estar desactivado por defecto');
  console.log(`   ✓ Sala creada con PIN: ${room.code} (Modo Caos: desactivado por defecto)`);

  manager.registerSocket(fakeSocketPlayer);
  const joinRes = manager.joinRoom(fakeSocketPlayer, room.code, 'Amigo Juan', 'gato-bigotes');
  if (!joinRes.room || joinRes.room.players.length !== 2) throw new Error('Fallo al unir jugador');
  console.log('   ✓ Segundo jugador unido correctamente');

  // 5. Probando límite de capacidad máxima (8 jugadores)
  console.log('5. Probando aforo máximo de 8 jugadores por sala...');
  const extraSockets = [];
  for (let i = 3; i <= 8; i++) {
    const s = { readyState: 1, send: () => {}, on: () => {} } as any;
    manager.registerSocket(s);
    extraSockets.push(s);
    const r = manager.joinRoom(s, room.code, `Jugador ${i}`, 'robot-carton');
    if (!r.room || r.room.players.length !== i) throw new Error(`Fallo uniendo jugador ${i}`);
  }
  const overflowSocket = { readyState: 1, send: () => {}, on: () => {} } as any;
  manager.registerSocket(overflowSocket);
  const overflowRes = manager.joinRoom(overflowSocket, room.code, 'Jugador Extra', 'alien-divertido');
  if (overflowRes.error !== 'ROOM_FULL') throw new Error('Se esperaba error ROOM_FULL al exceder 8 jugadores');
  console.log('   ✓ Límite de 8 jugadores respetado correctamente (rechaza 9no jugador)');

  // 6. Probando salida voluntaria y traspaso de anfitrión
  console.log('6. Probando traspaso de anfitrión (Host Migration)...');
  const originalHostId = room.hostId;
  manager.leaveRoom(fakeSocketHost);
  if (room.hostId === originalHostId) throw new Error('El anfitrión debió cambiar tras salir el creador');
  const newHostPlayer = room.players.find((p) => p.id === room.hostId);
  if (!newHostPlayer || !newHostPlayer.isHost) throw new Error('El nuevo anfitrión no tiene isHost en true');
  console.log(`   ✓ Traspaso exitoso: Nuevo anfitrión es "${newHostPlayer.name}"`);

  // Limpiar jugadores extra para continuar prueba de ronda con 2 jugadores
  for (const s of extraSockets) {
    manager.leaveRoom(s);
  }

  // Volver a unir al Profe Manuel para la prueba de juego
  manager.registerSocket(fakeSocketHost);
  manager.joinRoom(fakeSocketHost, room.code, 'Profe Manuel', 'garabato-feliz');

  // 7. Probando expulsión de jugador por parte del anfitrión (Host kick)
  console.log('7. Probando expulsión de jugador por el anfitrión...');
  let kickedMessageReceived = false;
  const kickTargetSocket = {
    OPEN: 1,
    readyState: 1,
    send: (data: string) => {
      const parsed = JSON.parse(data);
      if (parsed.event === 'room:kicked') {
        kickedMessageReceived = true;
      }
    },
    on: () => {},
  } as any;
  manager.registerSocket(kickTargetSocket);
  const joinKickTarget = manager.joinRoom(kickTargetSocket, room.code, 'Alumno Revoltoso', 'alien-divertido');
  const targetPlayer = joinKickTarget.room?.players.find((p) => p.name === 'Alumno Revoltoso');
  if (!targetPlayer) throw new Error('Fallo al unir Alumno Revoltoso');
  const targetId = targetPlayer.id;

  // Intento de auto-expulsión o no-anfitrión (debe ser ignorado)
  manager.kickPlayer(kickTargetSocket, targetId);
  if (kickedMessageReceived || !room.players.some((p) => p.id === targetId)) {
    throw new Error('Un jugador que no es anfitrión no puede expulsar');
  }

  // Anfitrión legítimo (fakeSocketPlayer / Juan) expulsa al revoltoso
  manager.kickPlayer(fakeSocketPlayer, targetId);
  if (!kickedMessageReceived) {
    throw new Error('El jugador expulsado debió recibir el evento room:kicked');
  }
  if (room.players.some((p) => p.id === targetId)) {
    throw new Error('El jugador expulsado aún se encuentra en la sala');
  }
  console.log('   ✓ Expulsión de jugador por anfitrión validada correctamente');

  // Start Game
  const activeHostSocket = fakeSocketPlayer; // Juan is host now
  manager.startGame(activeHostSocket);
  if (room.status !== 'PLAYING' || !room.currentRound) throw new Error('Fallo al iniciar partida');
  console.log(`   ✓ Ronda iniciada: Letra [${room.currentRound.letter}], Ronda #${room.currentRound.roundNumber}`);

  // 1. Submit empty answers & test that STOP is blocked when player has no letters
  manager.submitAnswers(fakeSocketHost, {});

  manager.triggerStopFromPlayer(fakeSocketHost);
  if (room.currentRound.stoppedBy) {
    throw new Error('STOP no debió permitirse sin haber escrito palabras');
  }
  console.log('   ✓ Intento de ¡STOP! sin letras bloqueado correctamente');

  // 2. Submit at least 1 word for Host and other player
  const letter = room.currentRound.letter;
  manager.submitAnswers(fakeSocketHost, {
    nombre: `${letter}lberto`,
  });

  manager.submitAnswers(fakeSocketPlayer, {
    nombre: `${letter}lberto`, // Duplicate
    animal: `${letter}péndiceRaro`, // Unknown word, triggers vote!
  });

  // Now trigger STOP from Host with at least 1 word
  manager.triggerStopFromPlayer(fakeSocketHost);
  if (!room.currentRound.stoppedBy) {
    throw new Error('Fallo al activar STOP con al menos una palabra escrita');
  }
  console.log('   ✓ ¡STOP! activado con al menos una palabra simulado con éxito');

  console.log('\n🎉 ¡TODAS LAS PRUEBAS DEL MOTOR DE JUEGO PASARON EXITOSAMENTE!');
}

runSmokeTest().catch((err) => {
  console.error('❌ Error en prueba:', err);
  process.exit(1);
});
