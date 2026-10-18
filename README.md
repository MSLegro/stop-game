# ✏️ Stop! (Tutti Frutti / Basta) — PWA Multiplayer Indie Game

Juego multijugador progresivo en tiempo real del clásico juego escolar **Stop** (conocido también como *Tutti Frutti*, *Basta*, *Lápiz Quieto* o *Alto el Lápiz*), diseñado con una estética **"Playful Indie Game"** inspirada en pizarras y bocetos a mano (estilo **Peak** y **Excalidraw**).

---

## 🎨 Identidad Visual y Experiencia "Juicy"

- **Estética de Cuaderno Escolar:** Hojas cuadriculadas con margen rojo, clips, cinta adhesiva *washi tape* decorativa, y tipografías manuscritas redondeadas (`Patrick Hand` y `Fredoka`).
- **Componentes con Trazo Orgánico:** Bordes irregulares simulando bocetos hechos a lápiz (`border-sketch`), sombras planas marcadas (`box-shadow`), y botones con animaciones reactivas y elásticas mediante **Framer Motion**.
- **Avatares Garabateados (Doodle SVGs):** 8 personajes únicos dibujados a mano (Carita Garabato, Gatito de Tiza, Monstruo Ojo, Alien de Plastilina, Robot de Cartón, Tostada Kawaii, Pulpo Manchado, Estrella Rebelde).
- **Audio Procedural (Web Audio API):** Efectos sonoros caricaturescos sintetizados en el navegador (tic-tac de reloj de madera, bocinazo cómic de ¡STOP!, papel arrugado, pop jugoso y fanfarrias festivas) **100% offline sin dependencias externas de archivos mp3**.

---

## ⚡ Stack Tecnológico

- **Monorepo:** `pnpm workspaces` + `Turborepo` (`apps/web`, `apps/api`, `packages/shared`).
- **Backend:** Fastify (TypeScript) + `@fastify/websocket` con sincronización de salas en memoria y persistencia reactiva.
- **Base de Datos & ORM:** PostgreSQL 16 local (`docker-compose.yml`) + Drizzle ORM + Diccionario español precargado (700+ palabras y caché rápida).
- **Frontend:** React 19 + Vite 6 + TypeScript + Tailwind CSS + Framer Motion + Canvas Confetti.
- **PWA:** `vite-plugin-pwa` configurado con Service Worker, Web App Manifest, soporte offline y precache de Google Fonts.
- **Tipado Compartido:** `@stop/shared` para sincronizar contratos, eventos de WebSocket, categorías y algoritmos de normalización.

---

## 🕹️ Mecánicas de Juego

1. **Salas Multijugador con PIN:** Creación de salas instantáneas con código de 4 caracteres (ej. `KZ79`).
2. **Temporizador Absoluto del Servidor:** Cronómetro de ronda controlado desde el servidor (no manipulable por clientes).
3. **Modo Caos y Comodines:**
   - ⚡ *Doble Puntuación:* Duplica la puntuación de tu mejor palabra.
   - 🔀 *Comodín de Letra:* Te permite saltarte la letra requerida en una categoría.
   - 🛡️ *Escudo Escolar:* Protege tu respuesta contra el 0 (garantiza 50 puntos si es rechazada).
   - 🎒 *Robo de Apuntes:* Otorga 25 puntos bonus al final de la ronda.
4. **El Botón "¡STOP!" y Congelado Inmediato:** Al presionarlo (o al acabarse el tiempo a cero), el backend emite una señal que sacude y congela las pantallas de todos los participantes.
5. **Validación Híbrida Inteligente:**
   - *Filtro Algorítmico:* Valida letra inicial, normaliza acentos y diacríticos preservando la `ñ`, y longitud mínima.
   - *Diccionario Precargado:* Consulta automática al banco de palabras en PostgreSQL / memoria.
   - *Votación Social Relámpago:* Si una palabra no existe en el diccionario (slang, apodos locales o inventos), se activa una votación de 15 segundos en la sala (👍 vs 👎). Las palabras aceptadas por mayoría se agregan al diccionario.
6. **El Rincón de la Vergüenza:** Antes de pasar de ronda, los jugadores pueden votar por la respuesta más bizarra, insólita o divertida para coronar al *"Rey del Rincón de la Vergüenza"*.
7. **Podio Final:** Escalafón de 1°, 2° y 3° lugar con trofeos dibujados a mano y explosión de confeti.

---

## 🚀 Inicio Rápido

### Requisitos Previos:
- Node.js v20+ (probado en v25)
- pnpm v9+ (probado en v11)
- Docker & Docker Compose (opcional para PostgreSQL; si no está activo, el servidor usa su motor en memoria automáticamente)

### 1. Clonar e Instalar Dependencias
```bash
pnpm install
```

### 2. (Opcional) Levantar Base de Datos PostgreSQL
```bash
docker compose up -d
pnpm db:push
pnpm db:seed
```

### 3. Ejecutar Pruebas del Motor de Juego
```bash
pnpm test
```

### 4. Iniciar en Modo Desarrollo
```bash
pnpm dev
```
- **Web App (PWA):** `http://localhost:3000`
- **API & WebSockets:** `http://localhost:3001` (WS en `ws://localhost:3001/ws`)

### 5. Compilar para Producción
```bash
pnpm build
```

---

## 📁 Estructura del Monorepo

```
stop-game/
├── apps/
│   ├── api/                      # Servidor Fastify + WebSockets + Drizzle ORM
│   │   ├── src/
│   │   │   ├── db/               # Esquemas Drizzle, cliente Postgres y semillas
│   │   │   ├── game/             # Gestor de salas, temporizador y validación híbrida
│   │   │   └── index.ts          # Entrypoint Fastify y rutas WS
│   │   └── tsconfig.json
│   └── web/                      # Cliente React PWA + Vite + Tailwind + Framer Motion
│       ├── public/               # Favicon, logo SVG y assets PWA
│       ├── src/
│       │   ├── components/       # Avatares Garabato y Freeze Overlay de ¡STOP!
│       │   ├── hooks/            # useGameSocket para sincronización en tiempo real
│       │   ├── utils/            # Generador Web Audio procedural (sin dependencias)
│       │   ├── views/            # Lobby, Sala de Espera, Tablero Cuaderno, Votación, Podio
│       │   ├── App.tsx
│       │   └── index.css         # Texturas de libreta, washi tape y trazos orgánicos
│       ├── vite.config.ts        # Configuración de PWA y Service Worker
│       └── tailwind.config.js    # Estilos Excalidraw, sombras y tipografías manuscritas
├── packages/
│   └── shared/                   # Tipos TypeScript, contratos WS y utilidades compartidas
├── docker-compose.yml            # PostgreSQL 16 para persistencia local
├── turbo.json                    # Pipeline de compilación Turborepo
└── pnpm-workspace.yaml           # Configuración del monorepo
```
