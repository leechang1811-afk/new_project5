import { FormEvent, useEffect, useMemo, useState } from 'react';
import BannerAd from './components/BannerAd';
import { track } from './services/analytics';

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
const STAGE_HELP_SNOOZE_KEY = 'korea-habit-stage-help-snooze-until';

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

function parseOrNull(date: string): Date | null {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
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

function buildNextStage(previous: Stage, stageNumber: number, durationDays: number): Stage {
  const nextStart = addDays(previous.endDate, 1);
  const nextEnd = addDays(nextStart, durationDays - 1);
  return {
    id: makeId(),
    stageNumber,
    title: '',
    startDate: nextStart,
    endDate: nextEnd,
    checkDates: [],
    completed: false,
    needsSetup: true,
    failed: false,
  };
}

function maybeAdvanceStage(project: HabitProject): HabitProject {
  const current = activeStage(project);
  if (current.completed || stageRate(current) < 100) return project;
  const updatedStages = project.stages.map((stage) =>
    stage.id === current.id ? { ...stage, completed: true } : stage
  );
  const next = buildNextStage(current, current.stageNumber + 1, project.stageDurationDays);
  return { ...project, stages: [...updatedStages, next] };
}

function resolveStageByDeadline(project: HabitProject, today: string): HabitProject {
  const current = activeStage(project);
  if (current.completed || current.failed || current.needsSetup) return project;
  if (today <= current.endDate) return project;

  const rate = stageRate(current);
  if (rate >= 100) {
    return maybeAdvanceStage(project);
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

export default function App() {
  const [state, setState] = useState<AppState>(() => safeLoadState());
  const [view, setView] = useState<'create' | 'list' | 'detail'>('create');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');
  const [firstStageTitle, setFirstStageTitle] = useState('');
  const [stageDays, setStageDays] = useState(7);
  const [nextStageTitle, setNextStageTitle] = useState('');
  const [nextStageDays, setNextStageDays] = useState(7);
  const [showStageGuideModal, setShowStageGuideModal] = useState(false);

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

  const shouldShowGuide = useMemo(() => {
    if (!selectedCurrentStage?.needsSetup) return false;
    if (typeof window === 'undefined') return false;
    const snoozeRaw = window.localStorage.getItem(STAGE_HELP_SNOOZE_KEY);
    if (!snoozeRaw) return true;
    const snoozeDate = parseOrNull(snoozeRaw);
    if (!snoozeDate) return true;
    return snoozeDate.getTime() < Date.now();
  }, [selectedCurrentStage?.id, selectedCurrentStage?.needsSetup]);

  useEffect(() => {
    if (shouldShowGuide) setShowStageGuideModal(true);
  }, [shouldShowGuide]);

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
        return maybeAdvanceStage({ ...project, stages: nextStages });
      });
      return { ...prev, projects };
    });
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

  function closeGuideFor(days: 7 | 30) {
    const target = new Date();
    target.setDate(target.getDate() + days);
    window.localStorage.setItem(STAGE_HELP_SNOOZE_KEY, target.toISOString());
    setShowStageGuideModal(false);
  }

  function removeProject(projectId: string) {
    setState((prev) => ({ ...prev, projects: prev.projects.filter((project) => project.id !== projectId) }));
    if (selectedProjectId === projectId) setSelectedProjectId(null);
    track('project_delete');
  }

  const overallTodayRate = useMemo(() => {
    if (state.projects.length === 0) return 0;
    const done = state.projects.filter((project) => {
      const current = activeStage(project);
      return current.checkDates.includes(today);
    }).length;
    return Math.round((done / state.projects.length) * 100);
  }, [state.projects, today]);

  return (
    <main className="mx-auto max-w-md min-h-[100dvh] bg-slate-50 text-toss-text">
      <section className="px-5 pt-8 pb-4">
        <p className="text-sm text-toss-sub">좋은 습관 기르기</p>
        <h1 className="text-2xl font-bold mt-1">좋은 습관 기르기</h1>
        <p className="text-sm text-toss-sub mt-2">하루 체크로 습관을 쌓아요. 목표를 달성하면 다음 단계로 넘어가요.</p>
      </section>

      <section className="px-5 pb-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-white border border-toss-border p-3">
            <p className="text-xs text-toss-sub">오늘 달성률</p>
            <p className="text-xl font-semibold mt-1">{overallTodayRate}%</p>
          </div>
          <div className="rounded-xl bg-white border border-toss-border p-3">
            <p className="text-xs text-toss-sub">진행 중</p>
            <p className="text-xl font-semibold mt-1">{state.projects.length}개</p>
          </div>
        </div>
      </section>

      {view === 'create' && (
        <section className="px-5 pb-8">
          <div className="rounded-xl border border-toss-border bg-white p-4">
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
              <label className="block">
                <span className="text-sm text-toss-sub">기간</span>
                <select
                  value={stageDays}
                  onChange={(event) => setStageDays(Number(event.target.value))}
                  className="mt-1 w-full rounded-xl border border-toss-border px-3 py-2 bg-white"
                >
                  <option value={7}>7일</option>
                  <option value={3}>3일</option>
                  <option value={1}>1일</option>
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
          <section className="px-5 pb-3 flex gap-2">
            <button
              type="button"
              className={`rounded-lg px-3 py-2 text-sm ${view === 'list' ? 'bg-toss-blue text-white' : 'bg-white border border-toss-border'}`}
              onClick={() => setView('list')}
            >
              목표 목록
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
            <section className="px-5 pb-8 space-y-3">
              {state.projects.map((project) => {
                const current = activeStage(project);
                const currentRate = stageRate(current);
                return (
                  <article
                    key={project.id}
                    className="rounded-xl border border-toss-border bg-white p-4"
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
                      <p className="text-sm text-slate-700">단계 달성률 {currentRate}%</p>
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
            <section className="px-5 pb-10 space-y-3">
              <div className="rounded-xl border border-toss-border bg-white p-4">
                <h3 className="font-semibold">{selectedProject.name}</h3>
                <p className="text-sm text-toss-sub mt-1">
                  기본 기간 {selectedProject.stageDurationDays}일 · 총 {selectedProject.stages.length}단계
                </p>
              </div>

              <div className="rounded-xl border border-toss-border bg-white p-4">
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
                          <select
                            value={nextStageDays}
                            onChange={(event) => setNextStageDays(Number(event.target.value))}
                            className="w-full rounded-lg border border-toss-border px-3 py-2 bg-white"
                          >
                            <option value={7}>7일</option>
                            <option value={3}>3일</option>
                            <option value={1}>1일</option>
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
                        {current.checkDates.includes(today) ? '오늘 완료했어요' : '오늘 완료 체크'}
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

              <div className="rounded-xl border border-toss-border bg-white p-4">
                <h4 className="font-semibold">성공 캘린더 (최근 30일)</h4>
                <div className="mt-3 grid grid-cols-6 gap-1.5">
                  {calendarKeys.map((dateKey) => {
                    const found = selectedProject.stages.find((stage) => stage.checkDates.includes(dateKey));
                    const isToday = dateKey === today;
                    return (
                      <div
                        key={dateKey}
                        className={`h-10 rounded-md border text-[10px] flex flex-col items-center justify-center ${
                          found ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-slate-50 text-slate-500 border-slate-200'
                        } ${isToday ? 'ring-2 ring-toss-blue/30' : ''}`}
                        title={`${formatDateLabel(dateKey)} ${found ? `${found.stageNumber}단계 성공` : '기록 없음'}`}
                      >
                        <span>{formatDateLabel(dateKey)}</span>
                        <span>{found ? `${found.stageNumber}단계` : '-'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-toss-border bg-white p-4">
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
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </>
      )}

      {showStageGuideModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl">
            <h3 className="text-base font-semibold">다음 단계 안내</h3>
            <p className="text-sm text-slate-600 mt-2">
              지금 단계를 100% 달성하면 다음 단계가 열려요. 다음 목표와 기간은 직접 정하면 됩니다.
            </p>
            <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700 space-y-1">
              <p>예시) 물 2L(7일) 성공 → 물 2.3L(7일) 도전</p>
              <p>예시) 10분 독서(14일) 성공 → 15분 독서(14일) 도전</p>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-300 py-2 text-sm"
                onClick={() => closeGuideFor(7)}
              >
                일주일간 그만보기
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-300 py-2 text-sm"
                onClick={() => closeGuideFor(30)}
              >
                한달간 그만보기
              </button>
              <button
                type="button"
                className="rounded-lg bg-toss-blue text-white py-2 text-sm font-medium"
                onClick={() => setShowStageGuideModal(false)}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      <BannerAd />
    </main>
  );
}
