import type { GameType } from './types.js';

// 기억력: 레벨별 자리수/노출시간, 후반 3x3 패턴
export interface MemoryParams {
  digitCount: number;
  exposeMs: number;
  usePattern: boolean; // 3x3 패턴
  patternSize?: number;
}

/** 기억력: 난이도 완화 — 노출시간 연장, 후반 패턴 구간 완화 */
export const MEMORY_PARAMS: Record<number, MemoryParams> = {
  1: { digitCount: 5, exposeMs: 5500, usePattern: false },
  2: { digitCount: 5, exposeMs: 5000, usePattern: false },
  3: { digitCount: 5, exposeMs: 4600, usePattern: false },
  4: { digitCount: 6, exposeMs: 4200, usePattern: false },
  5: { digitCount: 6, exposeMs: 3900, usePattern: false },
  6: { digitCount: 7, exposeMs: 3600, usePattern: false },
  7: { digitCount: 7, exposeMs: 3400, usePattern: false },
  8: { digitCount: 8, exposeMs: 3200, usePattern: false },
  9: { digitCount: 7, exposeMs: 1300, usePattern: true, patternSize: 3 },
  10: { digitCount: 8, exposeMs: 1100, usePattern: true, patternSize: 3 },
  11: { digitCount: 8, exposeMs: 850, usePattern: true, patternSize: 3 },
  12: { digitCount: 9, exposeMs: 650, usePattern: true, patternSize: 4 },
  13: { digitCount: 9, exposeMs: 550, usePattern: true, patternSize: 4 },
  14: { digitCount: 9, exposeMs: 450, usePattern: true, patternSize: 4 },
  15: { digitCount: 9, exposeMs: 350, usePattern: true, patternSize: 4 },
  16: { digitCount: 9, exposeMs: 280, usePattern: true, patternSize: 4 },
  17: { digitCount: 9, exposeMs: 220, usePattern: true, patternSize: 4 },
  18: { digitCount: 9, exposeMs: 170, usePattern: true, patternSize: 4 },
  19: { digitCount: 9, exposeMs: 130, usePattern: true, patternSize: 4 },
  20: { digitCount: 9, exposeMs: 90, usePattern: true, patternSize: 4 },
};

// 계산: 레벨별 난이도 (초반 덧셈/뺄셈, 후반 O/X)
export interface CalcParams {
  maxNum: number;
  ops: ('+' | '-')[];
  useOX: boolean;
}

/** 계산: 난이도 완화 — maxNum 완화, O/X 도입 구간 연장 */
export const CALC_PARAMS: Record<number, CalcParams> = {
  1: { maxNum: 12, ops: ['+'], useOX: false },
  2: { maxNum: 18, ops: ['+', '-'], useOX: false },
  3: { maxNum: 30, ops: ['+', '-'], useOX: false },
  4: { maxNum: 45, ops: ['+', '-'], useOX: false },
  5: { maxNum: 65, ops: ['+', '-'], useOX: false },
  6: { maxNum: 90, ops: ['+', '-'], useOX: false },
  7: { maxNum: 130, ops: ['+', '-'], useOX: false },
  8: { maxNum: 170, ops: ['+', '-'], useOX: false },
  9: { maxNum: 280, ops: ['+', '-'], useOX: false },
  10: { maxNum: 320, ops: ['+', '-'], useOX: true },
  11: { maxNum: 380, ops: ['+', '-'], useOX: true },
  12: { maxNum: 430, ops: ['+', '-'], useOX: true },
  13: { maxNum: 500, ops: ['+', '-'], useOX: true },
  14: { maxNum: 580, ops: ['+', '-'], useOX: true },
  15: { maxNum: 680, ops: ['+', '-'], useOX: true },
  16: { maxNum: 780, ops: ['+', '-'], useOX: true },
  17: { maxNum: 880, ops: ['+', '-'], useOX: true },
  18: { maxNum: 1000, ops: ['+', '-'], useOX: true },
  19: { maxNum: 1200, ops: ['+', '-'], useOX: true },
  20: { maxNum: 1400, ops: ['+', '-'], useOX: true },
};

// 10초 터치: 레벨별 정확도 요구
export interface Tap10Params {
  targetOnly: boolean; // 표적만 탭
  targetMoves: boolean; // 표적 이동
}

export const TAP10_PARAMS: Record<number, Tap10Params> = {
  1: { targetOnly: false, targetMoves: false },
  2: { targetOnly: false, targetMoves: false },
  3: { targetOnly: false, targetMoves: false },
  4: { targetOnly: true, targetMoves: false },
  5: { targetOnly: true, targetMoves: false },
  6: { targetOnly: true, targetMoves: false },
  7: { targetOnly: true, targetMoves: false },
  8: { targetOnly: true, targetMoves: true },
  9: { targetOnly: true, targetMoves: true },
  10: { targetOnly: true, targetMoves: true },
  11: { targetOnly: true, targetMoves: true },
  12: { targetOnly: true, targetMoves: true },
  13: { targetOnly: true, targetMoves: true },
  14: { targetOnly: true, targetMoves: true },
  15: { targetOnly: true, targetMoves: true },
  16: { targetOnly: true, targetMoves: true },
  17: { targetOnly: true, targetMoves: true },
  18: { targetOnly: true, targetMoves: true },
  19: { targetOnly: true, targetMoves: true },
  20: { targetOnly: true, targetMoves: true },
};

