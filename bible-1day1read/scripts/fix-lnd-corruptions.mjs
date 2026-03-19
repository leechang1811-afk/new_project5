#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const LND_PATH = path.join(__dirname, 'translations-lev-num-deut.json');
const KRV_PATH = path.join(__dirname, '..', 'public', 'bible', 'kjv.json');
const krvPath = path.join(__dirname, '..', 'public', 'bible', 'krv.json');

const BAD_KEYS = ['leviticus,5,16','leviticus,14,49','leviticus,21,23','leviticus,27,5','numbers,6,10','numbers,8,9','numbers,11,21','numbers,14,42','numbers,23,16','numbers,26,50','numbers,30,2','deuteronomy,3,7','deuteronomy,5,15','deuteronomy,8,17','deuteronomy,11,32','deuteronomy,15,11','deuteronomy,19,13','deuteronomy,23,13','deuteronomy,27,15','deuteronomy,29,14'];

const lnd = JSON.parse(fs.readFileSync(LND_PATH, 'utf8'));
const krv = JSON.parse(fs.readFileSync(krvPath, 'utf8'));

for (const key of BAD_KEYS) {
  if (krv[key]) {
    lnd[key] = krv[key];
    console.log('Fixed:', key);
  }
}
fs.writeFileSync(LND_PATH, JSON.stringify(lnd, null, 2), 'utf8');
console.log('Done. Fixed', BAD_KEYS.length, 'verses');
