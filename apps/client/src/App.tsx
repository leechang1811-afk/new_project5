import { FormEvent, useEffect, useMemo, useState } from 'react';
import BannerAd from './components/BannerAd';
import { adsService } from './services/ads';
import { track } from './services/analytics';

type Habit = {
  id: string;
  name: string;
  createdAt: string;
  checkedDates: string[];
};

type HabitState = {
  habits: Habit[];
  adCounter: number;
};

const STORAGE_KEY = 'korea-habit-tracker-v1';
const PRESET_HABITS = ['물 2L 마시기', '10분 독서', '15분 걷기'];

function todayKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function safeLoadState(): HabitState {
  if (typeof window === 'undefined') return { habits: [], adCounter: 0 };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { habits: [], adCounter: 0 };
    const parsed = JSON.parse(raw) as HabitState;
    if (!Array.isArray(parsed.habits)) return { habits: [], adCounter: 0 };
    return {
      habits: parsed.habits.map((habit) => ({
        ...habit,
        checkedDates: Array.isArray(habit.checkedDates) ? habit.checkedDates : [],
      })),
      adCounter: Number.isFinite(parsed.adCounter) ? parsed.adCounter : 0,
    };
  } catch {
    return { habits: [], adCounter: 0 };
  }
}

function streakCount(checkedDates: string[]): number {
  const checked = new Set(checkedDates);
  let streak = 0;
  const cursor = new Date();
  while (true) {
    const key = todayKey(cursor);
    if (!checked.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function weeklyCompletedCount(checkedDates: string[]): number {
  const checked = new Set(checkedDates);
  let count = 0;
  const cursor = new Date();
  for (let i = 0; i < 7; i += 1) {
    const key = todayKey(cursor);
    if (checked.has(key)) count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

export default function App() {
  const [state, setState] = useState<HabitState>(() => safeLoadState());
  const [habitName, setHabitName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const dateKey = todayKey();

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    track('app_open', {
      habits_count: state.habits.length,
    });
  }, [state.habits.length]);

  const completionRate = useMemo(() => {
    if (state.habits.length === 0) return 0;
    const doneToday = state.habits.filter((habit) => habit.checkedDates.includes(dateKey)).length;
    return Math.round((doneToday / state.habits.length) * 100);
  }, [state.habits, dateKey]);

  const totalWeeklyChecks = useMemo(
    () => state.habits.reduce((acc, habit) => acc + weeklyCompletedCount(habit.checkedDates), 0),
    [state.habits]
  );

  async function maybeShowInterstitial(nextCounter: number) {
    if (nextCounter % 5 !== 0) return;
    try {
      await adsService.loadInterstitial();
      await adsService.showInterstitial();
      track('ad_interstitial_shown', { trigger: 'habit_check_5x' });
    } catch {
      // ignore ad failures to keep main flow stable
    }
  }

  async function handleAddHabit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = habitName.trim();
    if (!trimmed || isSaving) return;
    setIsSaving(true);
    const newHabit: Habit = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: trimmed.slice(0, 24),
      createdAt: new Date().toISOString(),
      checkedDates: [],
    };

    setState((prev) => ({
      ...prev,
      habits: [newHabit, ...prev.habits],
    }));

    track('habit_add', { name_length: trimmed.length });
    setHabitName('');
    setIsSaving(false);
  }

  function addPresetHabit(name: string) {
    if (state.habits.some((habit) => habit.name === name)) return;
    const newHabit: Habit = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      createdAt: new Date().toISOString(),
      checkedDates: [],
    };
    setState((prev) => ({
      ...prev,
      habits: [newHabit, ...prev.habits],
    }));
    track('habit_add', { source: 'preset' });
  }

  async function toggleToday(habitId: string) {
    let nextCounter = state.adCounter;
    const nextHabits = state.habits.map((habit) => {
      if (habit.id !== habitId) return habit;
      const isDone = habit.checkedDates.includes(dateKey);
      const checkedDates = isDone
        ? habit.checkedDates.filter((d) => d !== dateKey)
        : [...habit.checkedDates, dateKey];
      if (!isDone) nextCounter += 1;
      return { ...habit, checkedDates };
    });

    setState({ habits: nextHabits, adCounter: nextCounter });
    track('habit_toggle', { done_count: nextHabits.filter((h) => h.checkedDates.includes(dateKey)).length });
    void maybeShowInterstitial(nextCounter);
  }

  function removeHabit(habitId: string) {
    setState((prev) => ({
      ...prev,
      habits: prev.habits.filter((habit) => habit.id !== habitId),
    }));
    track('habit_delete');
  }

  return (
    <main className="mx-auto max-w-md min-h-[100dvh] bg-slate-50 text-toss-text">
      <section className="px-5 pt-8 pb-4">
        <p className="text-sm text-toss-sub">Korea Habit</p>
        <h1 className="text-2xl font-bold mt-1">초간단 습관 트래커</h1>
        <p className="text-sm text-toss-sub mt-2">오늘 체크만 해도 루틴이 쌓여요. 복잡한 기능 없이 바로 시작하세요.</p>
      </section>

      <section className="px-5">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-white border border-toss-border p-3">
            <p className="text-xs text-toss-sub">오늘 달성률</p>
            <p className="text-xl font-semibold mt-1">{completionRate}%</p>
          </div>
          <div className="rounded-xl bg-white border border-toss-border p-3">
            <p className="text-xs text-toss-sub">습관 개수</p>
            <p className="text-xl font-semibold mt-1">{state.habits.length}</p>
          </div>
          <div className="rounded-xl bg-white border border-toss-border p-3">
            <p className="text-xs text-toss-sub">7일 체크합</p>
            <p className="text-xl font-semibold mt-1">{totalWeeklyChecks}</p>
          </div>
        </div>
      </section>

      <section className="px-5 mt-5">
        <form onSubmit={handleAddHabit} className="flex gap-2">
          <input
            value={habitName}
            onChange={(event) => setHabitName(event.target.value)}
            className="flex-1 rounded-xl border border-toss-border px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-toss-blue/20"
            placeholder="예: 물 2L 마시기"
            maxLength={24}
            aria-label="습관 이름"
          />
          <button
            type="submit"
            className="rounded-xl bg-toss-blue text-white px-4 py-3 font-medium disabled:opacity-50"
            disabled={!habitName.trim() || isSaving}
          >
            추가
          </button>
        </form>
        <div className="mt-3 flex gap-2 flex-wrap">
          {PRESET_HABITS.map((preset) => (
            <button
              key={preset}
              type="button"
              className="rounded-full bg-white border border-toss-border px-3 py-1.5 text-xs text-slate-700"
              onClick={() => addPresetHabit(preset)}
            >
              + {preset}
            </button>
          ))}
        </div>
      </section>

      <section className="px-5 mt-5 pb-8 space-y-3">
        {state.habits.length === 0 ? (
          <div className="rounded-xl border border-dashed border-toss-border bg-white p-5 text-center">
            <p className="text-sm text-toss-sub">첫 습관을 추가해 오늘 체크를 시작해 보세요.</p>
          </div>
        ) : (
          state.habits.map((habit) => {
            const checkedToday = habit.checkedDates.includes(dateKey);
            const streak = streakCount(habit.checkedDates);
            const weeklyCount = weeklyCompletedCount(habit.checkedDates);
            return (
              <article key={habit.id} className="rounded-xl border border-toss-border bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{habit.name}</h2>
                    <p className="text-sm text-toss-sub mt-1">
                      연속 {streak}일 · 최근 7일 {weeklyCount}회
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-xs text-slate-400 hover:text-slate-600"
                    onClick={() => removeHabit(habit.id)}
                    aria-label={`${habit.name} 삭제`}
                  >
                    삭제
                  </button>
                </div>
                <button
                  type="button"
                  className={`mt-3 w-full rounded-xl py-3 font-medium transition ${
                    checkedToday ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                  onClick={() => {
                    void toggleToday(habit.id);
                  }}
                >
                  {checkedToday ? '오늘 완료됨' : '오늘 체크하기'}
                </button>
              </article>
            );
          })
        )}
      </section>
      <BannerAd />
    </main>
  );
}
