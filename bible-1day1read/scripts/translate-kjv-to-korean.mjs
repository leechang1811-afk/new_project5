#!/usr/bin/env node
/**
 * KJV 전체 성경을 한국어 직역으로 변환
 * - kjv.json의 모든 절을 번역하여 explanations.json 생성
 * - 진행상황 저장으로 중단 후 재실행 시 이어서 진행
 * - npm run translate-kjv 실행
 */

import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const KJV_PATH = path.join(__dirname, '..', 'public', 'bible', 'kjv.json');
const OUT_PATH = path.join(__dirname, '..', 'src', 'data', 'explanations.json');
const PROGRESS_PATH = path.join(__dirname, '..', 'public', 'bible', 'translate-progress.json');

const DELAY_MS = 1500; // 요청 간 딜레이 (rate limit 방지)
const LIBRE_URL = 'https://libretranslate.com/translate';

// 실행: npm run translate-kjv
// 제한 테스트: npm run translate-kjv -- --limit 100
const LIMIT = parseInt(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] || '0', 10) || null;

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function translate(text, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(LIBRE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text.slice(0, 5000), source: 'en', target: 'ko' }),
      });
      const data = await res.json();
      if (data.translatedText) return data.translatedText;
      if (res.status === 429) throw new Error('Rate limited');
    } catch (e) {
      if (attempt < retries - 1) {
        await sleep(5000);
        continue;
      }
      console.error('Translate error:', e.message);
      return null;
    }
  }
  return null;
}

async function main() {
  const kjv = JSON.parse(fs.readFileSync(KJV_PATH, 'utf8'));
  const keys = Object.keys(kjv);
  const total = keys.length;

  let result = {};
  let startIndex = 0;

  if (fs.existsSync(PROGRESS_PATH)) {
    try {
      const progress = JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'));
      result = progress.result || {};
      startIndex = progress.lastIndex + 1;
      console.log(`Resuming from verse ${startIndex + 1}/${total}`);
    } catch (_) {}
  }

  for (let i = startIndex; i < total; i++) {
    const key = keys[i];
    const en = kjv[key];
    if (!en || typeof en !== 'string') continue;

    const ko = await translate(en.trim());
    if (ko) {
      result[key] = ko;
    }

    if ((i + 1) % 100 === 0) {
      fs.writeFileSync(PROGRESS_PATH, JSON.stringify({ result, lastIndex: i }));
      console.log(`Progress: ${i + 1}/${total} (${((i + 1) / total * 100).toFixed(1)}%)`);
    }

    await sleep(DELAY_MS);
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2), 'utf8');
  if (fs.existsSync(PROGRESS_PATH)) fs.unlinkSync(PROGRESS_PATH);
  console.log(`\nDone. Wrote ${Object.keys(result).length} verses to ${OUT_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
