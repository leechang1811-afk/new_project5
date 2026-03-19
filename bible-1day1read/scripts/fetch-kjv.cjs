#!/usr/bin/env node
/**
 * Fetches KJV Bible from https://github.com/aruljohn/Bible-kjv
 * Converts to flat object: bookId,chapter,verse -> text
 * Output: bible-1day1read/public/bible/kjv.json
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const BASE_URL = 'https://raw.githubusercontent.com/aruljohn/Bible-kjv/master';

const BOOKS = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
  'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
  '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles',
  'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs',
  'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah',
  'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel',
  'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk',
  'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
  'Matthew', 'Mark', 'Luke', 'John', 'Acts',
  'Romans', '1 Corinthians', '2 Corinthians', 'Galatians',
  'Ephesians', 'Philippians', 'Colossians',
  '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy',
  'Titus', 'Philemon', 'Hebrews', 'James',
  '1 Peter', '2 Peter', '1 John', '2 John', '3 John',
  'Jude', 'Revelation'
];

function bookNameToFileName(book) {
  return book.replace(/ /g, '') + '.json';
}

function bookNameToBookId(book) {
  return book.toLowerCase().replace(/ /g, '').replace('songofsolomon', 'song');
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(url + ' returned ' + res.statusCode));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function bookToFlat(obj, bookData) {
  const bookId = bookNameToBookId(bookData.book);
  if (!bookData.chapters) return;
  for (const ch of bookData.chapters) {
    const chapter = String(ch.chapter);
    if (!ch.verses) continue;
    for (const v of ch.verses) {
      const verse = String(v.verse);
      const key = bookId + ',' + chapter + ',' + verse;
      obj[key] = v.text || '';
    }
  }
}

async function main() {
  const result = {};
  for (const book of BOOKS) {
    const fileName = bookNameToFileName(book);
    const url = BASE_URL + '/' + fileName;
    process.stdout.write('Fetching ' + book + '... ');
    try {
      const data = await fetchJson(url);
      bookToFlat(result, data);
      console.log('OK');
    } catch (e) {
      console.error('FAIL: ' + e.message);
      process.exit(1);
    }
  }
  const outPath = path.join(__dirname, '..', 'public', 'bible', 'kjv.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(result), 'utf8');
  console.log('\nWrote ' + Object.keys(result).length + ' verses to ' + outPath);
}

main();

