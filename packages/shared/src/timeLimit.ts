/**
 * 공통 제한시간: 9+ 짧음, 16+ 더 짧음, 20 = 2초 (1% 통과)
 */
export function timeLimitForLevel(level: number): number {
  if (level <= 1) return 25;
  if (level >= 20) return 2;
  if (level >= 16) {
    const t = (level - 16) / 4;
    return Math.round(5 - t * 3);
  }
  if (level >= 9) {
    const t = (level - 9) / 7;
    return Math.round(8 - t * 3);
  }
  const t = (level - 1) / 8;
  return Math.round(25 - t * 9);
}

/** 타이밍 게임 성공 허용 범위(초): 1~8은 ±0.8, 9+는 ±0.5 */
export function timingSuccessToleranceForLevel(level: number): number {
  return level <= 8 ? 0.8 : 0.5;
}

/**
 * 타이밍 게임 시간 배속: 9+ 빠름, 16+ 더 빠름, 20 = 6배 (1% 통과)
 */
export function timingSpeedMultiplierForLevel(level: number): number {
  if (level <= 1) return 1;
  if (level >= 20) return 6;
  if (level >= 16) {
    const t = (level - 16) / 4;
    return Math.round((4.5 + t * 1.5) * 10) / 10;
  }
  if (level >= 9) {
    const t = (level - 9) / 7;
    return Math.round((2.5 + t * 2) * 10) / 10;
  }
  const t = (level - 1) / 8;
  return Math.round((1 + t * 0.8) * 10) / 10;
}

/**
 * 반응속도 게임 전용 제한시간: 난이도 완화 — 1단계 50초, 20단계 10초
 */
export function reactionTimeLimitForLevel(level: number): number {
  if (level <= 1) return 50;
  if (level >= 20) return 10;
  const t = (level - 1) / 19;
  return Math.round(50 - t * 40);
}

/**
 * 10초 터치(시간 맞추기) 게임 제한시간: 최대 10초, 20단계 3초
 */
export function tap10TimeLimitForLevel(level: number): number {
  if (level <= 1) return 10;
  if (level >= 20) return 3;
  const t = (level - 1) / 19;
  return Math.round(10 - t * 7);
}

/**
 * 물감 색깔 맞추기 게임 제한시간(초) — 쉬우면서 아깝게, 초반 넉넉 후반 긴장
 */
export function paintTimeLimitForLevel(level: number): number {
  if (level <= 1) return 50;
  if (level <= 3) return 46;
  if (level <= 5) return 42;
  if (level <= 8) return 36 + (8 - level); // 36~39
  if (level >= 20) return 14;
  if (level >= 16) return 17 + (20 - level); // 17~21
  if (level >= 9) return 24 + (16 - level);   // 24~31
  return Math.round(36 - (level - 6) * 0.8);
}

/**
 * 반응속도 게임 색상 전환 주기(ms): 난이도 완화 — 초반 더 느림
 */
export function colorIntervalForLevel(level: number): number {
  if (level <= 1) return 900;
  if (level >= 20) return 50;
  if (level >= 16) {
    const t = (level - 16) / 4;
    return Math.round(180 - t * 100);
  }
  if (level >= 9) {
    const t = (level - 9) / 7;
    return Math.round(420 - t * 250);
  }
  const t = (level - 1) / 8;
  return Math.round(950 - t * 450);
}
