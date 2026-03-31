/**
 * 롤모델별 루틴은 공개 인터뷰·전기·보도 등에서 자주 인용되는 습관을 바탕으로 짧게 옮겼습니다.
 * (의학·법률 자문 아님 — 앱 내 동기 부여용)
 */

export const CELEBRITIES = {
  jobs: {
    name: '스티브 잡스',
    oneLine: '핵심 하나에 몰입',
    mediaNote: '※ 본질에 집중하는 습관을 전기·인터뷰에서 자주 인용되는 흐름을 바탕으로 옮겼어요.',
    routines: [
      '아침에 하루 목표 설정 질문 하기',
      '오전에 가장 중요한 1개 업무에 집중하기',
      '점심에 산책 또는 워킹 미팅 하기',
      '오후에 제품 및 아이디어 검토하기',
      '저녁에 불필요한 것 제거 및 정리하기',
    ],
  },
  musk: {
    name: '일론 머스크',
    oneLine: '실행과 문제 해결',
    mediaNote: '※ 시간 단위 스케줄·현장 중심 실행을 강조한 보도·인터뷰 흐름을 바탕으로 구성했어요.',
    routines: [
      '아침에 이메일 및 핵심 문제 먼저 처리하기',
      '오전에 가장 중요한 문제 해결 업무 집중하기',
      '점심 간단히 해결하기',
      '오후에 회의 및 현장 업무 수행하기',
      '저녁에 추가 업무 또는 기술 검토하기',
    ],
  },
  bezos: {
    name: '제프 베조스',
    oneLine: '고품질 의사결정',
    mediaNote: '※ “적은 수의 고품질 결정” 원칙과 메모 중심 회의를 정리해 하루 루틴으로 옮겼어요.',
    routines: [
      '아침에 충분한 수면 후 여유롭게 시작하기',
      '오전에 중요한 의사결정 수행하기',
      '점심에 가벼운 식사 하기',
      '오후에 전략 및 장기 방향 검토하기',
      '저녁에 휴식 또는 가족 시간 보내기',
    ],
  },
  buffett: {
    name: '워런 버핏',
    oneLine: '독서와 장기 관점',
    mediaNote: '※ 하루 대부분을 읽고 생각하는 투자 스타일을 루틴 형태로 정리했어요.',
    routines: [
      '아침에 신문 및 정보 읽기',
      '오전에 투자 자료 분석하기',
      '점심 간단히 해결하기',
      '오후에 독서 및 사고하기',
      '저녁에 추가 독서하기',
    ],
  },
  gates: {
    name: '빌 게이츠',
    oneLine: '깊은 사고와 학습',
    mediaNote: '※ Think Week와 독서·메모 습관을 기반으로 사고 확장 흐름을 정리했어요.',
    routines: [
      '아침에 독서 또는 학습하기',
      '오전에 깊은 사고 업무 수행하기',
      '점심에 휴식하기',
      '오후에 미팅 및 아이디어 정리하기',
      '저녁에 독서 및 기록하기',
    ],
  },
  zuckerberg: {
    name: '마크 저커버그',
    oneLine: '제품과 실행',
    mediaNote: '※ 제품 중심 사고와 빠른 실행·운동 습관을 아침·저녁 루틴으로 재구성했어요.',
    routines: [
      '아침에 빠르게 준비 후 업무 시작하기',
      '오전에 제품 및 개발 업무 집중하기',
      '점심 전후 운동하기',
      '오후에 팀 미팅 및 의사결정하기',
      '저녁에 추가 작업 또는 학습하기',
    ],
  },
  tim_cook: {
    name: '팀 쿡',
    oneLine: '아침 정리 루틴',
    mediaNote: '※ 이른 시간에 일정을 정리하고 우선순위를 세운다는 보도를 바탕으로 구성했어요.',
    routines: [
      '아침에 이메일·일정을 간단히 정리하기',
      '오늘 가장 중요한 일 1개만 고르기',
      '회의나 약속 시간을 너무 빽빽하게 잡지 않기',
      '하루 중간에 우선순위를 다시 한 번 점검하기',
      '퇴근 전 오늘을 짧게 회고하고 내일 첫 일을 정하기',
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
  messi: {
    name: '리오넬 메시',
    oneLine: '기본기와 회복',
    mediaNote: '※ 훈련·회복 루틴이 스포츠 매체에서 자주 다뤄져요.',
    routines: [
      '아침에 가벼운 몸풀기 하기',
      '오전에 기술 훈련하기',
      '점심에 식단 관리하기',
      '오후에 팀 훈련 및 전술 연습하기',
      '저녁에 회복 및 휴식하기',
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
  serena: {
    name: '세리나 윌리엄스',
    oneLine: '집중 훈련과 회복',
    mediaNote: '※ 코트·보강 훈련과 회복·식단 관리에 대한 보도를 바탕으로 구성했어요.',
    routines: [
      '아침에 스트레칭 및 준비 운동하기',
      '오전에 테니스 훈련하기',
      '점심에 식단 관리하기',
      '오후에 웨이트 및 보강 훈련하기',
      '저녁에 회복 관리하기',
    ],
  },
  churchill: {
    name: '윈스턴 처칠',
    oneLine: '야행성과 낮잠',
    mediaNote: '※ 침대 업무·낮잠·야간 작업 패턴을 전기·역사 자료에서 가져와 재구성했어요.',
    routines: [
      '아침에 침대에서 업무 시작하기',
      '오전에 문서 및 보고 검토하기',
      '점심 후 휴식하기',
      '오후에 낮잠 후 업무 재개하기',
      '저녁에 연설 작성 및 집중 업무 수행하기',
    ],
  },
  einstein: {
    name: '알베르트 아인슈타인',
    oneLine: '산책과 깊은 사고',
    mediaNote: '※ 산책·수면·음악을 통한 사색 습관을 전기에서 인용해 하루 루틴으로 정리했어요.',
    routines: [
      '아침에 여유롭게 시작하기',
      '오전에 깊은 사고 및 연구하기',
      '점심 후 산책하기',
      '오후에 연구 및 정리하기',
      '저녁에 음악 또는 휴식하기',
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
    oneLine: '학문과 기록 루틴',
    mediaNote: '※ 글과 기록, 백성을 생각하는 태도를 전기·교과서 자료에서 가져와 일상의 루틴으로 옮겼어요.',
    routines: [
      '아침에 오늘 배울 글·글자 1가지 적기',
      '백성·사람 입장에서 질문 1개 쓰기',
      '낮에는 배운 내용을 곰곰이 떠올려 보기',
      '저녁에 오늘 있었던 일을 짧게 정리하기',
      '하루를 한 줄로 요약해 기록하기',
    ],
  },
  yun_dong_ju: {
    name: '윤동주',
    oneLine: '시와 일기 루틴',
    mediaNote: '※ 시와 일기를 쓰던 습관을, 감정을 기록하는 하루 루틴으로 정리했어요.',
    routines: [
      '아침에 마음에 드는 시 한 구절 읽기',
      '하루 중 떠오른 감정을 짧게 메모하기',
      '저녁에 오늘 있었던 일을 시나 문장으로 적어 보기',
      '조용히 혼자 사색하는 시간 10분 갖기',
      '자기 전 오늘 마음을 한 줄로 정리하기',
    ],
  },
  kim_gu: {
    name: '김구',
    oneLine: '성찰 루틴',
    mediaNote: '※ 일기와 저서에서 드러나는 성찰·실천의 태도를, 일상 속 루틴으로 옮겼어요.',
    routines: [
      '아침에 오늘 나라·공동체를 위해 할 일 1줄 적기',
      '낮에 그 일을 향해 작은 행동 1개 실천하기',
      '하루 중 감사한 일 1가지 떠올리기',
      '저녁에 오늘의 선택을 돌아보기',
      '밤에 오늘을 반성하는 글 한 줄 쓰기',
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
      'kim_beom_seok',
      'kim_bong_jin',
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
      'lim_young_woong',
      'gong_yoo',
      'son_ye_jin',
      'iu',
      'son',
      'kim_yuna',
      'park_ji_sung',
      'kim_young_kyung',
    ],
  },
];

export const PRESET_CELEBRITY_IDS: PresetCelebrityId[] = PRESET_CELEBRITY_GROUPS.flatMap((g) => g.ids);

export type CelebrityProfile = {
  name: string;
  oneLine: string;
  routines: string[];
  mediaNote: string;
  quote?: string;
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
    routines: [...c.routines].slice(0, 5),
    mediaNote: c.mediaNote,
  };
}
