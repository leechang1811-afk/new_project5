import './loadEnv.js';
import express from 'express';
import cors from 'cors';
import { db } from './db/client.js';
import { sql } from 'drizzle-orm';
import runsRouter from './routes/runs.js';
import statsRouter from './routes/stats.js';
import leaderboardRouter from './routes/leaderboard.js';
import meRouter from './routes/me.js';

const app = express();
const PORT = process.env.PORT || 5005;

app.use(cors({ origin: true }));
app.use(express.json());

app.use(runsRouter);
app.use(statsRouter);
app.use(leaderboardRouter);
app.use(meRouter);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

function dbErrorHint(msg: string): string | undefined {
  if (msg.includes('Tenant or user not found'))
    return 'Supabase: ① 프로젝트 Paused면 Restore ② Connect 버튼에서 연결 문자열 새로 복사 ③ 포트 5432(Session) 사용';
  if (msg.includes('self-signed certificate')) return 'sslmode=no-verify 적용됨. 재배포 후 확인';
  if (msg.includes('ENETUNREACH')) return 'Start Command에 --dns-result-order=ipv4first 추가';
  return undefined;
}

app.get('/api/health/db', async (_req, res) => {
  try {
    await db.execute(sql`SELECT 1`);
    res.json({ ok: true, db: 'connected' });
  } catch (e) {
    const msg = (e as Error).message;
    console.error('DB health check failed:', e);
    const hint = dbErrorHint(msg);
    res.status(503).json({
      ok: false,
      db: 'error',
      message: msg,
      ...(hint && { hint }),
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
