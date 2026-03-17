// index.ts에서 .env 로드함
import dns from 'node:dns';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

// Render 등 일부 환경에서 Supabase IPv6 주소로 연결 시 ENETUNREACH 발생 → IPv4 우선
dns.setDefaultResultOrder('ipv4first');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');
// Supabase SSL: no-verify = 인증서 검증 생략 (Render 등에서 self-signed certificate 오류 방지)
const connStr = connectionString.includes('sslmode=')
  ? connectionString.replace(/sslmode=[^&]+/, 'sslmode=no-verify')
  : connectionString + (connectionString.includes('?') ? '&' : '?') + 'sslmode=no-verify';
const pool = new pg.Pool({
  connectionString: connStr,
  connectionTimeoutMillis: 8000,
});
export const db = drizzle(pool, { schema });
export type Db = typeof db;
