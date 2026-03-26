import { useState, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  REACTION_COLORS,
  reactionTimeLimitForLevel,
  colorIntervalForLevel,
  type ReactionColor,
} from 'shared';
import { normalizeStageScore } from 'shared';
import { playFail } from '../services/sounds';

const COLOR_MAP: Record<ReactionColor, string> = {
  Red: '#EF4444',
  Blue: '#3B82F6',
  Green: '#22C55E',
  Purple: '#A855F7',
  Yellow: '#EAB308',
};

const COLOR_LABELS_KO: Record<ReactionColor, string> = {
  Red: '빨강',
  Blue: '파랑',
  Green: '초록',
  Purple: '보라',
  Yellow: '노랑',
};

interface ReactionGameProps {
  level: number;
  onSuccess: (score: number, bonus?: number) => void;
  onFail: () => void;
}

export default function ReactionGame({ level, onSuccess, onFail }: ReactionGameProps) {
  const [phase, setPhase] = useState<'idle' | 'instruction' | 'playing'>('idle');
  const [targetColor, setTargetColor] = useState<ReactionColor | null>(null);
  const [currentColor, setCurrentColor] = useState<ReactionColor | null>(null);
  const [currentColorIndex, setCurrentColorIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const startTimeRef = useRef<number>(0);
  const currentColorRef = useRef<ReactionColor | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasFailedRef = useRef(false);

  const timeLimit = reactionTimeLimitForLevel(level);
  const colorInterval = colorIntervalForLevel(level);

  const startGame = useCallback(() => {
    hasFailedRef.current = false;
    const target = REACTION_COLORS[Math.floor(Math.random() * REACTION_COLORS.length)]!;
    setTargetColor(target);
    const first = REACTION_COLORS[0]!;
    setCurrentColor(first);
    currentColorRef.current = first;
    setCurrentColorIndex(0);
    setPhase('instruction');
  }, []);

  useLayoutEffect(() => {
    startGame();
  }, [startGame]);

  useEffect(() => {
    if (phase !== 'instruction') return;
    const t = setTimeout(() => {
      startTimeRef.current = Date.now();
      setPhase('playing');
      setTimeLeft(timeLimit);
    }, 1500);
    return () => clearTimeout(t);
  }, [phase, timeLimit]);

  // playing 중 색상 순환 (ref도 동기 업데이트 → 클릭 시 실제 표시색과 일치)
  useEffect(() => {
    if (phase !== 'playing') return;
    currentColorRef.current = REACTION_COLORS[0]!;
    intervalRef.current = setInterval(() => {
      setCurrentColorIndex((prev) => {
        const next = (prev + 1) % REACTION_COLORS.length;
        const nextColor = REACTION_COLORS[next]!;
        currentColorRef.current = nextColor;
        setCurrentColor(nextColor);
        return next;
      });
    }, colorInterval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase, colorInterval]);

  useEffect(() => {
    if (phase !== 'playing' || timeLeft <= 0) return;
    const id = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (!hasFailedRef.current) {
            hasFailedRef.current = true;
            playFail();
            onFail();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, timeLeft, onFail]);

  const handleShapeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (phase !== 'playing' || !targetColor || hasFailedRef.current) return;
    const actualColor = currentColorRef.current;
    if (!actualColor || actualColor !== targetColor) {
      hasFailedRef.current = true;
      playFail();
      onFail();
      return;
    }
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    const baseRawScore = Math.max(0, 100 - elapsed * 2);
    const bonusAmount = elapsed < 3 ? Math.min(20, 10 + Math.min(level, 10)) : 0;
    const baseScore = normalizeStageScore(baseRawScore, 100, true);
    onSuccess(baseScore, bonusAmount);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden p-3 sm:p-4">
      <AnimatePresence mode="wait">
        {(phase === 'instruction' || phase === 'playing') && targetColor && (
          <motion.div
            key="play"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-md text-center"
          >
            <p className="text-lg font-medium text-toss-text mb-6">
              {targetColor && COLOR_LABELS_KO[targetColor]}일 때 탭하세요
            </p>
            <p className="text-toss-sub text-sm mb-4">
              도형이 {targetColor && COLOR_LABELS_KO[targetColor]}색으로 바뀌면 탭하세요
            </p>
            <div className="flex justify-center gap-2 mb-6">
              <span className="text-toss-sub">제한시간</span>
              <span className="font-medium text-toss-blue">{timeLeft}초</span>
            </div>
            <button
              type="button"
              onClick={handleShapeClick}
              className="w-48 h-48 sm:w-56 sm:h-56 min-w-[160px] min-h-[160px] mx-auto block rounded-2xl shadow-md border border-toss-border hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer touch-manipulation"
              style={{
                backgroundColor: currentColor ? COLOR_MAP[currentColor] : '#E5E7EB',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
