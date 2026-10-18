import { pgTable, text, varchar, integer, timestamp, jsonb, boolean, serial, uuid, index } from 'drizzle-orm/pg-core';

export const rooms = pgTable('rooms', {
  code: varchar('code', { length: 4 }).primaryKey(),
  hostId: uuid('host_id').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('LOBBY'),
  settings: jsonb('settings').notNull(),
  currentRound: integer('current_round').notNull().default(0),
  letterHistory: jsonb('letter_history').notNull().default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const players = pgTable('players', {
  id: uuid('id').primaryKey(),
  roomCode: varchar('room_code', { length: 4 }).notNull().references(() => rooms.code, { onDelete: 'cascade' }),
  name: varchar('name', { length: 50 }).notNull(),
  avatarId: varchar('avatar_id', { length: 50 }).notNull(),
  score: integer('score').notNull().default(0),
  isHost: boolean('is_host').notNull().default(false),
  isReady: boolean('is_ready').notNull().default(false),
  isOnline: boolean('is_online').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const rounds = pgTable('rounds', {
  id: serial('id').primaryKey(),
  roomCode: varchar('room_code', { length: 4 }).notNull().references(() => rooms.code, { onDelete: 'cascade' }),
  roundNumber: integer('round_number').notNull(),
  letter: varchar('letter', { length: 2 }).notNull(),
  stoppedByPlayerId: uuid('stopped_by_player_id'),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  endedAt: timestamp('ended_at'),
});

export const answers = pgTable('answers', {
  id: serial('id').primaryKey(),
  roundId: integer('round_id').notNull().references(() => rounds.id, { onDelete: 'cascade' }),
  playerId: uuid('player_id').notNull().references(() => players.id, { onDelete: 'cascade' }),
  category: varchar('category', { length: 50 }).notNull(),
  rawWord: text('raw_word').notNull(),
  normalizedWord: text('normalized_word').notNull(),
  points: integer('points').notNull().default(0),
  status: varchar('status', { length: 30 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const dictionary = pgTable('dictionary', {
  id: serial('id').primaryKey(),
  category: varchar('category', { length: 50 }).notNull(),
  normalizedWord: varchar('normalized_word', { length: 100 }).notNull(),
  originalWord: varchar('original_word', { length: 100 }).notNull(),
  isApproved: boolean('is_approved').notNull().default(true),
}, (table) => [
  index('idx_dict_cat_norm').on(table.category, table.normalizedWord)
]);

export const absurdAwards = pgTable('absurd_awards', {
  id: serial('id').primaryKey(),
  roundId: integer('round_id').notNull().references(() => rounds.id, { onDelete: 'cascade' }),
  playerId: uuid('player_id').notNull().references(() => players.id, { onDelete: 'cascade' }),
  category: varchar('category', { length: 50 }).notNull(),
  word: text('word').notNull(),
  votesCount: integer('votes_count').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
