# Render ↔ Supabase DB 연결 점검 가이드

앱 URL 접속 시 "데이터베이스 연결이 안 되어 있다"면 아래를 순서대로 확인하세요.

---

## 1️⃣ Supabase 확인 (https://supabase.com/dashboard/project/svnhwtiwvzwbwdbmkecw)

### 1-1. 프로젝트 상태
- 좌측 **Project Settings** → **General** 에서 프로젝트가 **Active** 인지 확인
- 무료 플랜: 1주일 미접속 시 Paused 될 수 있음 → **Restore project** 클릭

### 1-2. Connection String 복사 (대시보드에서 직접 복사 권장)
1. **Project Settings** (톱니바퀴) → **Database**
2. **Connection string** 섹션 → **URI** 탭
3. **Connection pooling** → **Session** 모드 (포트 5432) 선택 후 **복사**
4. `[YOUR-PASSWORD]` 를 **실제 DB 비밀번호**로 교체
5. 비밀번호에 `@`, `#`, `%` 등 특수문자가 있으면 **URL 인코딩** 필요

### 1-3. 연결 테스트 (선택)
- **SQL Editor** → `SELECT 1;` 실행하여 DB 응답 확인

---

## 2️⃣ Render 확인 (https://dashboard.render.com/web/srv-d6o3kqshg0os73ch9bcg/settings)

### 2-1. Environment Variables
1. **Environment** 탭 이동
2. **Environment Variables** 섹션
3. `DATABASE_URL` 키가 있는지 확인
4. **없으면** → **Add Environment Variable**
   - Key: `DATABASE_URL`
   - Value: (1단계에서 복사한 전체 연결 문자열)

### 2-2. 값 확인
- 앞뒤 공백 없음
- 따옴표로 감싸지 않음 (그냥 `postgresql://...` 만 입력)
- **Session 모드**: 포트 `5432`, 사용자 `postgres.프로젝트ID`

### 2-3. 변경 후 재배포
- 환경변수 수정/추가 후 **Save** → **Manual Deploy** → **Deploy latest commit**

---

## 3️⃣ 자주 발생하는 오류

| 증상 | 원인 | 조치 |
|------|------|------|
| `DATABASE_URL is required` | Render에 DATABASE_URL 미설정 | 2-1 참고 |
| `Connection refused` | 잘못된 호스트/포트, Supabase Paused | 1-1, 1-2 확인 |
| `Password authentication failed` | 비밀번호 오류, 특수문자 미인코딩 | 1-2 비밀번호 확인 |
| `ENETUNREACH` (IPv6 주소) | Render가 Supabase IPv6로 연결 시도 후 실패 | 아래 "ENETUNREACH 조치" 참고 |
| `Tenant or user not found` | 프로젝트 Paused, 잘못된 연결 문자열 | 아래 "Tenant 조치" 참고 |
| `timeout` | 네트워크/방화벽 | Supabase Session 모드(5432) 시도 |

### Tenant or user not found 조치
1. **Supabase 프로젝트** → Paused면 **Restore project**
2. **Connection string** → Supabase Connect 버튼에서 **새로 복사** (수동 조합 금지)
3. **Session 모드** (포트 5432) 사용: `aws-0-ap-northeast-2.pooler.supabase.com:5432`

### ENETUNREACH 상세 조치
1. **DATABASE_URL** → **Session 모드** (포트 5432): `aws-0-ap-northeast-2.pooler.supabase.com:5432`
2. **Render Start Command**에 IPv4 플래그 추가
   - 현재: `node apps/server/dist/index.js`
   - 변경: `node --dns-result-order=ipv4first apps/server/dist/index.js`
   - 위치: Render 대시보드 → korea-quiz → Settings → Build & Deploy → Start Command

---

## 4️⃣ 연결 문자열 예시 (프로젝트 ID: svnhwtiwvzwbwdbmkecw)

**Session 모드 (권장):**
```
postgresql://postgres.svnhwtiwvzwbwdbmkecw:내비밀번호@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres
```

- **내비밀번호**를 실제 DB 비밀번호로 교체
- Supabase Connect 버튼에서 복사한 값을 사용하는 것이 가장 안전함

---

## 5️⃣ Render 배포 후 확인

배포 완료 후 아래 URL로 연결 테스트:

```
https://[Render서비스URL]/api/health
https://[Render서비스URL]/api/health/db
```

- `{"ok":true}` → 정상
- `{"ok":false,"db":"error"}` → DB 연결 실패 → 위 1~2단계 재확인
