#!/usr/bin/env node
/**
 * Translate Leviticus, Numbers, Deuteronomy from KJV to Korean (직역).
 * Output: JSON for merging into generate-all-translations.mjs
 * Protestant terminology: LORD→여호와, Egypt→애굽, tabernacle→성막, congregation→회중, sanctuary→성소
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { translate } from '@vitalets/google-translate-api';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KJV_PATH = path.join(__dirname, '..', 'public', 'bible', 'kjv.json');
const OUT_PATH = path.join(__dirname, '..', 'lev-num-deut-translations.json');
const PROGRESS_PATH = path.join(__dirname, '..', 'public', 'bible', 'lev-num-deut-progress.json');

const DELAY_MS = 300;
const LIMIT = parseInt(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] || '0', 10) || null;

// Pre-translation: keep divine name (translator often leaves proper nouns)
function prepareEnglish(text) {
  if (!text) return text;
  return text.replace(/\bthe LORD\b/gi, 'Yahweh').replace(/\bLORD\b/g, 'Yahweh');
}

// Protestant Korean terminology (apply AFTER translation)
function applyProtestantTerms(text) {
  if (!text || typeof text !== 'string') return text;
  let out = text;
  out = out.replace(/야훼|야웨/gi, '여호와');
  out = out.replace(/이집트/g, '애굽');
  out = out.replace(/주님/g, '여호와');
  out = out.replace(/집회/g, '회중');
  out = out.replace(/집회장|회중의 천막/gi, '회중의 성막');
  out = out.replace(/성막\s*of\s*the\s*집회/gi, '회중의 성막');
  out = out.replace(/성소\s*휘장/gi, '성소 휘장');
  return out;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function doTranslate(text, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const { text: ko } = await translate((text || '').slice(0, 5000), { to: 'ko' });
      return applyProtestantTerms(ko);
    } catch (e) {
      if (attempt < retries - 1) {
        await sleep(2000);
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
  const targetBooks = ['leviticus', 'numbers', 'deuteronomy'];
  const keys = Object.keys(kjv).filter((k) => {
    const book = k.split(',')[0];
    return targetBooks.includes(book);
  });

  let result = {};
  let startIdx = 0;

  if (fs.existsSync(PROGRESS_PATH)) {
    try {
      const p = JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'));
      result = p.result || {};
      startIdx = (p.lastIndex ?? -1) + 1;
      console.log(`Resuming from ${startIdx + 1}/${keys.length}`);
    } catch (_) {}
  }

  const endIdx = LIMIT ? Math.min(startIdx + LIMIT, keys.length) : keys.length;
  for (let i = startIdx; i < endIdx; i++) {
    const key = keys[i];
    const en = kjv[key];
    if (!en || typeof en !== 'string') continue;

    const prepared = prepareEnglish(en.trim());
    const ko = await doTranslate(prepared);
    if (ko) result[key] = ko;

    if ((i + 1) % 50 === 0) {
      fs.writeFileSync(PROGRESS_PATH, JSON.stringify({ result, lastIndex: i }));
      console.log(`Progress: ${i + 1}/${keys.length} (${((i + 1) / keys.length * 100).toFixed(1)}%)`);
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
