/**
 * 앱인토스 스토어용 세로 스크린샷 4장 (636×1048 PNG) — 4번째는 ?previewWow=1 달성 축하 모달
 * 기본: 프로덕션 (https://new-project5-six.vercel.app)
 * 로컬: STORE_SHOT_BASE=http://127.0.0.1:5010 npm run screenshot:rolmodel-store
 * 저장: 프로젝트 루트 assets/store-636x1048-rolmodel/
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const outDir = path.join(projectRoot, 'assets', 'store-636x1048-rolmodel');

const DEFAULT_PROD = 'https://new-project5-six.vercel.app';
const BASE = (process.env.STORE_SHOT_BASE || DEFAULT_PROD).replace(/\/$/, '');

const SHOTS = [
  { path: '/', file: '01-home-636x1048.png', label: '홈' },
  { path: '/mission', file: '02-mission-636x1048.png', label: '오늘 미션' },
  { path: '/report', file: '03-report-636x1048.png', label: '1개월 리포트' },
  { path: '/?previewWow=1', file: '04-wow-celebration-636x1048.png', label: '달성 축하' },
];

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 636, height: 1048, deviceScaleFactor: 1 });

  /** 롤모델 선택 풀스크린 모달이 본문을 가림 → React mount 전에 플래그 주입 */
  await page.evaluateOnNewDocument(() => {
    try {
      localStorage.setItem('rolemodel-picker-seen', 'true');
    } catch {
      /* ignore */
    }
  });

  for (const shot of SHOTS) {
    const url = `${BASE}${shot.path}`;
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 45_000 });
    } catch (err) {
      console.error(`연결 실패 (${url}). 네트워크·URL 확인 또는 STORE_SHOT_BASE로 로컬 지정:\n`, err.message);
      await browser.close();
      process.exitCode = 1;
      return;
    }
    const introOpen = await page.evaluate(() =>
      Boolean(document.body?.innerText?.includes('닮고 싶은 롤모델을 선택해주세요.')),
    );
    if (introOpen) {
      await page.evaluate(() => {
        try {
          localStorage.setItem('rolemodel-picker-seen', 'true');
        } catch {
          /* ignore */
        }
      });
      await page.reload({ waitUntil: 'networkidle2', timeout: 45_000 });
    }
    const waitMs = shot.path.includes('previewWow') ? 2200 : 1500;
    await new Promise((r) => setTimeout(r, waitMs));
    const outPath = path.join(outDir, shot.file);
    await page.screenshot({ path: outPath, type: 'png' });
    console.log('저장:', outPath, `(${shot.label})`);
  }

  await browser.close();
  console.log('완료:', outDir);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
