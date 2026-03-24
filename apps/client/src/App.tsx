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

function formatDateLabel(dateKeyValue: string): string {
  const date = new Date(`${dateKeyValue}T00:00:00`);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function daysBetweenInclusive(startIso: string, end: Date = new Date()): number {
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return 1;
  const startDateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDateOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const diffMs = endDateOnly.getTime() - startDateOnly.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000) + 1;
  return Math.max(diffDays, 1);
}

function lifetimeSuccessRate(habit: Habit): number {
  const totalDays = daysBetweenInclusive(habit.createdAt);
  return Math.round((habit.checkedDates.length / totalDays) * 100);
}

function lastNDaysKeys(days: number): string[] {
  const keys: string[] = [];
  const cursor = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(cursor);
    date.setDate(cursor.getDate() - i);
    keys.push(todayKey(date));
  }
  return keys;
}

export default function App() {
  const [state, setState] = useState<HabitState>(() => safeLoadState());
  const [habitName, setHabitName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);

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

  const successHistory = useMemo(() => {
    return state.habits
      .flatMap((habit) =>
        habit.checkedDates.map((date) => ({
          date,
          habitName: habit.name,
          habitId: habit.id,
        }))
      )
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 20);
  }, [state.habits]);

  const selectedHabit = useMemo(() => {
    if (state.habits.length === 0) return null;
    if (!selectedHabitId) return state.habits[0];
    return state.habits.find((habit) => habit.id === selectedHabitId) ?? state.habits[0];
  }, [state.habits, selectedHabitId]);

  const calendarKeys = useMemo(() => lastNDaysKeys(30), []);

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

      {state.habits.length > 0 && (
        <section className="px-5 pb-8">
          <div className="rounded-xl border border-toss-border bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold">성공 캘린더</h3>
              <select
                value={selectedHabit?.id ?? ''}
                onChange={(event) => setSelectedHabitId(event.target.value)}
                className="rounded-lg border border-toss-border px-2 py-1 text-sm bg-white"
                aria-label="습관 선택"
              >
                {state.habits.map((habit) => (
                  <option key={habit.id} value={habit.id}>
                    {habit.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedHabit && (
              <>
                <p className="text-sm text-toss-sub mt-2">
                  누적 성공률 {lifetimeSuccessRate(selectedHabit)}% · 생성일 이후 {selectedHabit.checkedDates.length}회 성공
                </p>
                <div className="mt-3 grid grid-cols-6 gap-1.5">
                  {calendarKeys.map((key) => {
                    const done = selectedHabit.checkedDates.includes(key);
                    const isToday = key === dateKey;
                    return (
                      <div
                        key={key}
                        className={`h-10 rounded-md border text-[10px] flex items-center justify-center ${
                          done ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-slate-50 text-slate-500 border-slate-200'
                        } ${isToday ? 'ring-2 ring-toss-blue/30' : ''}`}
                        title={`${formatDateLabel(key)} ${done ? '성공' : '미완료'}`}
                      >
                        {formatDateLabel(key)}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </section>
      )}

      <section className="px-5 pb-10">
        <div className="rounded-xl border border-toss-border bg-white p-4">
          <h3 className="font-semibold">최근 성공 기록</h3>
          {successHistory.length === 0 ? (
            <p className="text-sm text-toss-sub mt-2">아직 성공 기록이 없어요. 오늘 첫 체크를 해보세요.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {successHistory.map((item) => (
                <li key={`${item.habitId}-${item.date}`} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{item.habitName}</span>
                  <span className="text-toss-sub">{item.date}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      <BannerAd />
    </main>
  );
}
