import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyWebsocket from '@fastify/websocket';
import { RoomManager } from './game/room-manager.js';
import { isWordInDictionary } from './db/index.js';
import type { WsMessage } from '@stop/shared';

const fastify = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
      },
    },
  },
});

const roomManager = new RoomManager();

// Register plugins
await fastify.register(cors, {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
});

await fastify.register(fastifyWebsocket, {
  options: {
    maxPayload: 1048576, // 1MB
  },
});

// REST Health and info endpoints
fastify.get('/', async (request, reply) => {
  const hostName = request.hostname.split(':')[0];
  const isBrowser = request.headers.accept?.includes('text/html');
  if (isBrowser) {
    reply.type('text/html').send(`
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>Stop! Servidor API</title>
          <style>
            body { font-family: system-ui, sans-serif; background: #f6f3eb; color: #18181b; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
            .card { background: #fffdf9; border: 3px solid #18181b; border-radius: 24px; box-shadow: 5px 5px 0 #18181b; max-width: 480px; padding: 32px; text-align: center; }
            h1 { font-size: 2rem; margin-top: 0; }
            p { color: #3f3f46; font-size: 1.1rem; }
            .btn { display: inline-block; background: #ef4444; color: white; padding: 14px 28px; border-radius: 16px; font-weight: bold; font-size: 1.2rem; text-decoration: none; border: 3px solid #18181b; box-shadow: 4px 4px 0 #18181b; margin-top: 20px; transition: transform 0.1s; }
            .btn:hover { transform: scale(1.03); }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>✏️ ¡Stop! Backend Activo</h1>
            <p>Estás en el servidor API (puerto <strong>3001</strong>).</p>
            <p>Para ingresar al juego con tus amigos, abre la aplicación en el puerto <strong>3000</strong>:</p>
            <a class="btn" href="http://${hostName}:3000">👉 Ir al Juego (http://${hostName}:3000)</a>
          </div>
        </body>
      </html>
    `);
    return;
  }
  return {
    name: 'Stop! Game API',
    status: 'online',
    frontendUrl: `http://${hostName}:3000`,
    websocketUrl: `ws://${hostName}:3001/ws`,
  };
});

fastify.get('/favicon.ico', async (request, reply) => {
  reply.code(204).send();
});

fastify.get('/health', async () => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
});

fastify.get('/api/dictionary/check', async (request, reply) => {
  const { category, word } = request.query as { category?: string; word?: string };
  if (!category || !word) {
    return reply.status(400).send({ error: 'Parámetros category y word son requeridos' });
  }
  const exists = await isWordInDictionary(category, word);
  return { category, word, exists };
});

// WebSocket Route
fastify.register(async function (fastifyInstance) {
  fastifyInstance.get('/ws', { websocket: true }, (socket, req) => {
    roomManager.registerSocket(socket);

    socket.on('message', (rawData: Buffer | string) => {
      try {
        const text = rawData.toString();
        const msg = JSON.parse(text) as WsMessage<any>;

        switch (msg.event) {
          case 'room:create': {
            const { name, avatarId } = msg.payload || {};
            const room = roomManager.createRoom(socket, name, avatarId);
            socket.send(JSON.stringify({
              event: 'player:init',
              payload: { playerId: room.hostId, isHost: true },
            }));
            socket.send(JSON.stringify({ event: 'room:state', payload: room }));
            break;
          }

          case 'room:join': {
            const { code, name, avatarId } = msg.payload || {};
            const room = roomManager.joinRoom(socket, code, name, avatarId);
            if (!room) {
              socket.send(JSON.stringify({
                event: 'room:error',
                payload: { message: `No se encontró la sala con código "${code}". Verifica el PIN.` },
              }));
            } else {
              const client = roomManager.getClientBySocket(socket);
              socket.send(JSON.stringify({
                event: 'player:init',
                payload: { playerId: client?.playerId, isHost: client?.playerId === room.hostId },
              }));
              socket.send(JSON.stringify({ event: 'room:state', payload: room }));
            }
            break;
          }

          case 'room:update_settings': {
            roomManager.updateSettings(socket, msg.payload?.settings || {});
            break;
          }

          case 'game:start': {
            roomManager.startGame(socket);
            break;
          }

          case 'round:submit_answers': {
            roomManager.submitAnswers(socket, msg.payload?.answers || {});
            break;
          }

          case 'round:trigger_stop': {
            roomManager.triggerStopFromPlayer(socket);
            break;
          }

          case 'vote:cast': {
            const { voteId, accept } = msg.payload || {};
            roomManager.castVote(socket, voteId, Boolean(accept));
            break;
          }

          case 'absurd:vote': {
            const { nominationId } = msg.payload || {};
            roomManager.voteAbsurd(socket, nominationId);
            break;
          }

          case 'recap:next_round': {
            roomManager.nextRound(socket);
            break;
          }

          case 'game:restart': {
            roomManager.restartGame(socket);
            break;
          }

          case 'ping': {
            socket.send(JSON.stringify({ event: 'pong', payload: { serverTime: Date.now() } }));
            break;
          }

          default:
            console.log('Evento desconocido:', msg.event);
        }
      } catch (err) {
        console.error('Error procesando mensaje WebSocket:', err);
      }
    });

    socket.on('close', () => {
      roomManager.unregisterSocket(socket);
    });

    socket.on('error', (err: Error) => {
      console.warn('WebSocket socket error:', err.message);
      roomManager.unregisterSocket(socket);
    });
  });
});

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';

try {
  await fastify.listen({ port: PORT, host: HOST });
  console.log(`🚀 [API] Servidor Fastify corriendo en http://${HOST}:${PORT}`);
  console.log(`🔌 [WS] WebSockets listos en ws://${HOST}:${PORT}/ws`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
