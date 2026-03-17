# Vercel 연동 체크리스트 (연결 오류 해결)

"연결을 확인하고 다시 시도해주세요" 오류가 나면 아래를 순서대로 확인하세요.

---

## 1. Git 저장소 연결

[Vercel korea-quiz-client](https://vercel.com/leechang1811-afks-projects/korea-quiz-client) → **Settings** → **Git**

- **Connect Git Repository**가 비어 있으면:
  1. **Connect** 클릭
  2. **GitHub** 선택 → `leechang1811-afk/korea-quiz` 저장소 연결
  3. **Production Branch**: `main` 확인 후 저장

→ 이렇게 하면 `git push` 시 자동 배포됩니다.

---

## 2. 환경변수 설정 (필수)

**Settings** → **Environment Variables** → **Add New**

| Name | Value | Environment |
|------|-------|-------------|
| `VITE_API_URL` | `https://korea-quiz.onrender.com/api` | Production, Preview |

> ⚠️ 끝에 `/api` 꼭 포함. 공백 없이 입력.

`VITE_API_URL`이 없으면 클라이언트가 `/api`(같은 도메인)로 요청해 실패합니다.

---

## 3. 재배포

환경변수 추가/수정 후 **반드시 재배포**해야 적용됩니다.

1. **Deployments** 탭
2. 최신 배포 우측 **⋯** → **Redeploy**
3. 1~2분 후 https://korea-quiz-client.vercel.app 새로고침

---

## 4. Render API 확인

- https://korea-quiz.onrender.com/api/health → `{"ok":true}`
- https://korea-quiz.onrender.com/api/health/db → DB 연결 상태

Render 무료 플랜은 15분 미사용 시 슬립 모드로 들어갑니다. 첫 요청이 30초~1분 걸릴 수 있어, 그때는 "다시 시도" 버튼으로 재요청하면 됩니다.

---

## 요약

| 항목 | 확인 |
|------|------|
| Git 연결 | leechang1811-afk/korea-quiz (main) |
| VITE_API_URL | https://korea-quiz.onrender.com/api |
| 재배포 | 환경변수 변경 후 Redeploy |
