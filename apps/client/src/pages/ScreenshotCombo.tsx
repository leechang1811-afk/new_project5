/**
 * 홈 + 기록&순위 화면을 636 x 1048 px에 한번에 보여주는 스크린샷용 페이지
 * /screenshot 경로에서 접근
 */
export default function ScreenshotCombo() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100">
      <div
        className="bg-white flex flex-col overflow-hidden shadow-xl rounded-lg max-w-full"
        style={{ width: 636, height: 1048, maxHeight: 'calc(100vh - 2rem)' }}
      >
      {/* 상단: 홈 화면 (524px) */}
      <div
        className="flex-1 flex flex-col items-center justify-center p-4 overflow-hidden"
        style={{ height: 524 }}
      >
        <h1 className="text-xl font-bold text-toss-text mb-2 leading-tight">롤모델따라하기</h1>
        <p className="text-toss-text text-sm mb-1 font-medium">하루 1개 완료를 돕는 실행 루틴</p>
        <p className="text-toss-sub text-xs mb-3 leading-relaxed">아침 체크인 30초 · 저녁 체크아웃 60초</p>

        <div className="mb-3 p-3 rounded-xl bg-toss-blue/5 border border-toss-blue/20 text-left w-full">
          <p className="text-toss-text font-semibold text-xs">
            내 최고: 상위 <span className="text-toss-blue">23%</span>
            <span className="text-toss-sub font-medium ml-1">· 전체 #152등</span>
          </p>
          <p className="text-toss-sub text-[10px] mt-0.5">지난번 15단계 → 오늘은 16단계 도전!</p>
        </div>

        <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium mb-2">
          <span>🔥</span>
          <span>내 두뇌 건강 지키기 7일차</span>
        </div>

        <div className="text-toss-sub text-xs mb-3 bg-toss-bg rounded-lg py-2 px-3 text-left w-full">
          <p className="font-medium text-toss-text mb-1 text-[11px]">게임 내용 (총 20단계)</p>
          <ul className="space-y-0.5 text-[10px]">
            <li>① 민첩성 · 색이 바뀌면 빨간색만 탭!</li>
            <li>② 순발력 · N초에 맞춰 탭!</li>
            <li>③ 집중력 · 숫자·패턴 기억하기</li>
            <li>④ 논리력 · 덧셈·뺄셈 계산</li>
            <li>⑤ 시각 추론 · 색 섞어서 맞추기</li>
          </ul>
        </div>

        <button
          type="button"
          className="w-full py-3 rounded-xl text-white font-semibold shadow-lg text-sm bg-toss-blue"
        >
          한 번 더 도전!
        </button>
        <p className="mt-2 text-toss-sub text-[10px]">친구들과 겨뤄보세요 · 기록 & 순위</p>
      </div>

      {/* 구분선 */}
      <div className="h-px bg-slate-200 shrink-0" />

      {/* 하단: 기록 & 순위 화면 (524px) */}
      <div
        className="flex-1 overflow-hidden"
        style={{ height: 524 }}
      >
        <div className="h-full overflow-y-auto bg-gradient-to-b from-slate-50 to-white p-4">
          <h1 className="text-xl font-bold text-toss-text mb-4">기록 & 순위</h1>

          {/* Hero 카드 */}
          <div className="rounded-2xl p-6 text-center bg-gradient-to-br from-toss-blue to-blue-600 shadow-lg mb-3">
            <p className="text-4xl font-black text-white">상위 23%</p>
            <p className="mt-1 text-white/95 font-semibold text-sm">전체 순위 #152등</p>
            <p className="mt-0.5 text-white/90 text-xs">
              2,450점 · 15단계 · 🔥 7일차
            </p>
            <button
              type="button"
              className="mt-4 px-5 py-2 rounded-lg bg-white/20 text-white font-semibold text-xs"
            >
              내 기록 자랑하기
            </button>
          </div>

          {/* 내 점수 */}
          <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-100 mb-2">
            <p className="text-slate-500 text-[10px] mb-2 font-medium">내 점수</p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: '최고', value: '2,450', accent: true },
                { label: '최저', value: '1,820', accent: false },
                { label: '평균', value: '2,100', accent: false },
                { label: '최신', value: '2,450', accent: false },
              ].map(({ label, value, accent }) => (
                <div key={label} className="text-center">
                  <p className="text-slate-400 text-[9px] mb-0.5">{label}</p>
                  <p className={`text-sm font-bold ${accent ? 'text-toss-blue' : 'text-toss-text'}`}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 순위 */}
          <p className="text-slate-600 font-semibold mb-2 text-xs">이번 달 순위 🏆</p>
          <div className="space-y-1.5">
            {[
              { rank: 1, score: '3,120', level: 20 },
              { rank: 2, score: '2,980', level: 19 },
              { rank: 3, score: '2,850', level: 19 },
              { rank: 4, score: '2,450', level: 15, isMe: true },
              { rank: 5, score: '2,320', level: 14 },
            ].map((e) => (
              <div
                key={e.rank}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs ${
                  e.isMe
                    ? 'bg-toss-blue/10 border-2 border-toss-blue'
                    : e.rank <= 3
                      ? 'bg-amber-50 border border-amber-100'
                      : 'bg-white border border-slate-100'
                }`}
              >
                <span
                  className={`font-bold w-6 ${
                    e.isMe ? 'text-toss-blue' : e.rank <= 3 ? 'text-amber-600' : 'text-slate-600'
                  }`}
                >
                  #{e.rank}
                </span>
                <span
                  className={`font-medium flex-1 ${
                    e.isMe ? 'text-toss-blue font-bold' : 'text-slate-700'
                  }`}
                >
                  {e.score}점 {e.isMe && <span className="text-toss-blue text-[10px] ml-0.5">(나)</span>}
                </span>
                <span className={`text-[10px] ${e.isMe ? 'text-toss-blue/80' : 'text-slate-400'}`}>
                  Lv.{e.level}
                </span>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="w-full py-3 rounded-xl bg-toss-blue text-white font-bold text-sm mt-3 shadow-lg shadow-toss-blue/30"
          >
            나도 순위 올리기!
          </button>
        </div>
      </div>
    </div>
    </div>
  );
}
