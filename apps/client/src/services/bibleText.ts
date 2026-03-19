/**
 * 한국어 성경 본문 로드 (개역한글 - public/bible/krv.json)
 */

type BibleData = Record<string, string>;

/** HTML 엔티티 디코딩 (&#x27; → ', &#39; → ' 등) */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x2019;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

let cache: BibleData | null = null;

export async function loadBible(): Promise<BibleData> {
  if (cache) return cache;
  const res = await fetch('/bible/krv.json');
  if (!res.ok) throw new Error('성경 본문을 불러올 수 없습니다.');
  cache = (await res.json()) as BibleData;
  return cache!;
}

export function getVerseKey(bookId: string, chapter: number, verse: number): string {
  return `${bookId},${chapter},${verse}`;
}

export async function getVerses(
  bookId: string,
  startCh: number,
  endCh: number
): Promise<{ chapter: number; verse: number; text: string }[]> {
  const data = await loadBible();
  const result: { chapter: number; verse: number; text: string }[] = [];
  for (let ch = startCh; ch <= endCh; ch++) {
    for (let v = 1; v <= 200; v++) {
      const key = getVerseKey(bookId, ch, v);
      const text = data[key];
      if (!text) break;
      result.push({ chapter: ch, verse: v, text: decodeHtmlEntities(text.replace(/\s*!\s*$/, '')) });
    }
  }
  return result;
}

/** 랜덤 구절 뽑기용 - 전체 성경에서 랜덤 */
export async function getRandomVerse(): Promise<{
  bookId: string;
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
}> {
  const data = await loadBible();
  const keys = Object.keys(data);
  const key = keys[Math.floor(Math.random() * keys.length)];
  const [bookId, chStr, vStr] = key.split(',');
  const chapter = parseInt(chStr, 10);
  const verse = parseInt(vStr, 10);
  const text = decodeHtmlEntities((data[key] || '').replace(/\s*!\s*$/, ''));

  const bookNames: Record<string, string> = {
    genesis: '창세기', exodus: '출애굽기', leviticus: '레위기', numbers: '민수기',
    deuteronomy: '신명기', joshua: '여호수아', judges: '사사기', ruth: '룻기',
    '1samuel': '사무엘상', '2samuel': '사무엘하', '1kings': '열왕기상', '2kings': '열왕기하',
    '1chronicles': '역대상', '2chronicles': '역대하', ezra: '에스라', nehemiah: '느헤미야',
    esther: '에스더', job: '욥기', psalms: '시편', proverbs: '잠언',
    ecclesiastes: '전도서', song: '아가', isaiah: '이사야', jeremiah: '예레미야',
    lamentations: '예레미야애가', ezekiel: '에스겔', daniel: '다니엘',
    hosea: '호세아', joel: '요엘', amos: '아모스', obadiah: '오바댜',
    jonah: '요나', micah: '미가', nahum: '나훔', habakkuk: '하박국',
    zephaniah: '스바냐', haggai: '학개', zechariah: '스가랴', malachi: '말라기',
    matthew: '마태복음', mark: '마가복음', luke: '누가복음', john: '요한복음',
    acts: '사도행전', romans: '로마서', '1corinthians': '고린도전서', '2corinthians': '고린도후서',
    galatians: '갈라디아서', ephesians: '에베소서', philippians: '빌립보서', colossians: '골로새서',
    '1thessalonians': '데살로니가전서', '2thessalonians': '데살로니가후서',
    '1timothy': '디모데전서', '2timothy': '디모데후서', titus: '디도서', philemon: '빌레몬서',
    hebrews: '히브리서', james: '야고보서', '1peter': '베드로전서', '2peter': '베드로후서',
    '1john': '요한일서', '2john': '요한이서', '3john': '요한삼서', jude: '유다서',
    revelation: '요한계시록',
  };

  return {
    bookId,
    bookName: bookNames[bookId] || bookId,
    chapter,
    verse,
    text,
  };
}
