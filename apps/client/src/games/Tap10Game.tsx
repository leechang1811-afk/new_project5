import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  tap10TimeLimitForLevel,
  timingSpeedMultiplierForLevel,
  timingSuccessToleranceForLevel,
  normalizeStageScore,
} from 'shared';
import { playFail } from '../services/sounds';

interface Tap10GameProps {
  level: number;
  onSuccess: (score: number, bonus?: number) => void;
  onFail: (reason?: string) => void;
}

/** targetSec은 0~min(10, timeLimitSec) 안에서. 탭 목표 시간 최대 10초 */
function pickTargetSec(timeLimitSec: number): number {
  const maxTarget = Math.min(10, timeLimitSec);
  const margin = maxTarget >= 6 ? 2 : 0;
  const min = margin;
  const max = Math.max(min, maxTarget - margin);
  return min + Math.floor(Math.random() * (max - min + 1));
}

export default function Tap10Game({ level, onSuccess, onFail }: Tap10GameProps) {
  const timeLimitSec = tap10TimeLimitForLevel(level);
  const speedMultiplier = timingSpeedMultiplierForLevel(level);
  const successTolerance = timingSuccessToleranceForLevel(level);
  const targetSec = useMemo(() => pickTargetSec(timeLimitSec), [timeLimitSec]);

  const [elapsed, setElapsed] = useState(0);
  const [started, setStarted] = useState(false);
  const startTimeRef = useRef<number>(0);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!started) return;
    const id = setInterval(() => {
      const realElapsed = (Date.now() - startTimeRef.current) / 1000;
      const displayElapsed = realElapsed * speedMultiplier;
      if (displayElapsed >= timeLimitSec) {
        if (!completedRef.current) {
          completedRef.current = true;
          playFail();
          onFail('timeout');
        }
        setElapsed(timeLimitSec);
        return;
      }
      setElapsed(Math.floor(displayElapsed * 10) / 10);
    }, 50);
    return () => clearInterval(id);
  }, [started, timeLimitSec, speedMultiplier, onFail]);

  const handleTap = (e: React.MouseEvent) => {
    e.preventDefault();
    if (completedRef.current) return;
    if (!started) {
      setStarted(true);
      startTimeRef.current = Date.now();
      setElapsed(0);
      return;
    }
    const realElapsed = (Date.now() - startTimeRef.current) / 1000;
    const displayElapsed = realElapsed * speedMultiplier;
    if (displayElapsed >= timeLimitSec) {
      completedRef.current = true;
      playFail();
      onFail('timeout');
      return;
    }
    const diff = Math.abs(displayElapsed - targetSec);
    if (diff <= successTolerance) {
      completedRef.current = true;
      const baseRawScore = Math.max(0, 100 - diff * 20);
      const bonusAmount = realElapsed < 3 ? Math.min(20, 10 + Math.min(level, 10)) : 0;
      onSuccess(normalizeStageScore(baseRawScore, 100, true), bonusAmount);
    } else {
      completedRef.current = true;
      playFail();
      onFail(displayElapsed < targetSec ? 'too_early' : 'too_late');
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto overflow-x-hidden pt-0 pb-3 px-3 touch-manipulation select-none sm:pb-4 sm:px-4">
      <div className="mb-2 text-center space-y-1">
        <p className="text-lg font-medium text-toss-text">
          {!started ? '탭하면 시작 → 목표 ' : '목표 '}
          <span className="text-toss-blue font-bold">{targetSec}</span>초에 탭!
        </p>
      </div>

      <div className="mb-3">
        <span className="text-5xl font-bold text-toss-blue tabular-nums">
          {elapsed.toFixed(1)}
        </span>
        <span className="text-toss-sub text-lg ml-1">초</span>
      </div>

      <motion.button
        type="button"
        onClick={handleTap}
        className="w-44 h-44 sm:w-52 sm:h-52 min-w-[176px] min-h-[176px] rounded-full bg-toss-blue text-white font-semibold shadow-md border border-toss-border hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer flex items-center justify-center touch-manipulation"
        whileTap={{ scale: 0.98 }}
      >
        탭
      </motion.button>
    </div>
  );
}
