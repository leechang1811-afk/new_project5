/**
 * 한국 침례교/지구촌교회 기준 정통 기도적 묵상 질문
 * 성경 유형별·주제별 2개 질문 템플릿
 */

export type BookType =
  | 'torah'      // 모세오경
  | 'history'    // 역사서
  | 'wisdom'     // 시가·지혜서
  | 'prophecy'   // 예언서
  | 'gospel'     // 복음서
  | 'epistle'    // 서신서
  | 'revelation'; // 요한계시록

const BOOK_TYPE_MAP: Record<string, BookType> = {
  genesis: 'torah', exodus: 'torah', leviticus: 'torah', numbers: 'torah', deuteronomy: 'torah',
  joshua: 'history', judges: 'history', ruth: 'history', '1samuel': 'history', '2samuel': 'history',
  '1kings': 'history', '2kings': 'history', '1chronicles': 'history', '2chronicles': 'history',
  ezra: 'history', nehemiah: 'history', esther: 'history',
  job: 'wisdom', psalms: 'wisdom', proverbs: 'wisdom', ecclesiastes: 'wisdom', song: 'wisdom',
  isaiah: 'prophecy', jeremiah: 'prophecy', lamentations: 'prophecy', ezekiel: 'prophecy',
  daniel: 'prophecy', hosea: 'prophecy', joel: 'prophecy', amos: 'prophecy', obadiah: 'prophecy',
  jonah: 'prophecy', micah: 'prophecy', nahum: 'prophecy', habakkuk: 'prophecy',
  zephaniah: 'prophecy', haggai: 'prophecy', zechariah: 'prophecy', malachi: 'prophecy',
  matthew: 'gospel', mark: 'gospel', luke: 'gospel', john: 'gospel',
  acts: 'history', romans: 'epistle', '1corinthians': 'epistle', '2corinthians': 'epistle',
  galatians: 'epistle', ephesians: 'epistle', philippians: 'epistle', colossians: 'epistle',
  '1thessalonians': 'epistle', '2thessalonians': 'epistle', '1timothy': 'epistle',
  '2timothy': 'epistle', titus: 'epistle', philemon: 'epistle', hebrews: 'epistle',
  james: 'epistle', '1peter': 'epistle', '2peter': 'epistle', '1john': 'epistle',
  '2john': 'epistle', '3john': 'epistle', jude: 'epistle',
  revelation: 'revelation',
};

const QUESTIONS_BY_TYPE: Record<BookType, [string, string]> = {
  torah: [
    '오늘 말씀에서 하나님이 주시는 명령이나 약속 가운데 내 삶에 적용할 수 있는 것은 무엇인가요?',
    '이스라엘 백성의 신앙과 불신앙을 보며, 나는 오늘 어떤 면에서 회개하고 하나님을 더 믿어야 할까요?',
  ],
  history: [
    '오늘 말씀의 인물들(왕, 선지자, 백성) 가운데 나의 삶에 교훈을 주는 사람은 누구이며, 그 이유는 무엇인가요?',
    '하나님의 역사하심 속에서 내가 오늘 당한 일들을 어떻게 해석하고 감사로 받아들일 수 있을까요?',
  ],
  wisdom: [
    '오늘 읽은 시나 잠언 가운데 내 마음을 감동시킨 구절이 있다면, 그것을 기도 제목으로 삼아보세요.',
    '지혜로운 삶과 어리석은 삶의 대비 속에서, 나는 오늘 어떤 선택을 지혜롭게 할 수 있을까요?',
  ],
  prophecy: [
    '선지자의 경고와 위로의 말씀 가운데, 오늘 이 시대와 내 삶에 적용할 메시지는 무엇인가요?',
    '하나님의 심판과 회복의 약속을 묵상하며, 나와 교회를 위한 중보 기도를 해보세요.',
  ],
  gospel: [
    '오늘 말씀에서 예수님의 말씀이나 행하심이 나에게 어떻게 다가오나요? 그분을 더 깊이 알게 된 점을 나눠보세요.',
    '예수님을 만난 사람들의 변화를 보며, 나는 오늘 예수님께서 나의 삶 가운데 어떤 일을 하시기를 원하시는지 기도해보세요.',
  ],
  epistle: [
    '사도가 교회와 성도들에게 권면한 내용 가운데, 오늘 나에게 필요한 교훈은 무엇인가요?',
    '믿음, 소망, 사랑의 관점에서 오늘 나의 신앙 상태를 점검하고, 구체적으로 기도해보세요.',
  ],
  revelation: [
    '요한계시록의 상징과 예언이 주는 위로와 경고 가운데, 오늘 내가 새롭게 깨달은 것은 무엇인가요?',
    '재림과 심판을 바라보는 소망 속에서, 나는 오늘 어떻게 살아가야 할까요?',
  ],
};

export function getMeditationQuestions(bookId: string): [string, string] {
  const type = BOOK_TYPE_MAP[bookId] ?? 'epistle';
  return QUESTIONS_BY_TYPE[type];
}
