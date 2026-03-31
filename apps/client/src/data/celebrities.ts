/**
 * 롤모델별 루틴은 공개 인터뷰·전기·보도 등에서 자주 인용되는 습관을 바탕으로 짧게 옮겼습니다.
 * (의학·법률 자문 아님 — 앱 내 동기 부여용)
 */

export const CELEBRITIES = {
  jobs: {
    name: '스티브 잡스',
    oneLine: '핵심 하나에 몰입',
    mediaNote:
      '※ 월터 아이작슨 전기 등에서 강조되는 “집중·단순화” 흐름을 바탕으로 구성했어요.',
    routines: [
      '같은 옷 착용 (결정 피로 최소화)',
      '아침 거울 질문 (“오늘이 마지막이라면?”)',
      '핵심 1~2개에 집중',
      '산책하며 사고 (walking meeting)',
      '불필요한 것 제거',
    ],
  },
  musk: {
    name: '일론 머스크',
    oneLine: '짧고 강한 실행',
    mediaNote: '※ 다수 인터뷰에서 언급되는 시간 블록·즉시 실행 흐름을 바탕으로 구성했어요.',
    routines: [
      '5분 단위 스케줄링',
      '이메일 및 핵심 문제 먼저 처리',
      '공장/현장 중심 근무',
      '여러 프로젝트 병행',
      '주 80~100시간 근무',
    ],
  },
  bezos: {
    name: '제프 베조스',
    oneLine: '아침 여유와 결정 한 번',
    mediaNote: '※ 가족과 아침을 보내고 중요한 결정은 낮에 한다는 보도·인터뷰를 바탕으로 구성했어요.',
    routines: [
      '8시간 수면',
      '아침 여유 시간 (노 알람)',
      '중요한 결정은 오전에 수행',
      '하루 몇 개의 고품질 결정만 수행',
      '6-page memo 기반 회의',
    ],
  },
  buffett: {
    name: '워런 버핏',
    oneLine: '읽고 생각하기',
    mediaNote: '※ 장시간 독서·공시 읽기 습관이 보도·주주총회 등에서 자주 인용돼요.',
    routines: [
      '하루 대부분 독서',
      '신문 다수 읽기',
      '단순한 일정 유지',
      '장기적 의사결정',
      '간단한 아침 루틴',
    ],
  },
  gates: {
    name: '빌 게이츠',
    oneLine: '깊게 읽고 배우기',
    mediaNote: '※ 독서·사색을 강조한 인터뷰·블로그·연간 서한 등을 바탕으로 구성했어요.',
    routines: [
      '매일 독서',
      'Think Week (고립 집중 사고)',
      '노트 작성',
      '깊은 문제 분석',
      '다양한 분야 학습',
    ],
  },
  zuckerberg: {
    name: '마크 저커버그',
    oneLine: '몸을 먼저 깨우기',
    mediaNote: '※ 운동을 아침 루틴으로 꼽는 보도·인터뷰를 바탕으로 구성했어요.',
    routines: [
      '같은 스타일 옷 착용',
      '주 3회 이상 운동',
      '빠른 실행 및 개선',
      '제품 중심 회의',
      '코딩 기반 사고 유지',
    ],
  },
  tim_cook: {
    name: '팀 쿡',
    oneLine: '이른 정리와 우선순위',
    mediaNote: '※ 이른 출근·이메일 정리 등 업무 습관이 보도에서 자주 다뤄져요.',
    routines: [
      '아침 이메일·일정 정리 15분',
      '오늘 최우선 1개만 고르기',
      '퇴근 전 오늘 회고 한 줄',
    ],
  },
  oprah: {
    name: '오프라 윈프리',
    oneLine: '감사와 마음 챙기기',
    mediaNote: '※ 감사 일기·명상을 공개적으로 이야기한 인터뷰·쇼를 바탕으로 구성했어요.',
    routines: [
      '감사한 일 3가지 적기',
      '호흡·명상 5분',
      '고마운 사람에게 메시지·통화 1번',
    ],
  },
  michelle_obama: {
    name: '미셸 오바마',
    oneLine: '이른 운동과 균형',
    mediaNote: '※ 새벽 운동 습관을 본인이 인터뷰에서 언급한 내용을 바탕으로 구성했어요.',
    routines: [
      '가벼운 운동·걷기 20분',
      '하루 목표를 짧게 한 줄로 쓰기',
      '가족과 식사·대화 한 번',
    ],
  },
  obama: {
    name: '버락 오바마',
    oneLine: '운동과 가족 시간',
    mediaNote: '※ 아침 운동·가족 식사를 중시한다는 보도·인터뷰를 바탕으로 구성했어요.',
    routines: [
      '운동·산책 20분',
      '당일 중요한 일정·일 1개만 고르기',
      '가족과 이야기 나누기',
    ],
  },
  beyonce: {
    name: '비욘세',
    oneLine: '연습과 컨디션',
    mediaNote: '※ 리허설·훈련 강도에 대한 보도·다큐 흐름을 바탕으로 구성했어요.',
    routines: [
      '보컬·몸풀기 10분',
      '집중 연습·블록 25분',
      '오늘 몸 상태 한 줄 기록',
    ],
  },
  taylor_swift: {
    name: '테일러 스위프트',
    oneLine: '글과 감정 기록',
    mediaNote: '※ 작사·일기처럼 쓰는 습관이 인터뷰에서 자주 언급돼요.',
    routines: [
      '아이디어·가사 메모 10분',
      '조용히 글쓰기·연습 20분',
      '오늘 감정 한 줄 기록',
    ],
  },
  ronaldo: {
    name: '크리스티아누 호날두',
    oneLine: '훈련과 회복',
    mediaNote: '※ 수면·훈련·식단 규율이 스포츠 언론에서 반복 보도된 내용을 바탕으로 구성했어요.',
    routines: [
      '몸풀기·코어 10분',
      '집중 훈련·운동 25분',
      '수분·수면·회복 체크 한 줄',
    ],
  },
  messi: {
    name: '리오넬 메시',
    oneLine: '기본기와 회복',
    mediaNote: '※ 훈련·회복 루틴이 스포츠 매체에서 자주 다뤄져요.',
    routines: [
      '기본기 반복 훈련',
      '짧고 집중된 훈련',
      '부상 방지 운동',
      '경기 후 회복',
      '식단 및 수면 관리',
    ],
  },
  son: {
    name: '손흥민',
    oneLine: '기본기 반복',
    mediaNote: '※ 추가 슈팅 연습 등 훈련 태도가 국내외 스포츠 보도에서 반복 인용돼요.',
    routines: [
      '몸풀기·스트레칭 10분',
      '슈팅·첫 터치 연습 20분',
      '경기·훈련 복기 한 줄 쓰기',
    ],
  },
  iu: {
    name: '아이유',
    oneLine: '꾸준한 창작',
    mediaNote: '※ 작업실 루틴·자기 점검을 음악·방송 인터뷰에서 이야기한 흐름을 바탕으로 구성했어요.',
    routines: [
      '보컬·호흡 워밍업 10분',
      '조용히 작업·연습 25분',
      '오늘 느낀 점 짧게 기록',
    ],
  },
  rm: {
    name: 'RM (BTS)',
    oneLine: '읽고 언어에 닿기',
    mediaNote: '※ 독서 습관이 다수 인터뷰·방송에서 본인이 언급한 내용을 바탕으로 구성했어요.',
    routines: [
      '책·글 읽기 20분',
      '인상 깊은 문장 한 줄 적기',
      '오늘 영감 한 줄',
    ],
  },
  serena: {
    name: '세리나 윌리엄스',
    oneLine: '훈련과 회복',
    mediaNote: '※ 코트 훈련·회복 루틴이 스포츠 보도에서 자주 다뤄져요.',
    routines: [
      '하루 4~5시간 훈련',
      '웨이트 + 코트 훈련',
      '스트레칭 루틴',
      '회복 관리 (마사지/아이스배스)',
      '식단 관리',
    ],
  },
  churchill: {
    name: '윈스턴 처칠',
    oneLine: '집중과 낮잠',
    mediaNote: '※ 낮잠·글쓰기 습관이 전기·역사 자료에서 자주 인용돼요.',
    routines: [
      '침대에서 업무 시작',
      '늦은 기상',
      '낮잠 습관',
      '밤 늦게까지 작업',
      '연설 작성 집중 시간',
    ],
  },
  einstein: {
    name: '알베르트 아인슈타인',
    oneLine: '단순화와 산책',
    mediaNote: '※ 산책·사유를 즐겼다는 전기적 묘사를 바탕으로 구성했어요.',
    routines: [
      '산책하며 사고',
      '단순한 생활 유지',
      '충분한 수면 (약 10시간)',
      '음악 활동 (바이올린)',
      '깊은 문제 집중',
    ],
  },

  // —— 한국 · 연예인 (방송·인터뷰·보도에서 자주 인용되는 준비·습관 흐름)
  yoo_jae_suk: {
    name: '유재석',
    oneLine: '철저한 준비와 맞춤법',
    mediaNote: '※ 예능·인터뷰에서 반복 언급되는 사전 준비·대본 점검 습관을 바탕으로 구성했어요.',
    routines: [
      '오늘 할 일·대본·메모를 10분만 정리',
      '중요한 말 한마디를 미리 한 줄로 쓰기',
      '끝난 뒤 “다음엔 이렇게” 한 줄 복기',
    ],
  },
  gdragon: {
    name: 'G-Dragon',
    oneLine: '작업과 컨셉',
    mediaNote: '※ 음악·패션 관련 보도·인터뷰에서 이야기되는 작업 몰입·컨셉 정리 흐름을 바탕으로 구성했어요.',
    routines: [
      '오늘의 무드·컨셉을 한 단어로 적기',
      '작업·연습 블록 25분 (방해 끄기)',
      '오늘 영감·이미지 메모 3줄',
    ],
  },
  bts_suga: {
    name: '슈가 (BTS)',
    oneLine: '스튜디오 루틴',
    mediaNote: '※ 작곡·프로듀싱 과정을 본인이 방송·인터뷰에서 설명한 흐름을 바탕으로 구성했어요.',
    routines: [
      '작업 전 레퍼런스 듣기·정리 10분',
      '한 곡·한 트랙에만 25분 몰입',
      '오늘 만든 것 한 줄로 기록',
    ],
  },
  lim_young_woong: {
    name: '임영웅',
    oneLine: '발성과 마음가짐',
    mediaNote: '※ 방송·기사에서 언급되는 연습·무대 전 마음 다잡기 흐름을 바탕으로 구성했어요.',
    routines: [
      '호흡·발성 워밍업 10분',
      '집중 연습·녹음 블록 20분',
      '오늘 감사·다짐 한 줄',
    ],
  },
  gong_yoo: {
    name: '공유',
    oneLine: '운동과 독서',
    mediaNote: '※ 인터뷰에서 운동·독서 습관을 이야기한 내용을 바탕으로 구성했어요.',
    routines: [
      '가벼운 운동·걷기 20분',
      '책·시나리오 20분 읽기',
      '오늘 인상 깊은 대사·문장 한 줄',
    ],
  },
  son_ye_jin: {
    name: '손예진',
    oneLine: '촬영 전 준비와 케어',
    mediaNote: '※ 작품 준비·자기관리에 대해 인터뷰에서 언급한 흐름을 바탕으로 구성했어요.',
    routines: [
      '오늘 집중할 장면·감정 한 줄 적기',
      '대본·감정 메모 15분',
      '스트레칭·호흡으로 몸 풀기 10분',
    ],
  },

  // —— 한국 · 기업 CEO (언론·인터뷰·연설 등)
  kim_bong_jin: {
    name: '김봉진',
    oneLine: '빠른 실행과 고객',
    mediaNote: '※ 스타트업·서비스 관련 인터뷰·강연에서 자주 나오는 실행·피드백 흐름을 바탕으로 구성했어요.',
    routines: [
      '오늘 해결할 고객 문제 1개만 쓰기',
      '25분 안에 프로토타입·실행 1스텝',
      '오늘 배운 점·피드백 한 줄',
    ],
  },
  kim_beom_seok: {
    name: '김범석 (Coupang)',
    oneLine: '고객 경험과 장기 투자',
    mediaNote: '※ 쿠팡의 운영·데이터·고객 중심 문화로 알려진 흐름을 바탕으로 구성했어요.',
    routines: [
      '고객 경험 데이터 지속 확인',
      '장기 투자 중심 의사결정',
      '현장 중심 운영 이해',
      '빠른 실행 문화',
      '고객 중심 사고',
    ],
  },
  bang_si_hyuk: {
    name: '방시혁',
    oneLine: '음악과 미팅',
    mediaNote: '※ 음악·기획 중심 일정이 보도·인터뷰에서 다뤄지는 흐름을 바탕으로 구성했어요.',
    routines: [
      '음악 제작 및 리뷰 반복',
      '아티스트와 지속 미팅',
      '글로벌 트렌드 분석',
      'IP 중심 전략 회의',
      '밤 시간 집중 작업',
    ],
  },
  lee_hae_jin: {
    name: '이해진',
    oneLine: '기술과 제품',
    mediaNote: '※ 기술·서비스 지향적 의사결정이 인터뷰·강연에서 강조된 흐름을 바탕으로 구성했어요.',
    routines: [
      '오늘 개선할 기능·이슈 1개만 고르기',
      '데이터·글 읽기 20분',
      '사용자 입장에서 질문 1개 적기',
    ],
  },
  lee_jae_yong: {
    name: '이재용',
    oneLine: '일정과 결정',
    mediaNote: '※ 언론에서 보도되는 경영·일정 중심 하루 흐름을 일반화해 구성했어요.',
    routines: [
      '아침 일정·우선순위 15분 정리',
      '오늘 최종 결정 1개만 정하기',
      '퇴근 전 회고·내일 첫 일 1줄',
    ],
  },

  // —— 한국 · 위인 (전기·교과서·기록 자료)
  king_sejong: {
    name: '세종대왕',
    oneLine: '학문과 기록',
    mediaNote: '※ 학문·애민 정신이 전기·교과서 자료에서 강조되는 흐름을 바탕으로 구성했어요.',
    routines: [
      '오늘 배울 글·글자 1가지 적기',
      '백성·사람 입장 질문 1개 쓰기',
      '하루를 한 줄로 요약해 기록',
    ],
  },
  yun_dong_ju: {
    name: '윤동주',
    oneLine: '시와 일기',
    mediaNote: '※ 시·일기를 쓰던 문학적 습관이 작품·전기에서 소개되는 흐름을 바탕으로 구성했어요.',
    routines: [
      '마음에 드는 시 한 구절 읽기',
      '오늘 감정을 시 한 줄로 쓰기',
      '조용히 혼자 사색 10분',
    ],
  },
  kim_gu: {
    name: '김구',
    oneLine: '독립과 반성',
    mediaNote: '※ 일기·저서 등에 나타나는 성찰·실천 정신을 바탕으로 구성했어요.',
    routines: [
      '오늘 나라·공동체를 위해 할 일 1줄',
      '몸 기르기·걷기 15분',
      '밤에 오늘을 반성하는 글 한 줄',
    ],
  },

  // —— 한국 · 운동선수 (스포츠 보도·인터뷰)
  kim_yuna: {
    name: '김연아',
    oneLine: '연습과 표현',
    mediaNote: '※ 훈련·프로그램 준비가 스포츠 보도·다큐에서 반복 다뤄진 흐름을 바탕으로 구성했어요.',
    routines: [
      '스트레칭·코어 15분',
      '집중 연습 블록 25분',
      '오늘 동작·점수 느낌 한 줄',
    ],
  },
  park_ji_sung: {
    name: '박지성',
    oneLine: '체력과 전술',
    mediaNote: '※ 훈련·자기관리가 해외·국내 스포츠 언론에서 자주 인용돼요.',
    routines: [
      '인터벌·런닝 또는 유산소 15분',
      '전술·포지션 메모 10분',
      '경기·훈련 복기 한 줄',
    ],
  },
  kim_young_kyung: {
    name: '김연경',
    oneLine: '스파이크와 회복',
    mediaNote: '※ 배구 선수로서 훈련·부상 관리가 보도에서 자주 다뤄져요.',
    routines: [
      '몸풀기·어깨·발목 케어 10분',
      '서브·스파이크 폼 연습 20분',
      '컨디션·기분 한 줄 기록',
    ],
  },
  ryu_hyun_jin: {
    name: '류현진',
    oneLine: '투구 루틴과 회복',
    mediaNote: '※ 투구 전 준비·루틴이 야구 보도·인터뷰에서 반복 언급돼요.',
    routines: [
      '스트레칭·롱토스 준비 15분',
      '집중 피칭·모의투구 20분',
      '수분·수면·어깨 상태 체크 한 줄',
    ],
  },
} as const;

