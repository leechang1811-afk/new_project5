/**
 * 성경 본문 로드
 * - KJV(King James Version, public domain) only
 * - 한국어 설명: 별도 explanations.json (저작권 없는 해설)
 * - 본문과 해설은 명확히 분리
 */

import explanationsData from '../data/explanations.json';

type BibleData = Record<string, string>;

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#x27;/g, "'")
    .replace(/&#x39;/g, "'")
    .replace(/&#x2019;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

export type BibleVersion = 'ko' | 'en';

const cache: { kjv?: BibleData } = {};

/** KJV 성경 본문 (항상 동일) */
export async function loadBible(_version?: BibleVersion): Promise<BibleData> {
  if (cache.kjv) return cache.kjv;
  const res = await fetch('/bible/kjv.json');
  if (!res.ok) throw new Error('Failed to load Bible.');
  cache.kjv = (await res.json()) as BibleData;
  return cache.kjv;
}

/** 한국어 설명 (본문과 별도, 저작권 없는 해설) - 번들에서 직접 로드 */
export async function loadExplanations(): Promise<BibleData> {
  return explanationsData as BibleData;
}

export function getVerseKey(bookId: string, chapter: number, verse: number): string {
  return `${bookId},${chapter},${verse}`;
}

export async function getVerses(
  bookId: string,
  startCh: number,
  endCh: number,
  _version: BibleVersion = 'ko'
): Promise<{ chapter: number; verse: number; text: string; explanation?: string }[]> {
  const data = await loadBible();
  const explanations = await loadExplanations();
  const result: { chapter: number; verse: number; text: string; explanation?: string }[] = [];
  for (let ch = startCh; ch <= endCh; ch++) {
    for (let v = 1; v <= 200; v++) {
      const key = getVerseKey(bookId, ch, v);
      const text = data[key];
      if (!text) break;
      result.push({
        chapter: ch,
        verse: v,
        text: decodeHtmlEntities(text.replace(/\s*!\s*$/, '')),
        explanation: explanations[key]?.trim() || undefined,
      });
    }
  }
  return result;
}

const BOOK_NAMES_KO: Record<string, string> = {
  genesis: '창세기', exodus: '출애굽기', leviticus: '레위기', numbers: '민수기',
  deuteronomy: '신명기', joshua: '여호수아', judges: '사사기', ruth: '룻기',
  '1samuel': '사무엘상', '2samuel': '사무엘하', '1kings': '열왕기상', '2kings': '열왕기하',
  '1chronicles': '역대상', '2chronicles': '역대하', ezra: '에스라', nehemiah: '느헤미야',
  esther: '에스더', job: '욥기', psalms: '시편', proverbs: '잠언', ecclesiastes: '전도서', song: '아가',
  isaiah: '이사야', jeremiah: '예레미야', lamentations: '예레미야애가', ezekiel: '에스겔', daniel: '다니엘',
  hosea: '호세아', joel: '요엘', amos: '아모스', obadiah: '오바댜', jonah: '요나', micah: '미가',
  nahum: '나훔', habakkuk: '하박국', zephaniah: '스바냐', haggai: '학개', zechariah: '스가랴', malachi: '말라기',
  matthew: '마태복음', mark: '마가복음', luke: '누가복음', john: '요한복음', acts: '사도행전',
  romans: '로마서', '1corinthians': '고린도전서', '2corinthians': '고린도후서', galatians: '갈라디아서',
  ephesians: '에베소서', philippians: '빌립보서', colossians: '골로새서',
  '1thessalonians': '데살로니가전서', '2thessalonians': '데살로니가후서',
  '1timothy': '디모데전서', '2timothy': '디모데후서', titus: '디도서', philemon: '빌레몬서',
  hebrews: '히브리서', james: '야고보서', '1peter': '베드로전서', '2peter': '베드로후서',
  '1john': '요한일서', '2john': '요한이서', '3john': '요한삼서', jude: '유다서', revelation: '요한계시록',
};

const BOOK_NAMES_EN: Record<string, string> = {
  genesis: 'Genesis', exodus: 'Exodus', leviticus: 'Leviticus', numbers: 'Numbers',
  deuteronomy: 'Deuteronomy', joshua: 'Joshua', judges: 'Judges', ruth: 'Ruth',
  '1samuel': '1 Samuel', '2samuel': '2 Samuel', '1kings': '1 Kings', '2kings': '2 Kings',
  '1chronicles': '1 Chronicles', '2chronicles': '2 Chronicles', ezra: 'Ezra', nehemiah: 'Nehemiah',
  esther: 'Esther', job: 'Job', psalms: 'Psalms', proverbs: 'Proverbs', ecclesiastes: 'Ecclesiastes', song: 'Song of Solomon',
  isaiah: 'Isaiah', jeremiah: 'Jeremiah', lamentations: 'Lamentations', ezekiel: 'Ezekiel', daniel: 'Daniel',
  hosea: 'Hosea', joel: 'Joel', amos: 'Amos', obadiah: 'Obadiah', jonah: 'Jonah', micah: 'Micah',
  nahum: 'Nahum', habakkuk: 'Habakkuk', zephaniah: 'Zephaniah', haggai: 'Haggai', zechariah: 'Zechariah', malachi: 'Malachi',
  matthew: 'Matthew', mark: 'Mark', luke: 'Luke', john: 'John', acts: 'Acts',
  romans: 'Romans', '1corinthians': '1 Corinthians', '2corinthians': '2 Corinthians', galatians: 'Galatians',
  ephesians: 'Ephesians', philippians: 'Philippians', colossians: 'Colossians',
  '1thessalonians': '1 Thessalonians', '2thessalonians': '2 Thessalonians',
  '1timothy': '1 Timothy', '2timothy': '2 Timothy', titus: 'Titus', philemon: 'Philemon',
  hebrews: 'Hebrews', james: 'James', '1peter': '1 Peter', '2peter': '2 Peter',
  '1john': '1 John', '2john': '2 John', '3john': '3 John', jude: 'Jude', revelation: 'Revelation',
};

export function getBookName(bookId: string, version: BibleVersion): string {
  const map = version === 'ko' ? BOOK_NAMES_KO : BOOK_NAMES_EN;
  return map[bookId] || bookId;
}

export async function getRandomVerse(version: BibleVersion = 'ko'): Promise<{
  bookId: string;
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
  explanation?: string;
}> {
  const data = await loadBible();
  const explanations = await loadExplanations();
  // 직역이 있는 구절만 뽑아서 말씀 읽기에서 항상 한국어 직역이 보이게 함
  const keysWithTranslation = Object.keys(explanations).filter(
    (k) => explanations[k]?.trim() && data[k]
  );
  const keys = keysWithTranslation.length > 0 ? keysWithTranslation : Object.keys(data);
  const key = keys[Math.floor(Math.random() * keys.length)];
  const [bookId, chStr, vStr] = key.split(',');
  const chapter = parseInt(chStr, 10);
  const verse = parseInt(vStr, 10);
  const text = decodeHtmlEntities((data[key] || '').replace(/\s*!\s*$/, ''));
  const bookName = getBookName(bookId, version);
  const explanation = explanations[key]?.trim();

  return { bookId, bookName, chapter, verse, text, explanation };
}
