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
  const [muted, setMuted] = useState(() => isMuted());
  const prevAddedRef = useRef<number>(0);
  const prevBonusRef = useRef<number>(0);
  const timeLimit = getTimeLimitForGame(gameType, level);
  const gameIndex = ['REACTION', 'TAP10', 'MEMORY', 'CALCULATION', 'PAINT'].indexOf(gameType) + 1;

  useEffect(() => {
    if (lastAddedScore > 0 && lastAddedScore !== prevAddedRef.current) {
      prevAddedRef.current = lastAddedScore;
      fireScoreBurst();
    }
    if (lastAddedBonus > 0 && lastAddedBonus !== prevBonusRef.current) {
      prevBonusRef.current = lastAddedBonus;
      fireBonusBurst();
    }
    if ((lastAddedScore > 0 || lastAddedBonus > 0)) {
      const t = setTimeout(() => {
        onClearLastAddedScore?.();
        prevAddedRef.current = 0;
        prevBonusRef.current = 0;
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [lastAddedScore, lastAddedBonus, onClearLastAddedScore]);

  const handleMuteToggle = () => {
    setMuted(toggleMuted());
  };

  return (
    <header className="bg-white border-b border-toss-border">
      {/* 진행률 바 - 부드러운 애니메이션 */}
      <div className="h-1.5 bg-toss-bg overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-toss-blue to-blue-400"
          initial={{ width: 0 }}
          animate={{ width: `${(level / 20) * 100}%` }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          style={{ boxShadow: '0 0 8px rgba(49,130,246,0.5)' }}
        />
      </div>
      <div className="px-3 py-2">
        {/* 1행: 유형·단계·제한시간·mute — 모바일 최적화 */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0 shrink">
            <span className="text-xs text-toss-sub whitespace-nowrap">유형 {gameIndex}/5</span>
            <span className="text-xs text-toss-sub hidden sm:inline">·</span>
            <span className="text-xs text-toss-sub whitespace-nowrap">{level}/20 · {timeLimit}초</span>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <span className="text-xs font-medium text-toss-text truncate max-w-[4rem] sm:max-w-none">{GAME_TYPE_LABELS[gameType]}</span>
            <button
              type="button"
              onClick={handleMuteToggle}
              className="p-1 rounded-lg hover:bg-toss-bg transition -mr-1"
              aria-label={muted ? '소리 켜기' : '소리 끄기'}
            >
              {muted ? (
                <svg className="w-4 h-4 text-toss-sub" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-toss-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              )}
            </button>
          </div>
        </div>
        {/* 2행: 배지 — flex-wrap으로 모바일에서 자연스럽게 줄바꿈 */}
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5 justify-between">
          <div className="flex flex-wrap gap-1.5 min-w-0">
            {remainingRevives > 0 && (
              <span className="px-1.5 py-0.5 rounded-md bg-green-50 text-green-700 text-[11px] font-medium border border-green-200 whitespace-nowrap">
                💪 부활 {remainingRevives}/2
              </span>
            )}
            {comboCount >= 2 && (
              <motion.span
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 12 }}
                className="px-1.5 py-0.5 rounded-md bg-gradient-to-r from-amber-100 to-amber-50 text-amber-700 text-[11px] font-bold border border-amber-200/60 whitespace-nowrap"
              >
                <motion.span animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}>
                  🔥 {comboCount}연속
                </motion.span>
              </motion.span>
            )}
            <span className="px-1.5 py-0.5 rounded-md bg-toss-bg text-toss-blue text-[11px] font-medium whitespace-nowrap">
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
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-toss-blue/10 text-toss-blue font-bold text-[11px] border border-toss-blue/30"
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
