import { FormEvent, useEffect, useMemo, useState } from 'react';
import BannerAd from './components/BannerAd';
import { track } from './services/analytics';
import { adsService } from './services/ads';
import { fireSuccess } from './utils/confetti';

type Stage = {
  id: string;
  stageNumber: number;
  title: string;
  startDate: string;
  endDate: string;
  checkDates: string[];
  completed: boolean;
  needsSetup?: boolean;
  failed?: boolean;
};

type HabitProject = {
  id: string;
  name: string;
  createdAt: string;
  stageDurationDays: number;
  stages: Stage[];
};

type AppState = {
  projects: HabitProject[];
};

const STORAGE_KEY = 'korea-habit-projects-v2';
const PRESET_TITLES = ['물 2L 마시기', '10분 독서', '15분 걷기'];

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function fromDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function addDays(dateKey: string, days: number): string {
  const date = fromDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

function formatDateLabel(dateKey: string): string {
  const date = fromDateKey(dateKey);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function daysInclusive(startDate: string, endDate: string): number {
  const start = fromDateKey(startDate).getTime();
  const end = fromDateKey(endDate).getTime();
  return Math.max(Math.floor((end - start) / 86_400_000) + 1, 1);
}

function stageRate(stage: Stage): number {
  const planned = daysInclusive(stage.startDate, stage.endDate);
  return Math.min(100, Math.round((stage.checkDates.length / planned) * 100));
}

function stageRateByConfiguredPeriod(stage: Stage, periodDays: number, today: string): number {
  const rangeStart = addDays(today, -(periodDays - 1));
  const effectiveStart = stage.startDate > rangeStart ? stage.startDate : rangeStart;
  const effectiveEnd = stage.endDate < today ? stage.endDate : today;
  if (effectiveEnd < effectiveStart) return 0;
  const plannedDays = daysInclusive(effectiveStart, effectiveEnd);
  const done = stage.checkDates.filter((date) => date >= effectiveStart && date <= effectiveEnd).length;
  return Math.min(100, Math.round((done / plannedDays) * 100));
}

function isStageWindowToday(stage: Stage, today: string): boolean {
  return today >= stage.startDate && today <= stage.endDate;
}

function activeStage(project: HabitProject): Stage {
  const next = project.stages.find((stage) => !stage.completed && !stage.failed);
  return next ?? project.stages[project.stages.length - 1];
}

function safeLoadState(): AppState {
  if (typeof window === 'undefined') return { projects: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { projects: [] };
    const parsed = JSON.parse(raw) as AppState;
    if (!Array.isArray(parsed.projects)) return { projects: [] };
    return {
      projects: parsed.projects.map((project) => ({
        ...project,
        stageDurationDays: Number.isFinite(project.stageDurationDays) ? project.stageDurationDays : 7,
        stages: Array.isArray(project.stages)
          ? project.stages.map((stage, idx) => ({
              ...stage,
              stageNumber: Number.isFinite(stage.stageNumber) ? stage.stageNumber : idx + 1,
              checkDates: Array.isArray(stage.checkDates) ? stage.checkDates : [],
              completed: Boolean(stage.completed),
              needsSetup: Boolean(stage.needsSetup),
              failed: Boolean(stage.failed),
            }))
          : [],
      })),
    };
  } catch {
    return { projects: [] };
  }
}

function buildNextStage(previous: Stage, stageNumber: number, durationDays: number, nextStart?: string): Stage {
  const startDate = nextStart ?? addDays(previous.endDate, 1);
  const nextEnd = addDays(startDate, durationDays - 1);
  return {
    id: makeId(),
    stageNumber,
    title: '',
    startDate,
    endDate: nextEnd,
    checkDates: [],
    completed: false,
    needsSetup: true,
    failed: false,
  };
}

function maybeAdvanceStage(project: HabitProject, transitionDate: string): HabitProject {
  const current = activeStage(project);
  if (current.completed || stageRate(current) < 100) return project;
  const updatedStages = project.stages.map((stage) =>
    stage.id === current.id ? { ...stage, completed: true } : stage
  );
  // Next stage starts from the day after success transition date.
  const next = buildNextStage(current, current.stageNumber + 1, project.stageDurationDays, addDays(transitionDate, 1));
  return { ...project, stages: [...updatedStages, next] };
}

function resolveStageByDeadline(project: HabitProject, today: string): HabitProject {
  const current = activeStage(project);
  if (current.completed || current.failed || current.needsSetup) return project;
  if (today <= current.endDate) return project;

  const rate = stageRate(current);
  if (rate >= 100) {
    return maybeAdvanceStage(project, current.endDate);
  }

  const failedStages = project.stages.map((stage) =>
    stage.id === current.id ? { ...stage, failed: true, completed: true } : stage
  );
  const retryStage = {
    ...buildNextStage(current, current.stageNumber + 1, project.stageDurationDays),
    startDate: today,
    endDate: addDays(today, project.stageDurationDays - 1),
  };
  return { ...project, stages: [...failedStages, retryStage] };
}

function lastNDays(days: number): string[] {
  const result: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    result.push(toDateKey(date));
  }
  return result;
}

function buildStageSuggestions(previousTitle: string): string[] {
  const base = previousTitle.trim() || '현재 목표';
  return [
    `${base} 유지`,
    `${base} 조금 올리기`,
    `${base} 다시 도전`,
  ];
}

function stageDurationDays(stage: Stage): number {
  return daysInclusive(stage.startDate, stage.endDate);
}

function rebalanceProjectAfterStageEdit(project: HabitProject, stageId: string, title: string, durationDays: number): HabitProject {
  const stages = [...project.stages].sort((a, b) => a.stageNumber - b.stageNumber);
  const editIndex = stages.findIndex((stage) => stage.id === stageId);
  if (editIndex < 0) return project;

  const edited = stages[editIndex];
  const originalDuration = stageDurationDays(edited);
  const isDurationIncreased = durationDays > originalDuration;
  const updatedEdited: Stage = {
    ...edited,
    title: title.trim().slice(0, 30) || edited.title,
    endDate: addDays(edited.startDate, durationDays - 1),
    completed: false,
    failed: false,
    needsSetup: false,
  };

  const nextStages: Stage[] = [];
  for (let i = 0; i < stages.length; i += 1) {
    const source = i === editIndex ? updatedEdited : stages[i];
    if (i < editIndex) {
      nextStages.push(source);
      continue;
    }
    if (i === editIndex) {
      // Keep only checks that are inside the updated period.
      const filteredChecks = source.checkDates.filter((date) => date >= source.startDate && date <= source.endDate);
      nextStages.push({ ...source, checkDates: filteredChecks });
      continue;
    }

    const previous = nextStages[i - 1];
    const duration = stageDurationDays(source);
    const startDate = addDays(previous.endDate, 1);
    const endDate = addDays(startDate, duration - 1);
    const checkDates = source.checkDates.filter((date) => date >= startDate && date <= endDate);
    nextStages.push({
      ...source,
      startDate,
      endDate,
      checkDates,
      completed: false,
      failed: false,
      needsSetup: source.needsSetup,
    });
  }

  // Re-evaluate stage progression from the edited stage.
  let blockNextStages = false;
  const normalized = nextStages.map((stage, idx) => {
    if (idx < editIndex) return stage;
    if (blockNextStages) {
      return {
        ...stage,
        completed: false,
        failed: false,
      };
    }
    const rate = stageRate(stage);
    if (stage.needsSetup) {
      blockNextStages = true;
      return { ...stage, completed: false, failed: false };
    }
    if (rate >= 100) {
      return { ...stage, completed: true, failed: false };
    }
    blockNextStages = true;
    return { ...stage, completed: false, failed: false };
  });

  if (isDurationIncreased) {
    return { ...project, stages: normalized.slice(0, editIndex + 1) };
  }

  const hasActiveStage = normalized.some((stage) => !stage.completed && !stage.failed);
  if (!hasActiveStage && normalized.length > 0) {
    const last = normalized[normalized.length - 1];
    return {
      ...project,
      stages: [...normalized, buildNextStage(last, last.stageNumber + 1, project.stageDurationDays)],
    };
  }

  return { ...project, stages: normalized };
}

export default function App() {
  const [state, setState] = useState<AppState>(() => safeLoadState());
  const [view, setView] = useState<'create' | 'list' | 'detail'>('create');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');
  const [firstStageTitle, setFirstStageTitle] = useState('');
  const [stageDays, setStageDays] = useState(7);
  const [nextStageTitle, setNextStageTitle] = useState('');
  const [nextStageDays, setNextStageDays] = useState(7);
  const [celebrationMessage, setCelebrationMessage] = useState<string | null>(null);
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editingStageTitle, setEditingStageTitle] = useState('');
  const [editingStageDays, setEditingStageDays] = useState(7);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState('');
  const [shareCopied, setShareCopied] = useState(false);

  const today = toDateKey();
  const calendarKeys = useMemo(() => lastNDays(30), []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (state.projects.length === 0) {
      setView('create');
      return;
    }
    if (!selectedProjectId) {
      setSelectedProjectId(state.projects[0].id);
      setView('list');
    }
  }, [selectedProjectId, state.projects]);

  useEffect(() => {
    track('app_open', { projects: state.projects.length });
  }, [state.projects.length]);

  useEffect(() => {
    const detect = () => {
      const width = window.innerWidth;
      if (width < 640) setDeviceType('mobile');
      else if (width < 1024) setDeviceType('tablet');
      else setDeviceType('desktop');
    };
    detect();
    window.addEventListener('resize', detect);
    return () => window.removeEventListener('resize', detect);
  }, []);

  useEffect(() => {
    setState((prev) => {
      let changed = false;
      const projects = prev.projects.map((project) => {
        const resolved = resolveStageByDeadline(project, today);
        if (resolved !== project) changed = true;
        return resolved;
      });
      return changed ? { ...prev, projects } : prev;
    });
  }, [today]);

  const selectedProject = useMemo(() => {
    if (!selectedProjectId) return null;
    return state.projects.find((project) => project.id === selectedProjectId) ?? null;
  }, [selectedProjectId, state.projects]);

  const selectedCurrentStage = useMemo(() => {
    if (!selectedProject) return null;
    return activeStage(selectedProject);
  }, [selectedProject]);
  const previousStage = useMemo(() => {
    if (!selectedProject || !selectedCurrentStage) return null;
    return selectedProject.stages.find((stage) => stage.stageNumber === selectedCurrentStage.stageNumber - 1) ?? null;
  }, [selectedProject, selectedCurrentStage]);
  const suggestionTitles = useMemo(
    () => buildStageSuggestions(previousStage?.title ?? ''),
    [previousStage?.title]
  );

  function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = projectName.trim();
    const stageTitle = firstStageTitle.trim();
    if (!name || !stageTitle) return;
    const start = today;
    const end = addDays(start, stageDays - 1);
    const newProject: HabitProject = {
      id: makeId(),
      name: name.slice(0, 30),
      createdAt: new Date().toISOString(),
      stageDurationDays: stageDays,
      stages: [
        {
          id: makeId(),
          stageNumber: 1,
          title: stageTitle.slice(0, 30),
          startDate: start,
          endDate: end,
          checkDates: [],
          completed: false,
          needsSetup: false,
          failed: false,
        },
      ],
    };
    setState((prev) => ({ ...prev, projects: [newProject, ...prev.projects] }));
    setSelectedProjectId(newProject.id);
    setView('list');
    setProjectName('');
    setFirstStageTitle('');
    setStageDays(7);
    track('project_create', { duration_days: stageDays });
  }

  function toggleTodayOnActiveStage(projectId: string) {
    const targetProject = state.projects.find((project) => project.id === projectId);
    const current = targetProject ? activeStage(targetProject) : null;
    const plannedDays = current ? daysInclusive(current.startDate, current.endDate) : 1;
    const willCompleteStage = current
      ? !current.checkDates.includes(today) &&
        !current.completed &&
        !current.needsSetup &&
        isStageWindowToday(current, today) &&
        Math.round(((current.checkDates.length + 1) / plannedDays) * 100) >= 100
      : false;

    setState((prev) => {
      const projects = prev.projects.map((project) => {
        if (project.id !== projectId) return project;
        const current = activeStage(project);
        if (!isStageWindowToday(current, today) || current.completed || current.needsSetup) return project;
        const checked = current.checkDates.includes(today);
        const nextStages = project.stages.map((stage) =>
          stage.id !== current.id
            ? stage
            : {
                ...stage,
                checkDates: checked
                  ? stage.checkDates.filter((key) => key !== today)
                  : [...stage.checkDates, today].sort(),
              }
        );
        return maybeAdvanceStage({ ...project, stages: nextStages }, today);
      });
      return { ...prev, projects };
    });
    if (willCompleteStage && current) {
      fireSuccess(current.stageNumber);
      setCelebrationMessage(`축하해요! ${current.stageNumber}단계를 100% 달성했어요.`);
      window.setTimeout(() => setCelebrationMessage(null), 2400);
      track('stage_completed_100', { stage_number: current.stageNumber });
    }
    track('stage_toggle_today');
  }

  function setupActiveStage(projectId: string, title: string, durationDays: number) {
    const trimmed = title.trim();
    if (!trimmed) return;
    setState((prev) => {
      const projects = prev.projects.map((project) => {
        if (project.id !== projectId) return project;
        const current = activeStage(project);
        const newEnd = addDays(current.startDate, durationDays - 1);
        const nextStages = project.stages.map((stage) =>
          stage.id === current.id
            ? {
                ...stage,
                title: trimmed.slice(0, 30),
                endDate: newEnd,
                needsSetup: false,
              }
            : stage
        );
        return { ...project, stages: nextStages, stageDurationDays: durationDays };
      });
      return { ...prev, projects };
    });
    setNextStageTitle('');
    track('stage_setup', { duration_days: durationDays });
  }

  function removeProject(projectId: string) {
    setState((prev) => ({ ...prev, projects: prev.projects.filter((project) => project.id !== projectId) }));
    if (selectedProjectId === projectId) setSelectedProjectId(null);
    track('project_delete');
  }

  function startEditProject(project: HabitProject) {
    setEditingProjectId(project.id);
    setEditingProjectName(project.name);
  }

  function applyProjectNameEdit(projectId: string) {
    const trimmed = editingProjectName.trim();
    if (!trimmed) return;
    setState((prev) => ({
      ...prev,
      projects: prev.projects.map((project) =>
        project.id === projectId ? { ...project, name: trimmed.slice(0, 30) } : project
      ),
    }));
    setEditingProjectId(null);
    track('project_rename');
  }

  async function copyShareLink() {
    const baseUrl = 'https://korea-habits.vercel.app/';
    const shareText = `좋은 습관 만들기\n현재 달성률 ${overallProjectProgressRate}% · 오늘 하루 달성률 ${overallTodayRate}%\n${baseUrl}`;
    try {
      try {
        await adsService.loadInterstitial();
        await adsService.showInterstitial();
        track('ad_interstitial_shown', { trigger: 'share_link' });
      } catch {
        // 광고 실패해도 공유 플로우는 유지
      }
      await navigator.clipboard.writeText(shareText);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 1800);
      track('share_link_copy');
    } catch {
      // fallback
      window.prompt('아래 내용을 복사해 공유해 주세요.', shareText);
    }
  }

  const overallTodayRate = useMemo(() => {
    if (state.projects.length === 0) return 0;
    const done = state.projects.filter((project) => {
      return project.stages.some((stage) => stage.checkDates.includes(today));
    }).length;
    return Math.round((done / state.projects.length) * 100);
  }, [state.projects, today]);
  const todayProjectStatus = useMemo(() => {
    return state.projects.map((project) => {
      const doneToday = project.stages.some((stage) => stage.checkDates.includes(today));
      return {
        projectId: project.id,
        projectName: project.name,
        doneToday,
      };
    });
  }, [state.projects, today]);
  const selectedProjectRate = useMemo(() => {
    if (!selectedProject) return 0;
    return stageRate(activeStage(selectedProject));
  }, [selectedProject]);
  const selectedProjectConfiguredRate = useMemo(() => {
    if (!selectedProject) return 0;
    return stageRateByConfiguredPeriod(activeStage(selectedProject), selectedProject.stageDurationDays, today);
  }, [selectedProject, today]);
  const overallProjectProgressRate = useMemo(() => {
    if (state.projects.length === 0) return 0;
    const sum = state.projects.reduce((acc, project) => {
      return acc + stageRate(activeStage(project));
    }, 0);
    return Math.round(sum / state.projects.length);
  }, [state.projects]);
  const dashboardRate = view === 'detail' && selectedProject ? selectedProjectRate : overallProjectProgressRate;
  const displayRate = Math.min(94, Math.max(6, dashboardRate));
  const stairHeights = [14, 24, 38, 54, 72, 92, 114];
  const stepIndex = Math.round((dashboardRate / 100) * (stairHeights.length - 1));
  const climberBottom = stairHeights[Math.max(0, Math.min(stepIndex, stairHeights.length - 1))] + 18;
  const checkButtonLabel = deviceType === 'mobile' ? '오늘 완료 체크' : '오늘 완료하기';
  const climberIcon = dashboardRate <= 0 ? '🚶‍➡️' : '🏃‍➡️';
  const selectedProjectDateStageMap = useMemo(() => {
    if (!selectedProject) return new Map<string, number>();
    const map = new Map<string, number>();
    for (const stage of selectedProject.stages) {
      for (const date of stage.checkDates) {
        map.set(date, stage.stageNumber);
      }
    }
    return map;
  }, [selectedProject]);

  function startEditStage(stage: Stage) {
    setEditingStageId(stage.id);
    setEditingStageTitle(stage.title || '');
    setEditingStageDays(stageDurationDays(stage));
  }

  function applyStageEdit(projectId: string, stageId: string) {
    if (!editingStageTitle.trim()) return;
    setState((prev) => ({
      ...prev,
      projects: prev.projects.map((project) =>
        project.id === projectId
          ? rebalanceProjectAfterStageEdit(project, stageId, editingStageTitle, editingStageDays)
          : project
      ),
    }));
    setEditingStageId(null);
    track('stage_edit', { duration_days: editingStageDays });
  }

  return (
    <main className="mx-auto w-full max-w-5xl min-h-[100dvh] bg-slate-50 text-toss-text">
      <section className="px-4 sm:px-6 lg:px-8 pt-7 sm:pt-8 pb-4 text-center">
        <p className="text-sm font-semibold text-emerald-700">좋은 습관 만들기</p>
        <h1 className="text-2xl font-bold mt-1">
          {view === 'detail' && selectedProject ? selectedProject.name : '나의 홈화면'}
        </h1>
        <p className="text-sm text-toss-sub mt-2">
          하루 체크로 습관을 쌓아요. 목표를 달성하면 다음 단계로 넘어가요.
          {deviceType === 'desktop' ? ' 큰 화면에서는 기록을 한눈에 볼 수 있어요.' : ''}
        </p>
      </section>

      <section className="px-4 sm:px-6 lg:px-8 pb-4">
        <div className="rounded-xl border border-toss-border bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">나의 습관형성 달성률</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="text-xs border border-slate-300 rounded-md px-2 py-1 text-slate-700"
                onClick={() => {
                  void copyShareLink();
                }}
              >
                내 성공률 공유하기
              </button>
              <p className="text-lg font-bold text-toss-blue">{dashboardRate}%</p>
            </div>
          </div>
          <div className="relative mt-4 h-[170px] rounded-xl bg-slate-50 border border-slate-100 overflow-hidden">
            <div className="absolute inset-x-3 bottom-3 flex items-end gap-2">
              {stairHeights.map((height, index) => (
                <div
                  key={`step-${height}`}
                  className={`flex-1 rounded-2xl transition-all duration-500 ${
                    index <= stepIndex ? 'bg-emerald-400' : 'bg-slate-200'
                  }`}
                  style={{ height: `${height}px` }}
                />
              ))}
            </div>
            <div
              className="absolute text-2xl transition-all duration-700 ease-out"
              style={{
                left: `calc(${displayRate}% - 12px)`,
                bottom: `${climberBottom + 6}px`,
              }}
              aria-label="진도 캐릭터"
            >
              {climberIcon}
            </div>
          </div>
          <div className="mt-1 px-1 flex justify-between text-[10px] text-slate-400">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8 pb-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-white border border-toss-border p-3">
            <p className="text-xs text-toss-sub">전체 진행 달성률</p>
            <p className="text-xl font-semibold mt-1">
              {view === 'detail' && selectedProject ? `${selectedProjectRate}%` : `${overallProjectProgressRate}%`}
            </p>
          </div>
          <div className="rounded-xl bg-white border border-toss-border p-3">
            <p className="text-xs text-toss-sub">진행 현황</p>
            <p className="text-xl font-semibold mt-1">
              {view === 'detail' && selectedProject
                ? `${activeStage(selectedProject).stageNumber}단계`
                : `${state.projects.length}개`}
            </p>
            <p className="text-[11px] text-toss-sub mt-1">오늘 달성률 {overallTodayRate}%</p>
          </div>
        </div>
        <div className="rounded-xl bg-white border border-toss-border p-3 mt-2">
          <p className="text-xs text-toss-sub">오늘 하루 달성률</p>
          <p className="text-xl font-semibold mt-1">{overallTodayRate}%</p>
          <div className="mt-2 space-y-1">
            {todayProjectStatus.length === 0 ? (
              <p className="text-[11px] text-toss-sub">아직 만든 프로젝트가 없어요</p>
            ) : (
              todayProjectStatus.map((item) => (
                <div key={item.projectId} className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 truncate pr-2">{item.projectName}</span>
                  <span className={item.doneToday ? 'text-emerald-600 font-semibold' : 'text-rose-500 font-semibold'}>
                    {item.doneToday ? 'O' : 'X'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {celebrationMessage && (
        <section className="px-4 sm:px-6 lg:px-8 pb-2">
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-emerald-700 text-sm font-medium">
            {celebrationMessage}
          </div>
        </section>
      )}
      {shareCopied && (
        <section className="px-4 sm:px-6 lg:px-8 pb-2">
          <div className="rounded-xl bg-blue-50 border border-blue-200 px-3 py-2 text-blue-700 text-sm font-medium">
            공유 링크를 복사했어요.
          </div>
        </section>
      )}

      {view === 'create' && (
        <section className="px-4 sm:px-6 lg:px-8 pb-8">
          <div className="rounded-xl border border-toss-border bg-white p-4 sm:p-5">
            <h2 className="font-semibold">새 목표 만들기</h2>
            <form className="mt-3 space-y-3" onSubmit={createProject}>
              <input
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                className="w-full rounded-xl border border-toss-border px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-toss-blue/20"
                placeholder="목표 이름 (예: 아침 루틴)"
                maxLength={30}
                aria-label="목표 이름"
              />
              <input
                value={firstStageTitle}
                onChange={(event) => setFirstStageTitle(event.target.value)}
                className="w-full rounded-xl border border-toss-border px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-toss-blue/20"
                placeholder="첫 단계 목표 (예: 물 2L 마시기)"
                maxLength={30}
                aria-label="첫 단계 목표"
              />
              <div className="flex gap-2 flex-wrap">
                {PRESET_TITLES.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className="rounded-full bg-slate-100 border border-slate-200 px-3 py-1.5 text-xs text-slate-700"
                    onClick={() => setFirstStageTitle(preset)}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <label className="block sm:max-w-xs">
                <span className="text-sm text-toss-sub">기간</span>
                <select
                  value={stageDays}
                  onChange={(event) => setStageDays(Number(event.target.value))}
                  className="mt-1 w-full rounded-xl border border-toss-border px-3 py-2 bg-white"
                >
                  <option value={1}>1일</option>
                  <option value={3}>3일</option>
                  <option value={7}>7일</option>
                  <option value={14}>14일</option>
                  <option value={21}>21일</option>
                  <option value={30}>30일</option>
                </select>
              </label>
              <button
                type="submit"
                className="w-full rounded-xl bg-toss-blue text-white py-3 font-medium disabled:opacity-50"
                disabled={!projectName.trim() || !firstStageTitle.trim()}
              >
                시작하기
              </button>
            </form>
          </div>
        </section>
      )}

      {view !== 'create' && (
        <>
          <section className="px-4 sm:px-6 lg:px-8 pb-3 flex gap-2 overflow-x-auto">
            <button
              type="button"
              className={`rounded-lg px-3 py-2 text-sm ${view === 'list' ? 'bg-toss-blue text-white' : 'bg-white border border-toss-border'}`}
              onClick={() => setView('list')}
            >
              전체 습관보기
            </button>
            <button
              type="button"
              className={`rounded-lg px-3 py-2 text-sm ${view === 'detail' ? 'bg-toss-blue text-white' : 'bg-white border border-toss-border'}`}
              onClick={() => setView('detail')}
              disabled={!selectedProject}
            >
              상세 보기
            </button>
            <button
              type="button"
              className="rounded-lg px-3 py-2 text-sm bg-white border border-toss-border ml-auto"
              onClick={() => setView('create')}
            >
              + 새 목표
            </button>
          </section>

          {view === 'list' && (
            <section className="px-4 sm:px-6 lg:px-8 pb-8 grid grid-cols-1 md:grid-cols-2 gap-3">
              {state.projects.map((project) => {
                const current = activeStage(project);
                const currentRate = stageRate(current);
                return (
                  <article
                    key={project.id}
                    className="rounded-xl border border-toss-border bg-white p-4 sm:p-5"
                    onClick={() => {
                      setSelectedProjectId(project.id);
                      setView('detail');
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">{project.name}</h3>
                        <p className="text-sm text-toss-sub mt-1">
                          지금 {current.stageNumber}단계 · {current.title || '다음 단계를 설정해 주세요'}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {current.startDate} ~ {current.endDate}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="text-xs text-slate-400 hover:text-slate-600"
                        onClick={(event) => {
                          event.stopPropagation();
                          removeProject(project.id);
                        }}
                      >
                        삭제
                      </button>
                    </div>
                    <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${currentRate}%` }} />
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-sm text-slate-700">
                        현재 {currentRate}% · 기간 기준 {stageRateByConfiguredPeriod(current, project.stageDurationDays, today)}%
                      </p>
                      <button
                        type="button"
                        className="text-sm text-toss-blue font-medium"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedProjectId(project.id);
                          setView('detail');
                        }}
                      >
                        상세내용보기
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>
          )}

          {view === 'detail' && selectedProject && (
            <section className="px-4 sm:px-6 lg:px-8 pb-10 space-y-3">
              <div className="rounded-xl border border-toss-border bg-white p-4 sm:p-5">
                {editingProjectId === selectedProject.id ? (
                  <form
                    className="space-y-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      applyProjectNameEdit(selectedProject.id);
                    }}
                  >
                    <input
                      value={editingProjectName}
                      onChange={(event) => setEditingProjectName(event.target.value)}
                      className="w-full rounded-lg border border-toss-border px-3 py-2 bg-white"
                      maxLength={30}
                      placeholder="프로젝트 이름"
                    />
                    <div className="flex gap-2">
                      <button type="submit" className="flex-1 rounded-lg bg-toss-blue text-white py-2 text-sm font-medium">
                        이름 저장
                      </button>
                      <button
                        type="button"
                        className="flex-1 rounded-lg border border-slate-300 py-2 text-sm"
                        onClick={() => setEditingProjectId(null)}
                      >
                        취소
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold">{selectedProject.name}</h3>
                    <button
                      type="button"
                      className="text-xs text-slate-500 border border-slate-300 rounded-md px-2 py-1"
                      onClick={() => startEditProject(selectedProject)}
                    >
                      프로젝트명 수정
                    </button>
                  </div>
                )}
                <p className="text-sm text-toss-sub mt-1">
                  기본 기간 {selectedProject.stageDurationDays}일 · 총 {selectedProject.stages.length}단계
                </p>
                <p className="text-sm text-toss-sub mt-1">기간 기준 달성률 {selectedProjectConfiguredRate}%</p>
              </div>

              <div className="rounded-xl border border-toss-border bg-white p-4 sm:p-5">
                {(() => {
                  const current = activeStage(selectedProject);
                  const currentRate = stageRate(current);
                  const canCheckToday = isStageWindowToday(current, today) && !current.completed && !current.needsSetup;
                  return (
                    <>
                      <h4 className="font-semibold">
                        {current.stageNumber}단계: {current.title || '목표를 설정해 주세요'}
                      </h4>
                      <p className="text-sm text-toss-sub mt-1">
                        {current.startDate} ~ {current.endDate} · 달성률 {currentRate}%
                      </p>
                      {current.needsSetup && (
                        <form
                          className="mt-3 rounded-lg border border-slate-200 p-3 space-y-2"
                          onSubmit={(event) => {
                            event.preventDefault();
                            setupActiveStage(selectedProject.id, nextStageTitle, nextStageDays);
                          }}
                        >
                          <p className="text-sm font-medium">다음 단계 설정</p>
                          <input
                            value={nextStageTitle}
                            onChange={(event) => setNextStageTitle(event.target.value)}
                            placeholder="다음 단계 목표를 적어주세요"
                            className="w-full rounded-lg border border-toss-border px-3 py-2 bg-white outline-none"
                          />
                          <div className="flex gap-2 flex-wrap">
                            {suggestionTitles.map((suggestion) => (
                              <button
                                key={suggestion}
                                type="button"
                                className="rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs text-slate-700"
                                onClick={() => setNextStageTitle(suggestion)}
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                          <div className="rounded-lg bg-slate-50 border border-slate-200 p-2 text-xs text-slate-600">
                            예시) 물 2L(7일) 성공 → 물 2.3L(7일) 도전
                            <br />
                            예시) 10분 독서(14일) 성공 → 15분 독서(14일) 도전
                          </div>
                          <p className="text-xs text-toss-sub">
                            안내: 지금 설정하는 다음 단계는 내일부터 시작되고, 오늘 성공한 기록은 그대로 유지돼요.
                          </p>
                          <select
                            value={nextStageDays}
                            onChange={(event) => setNextStageDays(Number(event.target.value))}
                            className="w-full rounded-lg border border-toss-border px-3 py-2 bg-white"
                          >
                            <option value={1}>1일</option>
                            <option value={3}>3일</option>
                            <option value={7}>7일</option>
                            <option value={14}>14일</option>
                            <option value={21}>21일</option>
                            <option value={30}>30일</option>
                          </select>
                          <button
                            type="submit"
                            className="w-full rounded-lg bg-toss-blue text-white py-2 font-medium disabled:opacity-50"
                            disabled={!nextStageTitle.trim()}
                          >
                            이 목표로 시작
                          </button>
                        </form>
                      )}
                      <button
                        type="button"
                        className={`mt-3 w-full rounded-xl py-3 font-medium ${
                          current.checkDates.includes(today) ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-700'
                        } ${canCheckToday ? '' : 'opacity-60'}`}
                        onClick={() => toggleTodayOnActiveStage(selectedProject.id)}
                        disabled={!canCheckToday}
                      >
                        {current.checkDates.includes(today) ? '오늘 완료했어요' : checkButtonLabel}
                      </button>
                      {!canCheckToday && (
                        <p className="text-xs text-slate-500 mt-2">
                          이 단계를 설정한 뒤에 오늘 체크를 할 수 있어요.
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="rounded-xl border border-toss-border bg-white p-4 sm:p-5">
                  <h4 className="font-semibold">성공 캘린더 (최근 30일)</h4>
                  <div className="mt-3 grid grid-cols-6 gap-1.5">
                    {calendarKeys.map((dateKey) => {
                      const foundStageNumber = selectedProjectDateStageMap.get(dateKey);
                      const isToday = dateKey === today;
                      return (
                        <div
                          key={dateKey}
                          className={`h-10 rounded-md border text-[10px] flex flex-col items-center justify-center ${
                            foundStageNumber ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-slate-50 text-slate-500 border-slate-200'
                          } ${isToday ? 'ring-2 ring-toss-blue/30' : ''}`}
                          title={`${formatDateLabel(dateKey)} ${foundStageNumber ? `${foundStageNumber}단계 성공` : '기록 없음'}`}
                        >
                          <span>{formatDateLabel(dateKey)}</span>
                          <span>{foundStageNumber ? `${foundStageNumber}단계` : '-'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-xl border border-toss-border bg-white p-4 sm:p-5">
                  <h4 className="font-semibold">진행 기록</h4>
                  <ul className="mt-3 space-y-2">
                    {selectedProject.stages.map((stage) => (
                      <li key={stage.id} className="border border-slate-200 rounded-lg p-3">
                        <p className="text-sm font-medium">
                          {stage.stageNumber}단계 · {stage.title || '목표 미설정'}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {stage.startDate} ~ {stage.endDate}
                        </p>
                        <p className="text-sm mt-1">
                          달성률 {stageRate(stage)}% · 성공 {stage.checkDates.length}회
                        </p>
                        {stage.failed && (
                          <p className="text-xs mt-1 text-rose-600">이번 단계는 기간 내 미달성으로 종료됐어요</p>
                        )}
                        {stage.completed && !stage.failed && (
                          <p className="text-xs mt-1 text-emerald-600">성공적으로 완료했어요</p>
                        )}
                        {editingStageId === stage.id ? (
                          <form
                            className="mt-2 space-y-2"
                            onSubmit={(event) => {
                              event.preventDefault();
                              applyStageEdit(selectedProject.id, stage.id);
                            }}
                          >
                            <input
                              value={editingStageTitle}
                              onChange={(event) => setEditingStageTitle(event.target.value)}
                              className="w-full rounded-lg border border-toss-border px-3 py-2 text-sm bg-white"
                              placeholder="수정할 목표를 입력해 주세요"
                            />
                            <select
                              value={editingStageDays}
                              onChange={(event) => setEditingStageDays(Number(event.target.value))}
                              className="w-full rounded-lg border border-toss-border px-3 py-2 text-sm bg-white"
                            >
                              <option value={1}>1일</option>
                              <option value={3}>3일</option>
                              <option value={7}>7일</option>
                              <option value={14}>14일</option>
                              <option value={21}>21일</option>
                              <option value={30}>30일</option>
                            </select>
                            <div className="flex gap-2">
                              <button type="submit" className="flex-1 rounded-lg bg-toss-blue text-white py-2 text-sm font-medium">
                                수정 저장
                              </button>
                              <button
                                type="button"
                                className="flex-1 rounded-lg border border-slate-300 py-2 text-sm"
                                onClick={() => setEditingStageId(null)}
                              >
                                취소
                              </button>
                            </div>
                          </form>
                        ) : (
                          <button
                            type="button"
                            className="mt-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700"
                            onClick={() => startEditStage(stage)}
                          >
                            단계 수정하기
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          )}
        </>
      )}

      <BannerAd />
    </main>
  );
}
