# 성경 1일1독 - GitHub & Vercel 배포 가이드

## 1. GitHub 저장소 생성

1. https://github.com/new 접속
2. **Repository name**: `bible`
3. **Owner**: `leechang1811-afk`
4. **Public** 선택
5. ❌ "Add a README file" **체크하지 않기** (이미 로컬에 코드 있음)
6. **Create repository** 클릭

## 2. GitHub에 푸시

저장소 생성 후, 터미널에서 실행:

```bash
cd /Users/changhwanlee/Desktop/Next-Tailwind\ 2/bible-1day1read
git push -u origin main
```

## 3. Vercel 프로젝트 생성 및 연동

1. https://vercel.com 접속 후 로그인
2. **Add New...** → **Project** 클릭
3. **Import Git Repository**에서 `leechang1811-afk/bible` 선택 (없으면 GitHub 계정 연동)
4. **Project Name**을 `korea-bible`로 변경
5. **Framework Preset**: Vite (자동 감지)
6. **Root Directory**: `./` (그대로)
7. **Deploy** 클릭

배포 완료 후 `korea-bible.vercel.app` 등으로 접속 가능합니다.
