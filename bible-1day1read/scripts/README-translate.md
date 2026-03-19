# KJV 전체 한국어 직역 생성

`explanations.json`에 전체 성경(31,102절)의 한국어 직역을 채우려면:

```bash
cd bible-1day1read
npm run translate-kjv
```

## 예상 소요 시간
- LibreTranslate: 절당 ~1.5초 딜레이 → 약 13시간
- Rate limit 걸리면 5분 대기 후 재시도

## 옵션
- `--limit 500`: 500절만 번역 (테스트용)
- 중단 후 `npm run translate-kjv` 재실행 시 `translate-progress.json`에서 이어서 진행

## 완료 후
생성된 `src/data/explanations.json`이 앱에 반영됩니다.
