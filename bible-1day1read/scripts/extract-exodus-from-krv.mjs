#!/usr/bin/env node
/** Extract full Exodus from KRV. Output: translations-exodus.json */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const krv = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/bible/krv.json'), 'utf8'));
const out = {};
for (const [k, v] of Object.entries(krv)) {
  if (k.startsWith('exodus,')) out[k] = (v || '').replace(/야훼|야웨/gi, '여호와').replace(/이집트/g, '애굽');
}
fs.writeFileSync(path.join(__dirname, 'translations-exodus.json'), JSON.stringify(out, null, 2), 'utf8');
console.log('Exodus:', Object.keys(out).length);
