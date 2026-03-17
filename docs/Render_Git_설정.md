# Render + Git 연동 설정 (korea-quiz)

Render 서비스 **korea-quiz** (https://korea-quiz.onrender.com)가 GitHub와 연동되도록 설정합니다.

---

## 1. Render 대시보드 설정 확인

**서비스**: korea-quiz  
**URL**: https://korea-quiz.onrender.com  
**Repository**: leechang1811-afk/korea-quiz (main)

### Build & Deploy
| 항목 | 값 |
|------|-----|
| **Build Command** | `npm install && npm run build:server` |
| **Start Command** | `node apps/server/dist/index.js` |
| **Root Directory** | (비워두기) |

### Environment (MANAGE → Environment)
| Key | Value |
|-----|-------|
| `DATABASE_URL` | Supabase URI (apps/server/.env와 동일) |
| `NODE_ENV` | `production` (선택) |

> ⚠️ **DATABASE_URL**은 대시보드에서 직접 추가해야 합니다. Git에 없음.

---

## 2. Vercel 클라이언트 연동

클라이언트(https://korea-quiz-client.vercel.app)는 **apps/client/.env.production**에 다음이 설정되어 있음:

```
VITE_API_URL=https://korea-quiz.onrender.com/api
```

→ Git push 시 자동 반영. Vercel에서 별도 설정 불필요.

---

## 3. 확인 절차

1. **Render Health**  
   https://korea-quiz.onrender.com/api/health → `{"ok":true}`

2. **DB 연결**  
   https://korea-quiz.onrender.com/api/health/db → `{"ok":true,"db":"connected"}`

3. **클라이언트**  
   https://korea-quiz-client.vercel.app 접속 → 내 최고 기록 등 표시

---

## 4. Git push → 자동 배포

`main` 브랜치에 push하면 Render가 자동으로:
1. 소스 풀
2. `npm install && npm run build:server` 실행
3. `node apps/server/dist/index.js`로 서버 시작
