#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const kjv = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/bible/kjv.json'), 'utf8'));
const [book, startCh, endCh] = process.argv.slice(2);
for (let ch = +startCh; ch <= +endCh; ch++) {
  for (let v = 1; v <= 200; v++) {
    const k = `${book},${ch},${v}`;
    if (kjv[k]) console.log(`${ch}:${v}: ${kjv[k]}`);
    else break;
  }
}
