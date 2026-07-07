import { drizzle } from 'drizzle-orm/d1';

// eslint-disable-next-line import/no-namespace -- drizzle needs the whole schema namespace passed to drizzle(d1, { schema }).
import * as schema from './schema';

export function getDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

export type Db = ReturnType<typeof getDb>;