export type PresetCelebrityId = keyof typeof CELEBRITIES;
export type CelebrityId = PresetCelebrityId | 'other';

/**
 * 롤모델 선택 그리드 순서 (인트로 등)
 * 기업가 → 전세계 유명인 → 위인 → 연예인·가수(국내 연예·스포츠 등)
 */
export const PRESET_CELEBRITY_GROUPS: { label: string; ids: PresetCelebrityId[] }[] = [
  {
    label: '기업가',
    ids: [
      'jobs',
      'musk',
      'bezos',
      'buffett',
      'gates',
      'zuckerberg',
      'tim_cook',
      'kim_bong_jin',
      'kim_beom_seok',
      'bang_si_hyuk',
      'lee_hae_jin',
      'lee_jae_yong',
    ],
  },
  {
    label: '전세계 유명인',
    ids: [
      'oprah',
      'michelle_obama',
      'obama',
      'beyonce',
      'taylor_swift',
      'ronaldo',
      'messi',
      'serena',
    ],
  },
  {
    label: '위인',
    ids: ['churchill', 'einstein', 'king_sejong', 'yun_dong_ju', 'kim_gu'],
  },
  {
    label: '연예인·가수',
    ids: [
      'yoo_jae_suk',
      'gdragon',
      'bts_suga',
      'lim_young_woong',
      'gong_yoo',
      'son_ye_jin',
      'iu',
      'rm',
      'son',
      'kim_yuna',
      'park_ji_sung',
      'kim_young_kyung',
      'ryu_hyun_jin',
    ],
  },
];

export const PRESET_CELEBRITY_IDS: PresetCelebrityId[] = PRESET_CELEBRITY_GROUPS.flatMap((g) => g.ids);

export type CelebrityProfile = {
  name: string;
  oneLine: string;
  routines: string[];
  mediaNote: string;
};

export function getProfile(id: CelebrityId, customName: string): CelebrityProfile {
  if (id === 'other') {
    const name = customName.trim() || '내 롤모델';
    return {
      name,
      oneLine: '직접 정한 하루 한 걸음',
      routines: ['오늘 집중할 일 1개만 쓰기', '방해 없는 25분 실행', '오늘 느낀 점 1줄 기록'],
      mediaNote: '직접 입력한 롤모델이에요. 이름은 아래에 적어 주세요.',
    };
  }
  const c = CELEBRITIES[id];
  return {
    name: c.name,
    oneLine: c.oneLine,
    routines: [...c.routines],
    mediaNote: c.mediaNote,
  };
}
