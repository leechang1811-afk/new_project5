import { create } from 'zustand';
import { generateGameOrder } from 'shared';
import type { GameType, PerStageResult, GameBreakdown } from 'shared';

export interface RunState {
  level: number;
  gameOrder: GameType[];
  currentIndex: number;
  cumulativeScore: number;
  perStageResults: PerStageResult[];
  gameBreakdown: GameBreakdown;
  usedReviveCount: number; // 0~2, 광고 부활 최대 2회
  isRevivedLevel: boolean;
  failed: boolean;
  comboCount: number;
  lastAddedScore?: number; // 통과 시 추가된 점수 (팡팡 애니용)
  lastAddedBonus?: number; // 3초 보너스 등 (따로 빵빵 터짐)
  lastFailedReason?: string; // Tap10 등: 'too_early' | 'too_late' | 'timeout'
}

export interface CompletedRunData {
  perStageResults: PerStageResult[];
  gameBreakdown: GameBreakdown;
  cumulativeScore: number;
  maxLevel: number;
}

interface GameStore {
  run: RunState | null;
  lastCompletedRun: CompletedRunData | null;
  userHash: string | null;
  startRun: () => void;
  nextLevel: (result: PerStageResult, bonus?: number) => void;
  failRun: () => void;
  triggerFail: (reason?: string) => void;
  useRevive: () => void;
  confirmGameOver: () => void;
  getCurrentGameType: () => GameType | null;
  getCumulativeScore: () => number;
  getComboCount: () => number;
  endRun: () => void;
  setUserHash: (hash: string) => void;
  clearLastAddedScore: () => void;
}

async function sha256Hex(str: string): Promise<string> {
  if (typeof crypto?.subtle?.digest === 'function') {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return 'hash-' + str.slice(0, 16);
}

export const ensureUserHash = async (): Promise<string> => {
  const stored = localStorage.getItem('user_hash');
  if (stored) return stored;
  const uuid = crypto.randomUUID();
  const hash = await sha256Hex(uuid);
  localStorage.setItem('user_hash', hash);
  return hash;
};

export const useGameStore = create<GameStore>((set, get) => ({
  run: null,
  lastCompletedRun: null,
  userHash: null,

  setUserHash: (hash) => set({ userHash: hash }),

  startRun: () => {
    const order = generateGameOrder();
    set({
      run: {
        level: 1,
        gameOrder: order,
        currentIndex: 0,
        cumulativeScore: 0,
        perStageResults: [],
        gameBreakdown: {},
        usedReviveCount: 0,
        isRevivedLevel: false,
        failed: false,
        comboCount: 0,
        lastFailedReason: undefined,
      },
    });
  },

  nextLevel: (result, bonus: number = 0) => {
    const { run } = get();
    if (!run) return;
    const breakdown = { ...run.gameBreakdown };
    const k = result.game_type;
    const prev = breakdown[k] ?? 0;
    const count = run.perStageResults.filter((r) => r.game_type === k).length + 1;
    breakdown[k] = (prev * (count - 1) + result.score) / count;
    const added = Math.round(result.score); // base + bonus
    const newCumulative = run.cumulativeScore + added;
    const newCombo = result.success ? (run.comboCount ?? 0) + 1 : 0;
    const baseAdded = added - bonus; // 표시용: 기본점수
    set({
      run: {
        ...run,
        level: run.level + 1,
        currentIndex: run.currentIndex + 1,
        cumulativeScore: newCumulative,
        perStageResults: [...run.perStageResults, result],
        gameBreakdown: breakdown,
        isRevivedLevel: false,
        comboCount: newCombo,
        lastAddedScore: result.success ? baseAdded : undefined,
        lastAddedBonus: result.success && bonus > 0 ? bonus : undefined,
      },
    });
  },

  failRun: () => set({ run: null }),

  triggerFail: (reason?: string) => {
    const { run } = get();
    if (!run) return;
    if (run.usedReviveCount >= 2) {
      get().confirmGameOver();
    } else {
      set({ run: { ...run, failed: true, comboCount: 0, lastFailedReason: reason } });
    }
  },

  confirmGameOver: () => {
    const { run } = get();
    if (run) {
      set({
        lastCompletedRun: {
          perStageResults: run.perStageResults,
          gameBreakdown: run.gameBreakdown,
          cumulativeScore: run.cumulativeScore,
          maxLevel: run.level - 1,
        },
        run: null,
      });
    } else {
      set({ run: null });
    }
  },

  useRevive: () => {
    const { run } = get();
    if (!run || run.usedReviveCount >= 2) return;
    const nextUsed = Math.min(2, run.usedReviveCount + 1);
    set({
      run: {
        ...run,
        usedReviveCount: nextUsed,
        failed: false,
        level: Math.max(1, run.level - 1),
        currentIndex: run.currentIndex,
        isRevivedLevel: true,
        lastFailedReason: undefined,
      },
    });
  },

  getCurrentGameType: () => {
    const { run } = get();
    if (!run) return null;
    return run.gameOrder[run.currentIndex] ?? null;
  },

  getCumulativeScore: () => get().run?.cumulativeScore ?? 0,

  getComboCount: () => get().run?.comboCount ?? 0,

  endRun: () => set({ run: null, lastCompletedRun: null }),

  clearLastAddedScore: () => {
    const { run } = get();
    if (run && (run.lastAddedScore != null || run.lastAddedBonus != null)) {
      set({ run: { ...run, lastAddedScore: undefined, lastAddedBonus: undefined } });
    }
  },
}));
