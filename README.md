# 한국인 상위 몇%?

Apps in Toss 미니앱 게임 "한국인 상위 몇%?" MVP

5가지 문제유형(민첩성, 순발력, 기억력, 논리력, 시각 추론)을 하나의 Run으로 묶은 게임입니다.

## 프로젝트 구조 (모노레포)

```
/
├── apps/
│   ├── client/     # Vite + React + TypeScript + Tailwind
│   └── server/     # Express + TypeScript
├── packages/
│   └── shared/     # 공통 타입, 점수, timeLimit
├── package.json
└── pnpm-workspace.yaml
```

## 사전 요구사항

- Node.js 18+
- pnpm 9+ (또는 npm)
- PostgreSQL (Supabase 권장)

## Supabase 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. Settings → Database → Connection string (URI) 복사
3. `.env` 파일 생성:

```bash
# apps/server/.env
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
PORT=5005
```

## 설치 및 실행

### 의존성 설치

```bash
pnpm install
# 또는
npm install
```

### shared 패키지 빌드

```bash
cd packages/shared && pnpm build && cd ../..
# 또는
cd packages/shared && npm run build && cd ../..
```

### DB 마이그레이션

```bash
cd apps/server
pnpm db:generate   # 스키마 변경 시
pnpm db:migrate    # 마이그레이션 실행
# 또는
npx drizzle-kit migrate
```

초기 스키마는 `apps/server/drizzle/0000_init.sql`을 직접 실행해도 됩니다:

```bash
psql $DATABASE_URL -f apps/server/drizzle/0000_init.sql
```

### 개발 서버 실행

```bash
pnpm dev
```

- 클라이언트: http://localhost:5173
- 서버: http://localhost:5005

개별 실행:

```bash
pnpm dev:client   # http://localhost:5173 (Vite, /api → 5005 프록시)
pnpm dev:server   # 또는 npm run dev:server
```

### 빌드

```bash
pnpm build
```

## 배포 (Render 예시)

### Server (Web Service)

- Build Command: `cd apps/server && pnpm install && pnpm build`
- Start Command: `cd apps/server && pnpm start`
- Environment: `DATABASE_URL` (Supabase connection string)

### Client (Vercel)

- Build Command: `npm run build:vercel`
- Output Directory: `apps/client/dist`
- Environment: `VITE_API_URL` = 백엔드 API URL (예: `https://your-api.onrender.com/api`)

## API

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | /api/runs/submit | Run 점수 제출, 상위% 계산 |
| GET | /api/stats/success?game_type=&level= | 문제유형/단계별 성공률 |
| GET | /api/stats/percentile?score= | 점수 기반 상위% |
| GET | /api/leaderboard?scope=monthly | 월간 리더보드 |
| GET | /api/me/summary?user_hash= | 내 기록 요약 |

## 환경변수

| 변수 | 설명 |
|------|------|
| DATABASE_URL | PostgreSQL 연결 문자열 (필수) |
| PORT | 서버 포트 (기본 5005) |
| VITE_API_URL | 클라이언트 API 주소 (Vercel 배포 시 필수) |
