/**
 * Dopamine-heavy confetti effects for game moments
 */
import confetti from 'canvas-confetti';

const COLORS = ['#3182F6', '#EAB308', '#22C55E', '#EF4444', '#A855F7', '#EC4899', '#06B6D4'];

export function fireSuccess(level: number = 1): void {
  const base = 30;
  const levelBonus = Math.min(150, (level - 1) * 15);
  const count = base + levelBonus;
  const scalar = 1.2 + (level - 1) * 0.05;
  confetti({ particleCount: count, angle: 60, spread: 60 + level * 2, origin: { x: 0 }, colors: COLORS, scalar });
  confetti({ particleCount: count, angle: 120, spread: 60 + level * 2, origin: { x: 1 }, colors: COLORS, scalar });
  if (level >= 3) {
    confetti({ particleCount: Math.floor(count * 0.9), spread: 100, origin: { y: 0.5 }, colors: COLORS, scalar });
  }
  if (level >= 10) {
    confetti({ particleCount: Math.floor(count * 0.7), spread: 110, origin: { x: 0.3, y: 0.3 }, colors: COLORS, scalar });
    confetti({ particleCount: Math.floor(count * 0.7), spread: 110, origin: { x: 0.7, y: 0.3 }, colors: COLORS, scalar });
  }
  if (level >= 15) {
    confetti({ particleCount: Math.floor(count * 0.6), spread: 130, origin: { x: 0.5, y: 0 }, colors: COLORS, scalar });
  }
}

export function fireCombo(count: number, level: number = 1): void {
  const levelBonus = Math.min(80, (level - 1) * 8);
  const particleCount = Math.min(120, 25 + count * 8 + levelBonus);
  const scalar = 1.2 + (level - 1) * 0.04;
  confetti({
    particleCount,
    spread: 90 + level * 2,
    origin: { y: 0.6 },
    colors: COLORS,
    ticks: 120,
    gravity: 1.2,
    scalar,
  });
}

/** 20단계 올클리어 — 상위 0.1% 도파민 폭발 축포 */
export function fireChampion(): void {
  const duration = 5500;
  const end = Date.now() + duration;
  const championColors = ['#FBBF24', '#F59E0B', '#D97706', '#FCD34D', '#FDE68A', '#FEF3C7', '#FDE047'];

  const frame = () => {
    // 좌우 폭발 (축포 느낌)
    confetti({
      particleCount: 35,
      angle: 60,
      spread: 85,
      origin: { x: 0, y: 0.6 },
      colors: championColors,
      ticks: 180,
      scalar: 2.2,
      gravity: 0.9,
    });
    confetti({
      particleCount: 35,
      angle: 120,
      spread: 85,
      origin: { x: 1, y: 0.6 },
      colors: championColors,
      ticks: 180,
      scalar: 2.2,
      gravity: 0.9,
    });
    // 하단에서 위로 터지는 축포
    confetti({
      particleCount: 45,
      spread: 140,
      origin: { x: 0.5, y: 0.75 },
      colors: championColors,
      ticks: 160,
      scalar: 1.8,
      startVelocity: 45,
    });
    // 좌측 중앙
    confetti({
      particleCount: 25,
      spread: 110,
      origin: { x: 0.2, y: 0.5 },
      colors: championColors,
      ticks: 150,
      scalar: 1.6,
    });
    // 우측 중앙
    confetti({
      particleCount: 25,
      spread: 110,
      origin: { x: 0.8, y: 0.5 },
      colors: championColors,
      ticks: 150,
      scalar: 1.6,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}

export function fireNewBest(): void {
  confetti({ particleCount: 80, spread: 120, origin: { y: 0.5 }, colors: COLORS, scalar: 1.2 });
  confetti({ particleCount: 50, spread: 100, origin: { x: 0.2, y: 0.5 }, angle: 60, colors: COLORS });
  confetti({ particleCount: 50, spread: 100, origin: { x: 0.8, y: 0.5 }, angle: 120, colors: COLORS });
}

/** 누적 점수 추가 시 팡팡 터지는 소규모 burst */
export function fireScoreBurst(): void {
  const burstColors = ['#EAB308', '#F59E0B', '#22C55E', '#3182F6'];
  confetti({ particleCount: 18, spread: 55, origin: { x: 0.85, y: 0.12 }, colors: burstColors, scalar: 1.1, ticks: 100 });
  confetti({ particleCount: 12, spread: 45, origin: { x: 0.9, y: 0.15 }, angle: 90, colors: burstColors, scalar: 0.9, ticks: 80 });
}

/** 보너스 점수 빵빵 터지는 골드 burst */
export function fireBonusBurst(): void {
  const goldColors = ['#FBBF24', '#F59E0B', '#FCD34D', '#FDE68A', '#EAB308'];
  confetti({ particleCount: 35, spread: 70, origin: { x: 0.85, y: 0.1 }, colors: goldColors, scalar: 1.4, ticks: 120 });
  confetti({ particleCount: 25, spread: 60, origin: { x: 0.88, y: 0.08 }, angle: 90, colors: goldColors, scalar: 1.2, ticks: 100 });
  confetti({ particleCount: 20, spread: 80, origin: { x: 0.82, y: 0.12 }, colors: goldColors, scalar: 1.0, ticks: 90 });
}

/** 마일스톤(5/10/15단계) 달성 시 도파민 burst */
export function fireMilestoneBurst(level: number): void {
  const intensity = level >= 15 ? 1.5 : level >= 10 ? 1.2 : 1;
  const count = Math.floor(40 * intensity);
  const spread = 100 + level * 2;
  confetti({ particleCount: count, spread, origin: { x: 0.5, y: 0.5 }, colors: COLORS, scalar: 1.3, ticks: 100 });
  confetti({ particleCount: Math.floor(count * 0.7), spread: spread + 20, origin: { x: 0.3, y: 0.4 }, colors: COLORS, scalar: 1.1 });
  confetti({ particleCount: Math.floor(count * 0.7), spread: spread + 20, origin: { x: 0.7, y: 0.4 }, colors: COLORS, scalar: 1.1 });
}
