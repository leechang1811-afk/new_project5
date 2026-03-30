import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import BannerAd from '../components/BannerAd';

type GoalType = 'work' | 'health' | 'study' | 'relationship';
type ResultType = 'done' | 'not_done';

type DayKey = string; // YYYY-MM-DD (KST)

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

const DEFAULT_REMINDERS = { morning: '08:20', evening: '19:10' };

function kstDayKey(d = new Date()): DayKey {
  // Convert to KST day bucket without external libs.
  const utc = d.getTime() + d.getTimezoneOffset() * 60_000;
  const kst = new Date(utc + 9 * 60 * 60_000);
  const yyyy = kst.getFullYear();
  const mm = String(kst.getMonth() + 1).padStart(2, '0');
  const dd = String(kst.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function clampText(s: string, max = 80) {
  return s.length > max ? s.slice(0, max) : s;
}

export default function Home() {
  const [goal, setGoal] = useState<GoalType>('work');
  const [morningTask, setMorningTask] = useState('');
  const [morningConfirmed, setMorningConfirmed] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState<ResultType | null>(null);
  const [failureReason, setFailureReason] = useState('');
  const [history, setHistory] = useState<boolean[]>([]); // last 14 days completion
  const [reminders, setReminders] = useState(() => DEFAULT_REMINDERS);
  const [showWeekly, setShowWeekly] = useState(false);
  const [lastSavedDay, setLastSavedDay] = useState<DayKey>(() => kstDayKey());

  useEffect(() => {
    const storedGoal = localStorage.getItem('commute-goal') as GoalType | null;
    const storedTask = localStorage.getItem('commute-task');
    const storedHistory = localStorage.getItem('commute-history');
    const storedConfirmed = localStorage.getItem('commute-morning-confirmed');
    const storedReminders = localStorage.getItem('commute-reminders');
    const storedLastSavedDay = localStorage.getItem('commute-last-saved-day') as DayKey | null;
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
    if (storedConfirmed === 'true') setMorningConfirmed(true);
    if (storedReminders) {
      try {
        const parsed = JSON.parse(storedReminders) as { morning: string; evening: string };
        if (parsed?.morning && parsed?.evening) setReminders(parsed);
      } catch {
        // ignore
      }
    }
    if (storedLastSavedDay) setLastSavedDay(storedLastSavedDay);
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

  useEffect(() => {
    localStorage.setItem('commute-morning-confirmed', String(morningConfirmed));
  }, [morningConfirmed]);

  useEffect(() => {
    localStorage.setItem('commute-reminders', JSON.stringify(reminders));
  }, [reminders]);

  useEffect(() => {
    localStorage.setItem('commute-last-saved-day', lastSavedDay);
  }, [lastSavedDay]);

  // Day rollover: if day changed, reset morning confirmation (so user has reason to "check-in" again).
  useEffect(() => {
    const t = window.setInterval(() => {
      const today = kstDayKey();
      if (today !== lastSavedDay) {
        setLastSavedDay(today);
        setMorningConfirmed(false);
        setCheckoutResult(null);
        setFailureReason('');
      }
    }, 15_000);
    return () => window.clearInterval(t);
  }, [lastSavedDay]);

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
  const isMorningSlot = hour < 15;
  const slotLabel = isMorningSlot ? '출근 전 체크인 시간' : '퇴근 후 체크아웃 시간';

  const todayKey = kstDayKey();
  const primaryCTA = useMemo(() => {
    if (!morningConfirmed) return '오늘의 1개 확정하기';
    return isMorningSlot ? '저녁에 체크아웃하면 점수가 올라요' : '오늘 결과 저장하고 점수 받기';
  }, [isMorningSlot, morningConfirmed]);

  const nextSuggestion = useMemo(() => {
    if (failureReason === '시간 부족') return '내일은 “10분만”으로 줄여서 시작해요.';
    if (failureReason === '피곤함') return '내일은 “집 도착 후 3분” 같은 초미니로 바꿔봐요.';
    if (failureReason === '우선순위 밀림') return '내일은 “가장 먼저 1개”로 예약해두면 확률이 올라요.';
    if (failureReason === '생각보다 어려움') return '내일은 “첫 단추 1개”만 잠깐 해도 성공이에요.';
    return '완벽보다 “완료”가 더 강합니다.';
  }, [failureReason]);

  const onSubmitCheckout = () => {
    if (!checkoutResult) return;
    if (!morningConfirmed) return;
    const completed = checkoutResult === 'done';
    setHistory((prev: boolean[]) => [...prev.slice(-13), completed]);
    setCheckoutResult(null);
    setFailureReason('');
    setMorningConfirmed(false); // consume the day loop; user comes back next day.
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center p-4 sm:p-6 pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-toss-text mt-4 mb-2 text-center">퇴근력</h1>
        <p className="text-toss-text text-base font-medium text-center">오늘 “1개”를 끝내는 확률을 올려요</p>
        <p className="text-toss-sub text-sm mt-1 mb-3 text-center">
          {todayKey} · {reminders.morning}/{reminders.evening} 리마인드
        </p>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setShowWeekly(false)}
            className={`py-2.5 rounded-xl border text-sm font-semibold ${
              !showWeekly ? 'bg-toss-blue text-white border-toss-blue' : 'bg-white text-toss-text border-toss-border'
            }`}
          >
            오늘 루프
          </button>
          <button
            type="button"
            onClick={() => setShowWeekly(true)}
            className={`py-2.5 rounded-xl border text-sm font-semibold ${
              showWeekly ? 'bg-toss-blue text-white border-toss-blue' : 'bg-white text-toss-text border-toss-border'
            }`}
          >
            주간 리포트
          </button>
        </div>

        {showWeekly ? (
          <section className="mb-4 p-4 rounded-2xl bg-toss-bg border border-toss-border">
            <p className="text-sm font-semibold text-toss-text">이번 주 리포트</p>
            <p className="text-xs text-toss-sub mt-1">“짧게 자주”가 이 앱의 전부예요.</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
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
            <div className="mt-3 p-3 rounded-xl bg-white border border-toss-border">
              <p className="text-xs text-toss-sub">추천 챌린지</p>
              <p className="text-sm font-semibold text-toss-text mt-1">7일 연속 “체크아웃” 달성</p>
              <div className="mt-2 h-2 rounded-full bg-toss-border/60 overflow-hidden">
                <div
                  className="h-full bg-toss-blue"
                  style={{ width: `${Math.min(100, Math.round((streakDays / 7) * 100))}%` }}
                />
              </div>
              <p className="text-xs text-toss-sub mt-2">현재 {Math.min(7, streakDays)}/7일</p>
            </div>
          </section>
        ) : (
          <>
            <section className="mb-4 p-4 rounded-2xl bg-toss-blue/5 border border-toss-blue/20 text-left">
              <p className="text-xs text-toss-sub">현재 타임슬롯</p>
              <p className="text-sm font-semibold text-toss-text mt-1">{slotLabel}</p>
              <p className="text-xs text-toss-sub mt-1">오늘의 상태: {morningConfirmed ? '체크인 완료' : '체크인 필요'}</p>
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
                onChange={(e) => setMorningTask(clampText(e.target.value, 80))}
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
              <button
                type="button"
                onClick={() => setMorningConfirmed(true)}
                disabled={!morningTask.trim()}
                className="mt-3 w-full py-3 rounded-xl bg-toss-blue text-white font-semibold disabled:opacity-50"
              >
                {primaryCTA}
              </button>
              <p className="mt-2 text-xs text-toss-sub">
                체크인을 확정하면, 저녁에 “결과 저장”으로 점수가 계산돼요.
              </p>
            </section>

            <section className="mb-4 p-4 rounded-2xl border border-toss-border bg-white">
              <p className="text-sm font-semibold text-toss-text mb-2">3) 저녁 체크아웃 (60초)</p>
              {!morningConfirmed ? (
                <div className="p-3 rounded-xl bg-toss-bg border border-toss-border">
                  <p className="text-sm text-toss-text font-semibold">아직 체크인이 없어요</p>
                  <p className="text-xs text-toss-sub mt-1">오늘의 1개를 먼저 확정하면, 저녁에 점수가 올라갑니다.</p>
                </div>
              ) : (
                <>
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
                        checkoutResult === 'not_done'
                          ? 'bg-rose-500 text-white border-rose-500'
                          : 'border-toss-border text-toss-text'
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
                              failureReason === reason
                                ? 'bg-toss-blue text-white border-toss-blue'
                                : 'text-toss-sub border-toss-border'
                            }`}
                          >
                            {reason}
                          </button>
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-toss-sub">{nextSuggestion}</p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={onSubmitCheckout}
                    disabled={!checkoutResult || (checkoutResult === 'not_done' && !failureReason)}
                    className="mt-4 w-full py-3 rounded-xl bg-toss-blue text-white font-semibold disabled:opacity-50"
                  >
                    오늘 결과 저장하고 점수 받기
                  </button>
                  <p className="mt-2 text-xs text-toss-sub">
                    광고가 나올 수 있어요. (실패해도 결과 저장은 항상 됩니다)
                  </p>
                </>
              )}
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
                {failureReason ? nextSuggestion : '오늘도 “1개”에 집중하면, 실행률이 올라갑니다.'}
              </p>
            </section>

            <section className="mb-5 p-4 rounded-2xl border border-toss-border bg-white">
              <p className="text-sm font-semibold text-toss-text mb-2">리마인드 시간</p>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-left">
                  <span className="block text-xs text-toss-sub mb-1">아침</span>
                  <input
                    type="time"
                    value={reminders.morning}
                    onChange={(e) => setReminders((r) => ({ ...r, morning: e.target.value }))}
                    className="w-full border border-toss-border rounded-xl px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-left">
                  <span className="block text-xs text-toss-sub mb-1">저녁</span>
                  <input
                    type="time"
                    value={reminders.evening}
                    onChange={(e) => setReminders((r) => ({ ...r, evening: e.target.value }))}
                    className="w-full border border-toss-border rounded-xl px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <p className="mt-2 text-xs text-toss-sub">
                앱인토스 푸시는 환경에 따라 제한될 수 있어요. 대신 이 앱은 “시간대 루프”를 화면에서 바로 보여줘요.
              </p>
            </section>
          </>
        )}
      </motion.div>

      <div className="w-full max-w-md mx-auto mt-auto">
        <BannerAd />
      </div>
    </div>
  );
}
