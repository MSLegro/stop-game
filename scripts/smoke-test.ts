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
  console.log(`   ✓ Sala creada con PIN: ${room.code}`);

  manager.registerSocket(fakeSocketPlayer);
  const joined = manager.joinRoom(fakeSocketPlayer, room.code, 'Amigo Juan', 'gato-bigotes');
  if (!joined || joined.players.length !== 2) throw new Error('Fallo al unir jugador');
  console.log('   ✓ Segundo jugador unido correctamente');

  // Start Game
  manager.startGame(fakeSocketHost);
  if (room.status !== 'PLAYING' || !room.currentRound) throw new Error('Fallo al iniciar partida');
  console.log(`   ✓ Ronda iniciada: Letra [${room.currentRound.letter}], Ronda #${room.currentRound.roundNumber}`);

  // Submit Answers
  const letter = room.currentRound.letter;
  manager.submitAnswers(fakeSocketHost, {
    nombre: `${letter}lberto`,
    animal: `${letter}beja`,
  });
  manager.submitAnswers(fakeSocketPlayer, {
    nombre: `${letter}lberto`, // Duplicate
    animal: `${letter}péndiceRaro`, // Unknown word, triggers vote!
  });

  // Trigger STOP
  await manager.triggerStop(room.code, { id: room.hostId, name: 'Profe Manuel' }, false);
  console.log('   ✓ ¡STOP! activado y congelado simulado con éxito');

  console.log('\n🎉 ¡TODAS LAS PRUEBAS DEL MOTOR DE JUEGO PASARON EXITOSAMENTE!');
}

runSmokeTest().catch((err) => {
  console.error('❌ Error en prueba:', err);
  process.exit(1);
});
