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

export function fireChampion(): void {
  const duration = 3500;
  const end = Date.now() + duration;
  const championColors = ['#FBBF24', '#F59E0B', '#D97706', '#FCD34D', '#FDE68A'];

  const frame = () => {
    confetti({
      particleCount: 12,
      angle: 60,
      spread: 70,
      origin: { x: 0, y: 0.5 },
      colors: championColors,
      ticks: 150,
      scalar: 1.8,
    });
    confetti({
      particleCount: 12,
      angle: 120,
      spread: 70,
      origin: { x: 1, y: 0.5 },
      colors: championColors,
      ticks: 150,
      scalar: 1.8,
    });
    confetti({
      particleCount: 8,
      spread: 100,
      origin: { y: 0.6 },
      colors: championColors,
      ticks: 150,
      scalar: 1.5,
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
