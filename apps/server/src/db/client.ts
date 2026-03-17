// index.ts에서 .env 로드함
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');
// Supabase SSL: 연결 문자열에 sslmode 없으면 추가 (Render 등 외부 연결 시 필요)
const connStr = connectionString.includes('sslmode=') ? connectionString : connectionString + (connectionString.includes('?') ? '&' : '?') + 'sslmode=require';
const pool = new pg.Pool({
  connectionString: connStr,
  connectionTimeoutMillis: 8000,
});
export const db = drizzle(pool, { schema });
export type Db = typeof db;
