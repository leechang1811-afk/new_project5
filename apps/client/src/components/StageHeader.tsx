import { useEffect, useRef } from 'react';
import {
  timeLimitForLevel,
  reactionTimeLimitForLevel,
  paintTimeLimitForLevel,
} from 'shared';
import type { GameType } from 'shared';
import { motion, AnimatePresence } from 'framer-motion';
import { fireScoreBurst, fireBonusBurst } from '../utils/confetti';

function getTimeLimitForGame(gameType: GameType, level: number): number {
  switch (gameType) {
    case 'REACTION':
      return reactionTimeLimitForLevel(level);
    case 'TAP10':
      return timeLimitForLevel(level);
    case 'PAINT':
      return paintTimeLimitForLevel(level);
    default:
      return timeLimitForLevel(level);
  }
}

interface StageHeaderProps {
  gameType: GameType;
  level: number;
  cumulativeScore: number;
  comboCount?: number;
  remainingRevives?: number; // 남은 부활 횟수 (0~2)
  lastAddedScore?: number;
  lastAddedBonus?: number;
  onClearLastAddedScore?: () => void;
}

export default function StageHeader({
  gameType,
  level,
  cumulativeScore,
  comboCount = 0,
  remainingRevives = 0,
  lastAddedScore = 0,
  lastAddedBonus = 0,
  onClearLastAddedScore,
}: StageHeaderProps) {
  const prevAddedRef = useRef<number>(0);
  const prevBonusRef = useRef<number>(0);
  const timeLimit = getTimeLimitForGame(gameType, level);
  const gameIndex = ['REACTION', 'TAP10', 'MEMORY', 'CALCULATION', 'PAINT'].indexOf(gameType) + 1;
  const metaLine = `유형 ${gameIndex}/5 · ${level}/20 · ${timeLimit}초`;

  useEffect(() => {
    if (lastAddedScore > 0 && lastAddedScore !== prevAddedRef.current) {
      prevAddedRef.current = lastAddedScore;
      fireScoreBurst();
    }
    if (lastAddedBonus > 0 && lastAddedBonus !== prevBonusRef.current) {
      prevBonusRef.current = lastAddedBonus;
      fireBonusBurst();
    }
    if (lastAddedScore > 0 || lastAddedBonus > 0) {
      const t = setTimeout(() => {
        onClearLastAddedScore?.();
        prevAddedRef.current = 0;
        prevBonusRef.current = 0;
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [lastAddedScore, lastAddedBonus, onClearLastAddedScore]);

  return (
    <header className="shrink-0 bg-white border-b border-toss-border">
      <div className="h-1.5 bg-toss-bg overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-toss-blue to-blue-400"
          initial={{ width: 0 }}
          animate={{ width: `${(level / 20) * 100}%` }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          style={{ boxShadow: '0 0 8px rgba(49,130,246,0.5)' }}
        />
      </div>
      <div className="px-3 py-2 sm:px-4 sm:py-2.5">
        <p className="text-xs text-toss-sub leading-tight">{metaLine}</p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex min-w-0 flex-wrap gap-1.5">
            {remainingRevives > 0 && (
              <span className="whitespace-nowrap rounded-md border border-green-200 bg-green-50 px-1.5 py-0.5 text-[11px] font-medium text-green-700">
                💪 부활 {remainingRevives}/2
              </span>
            )}
            {comboCount >= 2 && (
              <motion.span
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 12 }}
                className="whitespace-nowrap rounded-md border border-amber-200/60 bg-gradient-to-r from-amber-100 to-amber-50 px-1.5 py-0.5 text-[11px] font-bold text-amber-700"
              >
                <motion.span animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}>
                  🔥 {comboCount}연속
                </motion.span>
              </motion.span>
            )}
            <span className="whitespace-nowrap rounded-md bg-toss-bg px-1.5 py-0.5 text-[11px] font-medium text-toss-blue">
              {cumulativeScore}점
            </span>
          </div>
          <AnimatePresence>
            {(lastAddedScore != null && lastAddedScore > 0) || (lastAddedBonus != null && lastAddedBonus > 0) ? (
              <motion.span
                key={`add-${lastAddedScore ?? 0}-${lastAddedBonus ?? 0}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1.05, opacity: 1 }}
                exit={{ scale: 1.1, opacity: 0 }}
                transition={{ type: 'spring', damping: 14 }}
                className="flex shrink-0 items-center gap-0.5 rounded-full border border-toss-blue/30 bg-toss-blue/10 px-1.5 py-0.5 text-[11px] font-bold text-toss-blue"
              >
                {lastAddedScore != null && lastAddedScore > 0 && <span>+{lastAddedScore}</span>}
                {lastAddedBonus != null && lastAddedBonus > 0 && <span className="text-amber-600">+{lastAddedBonus}</span>}
              </motion.span>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
