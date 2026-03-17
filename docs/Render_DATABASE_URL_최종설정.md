# Render DATABASE_URL 최종 설정 (Tenant or user not found 해결)

로컬에서는 되고 Render 배포에서만 "Tenant or user not found"가 나올 때 아래를 **순서대로** 진행하세요.

---

## 1. Supabase 프로젝트 상태 확인

1. https://supabase.com/dashboard 접속
2. 프로젝트 **svnhwtiwvzwbwdbmkecw** 선택
3. **Paused** 상태면 → **Restore project** 클릭 (무료 플랜은 1주일 미접속 시 Paused됨)

---

## 2. 연결 문자열 복사 (대시보드에서 직접)

**수동 조합 금지.** 반드시 Supabase에서 복사하세요.

1. Supabase 대시보드 → 프로젝트 선택
2. 좌측 **Project Settings** (톱니바퀴) → **Database**
3. **Connection string** 섹션
4. **URI** 탭
5. **Connection pooling** 선택
6. **Session** 모드 선택 (포트 5432) → **복사** 버튼 클릭
7. `[YOUR-PASSWORD]`를 **실제 DB 비밀번호**로 교체
   - 비밀번호: Project Settings → Database → Database password
   - 특수문자 `@`, `#`, `%` 있으면 URL 인코딩 (예: `@` → `%40`)

---

## 3. Render에 설정

1. https://dashboard.render.com → **korea-quiz** 서비스
2. **Environment** 탭
3. `DATABASE_URL` 수정 또는 추가
4. Value에 (2)에서 복사한 **전체** 문자열 붙여넣기
5. **Save Changes**
6. **Manual Deploy** 또는 Deploy Hook 호출

---

## 4. 올바른 형식 예시

### Session 모드 (권장, 포트 5432)
```
postgresql://postgres.svnhwtiwvzwbwdbmkecw:비밀번호@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres
```

### Transaction 모드 (포트 6543)
```
postgresql://postgres.svnhwtiwvzwbwdbmkecw:비밀번호@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true
```

> ⚠️ **포트 5432**와 **6543**은 호스트가 같아도 **다른 모드**입니다. Session(5432)을 먼저 시도하세요.

---

## 5. 확인

배포 후: https://korea-quiz.onrender.com/api/health/db

- `{"ok":true,"db":"connected"}` → 성공
- `hint` 필드가 있으면 그대로 따라하세요.
