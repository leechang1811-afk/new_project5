/**
 * 연대기순 성경읽기표
 */

export interface ReadingItem {
  dayIndex: number;
  book: string;
  bookId: string;
  startCh: number;
  endCh: number;
  description?: string;
}

export const BIBLE_BOOKS_ORDER: { id: string; name: string }[] = [
  { id: 'genesis', name: '창세기' }, { id: 'exodus', name: '출애굽기' }, { id: 'leviticus', name: '레위기' },
  { id: 'numbers', name: '민수기' }, { id: 'deuteronomy', name: '신명기' }, { id: 'joshua', name: '여호수아' },
  { id: 'judges', name: '사사기' }, { id: 'ruth', name: '룻기' }, { id: '1samuel', name: '사무엘상' },
  { id: '2samuel', name: '사무엘하' }, { id: '1kings', name: '열왕기상' }, { id: '2kings', name: '열왕기하' },
  { id: '1chronicles', name: '역대상' }, { id: '2chronicles', name: '역대하' }, { id: 'ezra', name: '에스라' },
  { id: 'nehemiah', name: '느헤미야' }, { id: 'esther', name: '에스더' }, { id: 'job', name: '욥기' },
  { id: 'psalms', name: '시편' }, { id: 'proverbs', name: '잠언' }, { id: 'ecclesiastes', name: '전도서' },
  { id: 'song', name: '아가' }, { id: 'isaiah', name: '이사야' }, { id: 'jeremiah', name: '예레미야' },
  { id: 'lamentations', name: '예레미야애가' }, { id: 'ezekiel', name: '에스겔' }, { id: 'daniel', name: '다니엘' },
  { id: 'hosea', name: '호세아' }, { id: 'joel', name: '요엘' }, { id: 'amos', name: '아모스' }, { id: 'obadiah', name: '오바댜' },
  { id: 'jonah', name: '요나' }, { id: 'micah', name: '미가' }, { id: 'nahum', name: '나훔' }, { id: 'habakkuk', name: '하박국' },
  { id: 'zephaniah', name: '스바냐' }, { id: 'haggai', name: '학개' }, { id: 'zechariah', name: '스가랴' }, { id: 'malachi', name: '말라기' },
  { id: 'matthew', name: '마태복음' }, { id: 'mark', name: '마가복음' }, { id: 'luke', name: '누가복음' }, { id: 'john', name: '요한복음' },
  { id: 'acts', name: '사도행전' }, { id: 'romans', name: '로마서' }, { id: '1corinthians', name: '고린도전서' }, { id: '2corinthians', name: '고린도후서' },
  { id: 'galatians', name: '갈라디아서' }, { id: 'ephesians', name: '에베소서' }, { id: 'philippians', name: '빌립보서' }, { id: 'colossians', name: '골로새서' },
  { id: '1thessalonians', name: '데살로니가전서' }, { id: '2thessalonians', name: '데살로니가후서' },
  { id: '1timothy', name: '디모데전서' }, { id: '2timothy', name: '디모데후서' }, { id: 'titus', name: '디도서' }, { id: 'philemon', name: '빌레몬서' },
  { id: 'hebrews', name: '히브리서' }, { id: 'james', name: '야고보서' }, { id: '1peter', name: '베드로전서' }, { id: '2peter', name: '베드로후서' },
  { id: '1john', name: '요한일서' }, { id: '2john', name: '요한이서' }, { id: '3john', name: '요한삼서' }, { id: 'jude', name: '유다서' },
  { id: 'revelation', name: '요한계시록' },
];

export const CHAPTER_COUNTS: Record<string, number> = {
  genesis: 50, exodus: 40, leviticus: 27, numbers: 36, deuteronomy: 34,
  joshua: 24, judges: 21, ruth: 4, '1samuel': 31, '2samuel': 24, '1kings': 22, '2kings': 25,
  '1chronicles': 29, '2chronicles': 36, ezra: 10, nehemiah: 13, esther: 10, job: 42,
  psalms: 150, proverbs: 31, ecclesiastes: 12, song: 8, isaiah: 66, jeremiah: 52, lamentations: 5,
  ezekiel: 48, daniel: 12, hosea: 14, joel: 3, amos: 9, obadiah: 1, jonah: 4, micah: 7, nahum: 3,
  habakkuk: 3, zephaniah: 3, haggai: 2, zechariah: 14, malachi: 4, matthew: 28, mark: 16, luke: 24, john: 21,
  acts: 28, romans: 16, '1corinthians': 16, '2corinthians': 13, galatians: 6, ephesians: 6, philippians: 4, colossians: 4,
  '1thessalonians': 5, '2thessalonians': 3, '1timothy': 6, '2timothy': 4, titus: 3, philemon: 1,
  hebrews: 13, james: 5, '1peter': 5, '2peter': 3, '1john': 5, '2john': 1, '3john': 1, jude: 1, revelation: 22,
};

