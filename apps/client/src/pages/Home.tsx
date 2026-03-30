import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import BannerAd from '../components/BannerAd';
import {
  CELEBRITIES,
  type CelebrityId,
  getProfile,
  PRESET_CELEBRITY_IDS,
} from '../data/celebrities';
import { adsService } from '../services/ads';
import { fireMilestoneBurst } from '../utils/confetti';
type ResultType = 'done' | 'not_done';
type WowState = {
  score: number;
  streak: number;
  weeklyRate: number;
  completed: boolean;
  level: 'BRONZE' | 'SILVER' | 'GOLD';
  celebrityName: string;
  missionText: string;
};
type PromotionState = {
  from: 'BRONZE' | 'SILVER' | 'GOLD';
  to: 'BRONZE' | 'SILVER' | 'GOLD';
};

type DayKey = string; // YYYY-MM-DD (KST)
type EventName =
  | 'checkin_confirm'
  | 'checkout_done_quicksave'
  | 'checkout_not_done_save'
  | 'checkout_duplicate_block'
  | 'open_settings'
  | 'close_settings'
  | 'intro_close'
  | 'copy_variant_exposed'
  | 'level_promoted'
  | 'reserve_tomorrow'
  | 'milestone_badge_unlock'
  | 'new_record';

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

function kstNextDayKey(d = new Date()): DayKey {
  const utc = d.getTime() + d.getTimezoneOffset() * 60_000;
  const kst = new Date(utc + 9 * 60 * 60_000);
  kst.setDate(kst.getDate() + 1);
  const yyyy = kst.getFullYear();
  const mm = String(kst.getMonth() + 1).padStart(2, '0');
  const dd = String(kst.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** 축하 모달 미션 문구: 한 줄이 아닌 문장 단위로 내려가도록 분할 */
function splitMissionForDisplay(text: string): string[] {
  const t = text.trim();
  if (!t) return [];
  const bySentence = t.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  if (bySentence.length > 1) return bySentence;
  const byMiddleDot = t.split(/\s*·\s*/).map((s) => s.trim()).filter(Boolean);
  if (byMiddleDot.length > 1) return byMiddleDot;
  return [t];
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

function trackEvent(name: EventName, payload?: Record<string, string | number | boolean>) {
  try {
    const key = 'todayone-event-log';
    const prevRaw = localStorage.getItem(key);
    const prev = prevRaw ? (JSON.parse(prevRaw) as Array<Record<string, unknown>>) : [];
    const next = [...prev.slice(-199), { ts: Date.now(), name, ...(payload ?? {}) }];
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // ignore analytics storage failures
  }
}

function getLevel(score: number, streak: number): 'BRONZE' | 'SILVER' | 'GOLD' {
  if (score >= 80 || streak >= 7) return 'GOLD';
  if (score >= 50 || streak >= 3) return 'SILVER';
  return 'BRONZE';
}

function getLevelStyle(level: 'BRONZE' | 'SILVER' | 'GOLD') {
  if (level === 'GOLD') {
    return {
      chip: 'bg-yellow-100 border-yellow-300 text-yellow-800',
      title: 'text-yellow-700',
      next: '금빛 루틴! 지금 흐름을 유지해요.',
    };
  }
  if (level === 'SILVER') {
    return {
      chip: 'bg-slate-100 border-slate-300 text-slate-700',
      title: 'text-slate-700',
      next: '좋아요. 골드까지 한 걸음 남았어요.',
    };
  }
  return {
    chip: 'bg-amber-50 border-amber-200 text-amber-800',
    title: 'text-amber-700',
    next: '시작이 반이에요. 내일도 1개만 완료해요.',
  };
}

function getDailyRewardCopy(dayKey: string) {
  const seeds = [
    '깜짝 보상: 내일 시작 마찰 -20%',
    '깜짝 보상: 오늘의 집중력 +1',
    '깜짝 보상: 루틴 유지 확률 +12%',
    '깜짝 보상: 내일 실행 저항 -1',
  ];
  const n = Number(dayKey.split('-').join(''));
  return seeds[n % seeds.length];
}

function daySeed(dayKey: string) {
  return Number(dayKey.split('-').join(''));
}

function getWowHeadline(level: 'BRONZE' | 'SILVER' | 'GOLD', weeklyRate: number, celebName: string) {
  if (level === 'GOLD' && weeklyRate >= 85) return '오늘 1개 완료! 전설 페이스예요 👑';
  if (level === 'GOLD') return `오늘 1개 완료! ${celebName} 루틴에 더 닮아가요 ✨`;
  if (level === 'SILVER') return `오늘 1개 완료! ${celebName} 페이스에 가까워지는 중 🚀`;
  return `오늘 1개 완료! ${celebName} 루틴, 한 걸음 더 🌱`;
}

export default function Home() {
  const [selectedCelebrity, setSelectedCelebrity] = useState<CelebrityId>('yoo_jae_suk');
  const [customRoleModelName, setCustomRoleModelName] = useState('');
  const [celebrityPhotos, setCelebrityPhotos] = useState<Partial<Record<CelebrityId, string>>>({});
  const [morningTask, setMorningTask] = useState('');
  const [morningConfirmed, setMorningConfirmed] = useState(false);
  const [editingMorningTask, setEditingMorningTask] = useState(true);
  const [checkoutResult, setCheckoutResult] = useState<ResultType | null>(null);
  const [failureReason, setFailureReason] = useState('');
  const [history, setHistory] = useState<boolean[]>([]); // last 14 days completion
  const [reminders, setReminders] = useState(() => DEFAULT_REMINDERS);
  const [showWeekly, setShowWeekly] = useState(false);
  const [lastSavedDay, setLastSavedDay] = useState<DayKey>(() => kstDayKey());
  const [lastCheckoutSavedDay, setLastCheckoutSavedDay] = useState<DayKey | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [pickerMode, setPickerMode] = useState<'start_today' | 'reserve_tomorrow'>('start_today');
  const [pickerCelebrity, setPickerCelebrity] = useState<CelebrityId>('yoo_jae_suk');
  const [pickerOtherName, setPickerOtherName] = useState('');
  const [pickerRoutine, setPickerRoutine] = useState('');
  const [pickerCustomRoutine, setPickerCustomRoutine] = useState('');
  const [pickerSearch, setPickerSearch] = useState('');
  const [logoError, setLogoError] = useState(false);
  const [view, setView] = useState<'today' | 'weekly'>('today');
  const [wow, setWow] = useState<WowState | null>(null);
  const [promotion, setPromotion] = useState<PromotionState | null>(null);
  const [abSummary, setAbSummary] = useState<{ A: number; B: number }>({ A: 0, B: 0 });
  const [bestStreak, setBestStreak] = useState(0);
  const [newRecord, setNewRecord] = useState<number | null>(null);

  useEffect(() => {
    const storedCelebrity = localStorage.getItem('commute-celebrity') as CelebrityId | null;
    const storedCustomRole = localStorage.getItem('commute-custom-role-name');
    const storedTask = localStorage.getItem('commute-task');
    const storedHistory = localStorage.getItem('commute-history');
    const storedConfirmed = localStorage.getItem('commute-morning-confirmed');
    const storedReminders = localStorage.getItem('commute-reminders');
    const storedLastSavedDay = localStorage.getItem('commute-last-saved-day') as DayKey | null;
    const storedLastCheckoutSavedDay = localStorage.getItem('commute-last-checkout-saved-day') as DayKey | null;
    const storedBestStreak = localStorage.getItem('commute-best-streak');
    const storedCelebrityPhotos = localStorage.getItem('commute-celebrity-photos');
    if (storedCelebrity && storedCelebrity !== 'other' && !(storedCelebrity in CELEBRITIES)) {
      localStorage.removeItem('commute-celebrity');
    }
    const presetOk =
      storedCelebrity && storedCelebrity !== 'other' && storedCelebrity in CELEBRITIES;
    if (storedCelebrity === 'other' || presetOk) {
      setSelectedCelebrity(storedCelebrity as CelebrityId);
      setPickerCelebrity(storedCelebrity as CelebrityId);
    }
    if (storedCustomRole) setCustomRoleModelName(storedCustomRole);
    let appliedTomorrowReservation = false;
    try {
      const tr = localStorage.getItem('commute-tomorrow-reservation');
      if (tr) {
        const data = JSON.parse(tr) as {
          forDay: string;
          celebrityId: CelebrityId;
          customRoleModelName: string;
          morningTask: string;
        };
        if (data.forDay === kstDayKey()) {
          setSelectedCelebrity(data.celebrityId);
          setPickerCelebrity(data.celebrityId);
          setCustomRoleModelName(data.customRoleModelName ?? '');
          setMorningTask(data.morningTask);
          setMorningConfirmed(false);
          setEditingMorningTask(true);
          localStorage.removeItem('commute-tomorrow-reservation');
          appliedTomorrowReservation = true;
        }
      }
    } catch {
      // ignore
    }
    if (!appliedTomorrowReservation && storedTask) setMorningTask(storedTask);
    if (storedHistory) {
      try {
        const parsed = JSON.parse(storedHistory) as boolean[];
        if (Array.isArray(parsed)) setHistory(parsed);
      } catch {
        // Ignore invalid stored history.
      }
    }
    if (!appliedTomorrowReservation && storedConfirmed === 'true') setMorningConfirmed(true);
    if (storedReminders) {
      try {
        const parsed = JSON.parse(storedReminders) as { morning: string; evening: string };
        if (parsed?.morning && parsed?.evening) setReminders(parsed);
      } catch {
        // ignore
      }
    }
    if (storedLastSavedDay) setLastSavedDay(storedLastSavedDay);
    if (storedLastCheckoutSavedDay) setLastCheckoutSavedDay(storedLastCheckoutSavedDay);
    if (storedBestStreak && Number.isFinite(Number(storedBestStreak))) setBestStreak(Number(storedBestStreak));
    if (storedCelebrityPhotos) {
      try {
        const parsed = JSON.parse(storedCelebrityPhotos) as Partial<Record<CelebrityId, string>>;
        if (parsed && typeof parsed === 'object') setCelebrityPhotos(parsed);
      } catch {
        // ignore
      }
    }
    // 기본은 입력 가능 상태로 두되, 이미 체크인 완료면 요약 모드로 시작
    if (!appliedTomorrowReservation && storedConfirmed === 'true') setEditingMorningTask(false);
    if (localStorage.getItem('rolemodel-picker-seen') !== 'true') {
      setShowIntro(true);
    }
  }, []);

  useEffect(() => {
    // "오늘/주간" 탭 대신 명확한 화면 상태로 유지
    if (showWeekly) setView('weekly');
  }, [showWeekly]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('todayone-event-log');
      if (!raw) return;
      const parsed = JSON.parse(raw) as Array<{ name?: string; variant?: string }>;
      const recent = parsed.slice(-200);
      const A = recent.filter((e) => e.name === 'copy_variant_exposed' && e.variant === 'A').length;
      const B = recent.filter((e) => e.name === 'copy_variant_exposed' && e.variant === 'B').length;
      setAbSummary({ A, B });
    } catch {
      // ignore
    }
  }, [showSettings, wow]);

  useEffect(() => {
    localStorage.setItem('commute-celebrity', selectedCelebrity);
  }, [selectedCelebrity]);

  useEffect(() => {
    if (selectedCelebrity === 'other') {
      const t = customRoleModelName.trim();
      if (t) localStorage.setItem('commute-custom-role-name', t);
      else localStorage.removeItem('commute-custom-role-name');
    } else {
      localStorage.removeItem('commute-custom-role-name');
    }
  }, [selectedCelebrity, customRoleModelName]);

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

  useEffect(() => {
    if (lastCheckoutSavedDay) {
      localStorage.setItem('commute-last-checkout-saved-day', lastCheckoutSavedDay);
    }
  }, [lastCheckoutSavedDay]);

  useEffect(() => {
    localStorage.setItem('commute-best-streak', String(bestStreak));
  }, [bestStreak]);

  useEffect(() => {
    localStorage.setItem('commute-celebrity-photos', JSON.stringify(celebrityPhotos));
  }, [celebrityPhotos]);

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
        try {
          const tr = localStorage.getItem('commute-tomorrow-reservation');
          if (tr) {
            const data = JSON.parse(tr) as {
              forDay: string;
              celebrityId: CelebrityId;
              customRoleModelName: string;
              morningTask: string;
            };
            if (data.forDay === today) {
              setSelectedCelebrity(data.celebrityId);
              setPickerCelebrity(data.celebrityId);
              setCustomRoleModelName(data.customRoleModelName ?? '');
              setMorningTask(data.morningTask);
              localStorage.removeItem('commute-tomorrow-reservation');
            }
          }
        } catch {
          // ignore
        }
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
  const unlockedBadges = useMemo(() => {
    const list: string[] = [];
    if (streakDays >= 1) list.push('첫 저장');
    if (streakDays >= 3) list.push('3일 연속');
    if (streakDays >= 7) list.push('7일 연속');
    return list;
  }, [streakDays]);
  const hour = new Date().getHours();
  const isMorningSlot = hour < 15;
  const slotLabel = isMorningSlot ? '출근 전 체크인 시간' : '퇴근 후 체크아웃 시간';

  const todayKey = kstDayKey();
  const activeProfile = useMemo(
    () => getProfile(selectedCelebrity, customRoleModelName),
    [selectedCelebrity, customRoleModelName],
  );
  const todayMission = useMemo(() => {
    const r = activeProfile.routines;
    return r[daySeed(todayKey) % r.length];
  }, [activeProfile, todayKey]);
  const resemblanceHint = useMemo(() => {
    const n = activeProfile.name;
    if (streakDays <= 0) return `${n}의 하루를 닮아가는 첫 걸음이에요.`;
    if (streakDays < 3) return `조금씩 ${n}의 페이스에 가까워지고 있어요 · 연속 ${streakDays}일`;
    return `오늘의 한 걸음이 ${n} 루틴과 더 닮아가고 있어요 · 연속 ${streakDays}일`;
  }, [activeProfile.name, streakDays]);
  const activeRoutineText = useMemo(() => {
    const t = morningTask.trim();
    return t || todayMission;
  }, [morningTask, todayMission]);
  const pickerList = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    const all = PRESET_CELEBRITY_IDS;
    if (!q) return all;
    return all.filter((id) => {
      const c = CELEBRITIES[id];
      return c.name.toLowerCase().includes(q) || c.oneLine.toLowerCase().includes(q);
    });
  }, [pickerSearch]);
  const pickerProfile = useMemo(
    () => getProfile(pickerCelebrity, pickerOtherName),
    [pickerCelebrity, pickerOtherName],
  );
  const copyVariant = useMemo<'A' | 'B'>(() => {
    const dayNum = Number(todayKey.slice(-2));
    return dayNum % 2 === 0 ? 'A' : 'B';
  }, [todayKey]);

  useEffect(() => {
    trackEvent('copy_variant_exposed', { variant: copyVariant });
  }, [copyVariant]);

  useEffect(() => {
    const profile = getProfile(pickerCelebrity, pickerOtherName);
    setPickerRoutine(profile.routines[0] ?? '');
  }, [pickerCelebrity, pickerOtherName]);

  const primaryCTA = useMemo(() => {
    if (!morningConfirmed) return `${activeProfile.name} 루틴 1개 정하기`;
    return isMorningSlot ? '저녁에 완료 저장하면 점수가 올라요' : '오늘 루틴 결과 저장하기';
  }, [isMorningSlot, morningConfirmed, activeProfile.name]);

  const statusPill = useMemo(() => {
    if (!morningConfirmed) return { label: '지금: 루틴 정하기', tone: 'bg-amber-50 text-amber-700 border-amber-200' };
    if (morningConfirmed && isMorningSlot)
      return { label: `오늘: ${activeProfile.name} 루틴 중`, tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    return { label: '지금: 완료 저장', tone: 'bg-toss-blue/5 text-toss-blue border-toss-blue/20' };
  }, [isMorningSlot, morningConfirmed, activeProfile.name]);

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
    const today = kstDayKey();
    if (lastCheckoutSavedDay === today) {
      trackEvent('checkout_duplicate_block');
      setToast('오늘 결과는 이미 저장했어요. 내일 다시 저장할 수 있어요.');
      window.setTimeout(() => setToast(null), 2200);
      return;
    }
    const completed = checkoutResult === 'done';
    setHistory((prev: boolean[]) => [...prev.slice(-13), completed]);
    setLastCheckoutSavedDay(today);
    setCheckoutResult(null);
    setFailureReason('');
    setMorningConfirmed(false); // consume the day loop; user comes back next day.
  };

  const computeStreak = (arr: boolean[]) => {
    let count = 0;
    for (let i = arr.length - 1; i >= 0; i -= 1) {
      if (!arr[i]) break;
      count += 1;
    }
    return count;
  };

  const computeWeeklyRate = (arr: boolean[]) => {
    const last7 = arr.slice(-7);
    if (!last7.length) return 0;
    const done = last7.filter(Boolean).length;
    return Math.round((done / last7.length) * 100);
  };

  const onSubmitCheckoutWithAd = async (forcedResult?: ResultType) => {
    const selectedResult = forcedResult ?? checkoutResult;
    if (!selectedResult || !morningConfirmed) return;
    const today = kstDayKey();
    if (lastCheckoutSavedDay === today) {
      trackEvent('checkout_duplicate_block');
      setToast('오늘 결과는 이미 저장했어요. 내일 다시 저장할 수 있어요.');
      window.setTimeout(() => setToast(null), 2200);
      return;
    }
    const completed = selectedResult === 'done';
    const nextHistory = [...history.slice(-13), completed];
    const nextStreak = computeStreak(nextHistory);
    const nextWeekly = computeWeeklyRate(nextHistory);
    const nextScore = Math.min(100, Math.round(nextWeekly * 0.8 + nextStreak * 4));
    const nextLevel = getLevel(nextScore, nextStreak);
    const prevLevel = getLevel(score, streakDays);

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
    const missionSnap = morningTask.trim() || todayMission;
    const celebNameSnap = getProfile(selectedCelebrity, customRoleModelName).name;
    onSubmitCheckout();
    trackEvent(completed ? 'checkout_done_quicksave' : 'checkout_not_done_save', {
      streak: nextStreak,
      weeklyRate: nextWeekly,
      score: nextScore,
    });
    if (completed) {
      const burst = nextLevel === 'GOLD' ? 34 : nextLevel === 'SILVER' ? 26 : 18;
      fireMilestoneBurst(burst);
    }
    if (completed && prevLevel !== nextLevel) {
      setPromotion({ from: prevLevel, to: nextLevel });
      trackEvent('level_promoted', { from: prevLevel, to: nextLevel });
    }
    if (completed && nextStreak > bestStreak) {
      setBestStreak(nextStreak);
      setNewRecord(nextStreak);
      fireMilestoneBurst(Math.max(22, Math.min(40, nextStreak + 20)));
      trackEvent('new_record', { streak: nextStreak });
    }
    if (completed && (nextStreak === 1 || nextStreak === 3 || nextStreak === 7)) {
      trackEvent('milestone_badge_unlock', { streak: nextStreak });
    }
    setWow({
      score: nextScore,
      streak: nextStreak,
      weeklyRate: nextWeekly,
      completed,
      level: nextLevel,
      celebrityName: celebNameSnap,
      missionText: missionSnap,
    });
    setToast('저장 완료! 오늘 성공이 기록됐어요.');
    window.setTimeout(() => setToast(null), 2200);
  };

  const copyShare = async () => {
    const missionLine = activeRoutineText.trim();
    const text = `롤모델따라하기 · ${activeProfile.name} 루틴 · ${missionLine}\n점수 ${score}점 · 연속 ${streakDays}일 · 주간 ${weeklyRate}%\n${window.location.origin}`;
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
    localStorage.setItem('rolemodel-picker-seen', 'true');
    setShowIntro(false);
    setPickerMode('start_today');
    trackEvent('intro_close');
  };

  const openRoleModelPicker = (mode: 'start_today' | 'reserve_tomorrow' = 'start_today') => {
    setPickerMode(mode);
    setPickerCelebrity(selectedCelebrity);
    if (selectedCelebrity === 'other') {
      setPickerOtherName(customRoleModelName);
    } else {
      setPickerOtherName('');
    }
    const profile = getProfile(selectedCelebrity, customRoleModelName);
    const routines = profile.routines;
    const dayKeyForSuggestion = mode === 'reserve_tomorrow' ? kstNextDayKey() : kstDayKey();
    const suggested = routines[daySeed(dayKeyForSuggestion) % routines.length];
    const mt = morningTask.trim();
    if (mode === 'reserve_tomorrow') {
      setPickerRoutine(suggested);
      setPickerCustomRoutine('');
    } else if (mt && routines.includes(mt)) {
      setPickerRoutine(mt);
      setPickerCustomRoutine('');
    } else if (mt) {
      setPickerCustomRoutine(mt);
      setPickerRoutine(routines[0] ?? '');
    } else {
      setPickerCustomRoutine('');
      setPickerRoutine(routines[0] ?? '');
    }
    setPickerSearch('');
    setShowIntro(true);
  };

  const applyPickerStart = () => {
    if (pickerCelebrity === 'other') {
      const name = pickerOtherName.trim();
      if (!name) {
        setToast('기타 선택 시 롤모델 이름을 적어 주세요.');
        window.setTimeout(() => setToast(null), 2200);
        return;
      }
    }
    const profile = getProfile(pickerCelebrity, pickerOtherName.trim());
    const routine = pickerCustomRoutine.trim() || pickerRoutine || profile.routines[0];
    const nextDay = kstNextDayKey();

    if (pickerMode === 'reserve_tomorrow') {
      if (pickerCelebrity === 'other') {
        setCustomRoleModelName(pickerOtherName.trim());
      } else {
        setCustomRoleModelName('');
      }
      setSelectedCelebrity(pickerCelebrity);
      try {
        localStorage.setItem(
          'commute-tomorrow-reservation',
          JSON.stringify({
            forDay: nextDay,
            celebrityId: pickerCelebrity,
            customRoleModelName: pickerCelebrity === 'other' ? pickerOtherName.trim() : '',
            morningTask: clampText(routine, 80),
          }),
        );
      } catch {
        // ignore
      }
      setMorningTask('');
      closeIntro();
      setToast(`${profile.name} 루틴으로 내일(${nextDay}) 미션을 예약했어요.`);
      window.setTimeout(() => setToast(null), 2200);
      trackEvent('reserve_tomorrow', { nextCelebrity: pickerCelebrity });
      return;
    }

    if (pickerCelebrity === 'other') {
      setCustomRoleModelName(pickerOtherName.trim());
    } else {
      setCustomRoleModelName('');
    }
    setSelectedCelebrity(pickerCelebrity);
    setMorningTask(clampText(routine, 80));
    setMorningConfirmed(true);
    setEditingMorningTask(false);
    setCheckoutResult(null);
    setFailureReason('');
    closeIntro();
    setToast(`${profile.name} 루틴으로 시작했어요. 오늘 1미션만 하면 성공!`);
    window.setTimeout(() => setToast(null), 2200);
  };

  const reserveTomorrow = () => {
    setWow(null);
    openRoleModelPicker('reserve_tomorrow');
  };

  const onUploadCelebrityPhoto = (
    celebrity: CelebrityId,
    file: File | null,
    customNameForOther?: string,
  ) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setToast('이미지 파일만 업로드할 수 있어요.');
      window.setTimeout(() => setToast(null), 2200);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result || '');
      if (!url) return;
      setCelebrityPhotos((prev) => ({ ...prev, [celebrity]: url }));
      const label = getProfile(celebrity, customNameForOther ?? '').name;
      setToast(`${label} 사진을 저장했어요.`);
      window.setTimeout(() => setToast(null), 2000);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex h-[100svh] max-h-[100dvh] min-h-0 w-full max-w-lg mx-auto flex-col overflow-hidden bg-white">
      {/* 헤더: 스크롤 영역 밖, 짧은 화면에서도 상단 고정 */}
      <div className="sticky top-0 z-50 shrink-0 w-full bg-white/90 backdrop-blur border-b border-toss-border px-4 sm:px-6">
        <div className="py-2.5 sm:py-3">
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {logoError ? (
                <div className="w-7 h-7 rounded-lg border border-toss-border bg-toss-blue/10 flex items-center justify-center text-[12px]">
                  ✅
                </div>
              ) : (
                <img
                  src="/app-icon-600x600.png"
                  alt="롤모델따라하기 로고"
                  width={28}
                  height={28}
                  onError={() => setLogoError(true)}
                  className="w-7 h-7 rounded-lg border border-toss-border bg-white object-cover"
                  loading="eager"
                  decoding="async"
                />
              )}
              <span className="text-sm font-semibold text-toss-text truncate">롤모델따라하기</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowSettings((v) => {
                    const next = !v;
                    trackEvent(next ? 'open_settings' : 'close_settings');
                    return next;
                  });
                }}
                aria-label="설정 바꾸기"
                className="px-3 py-1.5 rounded-full border text-xs font-semibold bg-white text-toss-text border-toss-border"
              >
                설정 바꾸기
              </button>
              <button
                type="button"
                onClick={() => openRoleModelPicker()}
                aria-label="롤모델 선택 열기"
                className="px-3 py-1.5 rounded-full border text-xs font-semibold bg-white text-toss-text border-toss-border"
              >
                롤모델 선택
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain [scrollbar-gutter:stable] px-4 sm:px-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full pt-3 sm:pt-4 pb-2 sm:pb-3">
        {/* Minimal hero */}
        <div className="mb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-left min-w-0">
              <p className="text-xs text-toss-sub">{todayKey}</p>
              <p className="text-xl sm:text-2xl font-bold text-toss-text mt-1 leading-snug">
                {activeProfile.name} 루틴 · 오늘 1미션
              </p>
            </div>
            <span className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-semibold ${statusPill.tone}`}>
              {statusPill.label}
            </span>
          </div>
          <p className="text-sm text-toss-sub mt-2 leading-relaxed">
            {!morningConfirmed
              ? `${activeProfile.name} 루틴을 하나 골라 적고 시작하면 돼요.`
              : `오늘 미션: “${activeRoutineText.length > 36 ? `${activeRoutineText.slice(0, 36)}…` : activeRoutineText}” · 끝났으면 완료를 눌러 저장해요.`}
          </p>
          <p className="text-xs text-toss-blue/90 mt-2 font-medium leading-relaxed">{resemblanceHint}</p>
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
              <p className="text-sm font-semibold text-toss-text">설정 바꾸기</p>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="text-xs font-semibold text-toss-blue"
              >
                닫기
              </button>
            </div>
            <div className="mt-3 p-3 rounded-xl bg-toss-bg border border-toss-border">
              <p className="text-xs text-toss-sub">현재 롤모델</p>
              <p className="text-sm font-semibold text-toss-text mt-1">
                {activeProfile.name} · {activeProfile.oneLine}
              </p>
              <button
                type="button"
                onClick={() => openRoleModelPicker()}
                className="mt-2 py-2 px-3 rounded-lg border border-toss-border bg-white text-xs font-semibold text-toss-text"
              >
                롤모델/미션 다시 고르기
              </button>
            </div>

            <div className="mt-4">
              <p className="text-xs text-toss-sub mb-1">알림 시간 (선택)</p>
              <p className="text-[11px] text-toss-sub mb-2">시간은 점수와 무관해요. "다시 열어볼 시각"만 정해요.</p>
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
              <p className="text-xs text-toss-sub mt-2">한 줄 요약: 시간은 선택, 핵심은 "오늘 1개 저장".</p>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-white border border-toss-border">
              <p className="text-xs text-toss-sub">선택 인물 사진 (축하 모달 표시용)</p>
              <div className="mt-2 flex items-center gap-3">
                {celebrityPhotos[selectedCelebrity] ? (
                  <img
                    src={celebrityPhotos[selectedCelebrity]}
                    alt={`${activeProfile.name} 사진`}
                    className="w-14 h-14 rounded-xl object-cover border border-toss-border"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl border border-dashed border-toss-border text-[11px] text-toss-sub flex items-center justify-center">
                    사진 없음
                  </div>
                )}
                <label className="inline-flex items-center px-3 py-2 rounded-xl border border-toss-border bg-white text-sm font-semibold text-toss-text cursor-pointer">
                  사진 업로드
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      onUploadCelebrityPhoto(selectedCelebrity, e.target.files?.[0] ?? null, customRoleModelName)
                    }
                  />
                </label>
              </div>
              <p className="text-[11px] text-toss-sub mt-2">완료 저장 후 축하 화면에 이 사진이 함께 나와요.</p>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-toss-bg border border-toss-border">
              <p className="text-xs text-toss-sub">문구 실험 리포트 (최근 로그)</p>
              <p className="text-sm font-semibold text-toss-text mt-1">A안 노출 {abSummary.A}회 · B안 노출 {abSummary.B}회</p>
              <p className="text-xs text-toss-sub mt-1">어떤 문구가 더 유지율이 높은지 다음 버전에서 최적화합니다.</p>
            </div>
          </section>
        )}

        {showWeekly ? (
          <section className="mb-4 p-4 rounded-2xl bg-toss-bg border border-toss-border">
            <p className="text-sm font-semibold text-toss-text">이번 주 리포트</p>
            <p className="text-xs text-toss-sub mt-1">
              {activeProfile.name} 루틴을 얼마나 챙겼는지 볼 수 있어요. 완료한 날만 파랗게 쌓입니다.
            </p>
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
            <div className="mt-3 p-3 rounded-xl bg-white border border-toss-border">
              <p className="text-xs text-toss-sub">배지 진열장</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {['첫 저장', '3일 연속', '7일 연속'].map((badge) => {
                  const active = unlockedBadges.includes(badge);
                  return (
                    <div
                      key={badge}
                      className={`rounded-xl border px-2 py-2 text-center text-xs font-semibold ${
                        active ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : 'bg-white border-toss-border text-toss-sub'
                      }`}
                    >
                      {active ? '🏅 ' : '🔒 '}
                      {badge}
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-toss-sub">내 최고 연속 기록: {bestStreak}일</p>
            </div>
            {streakDays >= 7 && (
              <div className="mt-3 p-3 rounded-xl bg-yellow-50 border border-yellow-200">
                <p className="text-xs text-yellow-700">보상 카드</p>
                <p className="text-sm font-bold text-yellow-800 mt-1">7일 연속 달성! 유지 보상 +10</p>
                <p className="text-xs text-yellow-700 mt-1">내일도 성공하면 연속 기록이 이어집니다.</p>
              </div>
            )}
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
              {morningConfirmed && (
                <div className="mb-3 p-3 rounded-xl bg-toss-blue/5 border border-toss-blue/20">
                  <p className="text-xs text-toss-sub">팝업에서 고른 오늘 루틴</p>
                  <p className="text-sm font-semibold text-toss-text mt-1">{activeProfile.name}</p>
                  <p className="text-sm text-toss-text mt-1 leading-snug">“{activeRoutineText}”</p>
                </div>
              )}
              <p className="text-sm font-semibold text-toss-text mb-1">
                {!morningConfirmed
                  ? `1) ${activeProfile.name} 루틴 1개 정하기`
                  : `2) ${activeProfile.name} 루틴, 끝났나요?`}
              </p>
              <p className="text-xs text-toss-sub mb-3">
                {!morningConfirmed
                  ? `${activeProfile.name} 루틴 미션을 적거나, 아래 추천을 불러와 시작해요.`
                  : `“${activeRoutineText}” 를 해냈다면 완료를 눌러 저장해요.`}
              </p>
              {!morningConfirmed && (
                <div className="mb-3 p-3 rounded-xl bg-toss-blue/5 border border-toss-blue/20">
                  <p className="text-xs text-toss-sub">선택 중인 롤모델</p>
                  <p className="text-sm font-semibold text-toss-text mt-1">
                    {activeProfile.name} · {activeProfile.oneLine}
                  </p>
                  <p className="text-sm text-toss-text mt-1">추천 1미션: {todayMission}</p>
                </div>
              )}

              {!morningConfirmed ? (
                <>
                  <textarea
                    value={morningTask}
                    onChange={(e) => setMorningTask(clampText(e.target.value, 80))}
                    className="w-full border border-toss-border rounded-xl p-3 text-sm min-h-[88px] resize-none focus:outline-none focus:ring-2 focus:ring-toss-blue/30"
                    placeholder={`${activeProfile.name} 루틴 예: ${todayMission}`}
                    aria-label="오늘의 1개 입력"
                  />
                  <div className="mt-2 flex justify-end">
                    <span className="text-xs text-toss-sub">{morningTask.length}/80</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMorningConfirmed(true);
                      setEditingMorningTask(false);
                      trackEvent('checkin_confirm', { celebrity: selectedCelebrity });
                      setToast(`${activeProfile.name} 루틴 시작! 저녁에 완료 저장하면 점수가 올라요.`);
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
                    <p className="text-xs text-toss-sub">오늘의 루틴(미션)</p>
                    <p className="text-sm font-semibold text-toss-text mt-1">{morningTaskSummary}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingMorningTask(true)}
                        className="py-2.5 rounded-xl border border-toss-border bg-white text-sm font-semibold text-toss-text"
                      >
                        할 일 바꾸기
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMorningConfirmed(false);
                          setEditingMorningTask(true);
                          setCheckoutResult(null);
                          setFailureReason('');
                        }}
                        className="py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-sm font-semibold text-rose-700"
                      >
                        다시 적기
                      </button>
                    </div>
                  </div>

                  {editingMorningTask && (
                    <>
                      <textarea
                        value={morningTask}
                        onChange={(e) => setMorningTask(clampText(e.target.value, 80))}
                        className="w-full border border-toss-border rounded-xl p-3 text-sm min-h-[88px] resize-none focus:outline-none focus:ring-2 focus:ring-toss-blue/30"
                        placeholder={`${activeProfile.name} 루틴 예: ${todayMission}`}
                        aria-label="오늘의 1개 다시 입력"
                      />
                      <div className="mt-2 flex justify-end">
                        <span className="text-xs text-toss-sub">{morningTask.length}/80</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingMorningTask(false);
                          setToast('바꿨어요. 아래에서 완료 여부를 선택해 주세요.');
                          window.setTimeout(() => setToast(null), 2000);
                        }}
                        disabled={!morningTask.trim()}
                        className="mt-3 w-full py-3 rounded-xl bg-toss-blue text-white font-semibold disabled:opacity-50"
                      >
                        바꾸기 완료
                      </button>
                    </>
                  )}

                  <div className="mt-3 p-3 rounded-xl border border-toss-blue/20 bg-toss-blue/5">
                    <p className="text-sm font-semibold text-toss-text mb-2">완료 체크 (가장 중요)</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCheckoutResult('done');
                          setFailureReason('');
                          void onSubmitCheckoutWithAd('done');
                        }}
                        aria-pressed={checkoutResult === 'done'}
                        className={`py-3 rounded-xl border text-base font-bold ${
                          checkoutResult === 'done'
                            ? 'bg-emerald-500 text-white border-emerald-500'
                            : 'border-toss-border text-toss-text bg-white'
                        }`}
                      >
                        ✅ 다 했어요
                      </button>
                      <button
                        type="button"
                        onClick={() => setCheckoutResult('not_done')}
                        aria-pressed={checkoutResult === 'not_done'}
                        className={`py-3 rounded-xl border text-base font-bold ${
                          checkoutResult === 'not_done'
                            ? 'bg-rose-500 text-white border-rose-500'
                            : 'border-toss-border text-toss-text bg-white'
                        }`}
                      >
                        😓 아직 못했어요
                      </button>
                    </div>
                    <p className="mt-2 text-[11px] text-toss-sub">완료는 원탭 저장됩니다. 미완료는 이유 1개 선택 후 저장됩니다.</p>
                  </div>

                  {checkoutResult === 'not_done' && (
                    <div className="mt-3">
                      <p className="text-xs text-toss-sub mb-2">왜 못했는지 1개 선택 (누르면 바로 저장)</p>
                      <div className="flex flex-wrap gap-2">
                        {FAILURE_REASONS.map((reason) => (
                          <button
                            key={reason}
                            type="button"
                            onClick={() => {
                              setFailureReason(reason);
                              window.setTimeout(() => {
                                void onSubmitCheckoutWithAd('not_done');
                              }, 0);
                            }}
                            className={`px-3 py-1.5 rounded-full border text-xs ${
                              failureReason === reason ? 'bg-toss-blue text-white border-toss-blue' : 'text-toss-sub border-toss-border'
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
                    onClick={() => {
                      void onSubmitCheckoutWithAd();
                    }}
                    disabled={!checkoutResult || (checkoutResult === 'not_done' && !failureReason)}
                    className="mt-4 w-full py-4 rounded-xl bg-toss-blue text-white text-base font-extrabold shadow-[0_10px_24px_rgba(49,130,246,0.35)] disabled:opacity-50"
                  >
                    오늘 결과 저장하기
                  </button>
                  <p className="mt-2 text-xs text-toss-sub">하루 1번만 저장돼요. 광고가 나와도 저장은 됩니다.</p>
                </>
              )}
            </section>

            <section className="mb-5 p-4 rounded-2xl bg-toss-bg border border-toss-border">
              <p className="text-sm font-semibold text-toss-text mb-1">오늘 결과</p>
              <p className="text-xs text-toss-sub mb-3">
                {activeProfile.name} 루틴 · “{activeRoutineText.length > 40 ? `${activeRoutineText.slice(0, 40)}…` : activeRoutineText}”
              </p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white rounded-xl p-2.5 border border-toss-border">
                  <p className="text-xs text-toss-sub">오늘 점수</p>
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
              <div className="mt-3 p-3 rounded-xl bg-white border border-toss-border">
                <p className="text-xs text-toss-sub">왜 이 앱을 쓰나요?</p>
                <p className="text-sm font-semibold text-toss-text mt-1">
                  미션을 채울수록 닮고 싶은 사람의 하루를 조금씩 닮아가는 느낌을 만들어요. 오늘은 1미션만.
                </p>
              </div>
              <p className="mt-3 text-xs text-toss-sub">
                {failureReason
                  ? `${activeProfile.name} 루틴은 내일 다시 가볍게 이어가요. ${nextSuggestion}`
                  : `${activeProfile.name} 루틴, 오늘도 한 걸음이에요.`}
              </p>
            </section>

          </>
        )}
      </motion.div>
      </div>

      <div className="shrink-0 w-full px-4 sm:px-6 pt-1 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-toss-border/40 bg-white">
        <BannerAd />
      </div>

      {toast && (
        <div className="fixed left-0 right-0 z-50 px-4 sm:px-6 bottom-[calc(96px+12px+env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-md">
            <div className="rounded-xl bg-toss-text text-white text-sm px-4 py-3 shadow-lg">
              {toast}
            </div>
          </div>
        </div>
      )}

      {showIntro && (
        <div className="fixed inset-0 z-[60] overflow-y-auto overscroll-contain bg-black/45 [padding-top:max(1rem,env(safe-area-inset-top))] [padding-bottom:max(1rem,env(safe-area-inset-bottom))] px-4">
          <div className="flex min-h-[100dvh] min-h-[100svh] w-full items-center justify-center py-4">
          <div className="w-full max-w-md max-h-[min(88dvh,88svh)] overflow-y-auto rounded-2xl bg-white border border-toss-border p-4 sm:p-5 shadow-xl">
            <p className="text-lg font-bold text-toss-text text-center">
              {pickerMode === 'reserve_tomorrow' ? '내일 미션 예약하기' : '롤모델부터 고르고 시작해요'}
            </p>
            <p className="text-sm text-toss-sub mt-1 text-center leading-relaxed">
              {pickerMode === 'reserve_tomorrow'
                ? '지금 쓰던 롤모델이 기본으로 선택돼 있어요. 루틴을 눌러 고르거나, 아래에 직접 적을 수 있어요.'
                : '초등학생도 쉽게: 사람 고르기 → 1미션 선택 → 시작'}
            </p>

            <div className="mt-4">
              <p className="text-xs text-toss-sub mb-2">사람 찾기</p>
              <input
                type="text"
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                placeholder="이름 검색 (예: 테일러 스위프트, 손흥민)"
                className="w-full border border-toss-border rounded-xl px-3 py-2.5 text-sm"
              />
            </div>

            <div className="mt-4">
              <p className="text-xs text-toss-sub mb-2">나의 롤모델 선택하기</p>
              <div className="max-h-[min(11rem,38dvh)] overflow-auto pr-1 [contain:layout] [content-visibility:auto]">
                <div className="grid grid-cols-3 gap-2">
                  {pickerList.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setPickerCelebrity(id);
                        setPickerOtherName('');
                      }}
                      className={`p-2 rounded-xl border text-left min-h-[4.5rem] flex flex-col justify-center ${
                        pickerCelebrity === id ? 'bg-toss-blue text-white border-toss-blue' : 'bg-white border-toss-border text-toss-text'
                      }`}
                    >
                      <p className="text-sm font-semibold leading-tight line-clamp-2">{CELEBRITIES[id].name}</p>
                      <p
                        className={`text-[10px] mt-1 leading-snug line-clamp-2 ${
                          pickerCelebrity === id ? 'text-blue-50' : 'text-toss-sub'
                        }`}
                      >
                        {CELEBRITIES[id].oneLine}
                      </p>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPickerCelebrity('other')}
                    className={`p-2 rounded-xl border text-left min-h-[4.5rem] flex flex-col justify-center ${
                      pickerCelebrity === 'other'
                        ? 'bg-toss-blue text-white border-toss-blue'
                        : 'bg-white border-toss-border text-toss-text'
                    }`}
                  >
                    <p className="text-sm font-semibold leading-tight">기타</p>
                    <p className={`text-[10px] mt-1 leading-snug ${pickerCelebrity === 'other' ? 'text-blue-50' : 'text-toss-sub'}`}>
                      직접 이름 입력
                    </p>
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs text-toss-sub mb-2">{pickerProfile.name}의 루틴 1개 선택하기</p>
              {pickerCelebrity === 'other' && (
                <input
                  type="text"
                  value={pickerOtherName}
                  onChange={(e) => setPickerOtherName(e.target.value.slice(0, 40))}
                  placeholder="롤모델 이름을 적어 주세요 (필수)"
                  className="w-full border border-toss-border rounded-xl px-3 py-2.5 text-sm mb-2"
                />
              )}
              <p className="text-[10px] text-toss-sub leading-relaxed mb-2">{pickerProfile.mediaNote}</p>
              <div className="space-y-2">
                {pickerProfile.routines.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setPickerRoutine(r);
                      setPickerCustomRoutine('');
                    }}
                    className={`w-full p-2.5 rounded-xl border text-sm text-left ${
                      pickerRoutine === r && !pickerCustomRoutine
                        ? 'bg-toss-blue/10 border-toss-blue text-toss-text'
                        : 'bg-white border-toss-border text-toss-text'
                    }`}
                  >
                    {r}
                  </button>
                ))}
                <input
                  type="text"
                  value={pickerCustomRoutine}
                  onChange={(e) => setPickerCustomRoutine(clampText(e.target.value, 80))}
                  placeholder="기타: 미션을 내 말로 직접 쓰기"
                  className="w-full border border-toss-border rounded-xl px-3 py-2.5 text-sm"
                />
              </div>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-toss-bg border border-toss-border">
              <p className="text-xs text-toss-sub font-medium">롤모델 사진 업로드하기 (선택사항)</p>
              <p className="text-[11px] text-toss-sub mt-1.5 leading-relaxed">
                루틴 달성 시, 축하 메시지에 롤모델 사진이 함께 나옵니다.
              </p>
              <div className="mt-3 flex items-center gap-3">
                {celebrityPhotos[pickerCelebrity] ? (
                  <img
                    src={celebrityPhotos[pickerCelebrity]}
                    alt={`${pickerProfile.name} 미리보기`}
                    className="w-12 h-12 rounded-lg object-cover border border-toss-border"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg border border-dashed border-toss-border text-[10px] text-toss-sub flex items-center justify-center">
                    없음
                  </div>
                )}
                <label className="inline-flex items-center px-3 py-2 rounded-xl border border-toss-border bg-white text-xs font-semibold text-toss-text cursor-pointer">
                  사진 추가
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      onUploadCelebrityPhoto(pickerCelebrity, e.target.files?.[0] ?? null, pickerOtherName)
                    }
                  />
                </label>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={closeIntro}
                className="py-2.5 rounded-xl border border-toss-border bg-white text-sm font-semibold text-toss-text"
              >
                나중에
              </button>
              <button
                type="button"
                onClick={applyPickerStart}
                className="py-2.5 rounded-xl bg-toss-blue text-white text-sm font-semibold"
              >
                {pickerMode === 'reserve_tomorrow' ? '내일 미션으로 저장' : '이대로 시작'}
              </button>
            </div>
          </div>
          </div>
        </div>
      )}

      {wow && (
        <div className="fixed inset-0 z-[70] overflow-y-auto overscroll-contain bg-black/55 [padding-top:max(1rem,env(safe-area-inset-top))] [padding-bottom:max(1rem,env(safe-area-inset-bottom))] px-4">
          <div className="flex min-h-[100dvh] min-h-[100svh] w-full items-center justify-center py-4">
          <div className="w-full max-w-md max-h-[min(92dvh,92svh)] overflow-y-auto rounded-2xl bg-gradient-to-b from-white to-blue-50 border border-toss-border p-4 sm:p-5 shadow-2xl text-center">
            {(() => {
              const style = getLevelStyle(wow.level);
              return (
                <>
                  <p className="text-xs text-toss-sub text-center">오늘 결과</p>
                  <p
                    className={`text-2xl font-extrabold mt-1 text-balance break-keep leading-snug ${style.title} max-w-[95%] mx-auto`}
                  >
                    {wow.completed
                      ? getWowHeadline(wow.level, wow.weeklyRate, wow.celebrityName)
                      : '오늘은 쉬어도 괜찮아요'}
                  </p>
                  {wow.completed && (
                    <div className="mt-2">
                      <p className="text-xs text-toss-sub text-center mb-1">오늘 미션</p>
                      <div className="text-sm font-medium text-toss-text text-center text-pretty break-keep leading-relaxed max-w-[95%] mx-auto space-y-1.5">
                        {splitMissionForDisplay(wow.missionText).map((line, i) => (
                          <p key={i} className="block">
                            “{line}”
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                  {wow.completed && (
                    <p className="text-sm font-semibold text-toss-text mt-3 leading-relaxed text-center text-pretty break-keep max-w-[95%] mx-auto">
                      조금씩 {wow.celebrityName}의 페이스에 가까워지고 있어요.
                    </p>
                  )}
                  <p className="text-sm text-toss-sub mt-2 leading-relaxed text-center text-pretty break-keep max-w-[95%] mx-auto">
                    {wow.completed
                      ? `${style.next} 오늘도 충분히 잘했어요. 천천히, 하지만 꾸준히 같이 가요.`
                      : '오늘은 쉬어도 괜찮아요. 내일 다시 가볍게 시작하면 됩니다.'}
                  </p>
                  {wow.completed && celebrityPhotos[selectedCelebrity] && (
                    <div className="mt-3 p-2.5 rounded-xl bg-white border border-toss-border text-center">
                      <p className="text-xs text-toss-sub mb-2">오늘 내가 따라한 롤모델</p>
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <img
                          src={celebrityPhotos[selectedCelebrity]}
                          alt={`${wow.celebrityName} 축하 이미지`}
                          className="w-16 h-16 rounded-xl object-cover border border-toss-border shrink-0"
                        />
                        <p className="text-sm font-semibold text-toss-text text-center text-pretty break-keep">
                          {wow.celebrityName} 루틴 성공! 👏
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 grid grid-cols-3 gap-2 text-center mx-auto max-w-full">
                    <div className={`rounded-xl border p-2.5 ${style.chip}`}>
                      <p className="text-[11px]">레벨</p>
                      <p className="text-lg font-bold">{wow.level}</p>
                    </div>
                    <div className="rounded-xl bg-toss-bg border border-toss-border p-2.5">
                      <p className="text-[11px] text-toss-sub">점수</p>
                      <p className="text-lg font-bold text-toss-text">{wow.score}</p>
                    </div>
                    <div className="rounded-xl bg-toss-bg border border-toss-border p-2.5">
                      <p className="text-[11px] text-toss-sub">연속일</p>
                      <p className="text-lg font-bold text-toss-text">{wow.streak}일</p>
                    </div>
                    <div className="rounded-xl bg-toss-bg border border-toss-border p-2.5 col-span-3 sm:col-span-1">
                      <p className="text-[11px] text-toss-sub">주간</p>
                      <p className="text-lg font-bold text-toss-text">{wow.weeklyRate}%</p>
                    </div>
                  </div>
                  {wow.completed && (
                    <div className="mt-3 p-3 rounded-xl bg-white border border-yellow-200">
                      <p className="text-xs text-yellow-700">오늘의 깜짝 리워드</p>
                      <p className="text-sm font-bold text-yellow-800 mt-1">{getDailyRewardCopy(todayKey)}</p>
                    </div>
                  )}
                </>
              );
            })()}

            <div className="mt-4 p-3 rounded-xl bg-toss-blue/5 border border-toss-blue/20 text-center">
              <p className="text-xs text-toss-sub">내일 한 줄</p>
              <p className="text-sm font-semibold text-toss-text mt-1 text-pretty break-keep max-w-[95%] mx-auto">
                {wow.completed
                  ? `내일도 ${wow.celebrityName} 루틴 1개만 따라가요.`
                  : '내일은 3분짜리 쉬운 1개부터 시작해요.'}
              </p>
            </div>
            {wow.completed && (
              <p className="mt-2 text-xs text-toss-sub text-center text-pretty break-keep max-w-[95%] mx-auto">
                {streakDays >= 7 ? '지금 최고 구간이에요. 7일 루프를 유지해요.' : `다음 배지까지 ${streakDays < 1 ? 1 : streakDays < 3 ? 3 - streakDays : 7 - streakDays}일`}
              </p>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={reserveTomorrow}
                className="py-3 rounded-xl border border-toss-blue text-toss-blue font-semibold bg-white"
              >
                내일 1개 예약
              </button>
              <button
                type="button"
                onClick={() => {
                  void copyShare();
                }}
                className="py-3 rounded-xl bg-toss-blue text-white font-semibold"
              >
                성과 문구 복사
              </button>
            </div>
            <button
              type="button"
              onClick={() => setWow(null)}
              className="mt-2 w-full py-2.5 rounded-xl border border-toss-border bg-white text-toss-text font-semibold"
            >
              닫기
            </button>
          </div>
          </div>
        </div>
      )}

      {promotion && (
        <div className="fixed inset-0 z-[80] overflow-y-auto overscroll-contain bg-black/55 [padding-top:max(1rem,env(safe-area-inset-top))] [padding-bottom:max(1rem,env(safe-area-inset-bottom))] px-4">
          <div className="flex min-h-[100dvh] min-h-[100svh] w-full items-center justify-center py-4">
          <div className="w-full max-w-sm max-h-[min(88dvh,88svh)] overflow-y-auto rounded-2xl bg-white border border-toss-border p-4 sm:p-5 text-center">
            <p className="text-xs text-toss-sub">레벨 업</p>
            <p className="text-2xl font-extrabold text-toss-text mt-1">승급 성공! 🚀</p>
            <p className="text-sm text-toss-sub mt-2">
              {promotion.from} → <span className="font-bold text-toss-blue">{promotion.to}</span>
            </p>
            <p className="text-xs text-toss-sub mt-2">좋아요. 이 흐름이면 리텐션이 강해집니다.</p>
            <button
              type="button"
              onClick={() => setPromotion(null)}
              className="mt-4 w-full py-3 rounded-xl bg-toss-blue text-white font-semibold"
            >
              계속하기
            </button>
          </div>
          </div>
        </div>
      )}

      {newRecord && (
        <div className="fixed inset-0 z-[90] overflow-y-auto overscroll-contain bg-black/60 [padding-top:max(1rem,env(safe-area-inset-top))] [padding-bottom:max(1rem,env(safe-area-inset-bottom))] px-4">
          <div className="flex min-h-[100dvh] min-h-[100svh] w-full items-center justify-center py-4">
          <div className="w-full max-w-sm max-h-[min(88dvh,88svh)] overflow-y-auto rounded-2xl bg-white border border-toss-border p-4 sm:p-5 text-center">
            <p className="text-xs text-toss-sub">신기록 달성</p>
            <p className="text-2xl font-extrabold text-toss-text mt-1">최고 연속 {newRecord}일 🎯</p>
            <p className="text-sm text-toss-sub mt-2">지금 이 순간이 핵심 WOW 포인트예요.</p>
            <button
              type="button"
              onClick={() => setNewRecord(null)}
              className="mt-4 w-full py-3 rounded-xl bg-toss-blue text-white font-semibold"
            >
              좋아요, 계속할게요
            </button>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
