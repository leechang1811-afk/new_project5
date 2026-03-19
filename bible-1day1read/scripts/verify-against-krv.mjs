#!/usr/bin/env node
/**
 * Final verification: Compare our translations (explanations.json) against
 * KRV (개역한글 - orthodox Korean church standard).
 * Reports: exact match, similar (minor diff), significant diff, encoding issues.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXPLANATIONS_PATH = path.join(__dirname, '..', 'src', 'data', 'explanations.json');
const KRV_PATH = path.join(__dirname, '..', 'public', 'bible', 'krv.json');

// Protestant term equivalents (our usage vs KRV)
const NORMALIZE = (t) => {
  if (!t || typeof t !== 'string') return '';
  return t
    .replace(/\s+/g, ' ')
    .replace(/야훼|야웨/gi, '여호와')
    .replace(/이집트/g, '애굽')
    .trim();
};

function similarity(a, b) {
  if (!a || !b) return 0;
  const na = NORMALIZE(a);
  const nb = NORMALIZE(b);
  if (na === nb) return 1;
  // Levenshtein-like: count matching chars
  const longer = na.length > nb.length ? na : nb;
  const shorter = na.length > nb.length ? nb : na;
  if (longer.length === 0) return 1;
  let match = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (shorter[i] === longer[i]) match++;
  }
  return match / longer.length;
}

function hasEncodingIssue(text) {
  if (!text || typeof text !== 'string') return false;
  if (/�|[\uFFFD]|[\u0000-\u001F]/.test(text)) return true;
  // 神 in (神) is conventional in Korean Bible - allow it
  const withoutShen = text.replace(/\(\s*神\s*\)/g, '');
  return /[\u4e00-\u9fff]/.test(withoutShen);
}

const explanations = JSON.parse(fs.readFileSync(EXPLANATIONS_PATH, 'utf8'));
const krv = JSON.parse(fs.readFileSync(KRV_PATH, 'utf8'));

const keys = Object.keys(explanations);
let exactMatch = 0, similar = 0, diff = 0, encodingIssues = 0, noKrv = 0;
const samples = { diff: [], encoding: [], noKrv: [] };

for (const key of keys) {
  const ours = explanations[key];
  const krvText = krv[key];

  if (hasEncodingIssue(ours)) {
    encodingIssues++;
    if (samples.encoding.length < 10) samples.encoding.push({ key, ours: ours?.substring(0, 60) });
    continue;
  }

  if (!krvText) {
    noKrv++;
    if (samples.noKrv.length < 5) samples.noKrv.push(key);
    continue;
  }

  const normOurs = NORMALIZE(ours);
  const normKrv = NORMALIZE(krvText);

  if (normOurs === normKrv) {
    exactMatch++;
  } else {
    const sim = similarity(ours, krvText);
    if (sim >= 0.95) {
      similar++;
    } else {
      diff++;
      if (samples.diff.length < 15) {
        samples.diff.push({
          key,
          ours: ours.substring(0, 80),
          krv: krvText.substring(0, 80),
          sim: (sim * 100).toFixed(1) + '%'
        });
      }
    }
  }
}

console.log('=== 정통 한국교회 성경(KRV/개역한글) 대비 최종 점검 ===\n');
console.log('총 절 수:', keys.length);
console.log('완전 일치:', exactMatch, '(' + (exactMatch / keys.length * 100).toFixed(1) + '%)');
console.log('유사 (95%+)', similar, '(' + (similar / keys.length * 100).toFixed(1) + '%)');
console.log('차이 있음:', diff, '(' + (diff / keys.length * 100).toFixed(1) + '%)');
console.log('인코딩 이슈:', encodingIssues);
console.log('KRV에 없는 키:', noKrv);
console.log('');

if (samples.diff.length > 0) {
  console.log('--- 차이 샘플 (15개) ---');
  samples.diff.forEach((s, i) => {
    console.log(`\n[${i + 1}] ${s.key} (유사도 ${s.sim})`);
    console.log('  우리:', s.ours);
    console.log('  KRV:', s.krv);
  });
}

if (samples.encoding.length > 0) {
  console.log('\n--- 인코딩 이슈 샘플 ---');
  samples.encoding.forEach((s, i) => console.log(`  ${s.key}: ${s.ours}`));
}
