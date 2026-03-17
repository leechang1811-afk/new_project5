/**
 * Web Audio API 기반 게임 사운드 - 외부 파일 없이 경쾌한 피드백
 * PO: 성공·실패·탭 등 즉각 반응으로 몰입감 UP
 */

const MUTE_KEY = 'sound_muted';

export function isMuted(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(MUTE_KEY) === '1';
}

export function setMuted(muted: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
}

export function toggleMuted(): boolean {
  const next = !isMuted();
  setMuted(next);
  return next;
}

let audioContext: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioContext;
}

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.15,
  fade = true
): void {
  if (isMuted()) return;
  const ctx = getContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    if (fade) {
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    }
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // ignore
  }
}

/** 성공 — 밝은 상승 침 */
export function playSuccess(): void {
  playTone(523, 0.08, 'sine', 0.12);
  setTimeout(() => playTone(659, 0.1, 'sine', 0.1), 60);
  setTimeout(() => playTone(784, 0.12, 'sine', 0.08), 120);
}

/** 실패 — 부드러운 하강 */
export function playFail(): void {
  playTone(392, 0.15, 'triangle', 0.12);
  setTimeout(() => playTone(330, 0.2, 'triangle', 0.1), 80);
}

/** 탭/클릭 — 가볍고 짧게 */
export function playTap(): void {
  playTone(880, 0.04, 'sine', 0.06);
}

/** 콤보 — 스파클 느낌 */
export function playCombo(): void {
  playTone(880, 0.06, 'sine', 0.1);
  setTimeout(() => playTone(1100, 0.08, 'sine', 0.08), 40);
  setTimeout(() => playTone(1320, 0.1, 'sine', 0.06), 80);
}

/** 물감 선택 — 드롭 톤 */
export function playDropSelect(): void {
  playTone(440, 0.05, 'sine', 0.08);
}

/** 숫자 노출 시작 (기억력) — 짧은 톤 */
export function playReveal(): void {
  playTone(523, 0.03, 'sine', 0.05);
}

/** PERFECT! — 3초 보너스 달성 시 화려한 상승 */
export function playPerfect(): void {
  playTone(523, 0.06, 'sine', 0.12);
  setTimeout(() => playTone(659, 0.06, 'sine', 0.1), 50);
  setTimeout(() => playTone(784, 0.08, 'sine', 0.1), 100);
  setTimeout(() => playTone(1047, 0.12, 'sine', 0.08), 150);
}

/** GREAT! — 높은 점수 달성 */
export function playGreat(): void {
  playTone(587, 0.05, 'sine', 0.1);
  setTimeout(() => playTone(784, 0.08, 'sine', 0.08), 60);
}