const SCHEDULE_BASE: ReadingItem[] = [
  { dayIndex: 1, book: '창세기', bookId: 'genesis', startCh: 1, endCh: 2 },
  { dayIndex: 2, book: '창세기', bookId: 'genesis', startCh: 3, endCh: 4 },
  { dayIndex: 3, book: '창세기', bookId: 'genesis', startCh: 5, endCh: 6 },
  { dayIndex: 4, book: '창세기', bookId: 'genesis', startCh: 7, endCh: 8 },
  { dayIndex: 5, book: '창세기', bookId: 'genesis', startCh: 9, endCh: 10 },
  { dayIndex: 6, book: '창세기', bookId: 'genesis', startCh: 11, endCh: 12 },
  { dayIndex: 7, book: '창세기', bookId: 'genesis', startCh: 13, endCh: 14 },
  { dayIndex: 8, book: '창세기', bookId: 'genesis', startCh: 15, endCh: 16 },
  { dayIndex: 9, book: '창세기', bookId: 'genesis', startCh: 17, endCh: 18 },
  { dayIndex: 10, book: '창세기', bookId: 'genesis', startCh: 19, endCh: 20 },
  { dayIndex: 11, book: '창세기', bookId: 'genesis', startCh: 21, endCh: 22 },
  { dayIndex: 12, book: '창세기', bookId: 'genesis', startCh: 23, endCh: 24 },
  { dayIndex: 13, book: '창세기', bookId: 'genesis', startCh: 25, endCh: 26 },
  { dayIndex: 14, book: '창세기', bookId: 'genesis', startCh: 27, endCh: 28 },
  { dayIndex: 15, book: '창세기', bookId: 'genesis', startCh: 29, endCh: 30 },
  { dayIndex: 16, book: '창세기', bookId: 'genesis', startCh: 31, endCh: 32 },
  { dayIndex: 17, book: '창세기', bookId: 'genesis', startCh: 33, endCh: 34 },
  { dayIndex: 18, book: '창세기', bookId: 'genesis', startCh: 35, endCh: 36 },
  { dayIndex: 19, book: '창세기', bookId: 'genesis', startCh: 37, endCh: 38 },
  { dayIndex: 20, book: '창세기', bookId: 'genesis', startCh: 39, endCh: 40 },
  { dayIndex: 21, book: '창세기', bookId: 'genesis', startCh: 41, endCh: 42 },
  { dayIndex: 22, book: '창세기', bookId: 'genesis', startCh: 43, endCh: 44 },
  { dayIndex: 23, book: '창세기', bookId: 'genesis', startCh: 45, endCh: 46 },
  { dayIndex: 24, book: '창세기', bookId: 'genesis', startCh: 47, endCh: 48 },
  { dayIndex: 25, book: '창세기', bookId: 'genesis', startCh: 49, endCh: 50 },
  { dayIndex: 26, book: '출애굽기', bookId: 'exodus', startCh: 1, endCh: 2 },
  { dayIndex: 27, book: '출애굽기', bookId: 'exodus', startCh: 3, endCh: 4 },
  { dayIndex: 28, book: '출애굽기', bookId: 'exodus', startCh: 5, endCh: 6 },
  { dayIndex: 29, book: '출애굽기', bookId: 'exodus', startCh: 7, endCh: 8 },
  { dayIndex: 30, book: '출애굽기', bookId: 'exodus', startCh: 9, endCh: 10 },
];

function generateFullSchedule(): ReadingItem[] {
  const result = [...SCHEDULE_BASE];
  let dayIndex = 31;
  const booksWithChapters: { book: string; bookId: string; chapters: number }[] = [];
  for (const b of BIBLE_BOOKS_ORDER) {
    const count = CHAPTER_COUNTS[b.id];
    if (count) booksWithChapters.push({ book: b.name, bookId: b.id, chapters: count });
  }
  let bookIdx = 1;
  let chStart = 11;
  while (dayIndex <= 730 && bookIdx < booksWithChapters.length) {
    const { book, bookId, chapters } = booksWithChapters[bookIdx];
    const remaining = chapters - chStart + 1;
    const todaysChapters = Math.min(remaining, 2);
    const chEnd = chStart + todaysChapters - 1;
    result.push({ dayIndex, book, bookId, startCh: chStart, endCh: chEnd });
    if (chEnd >= chapters) { bookIdx++; chStart = 1; } else { chStart = chEnd + 1; }
    dayIndex++;
  }
  return result;
}

export const FULL_SCHEDULE = generateFullSchedule();

export function getScheduleFromBook(startBookId: string, customOrder?: string[]): ReadingItem[] {
  const order = customOrder ?? BIBLE_BOOKS_ORDER.map((b) => b.id);
  const startIdx = order.indexOf(startBookId);
  if (startIdx < 0) return FULL_SCHEDULE;
  const fromStart = FULL_SCHEDULE.filter((r) => order.indexOf(r.bookId) >= startIdx);
  const beforeStart = FULL_SCHEDULE.filter((r) => order.indexOf(r.bookId) < startIdx);
  return [...fromStart, ...beforeStart].map((r, i) => ({ ...r, dayIndex: i + 1 }));
}

export function getReadingByDayIndex(schedule: ReadingItem[], dayIndex: number): ReadingItem | undefined {
  return schedule.find((r) => r.dayIndex === dayIndex);
}
