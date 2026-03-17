# Render DB 연동 원클릭

로컬 `.env`의 `DATABASE_URL`을 Render에 동기화하고 재배포합니다.

## 1. Render API Key 발급 (1회)

1. https://dashboard.render.com/settings/api-keys 접속
2. **Create API Key** 클릭
3. 생성된 키 복사 (한 번만 표시됨)

## 2. 실행

```bash
# apps/server/.env에 RENDER_API_KEY=발급한키 추가 후:
RENDER_API_KEY=발급한키 npm run render:sync-db
```

또는 `apps/server/.env`에 다음 줄 추가 후:

```
RENDER_API_KEY=발급한키
```

```bash
npm run render:sync-db
```

## 3. 완료

- Render에 `DATABASE_URL` 설정됨
- 자동 재배포 트리거 (1~2분 후 반영)
- https://korea-quiz-api.onrender.com/api/health/db 로 연결 확인
