import { integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';
import { type WvWMatchStripped } from '#lib/resources/wvw/matches.ts';
import { type WvWTeamColor, type WvWMapType } from '#lib/resources/wvw/matches.ts';

type WvWEventType = 'capture' | 'claim';
type WvWObjectiveType = 'Camp' | 'Tower' | 'Keep' | 'Castle' | 'Ruins';

// snake_case property names intentionally mirror the DB column names so that
// Drizzle's inferred types match the snake_case shapes expected by the API.

export const matchState = sqliteTable('match_state', {
  match_id: text('match_id').primaryKey(),
  data: text('data', { mode: 'json' }).$type<WvWMatchStripped>().notNull(),
  end_time: text('end_time').notNull(),
  updated_at: text('updated_at').notNull(),
});

export const events = sqliteTable(
  'events',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    match_id: text('match_id').notNull(),
    type: text('type').$type<WvWEventType>().notNull(),
    at: text('at').notNull(),
    objective_id: text('objective_id').notNull(),
    objective_type: text('objective_type').$type<WvWObjectiveType>().notNull(),
    map_type: text('map_type').$type<WvWMapType>().notNull(),
    owner: text('owner').$type<WvWTeamColor>().notNull(),
    claimed_by: text('claimed_by'),
  },
  (table) => [unique().on(table.match_id, table.objective_id, table.type, table.at)],
);
