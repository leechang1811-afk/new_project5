import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import BannerAd from '../components/BannerAd';
import {
  CELEBRITIES,
  type CelebrityId,
  getProfile,
  PRESET_CELEBRITY_IDS,
  type PresetCelebrityId,
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
      next: '골드 구간입니다. 같은 패턴으로 이어가면 됩니다.',
    };
  }
  if (level === 'SILVER') {
    return {
      chip: 'bg-slate-100 border-slate-300 text-slate-700',
      title: 'text-slate-700',
      next: '다음 단계는 골드입니다.',
    };
  }
  return {
    chip: 'bg-amber-50 border-amber-200 text-amber-800',
    title: 'text-amber-700',
    next: '내일도 미션 1개만 저장하면 점수에 반영됩니다.',
  };
}

function getDailyRewardCopy(dayKey: string) {
  const seeds = [
    '내일도 같은 시간에 알림만 켜 두면 기억하기 쉬워요.',
    '미션 문장은 설정에서 언제든 바꿀 수 있어요.',
    '주간 실행률이 점수의 큰 비중을 차지합니다.',
    '연속일은 하루에 한 번 저장으로만 올라갑니다.',
  ];
  const n = Number(dayKey.split('-').join(''));
  return seeds[n % seeds.length];
}

function daySeed(dayKey: string) {
  return Number(dayKey.split('-').join(''));
}

