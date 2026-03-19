#!/usr/bin/env node
/**
 * Extract NT books from KRV (Korean Revised Version).
 * Output: translations-nt.json for merging into generate-all-translations.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KRV_PATH = path.join(__dirname, '..', 'public', 'bible', 'krv.json');
const OUT_PATH = path.join(__dirname, 'translations-nt.json');

const NT_BOOKS = [
  'matthew', 'mark', 'luke', 'john', 'acts', 'romans',
  '1corinthians', '2corinthians', 'galatians', 'ephesians', 'philippians', 'colossians',
  '1thessalonians', '2thessalonians', '1timothy', '2timothy', 'titus', 'philemon',
  'hebrews', 'james', '1peter', '2peter', '1john', '2john', '3john', 'jude', 'revelation',
];

function applyProtestantTerms(text) {
  if (!text || typeof text !== 'string') return text;
  let out = text;
  out = out.replace(/야훼|야웨/gi, '여호와');
  out = out.replace(/이집트/g, '애굽');
  out = out.replace(/주님/g, '여호와');
  out = out.replace(/집회/g, '회중');
  return out;
}

const krv = JSON.parse(fs.readFileSync(KRV_PATH, 'utf8'));
const result = {};

for (const book of NT_BOOKS) {
  for (const [key, value] of Object.entries(krv)) {
    if (key.startsWith(book + ',')) {
      result[key] = applyProtestantTerms(value);
    }
  }
}

fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2), 'utf8');
console.log(`Wrote ${Object.keys(result).length} NT verses to ${OUT_PATH}`);
