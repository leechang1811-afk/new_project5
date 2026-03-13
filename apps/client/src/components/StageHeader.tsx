import { useState, useEffect, useRef } from 'react';
import {
  GAME_TYPE_LABELS,
  timeLimitForLevel,
  reactionTimeLimitForLevel,
  paintTimeLimitForLevel,
} from 'shared';
import type { GameType } from 'shared';
import { isMuted, toggleMuted } from '../services/sounds';
import { motion, AnimatePresence } from 'framer-motion';
import { fireScoreBurst } from '../utils/confetti';

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
  onClearLastAddedScore?: () => void;
}

export default function StageHeader({
  gameType,
  level,
  cumulativeScore,
  comboCount = 0,
  remainingRevives = 0,
  lastAddedScore = 0,
  onClearLastAddedScore,
}: StageHeaderProps) {
  const [muted, setMuted] = useState(() => isMuted());
  const prevAddedRef = useRef<number>(0);
  const timeLimit = getTimeLimitForGame(gameType, level);
  const gameIndex = ['REACTION', 'TAP10', 'MEMORY', 'CALCULATION', 'PAINT'].indexOf(gameType) + 1;

  useEffect(() => {
    if (lastAddedScore > 0 && lastAddedScore !== prevAddedRef.current) {
      prevAddedRef.current = lastAddedScore;
      fireScoreBurst();
      const t = setTimeout(() => {
        onClearLastAddedScore?.();
        prevAddedRef.current = 0;
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [lastAddedScore, onClearLastAddedScore]);

  const handleMuteToggle = () => {
    setMuted(toggleMuted());
  };

  return (
    <header className="bg-white border-b border-toss-border">
      {/* 진행률 바 */}
      <div className="h-1 bg-toss-bg">
        <div
          className="h-full bg-toss-blue transition-all duration-500"
          style={{ width: `${(level / 20) * 100}%` }}
        />
      </div>
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-toss-sub">문제유형 {gameIndex}/5</span>
            <button
              type="button"
              onClick={handleMuteToggle}
              className="p-1 rounded-lg hover:bg-toss-bg transition"
              aria-label={muted ? '소리 켜기' : '소리 끄기'}
            >
              {muted ? (
                <svg className="w-5 h-5 text-toss-sub" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-toss-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              )}
            </button>
          </div>
          <div className="text-sm font-medium text-toss-text text-center flex-1">
            {GAME_TYPE_LABELS[gameType]}
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="text-sm text-toss-sub">
            {level}/20단계 · 제한시간 {timeLimit}초
          </div>
          <div className="flex items-center gap-2">
            {remainingRevives > 0 && (
              <span className="px-2 py-0.5 rounded-lg bg-green-50 text-green-700 text-xs font-medium border border-green-200">
                💪 부활 {remainingRevives}회
              </span>
            )}
            {comboCount >= 2 && (
              <span className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-100 to-amber-50 text-amber-700 text-xs font-bold animate-pulse border border-amber-200/60 shadow-sm">
                🔥 {comboCount}연속!
              </span>
            )}
            <div className="relative flex items-center gap-1">
              <span className="px-2 py-0.5 rounded-lg bg-toss-bg text-toss-blue text-xs font-medium">
                누적 점수 {cumulativeScore}
              </span>
              <AnimatePresence>
                {lastAddedScore != null && lastAddedScore > 0 && (
                  <motion.span
                    key={lastAddedScore}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1.3, opacity: 1 }}
                    exit={{ scale: 1.5, opacity: 0 }}
                    transition={{ type: 'spring', damping: 12 }}
                    className="absolute -top-1 -right-1 px-2 py-0.5 rounded-full bg-amber-400 text-amber-900 font-bold text-xs shadow-lg border-2 border-amber-500"
                  >
                    +{lastAddedScore}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