function getWowHeadline(level: 'BRONZE' | 'SILVER' | 'GOLD', weeklyRate: number, celebName: string) {
  if (level === 'GOLD' && weeklyRate >= 85) {
    return `오늘 미션 완료 · ${celebName} 루틴 · 주간 ${weeklyRate}%`;
  }
  if (level === 'GOLD') return `오늘 미션 완료 · ${celebName} 루틴`;
  if (level === 'SILVER') return `오늘 미션 완료 · ${celebName} 루틴`;
  return `오늘 미션 완료 · ${celebName} 루틴`;
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
  /** 내일 예약: 오늘 완료한 미션 문장 스냅샷(이전과 똑같이 진행) */
  const missionForReserveRef = useRef('');
  /** 미션 수정 화면: 취소 시 복원용 */
  const morningTaskEditSnapshotRef = useRef('');
  /** 「다시 적기」로 1단계 복귀 시, 2단계로 되돌릴 미션 스냅샷 */
  const morningTaskBeforeRewriteRef = useRef('');
  const [showRewriteBack, setShowRewriteBack] = useState(false);
  const [reserveKeepSameTomorrow, setReserveKeepSameTomorrow] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [view, setView] = useState<'today' | 'weekly'>('today');
  const [wow, setWow] = useState<WowState | null>(null);
  const [promotion, setPromotion] = useState<PromotionState | null>(null);
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
    if (streakDays <= 0) return `${n} 루틴 · 연속 기록 시작 전`;
    return `${n} 루틴 · 연속 ${streakDays}일`;
  }, [activeProfile.name, streakDays]);
  const activeRoutineText = useMemo(() => {
    const t = morningTask.trim();
    return t || todayMission;
  }, [morningTask, todayMission]);
  const pickerList = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    const all = PRESET_CELEBRITY_IDS;
    let base: PresetCelebrityId[] = !q
      ? [...all]
      : all.filter((id) => {
          const c = CELEBRITIES[id];
          return c.name.toLowerCase().includes(q) || c.oneLine.toLowerCase().includes(q);
        });
    const selectedPreset: PresetCelebrityId | null =
      pickerCelebrity !== 'other' ? (pickerCelebrity as PresetCelebrityId) : null;
    if (selectedPreset && base.includes(selectedPreset)) {
      base = [selectedPreset, ...base.filter((id) => id !== selectedPreset)];
    }
    return base;
  }, [pickerSearch, pickerCelebrity]);
  const pickerProfile = useMemo(
    () => getProfile(pickerCelebrity, pickerOtherName),
    [pickerCelebrity, pickerOtherName],
  );
  useEffect(() => {
    const profile = getProfile(pickerCelebrity, pickerOtherName);
    setPickerRoutine(profile.routines[0] ?? '');
  }, [pickerCelebrity, pickerOtherName]);

  const primaryCTA = useMemo(() => {
    if (!morningConfirmed) return `${activeProfile.name} 루틴 1개 정하기`;
    return isMorningSlot ? '저녁에 완료 저장' : '오늘 루틴 결과 저장하기';
  }, [isMorningSlot, morningConfirmed, activeProfile.name]);

  const statusPill = useMemo(() => {
    if (!morningConfirmed) return { label: '지금: 루틴 정하기', tone: 'bg-amber-50 text-amber-700 border-amber-200' };
    if (morningConfirmed && isMorningSlot)
      return { label: `오늘: ${activeProfile.name} 루틴 중`, tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    return { label: '지금: 완료 저장', tone: 'bg-toss-blue/5 text-toss-blue border-toss-blue/20' };
  }, [isMorningSlot, morningConfirmed, activeProfile.name]);

  const morningTaskSummary = useMemo(() => {
    const t = morningTask.trim();
    if (!t) return '미입력';
    return t.length > 48 ? `${t.slice(0, 48)}…` : t;
  }, [morningTask]);

  const nextSuggestion = useMemo(() => {
    if (failureReason === '시간 부족') return '내일은 10분 안에 끝나는 한 줄로 줄여 보세요.';
    if (failureReason === '피곤함') return '내일은 3분만 시작하는 것부터 적어 보세요.';
    if (failureReason === '우선순위 밀림') return '내일은 아침에 미션부터 고정해 두세요.';
    if (failureReason === '생각보다 어려움') return '내일은 더 쉬운 문장으로 바꿔 보세요.';
    return '';
  }, [failureReason]);

  const suggestedNextTask = useMemo(() => {
    if (failureReason === '시간 부족') return '10분만: 첫 단계만 끝내기';
    if (failureReason === '피곤함') return '3분만: 시작 버튼만 누르기';
    if (failureReason === '우선순위 밀림') return '가장 먼저 1개: 출근 직후 5분';
    if (failureReason === '생각보다 어려움') return '첫 단추 1개: 자료 1개만 열기';
    return '';
  }, [failureReason]);

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
        setToast('광고 후 결과 화면이 열립니다.');
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
    setToast('저장됐어요.');
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
    setReserveKeepSameTomorrow(false);
    trackEvent('intro_close');
  };

  const openRoleModelPicker = (mode: 'start_today' | 'reserve_tomorrow' = 'start_today') => {
    setPickerMode(mode);
    if (mode === 'start_today') {
      missionForReserveRef.current = '';
    }
    setReserveKeepSameTomorrow(false);
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
    const todayLine = mt || routines[daySeed(kstDayKey()) % routines.length];
    if (mode === 'reserve_tomorrow') {
      if (!missionForReserveRef.current.trim()) {
        missionForReserveRef.current = todayLine;
      }
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

  /** 내일 예약: 오늘과 동일 롤모델·미션으로 폼 채우기 */
  const applyKeepSameTomorrow = () => {
    const profile = getProfile(selectedCelebrity, customRoleModelName);
    const routines = profile.routines;
    const line = missionForReserveRef.current;
    setPickerCelebrity(selectedCelebrity);
    if (selectedCelebrity === 'other') {
      setPickerOtherName(customRoleModelName);
    } else {
      setPickerOtherName('');
    }
    if (line && routines.includes(line)) {
      setPickerRoutine(line);
      setPickerCustomRoutine('');
    } else if (line) {
      setPickerCustomRoutine(line);
      setPickerRoutine(routines[0] ?? '');
    } else {
      setPickerRoutine(routines[0] ?? '');
      setPickerCustomRoutine('');
    }
    setReserveKeepSameTomorrow(true);
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
    const nextDay = kstNextDayKey();
    const routineDefault = pickerCustomRoutine.trim() || pickerRoutine || profile.routines[0];
    const routine =
      pickerMode === 'reserve_tomorrow' && reserveKeepSameTomorrow
        ? (missionForReserveRef.current || '').trim() || routineDefault
        : routineDefault;

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
      setReserveKeepSameTomorrow(false);
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
    setShowRewriteBack(false);
    setCheckoutResult(null);
    setFailureReason('');
    closeIntro();
    setToast(`${profile.name} 루틴으로 시작했어요.`);
    window.setTimeout(() => setToast(null), 2200);
  };

  const reserveTomorrow = () => {
    const prof = getProfile(selectedCelebrity, customRoleModelName);
    const rList = prof.routines;
    const fallbackMission = rList[daySeed(kstDayKey()) % rList.length];
    const routineSnap =
      wow?.missionText?.trim() || morningTask.trim() || fallbackMission;
    missionForReserveRef.current = routineSnap;
    setWow(null);
    openRoleModelPicker('reserve_tomorrow');
  };

  /** 축하 모달: 오늘과 동일 롤모델·미션으로 내일 예약만 저장하고 메인으로 */
  const reserveTomorrowKeepSame = () => {
    if (!wow) return;
    const prof = getProfile(selectedCelebrity, customRoleModelName);
    const rList = prof.routines;
    const fallbackMission = rList[daySeed(kstDayKey()) % rList.length];
    const routineSnap =
      wow.missionText.trim() || morningTask.trim() || fallbackMission;
    const nextDay = kstNextDayKey();
    try {
      localStorage.setItem(
        'commute-tomorrow-reservation',
        JSON.stringify({
          forDay: nextDay,
          celebrityId: selectedCelebrity,
          customRoleModelName: selectedCelebrity === 'other' ? customRoleModelName.trim() : '',
          morningTask: clampText(routineSnap, 80),
        }),
      );
    } catch {
      // ignore
    }
    setMorningTask('');
    setWow(null);
    setToast(`${prof.name} 루틴으로 내일(${nextDay}) 미션을 예약했어요.`);
    window.setTimeout(() => setToast(null), 2200);
    trackEvent('reserve_tomorrow', { keepSame: true });
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
              ? '미션 한 줄을 적고 시작하면 됩니다.'
              : '끝났으면 아래에서 완료를 저장해요.'}
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
              <p className="text-[11px] text-toss-sub mb-2">점수와 무관해요. 습관용 알림만 켜 두면 됩니다.</p>
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
          </section>
        )}

        {showWeekly ? (
          <section className="mb-4 p-4 rounded-2xl bg-toss-bg border border-toss-border">
            <p className="text-sm font-semibold text-toss-text">이번 주 리포트</p>
            <p className="text-xs text-toss-sub mt-1">
              완료 저장한 날은 파란 칸으로 표시됩니다.
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
                <p className="text-xs text-yellow-700 mt-1">내일도 저장하면 연속일이 이어집니다.</p>
              </div>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={copyShare}
                className="py-2.5 rounded-xl border border-toss-border bg-white text-sm font-semibold text-toss-text"
              >
                내 미션 성공률 자랑하기
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
                {!morningConfirmed
                  ? `1) ${activeProfile.name} 루틴 1개 정하기`
                  : `2) ${activeProfile.name} 루틴, 끝났나요?`}
              </p>
              <p className="text-xs text-toss-sub mb-3">
                {!morningConfirmed
                  ? '미션을 적거나, 플레이스홀더 추천을 참고해 시작해요.'
                  : '끝났으면 완료를 눌러 저장해요.'}
              </p>

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
                  {showRewriteBack ? (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setMorningTask(morningTaskBeforeRewriteRef.current);
                          setMorningConfirmed(true);
                          setShowRewriteBack(false);
                        }}
                        className="py-3 rounded-xl border border-toss-border bg-white text-sm font-semibold text-toss-text"
                      >
                        돌아가기
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMorningConfirmed(true);
                          setEditingMorningTask(false);
                          setShowRewriteBack(false);
                          trackEvent('checkin_confirm', { celebrity: selectedCelebrity });
                          setToast('시작했어요. 저녁에 완료를 저장해 주세요.');
                          window.setTimeout(() => setToast(null), 2200);
                        }}
                        disabled={!morningTask.trim()}
                        className="py-3 rounded-xl bg-toss-blue text-white text-sm font-semibold disabled:opacity-50"
                      >
                        시작하기
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setMorningConfirmed(true);
                        setEditingMorningTask(false);
                        trackEvent('checkin_confirm', { celebrity: selectedCelebrity });
                        setToast('시작했어요. 저녁에 완료를 저장해 주세요.');
                        window.setTimeout(() => setToast(null), 2200);
                      }}
                      disabled={!morningTask.trim()}
                      className="mt-3 w-full py-3 rounded-xl bg-toss-blue text-white font-semibold disabled:opacity-50"
                    >
                      시작하기
                    </button>
                  )}
                </>
              ) : (
                <>
                  <div className="mb-3 p-3 rounded-xl bg-toss-bg border border-toss-border">
                    <p className="text-xs text-toss-sub">오늘의 미션</p>
                    <p className="text-sm font-semibold text-toss-text mt-1">{morningTaskSummary}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          morningTaskEditSnapshotRef.current = morningTask;
                          setEditingMorningTask(true);
                        }}
                        className="py-2.5 rounded-xl border border-toss-border bg-white text-sm font-semibold text-toss-text"
                      >
                        할 일 바꾸기
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          morningTaskBeforeRewriteRef.current = morningTask;
                          setShowRewriteBack(true);
                          setMorningConfirmed(false);
                          setEditingMorningTask(false);
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
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setMorningTask(morningTaskEditSnapshotRef.current);
                            setEditingMorningTask(false);
                          }}
                          className="py-3 rounded-xl border border-toss-border bg-white text-sm font-semibold text-toss-text"
                        >
                          돌아가기
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMorningTask(false);
                            setToast('반영했어요. 완료 여부를 선택해 주세요.');
                            window.setTimeout(() => setToast(null), 2000);
                          }}
                          disabled={!morningTask.trim()}
                          className="py-3 rounded-xl bg-toss-blue text-white text-sm font-semibold disabled:opacity-50"
                        >
                          바꾸기 완료
                        </button>
                      </div>
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
                    <p className="mt-2 text-[11px] text-toss-sub">미완료는 이유를 고른 뒤 저장돼요.</p>
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
                            setToast('미션 끝에 추천 문구를 붙였어요.');
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

            {!showSettings && (
              <section className="mb-5 p-4 rounded-2xl bg-toss-bg border border-toss-border">
                <p className="text-sm font-semibold text-toss-text mb-1">오늘 요약</p>
                <p className="text-xs text-toss-sub mb-3 line-clamp-2">
                  “{activeRoutineText.length > 40 ? `${activeRoutineText.slice(0, 40)}…` : activeRoutineText}”
                </p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white rounded-xl p-2.5 border border-toss-border">
                    <p className="text-xs text-toss-sub">점수</p>
                    <p className="text-lg font-bold text-toss-text">{score}</p>
                  </div>
                  <div className="bg-white rounded-xl p-2.5 border border-toss-border">
                    <p className="text-xs text-toss-sub">연속</p>
                    <p className="text-lg font-bold text-toss-text">{streakDays}일</p>
                  </div>
                  <div className="bg-white rounded-xl p-2.5 border border-toss-border">
                    <p className="text-xs text-toss-sub">주간</p>
                    <p className="text-lg font-bold text-toss-text">{weeklyRate}%</p>
                  </div>
                </div>
                <p className="mt-3 text-[11px] text-toss-sub leading-relaxed">
                  점수 = 주간 실행률×0.8 + 연속일×4 (최대 100). 하루 한 번 저장이면 반영돼요.
                </p>
                {failureReason && nextSuggestion && (
                  <p className="mt-2 text-xs text-toss-sub">{nextSuggestion}</p>
                )}
              </section>
            )}

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
              {pickerMode === 'reserve_tomorrow' ? '내일 미션 예약하기' : '닮고 싶은 롤모델을 선택해주세요.'}
            </p>
            {pickerMode === 'reserve_tomorrow' ? (
              <div className="text-sm text-toss-sub mt-1 text-center leading-relaxed space-y-1">
                <p>지금 선택한 롤모델이 기본으로 선택되어 있어요.</p>
                <p>루틴을 눌러 고르거나, 아래에 직접 적을 수 있어요.</p>
              </div>
            ) : (
              <p className="text-sm text-toss-sub mt-1 text-center leading-relaxed">
                {'롤모델 선택하기 > 롤모델 루틴 1개 선택하기 > 시작'}
              </p>
            )}

            {pickerMode === 'reserve_tomorrow' && (
              <button
                type="button"
                onClick={applyKeepSameTomorrow}
                className="mt-4 w-full py-3 rounded-xl border-2 border-toss-blue bg-toss-blue/5 text-toss-blue text-sm font-semibold"
              >
                이전과 똑같이 진행하기
              </button>
            )}

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
                        setReserveKeepSameTomorrow(false);
                        const p = getProfile(id, '');
                        setPickerRoutine(p.routines[0] ?? '');
                        setPickerCustomRoutine('');
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
                    onClick={() => {
                      setPickerCelebrity('other');
                      setReserveKeepSameTomorrow(false);
                    }}
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
                      setReserveKeepSameTomorrow(false);
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
                  onChange={(e) => {
                    setPickerCustomRoutine(clampText(e.target.value, 80));
                    setReserveKeepSameTomorrow(false);
                  }}
                  placeholder="기타: 미션을 내 말로 직접 쓰기"
                  className="w-full border border-toss-border rounded-xl px-3 py-2.5 text-sm"
                />
              </div>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-toss-bg border border-toss-border">
              <p className="text-xs text-toss-sub font-medium">롤모델 사진 (선택)</p>
              <p className="text-[11px] text-toss-sub mt-1.5 leading-relaxed">축하 화면에 함께 표시됩니다.</p>
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
                  <p
                    className={`text-2xl font-extrabold text-balance break-keep leading-snug ${style.title} max-w-[95%] mx-auto`}
                  >
                    {wow.completed
                      ? getWowHeadline(wow.level, wow.weeklyRate, wow.celebrityName)
                      : '오늘은 미완료로 저장됐어요'}
                  </p>
                  {wow.completed && (
                    <div className="text-sm font-medium text-toss-text text-center text-pretty break-keep leading-relaxed max-w-[95%] mx-auto mt-2 space-y-1.5">
                      {splitMissionForDisplay(wow.missionText).map((line, i) => (
                        <p key={i} className="block">
                          “{line}”
                        </p>
                      ))}
                    </div>
                  )}
                  <p className="text-sm text-toss-sub mt-3 leading-relaxed text-center text-pretty break-keep max-w-[95%] mx-auto">
                    {wow.completed ? style.next : '내일 다시 미션을 정하면 됩니다.'}
                  </p>
                  {wow.completed && celebrityPhotos[selectedCelebrity] && (
                    <div className="mt-3 flex items-center justify-center gap-3 p-2.5 rounded-xl bg-white border border-toss-border">
                      <img
                        src={celebrityPhotos[selectedCelebrity]}
                        alt=""
                        className="w-14 h-14 rounded-xl object-cover border border-toss-border shrink-0"
                      />
                      <p className="text-sm font-semibold text-toss-text text-left">{wow.celebrityName}</p>
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
                      <p className="text-xs text-yellow-700">오늘의 팁</p>
                      <p className="text-sm font-medium text-yellow-900 mt-1 leading-snug">{getDailyRewardCopy(todayKey)}</p>
                    </div>
                  )}
                </>
              );
            })()}

            <div className="mt-4 p-3 rounded-xl bg-toss-blue/5 border border-toss-blue/20 text-center">
              <p className="text-sm font-semibold text-toss-text text-pretty break-keep max-w-[95%] mx-auto">
                {wow.completed
                  ? `내일도 ${wow.celebrityName} 루틴 미션 1개를 저장하면 됩니다.`
                  : '내일은 3분짜리 미션으로 바꿔 보세요.'}
              </p>
              {wow.completed && (
                <p className="text-xs text-toss-sub mt-2 text-pretty break-keep max-w-[95%] mx-auto">
                  {streakDays >= 7
                    ? '7일 연속 달성 구간입니다.'
                    : `다음 배지까지 ${streakDays < 1 ? 1 : streakDays < 3 ? 3 - streakDays : 7 - streakDays}일`}
                </p>
              )}
            </div>

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
                onClick={reserveTomorrowKeepSame}
                className="py-3 px-2 rounded-xl bg-toss-blue text-white text-sm font-semibold leading-snug"
              >
                지금 미션 그대로 유지하기
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
            <p className="text-2xl font-extrabold text-toss-text mt-1">레벨 변경</p>
            <p className="text-sm text-toss-sub mt-2">
              {promotion.from} → <span className="font-bold text-toss-blue">{promotion.to}</span>
            </p>
            <p className="text-xs text-toss-sub mt-2">점수와 배지는 아래 통계에 반영됩니다.</p>
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
            <p className="text-2xl font-extrabold text-toss-text mt-1">최고 연속 {newRecord}일</p>
            <p className="text-sm text-toss-sub mt-2">기록이 갱신됐어요.</p>
            <button
              type="button"
              onClick={() => setNewRecord(null)}
              className="mt-4 w-full py-3 rounded-xl bg-toss-blue text-white font-semibold"
            >
              확인
            </button>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