export function getMemoryParams(level: number): MemoryParams {
  return MEMORY_PARAMS[Math.min(20, Math.max(1, level))] ?? MEMORY_PARAMS[1];
}

export function getCalcParams(level: number): CalcParams {
  return CALC_PARAMS[Math.min(20, Math.max(1, level))] ?? CALC_PARAMS[1];
}

export function getTap10Params(level: number): Tap10Params {
  return TAP10_PARAMS[Math.min(20, Math.max(1, level))] ?? TAP10_PARAMS[1];
}

// 물감 색깔: PO 개선 — 초반 색 이해 쉬움, 난이도 점진적 상승
export type PaintBaseColor = 'R' | 'G' | 'B' | 'Y' | 'M' | 'C' | 'O' | 'L' | 'P' | 'T';

export interface PaintParams {
  baseColors: PaintBaseColor[];
  dropIntervalMs: number;
  fallDurationSec: number;
  mixCount: 2 | 3 | 4 | 5;
}

/** 물감: 쉬우면서 아깝게 — 초반 넉넉, 후반만 점진적 상승으로 아쉬운 실패 유도 */
export const PAINT_PARAMS: Record<number, PaintParams> = {
  1: { baseColors: ['R', 'G', 'B'], dropIntervalMs: 2800, fallDurationSec: 3.2, mixCount: 2 },
  2: { baseColors: ['R', 'G', 'B'], dropIntervalMs: 2600, fallDurationSec: 3, mixCount: 2 },
  3: { baseColors: ['R', 'G', 'B', 'Y', 'M', 'C'], dropIntervalMs: 2400, fallDurationSec: 2.8, mixCount: 2 },
  4: { baseColors: ['R', 'G', 'B', 'Y', 'M', 'C'], dropIntervalMs: 2200, fallDurationSec: 2.6, mixCount: 2 },
  5: { baseColors: ['R', 'G', 'B', 'Y', 'M', 'C'], dropIntervalMs: 2000, fallDurationSec: 2.4, mixCount: 2 },
  6: { baseColors: ['R', 'G', 'B', 'Y', 'M', 'C'], dropIntervalMs: 1800, fallDurationSec: 2.2, mixCount: 3 },
  7: { baseColors: ['R', 'G', 'B', 'Y', 'M', 'C'], dropIntervalMs: 1600, fallDurationSec: 2, mixCount: 3 },
  8: { baseColors: ['R', 'G', 'B', 'Y', 'M', 'C', 'O', 'L'], dropIntervalMs: 1400, fallDurationSec: 1.8, mixCount: 3 },
  9: { baseColors: ['R', 'G', 'B', 'Y', 'M', 'C', 'O', 'L', 'P'], dropIntervalMs: 1200, fallDurationSec: 1.6, mixCount: 4 },
  10: { baseColors: ['R', 'G', 'B', 'Y', 'M', 'C', 'O', 'L', 'P', 'T'], dropIntervalMs: 1050, fallDurationSec: 1.45, mixCount: 4 },
  11: { baseColors: ['R', 'G', 'B', 'Y', 'M', 'C', 'O', 'L', 'P', 'T'], dropIntervalMs: 900, fallDurationSec: 1.3, mixCount: 4 },
  12: { baseColors: ['R', 'G', 'B', 'Y', 'M', 'C', 'O', 'L', 'P', 'T'], dropIntervalMs: 780, fallDurationSec: 1.2, mixCount: 5 },
  13: { baseColors: ['R', 'G', 'B', 'Y', 'M', 'C', 'O', 'L', 'P', 'T'], dropIntervalMs: 660, fallDurationSec: 1.1, mixCount: 5 },
  14: { baseColors: ['R', 'G', 'B', 'Y', 'M', 'C', 'O', 'L', 'P', 'T'], dropIntervalMs: 560, fallDurationSec: 1.0, mixCount: 5 },
  15: { baseColors: ['R', 'G', 'B', 'Y', 'M', 'C', 'O', 'L', 'P', 'T'], dropIntervalMs: 480, fallDurationSec: 0.95, mixCount: 5 },
  16: { baseColors: ['R', 'G', 'B', 'Y', 'M', 'C', 'O', 'L', 'P', 'T'], dropIntervalMs: 410, fallDurationSec: 0.88, mixCount: 5 },
  17: { baseColors: ['R', 'G', 'B', 'Y', 'M', 'C', 'O', 'L', 'P', 'T'], dropIntervalMs: 350, fallDurationSec: 0.82, mixCount: 5 },
  18: { baseColors: ['R', 'G', 'B', 'Y', 'M', 'C', 'O', 'L', 'P', 'T'], dropIntervalMs: 300, fallDurationSec: 0.75, mixCount: 5 },
  19: { baseColors: ['R', 'G', 'B', 'Y', 'M', 'C', 'O', 'L', 'P', 'T'], dropIntervalMs: 260, fallDurationSec: 0.68, mixCount: 5 },
  20: { baseColors: ['R', 'G', 'B', 'Y', 'M', 'C', 'O', 'L', 'P', 'T'], dropIntervalMs: 220, fallDurationSec: 0.6, mixCount: 5 },
};

export function getPaintParams(level: number): PaintParams {
  return PAINT_PARAMS[Math.min(20, Math.max(1, level))] ?? PAINT_PARAMS[1];
}
