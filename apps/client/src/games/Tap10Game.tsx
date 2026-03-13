import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  tap10TimeLimitForLevel,
  timingSpeedMultiplierForLevel,
  timingSuccessToleranceForLevel,
  normalizeStageScore,
} from 'shared';
import { playSuccess, playFail } from '../services/sounds';

interface Tap10GameProps {
  level: number;
  onSuccess: (score: number, bonus?: number) => void;
  onFail: () => void;
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
          onFail();
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
      onFail();
      return;
    }
    const diff = Math.abs(displayElapsed - targetSec);
    if (diff <= successTolerance) {
      completedRef.current = true;
      playSuccess();
      let rawScore = Math.max(0, 100 - diff * 20);
      let bonusAmount = 0;
      if (realElapsed < 3) {
        bonusAmount = Math.min(20, 10 + Math.min(level, 10));
        rawScore = Math.min(100, rawScore + bonusAmount);
      }
      onSuccess(normalizeStageScore(rawScore, 100, true), bonusAmount);
    } else {
      completedRef.current = true;
      playFail();
      onFail();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
      <div className="mb-6 text-center">
        <p className="text-lg font-medium text-toss-text mb-2">
          {targetSec}초가 되면 탭을 누르세요
        </p>
        <p className="text-toss-sub text-sm">제한시간 {timeLimitSec}초</p>
      </div>

      <div className="mb-6">
        <span className="text-5xl font-bold text-toss-blue tabular-nums">
          {elapsed.toFixed(1)}
        </span>
        <span className="text-toss-sub text-lg ml-1">초</span>
      </div>

      <motion.button
        type="button"
        onClick={handleTap}
        className="w-52 h-52 rounded-full bg-toss-blue text-white font-semibold shadow-md border border-toss-border hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer flex items-center justify-center"
        whileTap={{ scale: 0.98 }}
      >
        탭
      </motion.button>
    </div>
  );
}
