import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import BannerAd from '../components/BannerAd';

type GoalType = 'work' | 'health' | 'study' | 'relationship';
type ResultType = 'done' | 'not_done';

const GOAL_LABEL: Record<GoalType, string> = {
  work: '업무',
  health: '건강',
  study: '학습',
  relationship: '관계',
};

const PRESET_TASKS: Record<GoalType, string> = {
  work: '핵심 업무 1개 25분 집중',
  health: '저녁에 10분 걷기',
  study: '출근 전 1페이지 읽기',
  relationship: '고마운 사람 1명에게 메시지 보내기',
};

const FAILURE_REASONS = ['시간 부족', '피곤함', '우선순위 밀림', '생각보다 어려움'];

export default function Home() {
  const [goal, setGoal] = useState<GoalType>('work');
  const [morningTask, setMorningTask] = useState('');
  const [checkoutResult, setCheckoutResult] = useState<ResultType | null>(null);
  const [failureReason, setFailureReason] = useState('');
  const [history, setHistory] = useState<boolean[]>([]);

  useEffect(() => {
    const storedGoal = localStorage.getItem('commute-goal') as GoalType | null;
    const storedTask = localStorage.getItem('commute-task');
    const storedHistory = localStorage.getItem('commute-history');
    if (storedGoal) setGoal(storedGoal);
    if (storedTask) setMorningTask(storedTask);
    if (storedHistory) {
      try {
        const parsed = JSON.parse(storedHistory) as boolean[];
        if (Array.isArray(parsed)) setHistory(parsed);
      } catch {
        // Ignore invalid stored history.
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('commute-goal', goal);
  }, [goal]);

  useEffect(() => {
    localStorage.setItem('commute-task', morningTask);
  }, [morningTask]);

  useEffect(() => {
    localStorage.setItem('commute-history', JSON.stringify(history.slice(-14)));
  }, [history]);

  const streakDays = useMemo(() => {
    let count = 0;
    for (let i = history.length - 1; i >= 0; i -= 1) {
      if (!history[i]) break;
      count += 1;
    }
    return count;
  }, [history]);

  const weeklyRate = useMemo(() => {
    const last7 = history.slice(-7);
    if (last7.length === 0) return 0;
    const doneCount = last7.filter(Boolean).length;
    return Math.round((doneCount / last7.length) * 100);
  }, [history]);

  const score = Math.min(100, Math.round(weeklyRate * 0.8 + streakDays * 4));
  const hour = new Date().getHours();
  const slotLabel = hour < 15 ? '출근 전 체크인 시간' : '퇴근 후 체크아웃 시간';

  const onSubmitCheckout = () => {
    if (!checkoutResult) return;
    const completed = checkoutResult === 'done';
    setHistory((prev: boolean[]) => [...prev.slice(-13), completed]);
    setCheckoutResult(null);
    setFailureReason('');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center p-4 sm:p-6 pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-toss-text mt-4 mb-2 text-center">퇴근력</h1>
        <p className="text-toss-text text-base font-medium text-center">하루 2번, 실행률을 올리는 1분 루틴</p>
        <p className="text-toss-sub text-sm mt-1 mb-4 text-center">아침 30초 체크인 + 저녁 60초 체크아웃</p>

        <section className="mb-4 p-4 rounded-2xl bg-toss-blue/5 border border-toss-blue/20 text-left">
          <p className="text-xs text-toss-sub">현재 타임슬롯</p>
          <p className="text-sm font-semibold text-toss-text mt-1">{slotLabel}</p>
          <p className="text-xs text-toss-sub mt-1">선택 목표: {GOAL_LABEL[goal]}</p>
        </section>

        <section className="mb-4 p-4 rounded-2xl border border-toss-border bg-white">
          <p className="text-sm font-semibold text-toss-text mb-2">1) 목표 선택</p>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(GOAL_LABEL) as GoalType[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setGoal(item);
                  setMorningTask(PRESET_TASKS[item]);
                }}
                className={`py-2.5 rounded-xl border text-sm font-medium transition ${
                  goal === item
                    ? 'bg-toss-blue text-white border-toss-blue'
                    : 'bg-white text-toss-text border-toss-border'
                }`}
              >
                {GOAL_LABEL[item]}
              </button>
            ))}
          </div>
        </section>

        <section className="mb-4 p-4 rounded-2xl border border-toss-border bg-white">
          <p className="text-sm font-semibold text-toss-text mb-2">2) 아침 체크인 (30초)</p>
          <textarea
            value={morningTask}
            onChange={(e) => setMorningTask(e.target.value.slice(0, 80))}
            className="w-full border border-toss-border rounded-xl p-3 text-sm min-h-[88px] resize-none focus:outline-none focus:ring-2 focus:ring-toss-blue/30"
            placeholder="오늘 꼭 끝낼 1개를 적어보세요."
          />
          <div className="mt-2 flex justify-between items-center">
            <button
              type="button"
              onClick={() => setMorningTask(PRESET_TASKS[goal])}
              className="text-sm text-toss-blue font-medium"
            >
              추천 문구 사용
            </button>
            <span className="text-xs text-toss-sub">{morningTask.length}/80</span>
          </div>
        </section>

        <section className="mb-4 p-4 rounded-2xl border border-toss-border bg-white">
          <p className="text-sm font-semibold text-toss-text mb-2">3) 저녁 체크아웃 (60초)</p>
          <p className="text-sm text-toss-sub mb-2">오늘의 1개를 완료했나요?</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setCheckoutResult('done')}
              className={`py-2.5 rounded-xl border text-sm font-medium ${
                checkoutResult === 'done'
                  ? 'bg-emerald-500 text-white border-emerald-500'
                  : 'border-toss-border text-toss-text'
              }`}
            >
              완료했어요
            </button>
            <button
              type="button"
              onClick={() => setCheckoutResult('not_done')}
              className={`py-2.5 rounded-xl border text-sm font-medium ${
                checkoutResult === 'not_done' ? 'bg-rose-500 text-white border-rose-500' : 'border-toss-border text-toss-text'
              }`}
            >
              못했어요
            </button>
          </div>
          {checkoutResult === 'not_done' && (
            <div className="mt-3">
              <p className="text-xs text-toss-sub mb-2">이유를 하나만 선택해 주세요.</p>
              <div className="flex flex-wrap gap-2">
                {FAILURE_REASONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setFailureReason(reason)}
                    className={`px-3 py-1.5 rounded-full border text-xs ${
                      failureReason === reason ? 'bg-toss-blue text-white border-toss-blue' : 'text-toss-sub border-toss-border'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={onSubmitCheckout}
            disabled={!checkoutResult || (checkoutResult === 'not_done' && !failureReason)}
            className="mt-4 w-full py-3 rounded-xl bg-toss-blue text-white font-semibold disabled:opacity-50"
          >
            결과 저장하기
          </button>
        </section>

        <section className="mb-5 p-4 rounded-2xl bg-toss-bg border border-toss-border">
          <p className="text-sm font-semibold text-toss-text mb-2">4) 오늘의 성취 리포트</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white rounded-xl p-2.5 border border-toss-border">
              <p className="text-xs text-toss-sub">실행 점수</p>
              <p className="text-lg font-bold text-toss-text">{score}</p>
            </div>
            <div className="bg-white rounded-xl p-2.5 border border-toss-border">
              <p className="text-xs text-toss-sub">연속일</p>
              <p className="text-lg font-bold text-toss-text">{streakDays}일</p>
            </div>
            <div className="bg-white rounded-xl p-2.5 border border-toss-border">
              <p className="text-xs text-toss-sub">주간 실행률</p>
              <p className="text-lg font-bold text-toss-text">{weeklyRate}%</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-toss-sub">
            {checkoutResult === 'not_done'
              ? '괜찮아요. 내일은 더 작은 행동으로 다시 시작해요.'
              : '좋아요. 오늘도 실행을 지켰어요.'}
          </p>
        </section>
      </motion.div>

      <div className="w-full max-w-md mx-auto mt-auto">
        <BannerAd />
      </div>
    </div>
  );
}
