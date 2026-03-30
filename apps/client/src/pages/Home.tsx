import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import BannerAd from '../components/BannerAd';
import { adsService } from '../services/ads';

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
  work: '오늘 해야 할 일 1개 끝내기',
  health: '10분 걷기',
  study: '책 1페이지 읽기',
  relationship: '고마운 사람에게 문자 1개 보내기',
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

function minutesUntil(timeHHmm: string, now = new Date()) {
  const [hh, mm] = timeHHmm.split(':').map((v) => Number(v));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  const utc = now.getTime() + now.getTimezoneOffset() * 60_000;
  const kstNow = new Date(utc + 9 * 60 * 60_000);
  const target = new Date(kstNow);
  target.setHours(hh, mm, 0, 0);
  let diff = target.getTime() - kstNow.getTime();
  if (diff < 0) diff += 24 * 60 * 60_000;
  return Math.round(diff / 60_000);
}

function formatRemaining(minutes: number | null) {
  if (minutes == null) return '-';
  if (minutes < 60) return `${minutes}분`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

function isFirstCheckoutToday(): boolean {
  const key = 'commute-first-checkout-date';
  const today = kstDayKey();
  const stored = localStorage.getItem(key);
  if (stored !== today) {
    localStorage.setItem(key, today);
    return true;
  }
  return false;
}

export default function Home() {
  const [goal, setGoal] = useState<GoalType>('work');
  const [morningTask, setMorningTask] = useState('');
  const [morningConfirmed, setMorningConfirmed] = useState(false);
  const [editingMorningTask, setEditingMorningTask] = useState(true);
  const [checkoutResult, setCheckoutResult] = useState<ResultType | null>(null);
  const [failureReason, setFailureReason] = useState('');
  const [history, setHistory] = useState<boolean[]>([]); // last 14 days completion
  const [reminders, setReminders] = useState(() => DEFAULT_REMINDERS);
  const [showWeekly, setShowWeekly] = useState(false);
  const [lastSavedDay, setLastSavedDay] = useState<DayKey>(() => kstDayKey());
  const [toast, setToast] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [view, setView] = useState<'today' | 'weekly'>('today');

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
    // 기본은 입력 가능 상태로 두되, 이미 체크인 완료면 요약 모드로 시작
    if (storedConfirmed === 'true') setEditingMorningTask(false);
    if (localStorage.getItem('todayone-intro-seen') !== 'true') {
      setShowIntro(true);
    }
  }, []);

  useEffect(() => {
    // "오늘/주간" 탭 대신 명확한 화면 상태로 유지
    if (showWeekly) setView('weekly');
  }, [showWeekly]);

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
        setEditingMorningTask(true);
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

  const statusPill = useMemo(() => {
    if (!morningConfirmed) return { label: '지금: 체크인', tone: 'bg-amber-50 text-amber-700 border-amber-200' };
    if (morningConfirmed && isMorningSlot) return { label: '오늘: 체크인 완료', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    return { label: '지금: 체크아웃', tone: 'bg-toss-blue/5 text-toss-blue border-toss-blue/20' };
  }, [isMorningSlot, morningConfirmed]);

  const morningTaskSummary = useMemo(() => {
    const t = morningTask.trim();
    if (!t) return '아직 비어 있어요. (오늘 딱 1개만)';
    return t.length > 48 ? `${t.slice(0, 48)}…` : t;
  }, [morningTask]);

  const nextSuggestion = useMemo(() => {
    if (failureReason === '시간 부족') return '내일은 더 짧게, 10분만 해요.';
    if (failureReason === '피곤함') return '내일은 3분만 시작해도 좋아요.';
    if (failureReason === '우선순위 밀림') return '내일은 가장 먼저 1개부터 해요.';
    if (failureReason === '생각보다 어려움') return '내일은 더 쉬운 1개로 바꿔요.';
    return '조금만 해도 성공이에요.';
  }, [failureReason]);

  const suggestedNextTask = useMemo(() => {
    if (failureReason === '시간 부족') return '10분만: 첫 단계만 끝내기';
    if (failureReason === '피곤함') return '3분만: 시작 버튼만 누르기';
    if (failureReason === '우선순위 밀림') return '가장 먼저 1개: 출근 직후 5분';
    if (failureReason === '생각보다 어려움') return '첫 단추 1개: 자료 1개만 열기';
    return '';
  }, [failureReason]);

  const minsToMorning = useMemo(() => minutesUntil(reminders.morning), [reminders.morning, lastSavedDay]);
  const minsToEvening = useMemo(() => minutesUntil(reminders.evening), [reminders.evening, lastSavedDay]);

  const onSubmitCheckout = () => {
    if (!checkoutResult) return;
    if (!morningConfirmed) return;
    const completed = checkoutResult === 'done';
    setHistory((prev: boolean[]) => [...prev.slice(-13), completed]);
    setCheckoutResult(null);
    setFailureReason('');
    setMorningConfirmed(false); // consume the day loop; user comes back next day.
  };

  const onSubmitCheckoutWithAd = async () => {
    if (!checkoutResult || !morningConfirmed) return;
    try {
      // 저녁 결과 저장 전 전면광고: 당일 첫 체크아웃은 생략(이탈 방지)
      const skip = isFirstCheckoutToday();
      if (!skip) {
        setToast('잠시 후 결과를 보여드릴게요.');
        await adsService.showInterstitial();
      }
    } catch {
      // ignore
    }
    onSubmitCheckout();
      setToast('저장 완료! 오늘 성공이 기록됐어요.');
    window.setTimeout(() => setToast(null), 2200);
  };

  const copyShare = async () => {
    const text = `오늘1개완료 · 점수 ${score}점 · 연속 ${streakDays}일 · 주간 ${weeklyRate}%\n${window.location.origin}`;
    try {
      await navigator.clipboard.writeText(text);
      setToast('공유 문구를 복사했어요.');
      window.setTimeout(() => setToast(null), 1800);
    } catch {
      setToast('복사 권한이 없어요. 길게 눌러 선택해 주세요.');
      window.setTimeout(() => setToast(null), 2200);
    }
  };

  const closeIntro = () => {
    localStorage.setItem('todayone-intro-seen', 'true');
    setShowIntro(false);
  };

  return (
    <div className="min-h-[100svh] bg-white flex flex-col items-center px-4 sm:px-6 pb-[calc(7rem+env(safe-area-inset-bottom))]">
      {/* Sticky header: prevents content being cut off by fixed bar */}
      <div className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur border-b border-toss-border">
        <div className="mx-auto max-w-lg py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {logoError ? (
                <div className="w-7 h-7 rounded-lg border border-toss-border bg-toss-blue/10 flex items-center justify-center text-[12px]">
                  ✅
                </div>
              ) : (
                <img
                  src="/app-icon-600x600.png"
                  alt="오늘1개완료 로고"
                  width={28}
                  height={28}
                  onError={() => setLogoError(true)}
                  className="w-7 h-7 rounded-lg border border-toss-border bg-white object-cover"
                  loading="eager"
                  decoding="async"
                />
              )}
              <span className="text-sm font-semibold text-toss-text truncate">오늘1개완료</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowSettings((v) => !v)}
                aria-label="목표와 알림 바꾸기"
                className="px-3 py-1.5 rounded-full border text-xs font-semibold bg-white text-toss-text border-toss-border"
              >
                바꾸기
              </button>
              <button
                type="button"
                onClick={() => setShowIntro(true)}
                aria-label="도움말 보기"
                className="px-3 py-1.5 rounded-full border text-xs font-semibold bg-white text-toss-text border-toss-border"
              >
                도움말
              </button>
            </div>
          </div>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg w-full mx-auto pt-4">
        {/* Minimal hero */}
        <div className="mb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-left">
              <p className="text-xs text-toss-sub">{todayKey}</p>
              <p className="text-xl sm:text-2xl font-bold text-toss-text mt-1">오늘 할 일 1개</p>
            </div>
            <span className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-semibold ${statusPill.tone}`}>
              {statusPill.label}
            </span>
          </div>
          <p className="text-sm text-toss-sub mt-2">
            {!morningConfirmed ? '적고, 시작해요.' : '다 했는지 누르고, 저장해요.'}
          </p>
        </div>

        {/* Primary navigation: explicit and child-friendly */}
        <div className="mb-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setShowWeekly(false);
              setView('today');
            }}
            className={`py-2.5 rounded-xl border text-sm font-semibold ${
              view === 'today' ? 'bg-toss-blue text-white border-toss-blue' : 'bg-white text-toss-text border-toss-border'
            }`}
          >
            오늘 하기
          </button>
          <button
            type="button"
            onClick={() => {
              setShowWeekly(true);
              setView('weekly');
            }}
            className={`py-2.5 rounded-xl border text-sm font-semibold ${
              view === 'weekly' ? 'bg-toss-blue text-white border-toss-blue' : 'bg-white text-toss-text border-toss-border'
            }`}
          >
            내 기록 보기
          </button>
        </div>

        {showSettings && (
          <section className="mb-4 p-4 rounded-2xl border border-toss-border bg-white">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-toss-text">바꾸기 (목표/알림)</p>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="text-xs font-semibold text-toss-blue"
              >
                닫기
              </button>
            </div>
            <div className="mt-3">
              <p className="text-xs text-toss-sub mb-2">무슨 종류의 할 일인지 고르기</p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(GOAL_LABEL) as GoalType[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setGoal(item);
                      setMorningTask(PRESET_TASKS[item]);
                      setEditingMorningTask(true);
                      setToast(`목표가 “${GOAL_LABEL[item]}”로 바뀌었어요.`);
                      window.setTimeout(() => setToast(null), 1800);
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
            </div>

            <div className="mt-4">
              <p className="text-xs text-toss-sub mb-2">알림 시간</p>
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
              <div className="mt-3 p-3 rounded-xl bg-toss-bg border border-toss-border">
                <p className="text-xs text-toss-sub">다음에 열어볼 시간</p>
                <p className="text-sm font-semibold text-toss-text mt-1">
                  다음 아침까지 {formatRemaining(minsToMorning)} · 다음 저녁까지 {formatRemaining(minsToEvening)}
                </p>
                <p className="text-xs text-toss-sub mt-1">오늘은 1번만 성공하면 끝!</p>
              </div>
            </div>
          </section>
        )}

        {showWeekly ? (
          <section className="mb-4 p-4 rounded-2xl bg-toss-bg border border-toss-border">
            <p className="text-sm font-semibold text-toss-text">이번 주 리포트</p>
            <p className="text-xs text-toss-sub mt-1">완료한 날만 파랗게 쌓입니다.</p>
            <div className="mt-3">
              <p className="text-xs text-toss-sub mb-2">최근 7일</p>
              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: 7 }).map((_, idx) => {
                  const v = history.slice(-7)[idx] ?? false;
                  return (
                    <div
                      key={idx}
                      className={`h-8 rounded-lg border ${v ? 'bg-toss-blue/90 border-toss-blue' : 'bg-white border-toss-border'}`}
                      aria-label={v ? '완료' : '미완료'}
                    />
                  );
                })}
              </div>
              <p className="text-xs text-toss-sub mt-2">파란 칸이 “저장 성공”한 날이에요.</p>
            </div>
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
              <p className="text-sm font-semibold text-toss-text mt-1">7일 연속 저장하기</p>
              <div className="mt-2 h-2 rounded-full bg-toss-border/60 overflow-hidden">
                <div
                  className="h-full bg-toss-blue"
                  style={{ width: `${Math.min(100, Math.round((streakDays / 7) * 100))}%` }}
                />
              </div>
              <p className="text-xs text-toss-sub mt-2">현재 {Math.min(7, streakDays)}/7일</p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={copyShare}
                className="py-2.5 rounded-xl border border-toss-border bg-white text-sm font-semibold text-toss-text"
              >
                공유 문구 복사
              </button>
              <button
                type="button"
                onClick={() => setShowWeekly(false)}
                className="py-2.5 rounded-xl bg-toss-blue text-white text-sm font-semibold"
              >
                오늘 루프로 돌아가기
              </button>
            </div>
          </section>
        ) : (
          <>
            {/* 상태 기반: 체크인/체크아웃 2개 화면만 남김 */}
            <section className="mb-4 p-4 rounded-2xl border border-toss-border bg-white">
              <p className="text-sm font-semibold text-toss-text mb-1">
                {!morningConfirmed ? '1) 먼저 적기 (30초)' : '2) 끝났는지 누르기 (60초)'}
              </p>
              <p className="text-xs text-toss-sub mb-3">
                {!morningConfirmed ? '오늘 할 일 1개를 적고 시작해요.' : '완료/미완료를 누르고 저장해요.'}
              </p>

              {!editingMorningTask && morningConfirmed ? (
                <div className="p-3 rounded-xl bg-toss-bg border border-toss-border">
                  <p className="text-xs text-toss-sub">지금 할 일</p>
                  <p className="text-sm font-semibold text-toss-text mt-1">{morningTaskSummary}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingMorningTask(true)}
                      className="py-2.5 rounded-xl border border-toss-border bg-white text-sm font-semibold text-toss-text"
                    >
                      수정하기
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMorningConfirmed(false);
                        setEditingMorningTask(true);
                      }}
                      className="py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-sm font-semibold text-rose-700"
                    >
                      다시 적기
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {!morningConfirmed ? (
                    <>
                      <textarea
                        value={morningTask}
                        onChange={(e) => setMorningTask(clampText(e.target.value, 80))}
                        className="w-full border border-toss-border rounded-xl p-3 text-sm min-h-[88px] resize-none focus:outline-none focus:ring-2 focus:ring-toss-blue/30"
                        placeholder="예) 숙제 1개 끝내기 / 10분 걷기"
                        aria-label="오늘의 1개 입력"
                      />
                      <div className="mt-2 flex justify-between items-center">
                        <button
                          type="button"
                          onClick={() => setMorningTask(PRESET_TASKS[goal])}
                          className="text-sm text-toss-blue font-medium"
                        >
                          예시 넣기
                        </button>
                        <span className="text-xs text-toss-sub">{morningTask.length}/80</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setMorningConfirmed(true);
                          setEditingMorningTask(false);
                          setToast('체크인 완료. 저녁에 저장하면 점수가 올라요.');
                          window.setTimeout(() => setToast(null), 2200);
                        }}
                        disabled={!morningTask.trim()}
                        className="mt-3 w-full py-3 rounded-xl bg-toss-blue text-white font-semibold disabled:opacity-50"
                      >
                        시작하기
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="mb-3 p-3 rounded-xl bg-toss-bg border border-toss-border">
                        <p className="text-xs text-toss-sub">내가 적은 할 일</p>
                        <p className="text-sm font-semibold text-toss-text mt-1">{morningTaskSummary}</p>
                      </div>
                      <p className="text-sm text-toss-sub mb-2">다 했나요?</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setCheckoutResult('done')}
                          aria-pressed={checkoutResult === 'done'}
                          className={`py-2.5 rounded-xl border text-sm font-medium ${
                            checkoutResult === 'done'
                              ? 'bg-emerald-500 text-white border-emerald-500'
                              : 'border-toss-border text-toss-text'
                          }`}
                        >
                          다 했어요
                        </button>
                        <button
                          type="button"
                          onClick={() => setCheckoutResult('not_done')}
                          aria-pressed={checkoutResult === 'not_done'}
                          className={`py-2.5 rounded-xl border text-sm font-medium ${
                            checkoutResult === 'not_done'
                              ? 'bg-rose-500 text-white border-rose-500'
                              : 'border-toss-border text-toss-text'
                          }`}
                        >
                          아직 못했어요
                        </button>
                      </div>

                      {checkoutResult === 'not_done' && (
                        <div className="mt-3">
                          <p className="text-xs text-toss-sub mb-2">왜 못했는지 1개만 고르기</p>
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
                          {suggestedNextTask && (
                            <button
                              type="button"
                              onClick={() => {
                                setMorningTask((t) => clampText(t ? `${t} · ${suggestedNextTask}` : suggestedNextTask, 80));
                                setToast('내일용 “더 쉬운 1개”를 준비했어요.');
                                window.setTimeout(() => setToast(null), 2000);
                              }}
                              className="mt-3 w-full py-2.5 rounded-xl border border-toss-border bg-white text-sm font-semibold text-toss-text"
                            >
                              내일은 더 쉽게 바꾸기
                            </button>
                          )}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={onSubmitCheckoutWithAd}
                        disabled={!checkoutResult || (checkoutResult === 'not_done' && !failureReason)}
                        className="mt-4 w-full py-3 rounded-xl bg-toss-blue text-white font-semibold disabled:opacity-50"
                      >
                        저장하기
                      </button>
                      <p className="mt-2 text-xs text-toss-sub">광고가 나와도 저장은 됩니다.</p>
                    </>
                  )}
                </>
              )}
            </section>

            <section className="mb-5 p-4 rounded-2xl bg-toss-bg border border-toss-border">
              <p className="text-sm font-semibold text-toss-text mb-2">오늘 결과</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white rounded-xl p-2.5 border border-toss-border">
                  <p className="text-xs text-toss-sub">점수</p>
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
                <p className="text-xs text-toss-sub">점수는 이렇게 계산해요</p>
                <p className="text-sm font-semibold text-toss-text mt-1">주간 실행률 x 0.8 + 연속일 x 4 (최대 100점)</p>
                <p className="text-xs text-toss-sub mt-1">쉬운 말로: 자주 하면 점수가 올라가요.</p>
              </div>
              <p className="mt-3 text-xs text-toss-sub">
                {failureReason ? nextSuggestion : '조금만 해도 성공이에요.'}
              </p>
            </section>

          </>
        )}
      </motion.div>

      <div className="w-full max-w-md mx-auto mt-auto">
        <BannerAd />
      </div>

      {toast && (
        <div className="fixed left-0 right-0 bottom-[calc(96px+env(safe-area-inset-bottom)+12px)] z-50 px-4 sm:px-6">
          <div className="mx-auto max-w-md">
            <div className="rounded-xl bg-toss-text text-white text-sm px-4 py-3 shadow-lg">
              {toast}
            </div>
          </div>
        </div>
      )}

      {showIntro && (
        <div className="fixed inset-0 z-[60] bg-black/45 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-toss-border p-5">
            <p className="text-lg font-bold text-toss-text">처음이죠? 아주 쉬워요</p>
            <p className="text-sm text-toss-sub mt-2">하루에 2번만 누르면 됩니다.</p>
            <div className="mt-4 space-y-2 text-sm text-toss-text">
              <p>1) 아침: 오늘 할 일 1개 적기</p>
              <p>2) 저녁: 다 했는지 누르기</p>
              <p>3) 저장하면 점수 올라가기</p>
            </div>
            <div className="mt-4 p-3 rounded-xl bg-toss-bg border border-toss-border">
              <p className="text-xs text-toss-sub">핵심만 기억하세요</p>
              <p className="text-sm font-semibold text-toss-text mt-1">오늘은 1개만 끝내면 성공!</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={closeIntro}
                className="py-2.5 rounded-xl border border-toss-border bg-white text-sm font-semibold text-toss-text"
              >
                다시 안 볼래요
              </button>
              <button
                type="button"
                onClick={closeIntro}
                className="py-2.5 rounded-xl bg-toss-blue text-white text-sm font-semibold"
              >
                시작할래요
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
