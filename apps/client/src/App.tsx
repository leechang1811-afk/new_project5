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

function isStageWindowToday(stage: Stage, today: string): boolean {
  return today >= stage.startDate && today <= stage.endDate;
}

function activeStage(project: HabitProject): Stage {
  const next = project.stages.find((stage) => !stage.completed);
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
    title: `${stageNumber}단계`,
    startDate: nextStart,
    endDate: nextEnd,
    checkDates: [],
    completed: false,
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

export default function App() {
  const [state, setState] = useState<AppState>(() => safeLoadState());
  const [view, setView] = useState<'create' | 'list' | 'detail'>('create');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');
  const [firstStageTitle, setFirstStageTitle] = useState('');
  const [stageDays, setStageDays] = useState(7);

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

  const selectedProject = useMemo(() => {
    if (!selectedProjectId) return null;
    return state.projects.find((project) => project.id === selectedProjectId) ?? null;
  }, [selectedProjectId, state.projects]);

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
        if (!isStageWindowToday(current, today) || current.completed) return project;
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
        <p className="text-sm text-toss-sub">Korea Habit</p>
        <h1 className="text-2xl font-bold mt-1">단계형 습관 프로젝트</h1>
        <p className="text-sm text-toss-sub mt-2">설정한 기간 동안 100% 달성하면 자동으로 다음 단계가 열립니다.</p>
      </section>

      <section className="px-5 pb-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-white border border-toss-border p-3">
            <p className="text-xs text-toss-sub">오늘 프로젝트 달성률</p>
            <p className="text-xl font-semibold mt-1">{overallTodayRate}%</p>
          </div>
          <div className="rounded-xl bg-white border border-toss-border p-3">
            <p className="text-xs text-toss-sub">진행 프로젝트</p>
            <p className="text-xl font-semibold mt-1">{state.projects.length}개</p>
          </div>
        </div>
      </section>

      {view === 'create' && (
        <section className="px-5 pb-8">
          <div className="rounded-xl border border-toss-border bg-white p-4">
            <h2 className="font-semibold">새 습관 프로젝트 만들기</h2>
            <form className="mt-3 space-y-3" onSubmit={createProject}>
              <input
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                className="w-full rounded-xl border border-toss-border px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-toss-blue/20"
                placeholder="프로젝트 이름 (예: 아침 루틴)"
                maxLength={30}
                aria-label="프로젝트 이름"
              />
              <input
                value={firstStageTitle}
                onChange={(event) => setFirstStageTitle(event.target.value)}
                className="w-full rounded-xl border border-toss-border px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-toss-blue/20"
                placeholder="1단계 목표 (예: 물 2L 마시기)"
                maxLength={30}
                aria-label="1단계 목표"
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
                <span className="text-sm text-toss-sub">단계 기간</span>
                <select
                  value={stageDays}
                  onChange={(event) => setStageDays(Number(event.target.value))}
                  className="mt-1 w-full rounded-xl border border-toss-border px-3 py-2 bg-white"
                >
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
                프로젝트 시작하기
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
              프로젝트 목록
            </button>
            <button
              type="button"
              className={`rounded-lg px-3 py-2 text-sm ${view === 'detail' ? 'bg-toss-blue text-white' : 'bg-white border border-toss-border'}`}
              onClick={() => setView('detail')}
              disabled={!selectedProject}
            >
              선택 프로젝트
            </button>
            <button
              type="button"
              className="rounded-lg px-3 py-2 text-sm bg-white border border-toss-border ml-auto"
              onClick={() => setView('create')}
            >
              + 새 프로젝트
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
                          현재 {current.stageNumber}단계 · {current.title}
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
                    <p className="text-sm mt-2 text-slate-700">단계 달성률 {currentRate}%</p>
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
                  단계 기간 {selectedProject.stageDurationDays}일 · 총 {selectedProject.stages.length}단계
                </p>
              </div>

              <div className="rounded-xl border border-toss-border bg-white p-4">
                {(() => {
                  const current = activeStage(selectedProject);
                  const currentRate = stageRate(current);
                  const canCheckToday = isStageWindowToday(current, today) && !current.completed;
                  return (
                    <>
                      <h4 className="font-semibold">
                        {current.stageNumber}단계: {current.title}
                      </h4>
                      <p className="text-sm text-toss-sub mt-1">
                        {current.startDate} ~ {current.endDate} · 달성률 {currentRate}%
                      </p>
                      <button
                        type="button"
                        className={`mt-3 w-full rounded-xl py-3 font-medium ${
                          current.checkDates.includes(today) ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-700'
                        } ${canCheckToday ? '' : 'opacity-60'}`}
                        onClick={() => toggleTodayOnActiveStage(selectedProject.id)}
                        disabled={!canCheckToday}
                      >
                        {current.checkDates.includes(today) ? '오늘 완료됨' : '오늘 체크하기'}
                      </button>
                      {!canCheckToday && (
                        <p className="text-xs text-slate-500 mt-2">
                          현재 단계 기간 안에서만 체크할 수 있어요. 100% 달성 시 다음 단계가 자동 생성됩니다.
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>

              <div className="rounded-xl border border-toss-border bg-white p-4">
                <h4 className="font-semibold">단계별 성공 캘린더 (최근 30일)</h4>
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
                <h4 className="font-semibold">단계 기록</h4>
                <ul className="mt-3 space-y-2">
                  {selectedProject.stages.map((stage) => (
                    <li key={stage.id} className="border border-slate-200 rounded-lg p-3">
                      <p className="text-sm font-medium">
                        {stage.stageNumber}단계 · {stage.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {stage.startDate} ~ {stage.endDate}
                      </p>
                      <p className="text-sm mt-1">
                        달성률 {stageRate(stage)}% · 성공 {stage.checkDates.length}회
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </>
      )}

      <BannerAd />
    </main>
  );
}
