# Vercel ↔ Render 연동 (화면이 이전 버전처럼 보일 때)

## 원인
`VITE_API_URL`이 설정되지 않으면 API 호출이 실패하고, **내 최고 기록·오늘의 목표·스트릭** 등이 안 보여서 이전 버전처럼 보입니다.

## 해결 방법 (2분)

### 1. Render 서비스 URL 확인
1. [Render 대시보드](https://dashboard.render.com) 로그인
2. **korea-quiz** (또는 해당 Web Service) 클릭
3. 상단 **URL** 복사 (예: `https://korea-quiz.onrender.com`)

### 2. Vercel에 환경변수 추가
1. [Vercel 대시보드](https://vercel.com) 로그인
2. **korea-quiz-client** 프로젝트 클릭
3. **Settings** → **Environment Variables**
4. **Add** 클릭 후:

| Name | Value |
|------|-------|
| `VITE_API_URL` | `https://korea-quiz.onrender.com/api` |

> ⚠️ **끝에 `/api` 꼭 붙이세요!**

5. **Save** 클릭

### 3. 재배포
1. **Deployments** 탭 이동
2. 최신 배포 우측 **⋯** 클릭 → **Redeploy**
3. 1~2분 후 https://korea-quiz-client.vercel.app 새로고침

---

## 확인
- **내 최고: 상위 N%** 박스가 보이면 연동 성공
- 결과 제출 후 **상위 N%** 표시되면 정상
