import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { computeRunScore } from 'shared';
import { getPercentilePreview } from '../services/api';

interface PassOverlayProps {
  passedLevel: number;
  perStageResults: { score: number }[];
  pendingScore: number;
  pendingBonus?: number;
  comboCount?: number;
  onComplete: () => void;
}

function calcNextStageScore(
  perStageResults: { score: number }[],
  newScore: number
): number {
  return computeRunScore([...perStageResults, { score: newScore }]);
}

function calcWithNextStage(
  perStageResults: { score: number }[],
  newScore: number,
  nextStageScore: number
): number {
  return computeRunScore([
    ...perStageResults,
    { score: newScore },
    { score: nextStageScore },
  ]);
}

export default function PassOverlay({
  passedLevel,
  perStageResults,
  pendingScore,
  pendingBonus = 0,
  comboCount = 0,
  onComplete,
}: PassOverlayProps) {
  const [count, setCount] = useState(3);
  const [finalPhase, setFinalPhase] = useState<'ready' | 'go' | null>(null);
  const [percentile, setPercentile] = useState<{
    current: number;
    next: number | null;
  } | null>(null);
  const completedRef = useRef(false);
  const [praise] = useState(() =>
    ['잘하셨어요!', '완벽해요!', '대단해요!', '굿!', '수준이에요!'][Math.floor(Math.random() * 5)]!
  );

  // DB 기반 퍼센타일 조회
  useEffect(() => {
    const currentScore = calcNextStageScore(perStageResults, pendingScore);
    const nextScore = calcWithNextStage(perStageResults, pendingScore, 80);
    getPercentilePreview(currentScore, nextScore)
      .then(({ currentPercentile, nextPercentile }) =>
        setPercentile({ current: currentPercentile, next: nextPercentile })
      )
      .catch(() => setPercentile({ current: 50, next: 45 }));
  }, [perStageResults, pendingScore]);

  useEffect(() => {
    if (count <= 0) {
      setFinalPhase('ready');
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 500);
    return () => clearTimeout(t);
  }, [count]);

  useEffect(() => {
    if (finalPhase === 'ready') {
      const t = setTimeout(() => setFinalPhase('go'), 300);
      return () => clearTimeout(t);
    }
    if (finalPhase === 'go') {
      const t = setTimeout(() => {
        if (!completedRef.current) {
          completedRef.current = true;
          onComplete();
        }
      }, 250);
      return () => clearTimeout(t);
    }
  }, [finalPhase, onComplete]);

  const difficultyMsg =
    passedLevel === 8
      ? '🎉 8단계 통과! 이제 난이도가 상승합니다'
      : passedLevel === 15
        ? '🎉 15단계 통과! 상위 구간 돌입!'
        : null;

  const handleSkip = () => {
    if (!completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={handleSkip}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSkip(); } }}
      aria-label="다음 스테이지로"
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-40 p-6 cursor-pointer"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 15 }}
        className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center"
      >
        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-xl font-bold text-toss-blue mb-1"
        >
          {comboCount >= 2 ? `🎯 ${comboCount}연속!` : praise}
        </motion.p>
        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="text-lg font-medium text-toss-text mb-2"
        >
          {comboCount >= 2 ? '연속 성공!' : '통과입니다!'}
        </motion.p>

        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.08 }}
          className="mb-2 space-y-1"
        >
          <p className="text-base font-bold text-toss-blue">
            이번 스테이지 +{Math.round(pendingScore)}점
          </p>
          {pendingBonus > 0 && (
            <p className="text-sm font-bold text-amber-600 animate-pulse">
              ⚡ 3초 보너스 +{pendingBonus}점!
            </p>
          )}
        </motion.div>

        {difficultyMsg && (
          <motion.p
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="text-sm text-toss-sub mb-4"
          >
            {difficultyMsg}
          </motion.p>
        )}

        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-xs text-toss-sub mb-4"
        >
          {passedLevel}/20 완료 · {20 - passedLevel}단계 남았어요
        </motion.p>
        {percentile && (
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-sm text-toss-sub mb-4 space-y-1"
          >
            <p>현재 상위 {percentile.current}%</p>
            {percentile.next != null && (
              <p className="text-toss-blue font-medium">
                다음 단계 통과하면 상위 {percentile.next}% 👀
              </p>
            )}
          </motion.div>
        )}

        <p className="text-toss-sub text-xs mb-4">터치하면 바로 시작</p>
        <AnimatePresence mode="wait">
          {count > 0 ? (
            <motion.div
              key={count}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className={`text-5xl font-bold ${
                count === 3 ? 'text-blue-500' : count === 2 ? 'text-green-500' : 'text-yellow-500'
              }`}
            >
              {count}
            </motion.div>
          ) : (
            <motion.div
              key={finalPhase ?? 'go'}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`text-2xl font-bold ${
                finalPhase === 'go' ? 'text-red-500' : 'text-orange-500'
              }`}
            >
              {finalPhase === 'go' ? 'Go!' : 'Ready'}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
