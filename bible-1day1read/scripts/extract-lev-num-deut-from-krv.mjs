#!/usr/bin/env node
/**
 * Extract Leviticus, Numbers, Deuteronomy from KRV (Korean Revised Version).
 * Output: translations-lev-num-deut.json for merging into generate-all-translations.
 * Protestant terminology: 여호와, 애굽, 성소, 회중
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KRV_PATH = path.join(__dirname, '..', 'public', 'bible', 'krv.json');
const OUT_PATH = path.join(__dirname, 'translations-lev-num-deut.json');

const books = ['leviticus', 'numbers', 'deuteronomy'];

function applyProtestantTerms(text) {
  if (!text || typeof text !== 'string') return text;
  let out = text;
  // Ensure Protestant terminology
  out = out.replace(/야훼|야웨/gi, '여호와');
  out = out.replace(/이집트/g, '애굽');
  out = out.replace(/주님/g, '여호와');
  out = out.replace(/집회/g, '회중');
  out = out.replace(/회막/g, '회중의 성막');  // tabernacle of congregation
  return out;
}

const krv = JSON.parse(fs.readFileSync(KRV_PATH, 'utf8'));
const result = {};

for (const book of books) {
  for (const [key, value] of Object.entries(krv)) {
    if (key.startsWith(book + ',')) {
      result[key] = applyProtestantTerms(value);
    }
  }
}

fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2), 'utf8');
console.log(`Wrote ${Object.keys(result).length} verses to ${OUT_PATH}`);
