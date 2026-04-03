/**
 * 앱인토스 스토어용 세로 스크린샷 3장 (636×1048 PNG)
 * 실행 전: npm run dev:client (apps/client → http://127.0.0.1:5010)
 * 저장: 프로젝트 루트 assets/store-636x1048-rolmodel/
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const outDir = path.join(projectRoot, 'assets', 'store-636x1048-rolmodel');

/** 기본 5010 — 포트 충돌 시: STORE_SHOT_BASE=http://127.0.0.1:5013 npm run screenshot:rolmodel-store */
const BASE = (process.env.STORE_SHOT_BASE || 'http://127.0.0.1:5010').replace(/\/$/, '');

const SHOTS = [
  { path: '/', file: '01-home-636x1048.png', label: '홈' },
  { path: '/mission', file: '02-mission-636x1048.png', label: '오늘 미션' },
  { path: '/report', file: '03-report-636x1048.png', label: '1개월 리포트' },
];

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 636, height: 1048, deviceScaleFactor: 1 });

  for (const shot of SHOTS) {
    const url = `${BASE}${shot.path}`;
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 25_000 });
    } catch (err) {
      console.error(`연결 실패 (${url}). dev 서버를 켠 뒤 다시 실행하세요:\n  npm run dev:client\n`, err.message);
      await browser.close();
      process.exitCode = 1;
      return;
    }
    await new Promise((r) => setTimeout(r, 400));
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
