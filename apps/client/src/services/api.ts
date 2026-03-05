import type { GameBreakdown } from 'shared';

export const API_BASE = import.meta.env.VITE_API_URL || '/api';

export interface RunSubmitResponse {
  percentileTop: number;
  successRatePct: number | null;
  successBaseN: number;
  nextGoalHint: string;
  monthlyTop?: number | null;
  me?: { user_hash: string; best_score: number; best_level: number } | null;
}

export async function submitRun(payload: {
  user_hash: string;
  run_score: number;
  max_level: number;
  game_breakdown: GameBreakdown;
  per_stage: Array<{ game_type: string; level: number; success: boolean; score: number }>;
  client_time: string;
}): Promise<RunSubmitResponse> {
  const res = await fetch(`${API_BASE}/runs/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to submit run');
  return res.json();
}
