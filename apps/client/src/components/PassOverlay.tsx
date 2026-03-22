import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { computeRunScore } from 'shared';
import { getPercentilePreview } from '../services/api';
import { fireMilestoneBurst, fireChampion } from '../utils/confetti';

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
  const [count, setCount] = useState(2); // 2-1-Go (빠른 진행)
  const [finalPhase, setFinalPhase] = useState<'ready' | 'go' | null>(null);
  const [percentile, setPercentile] = useState<{
    current: number;
    next: number | null;
  } | null>(null);
  const completedRef = useRef(false);
  const [praise] = useState(() =>
    ['잘하셨어요!', '완벽해요!', '대단해요!', '굿!', '수준이에요!'][Math.floor(Math.random() * 5)]!
  );

  // Perfect: 3초 보너스 | Great: 2연속+ 콤보 | Good: 기본
  const tier: 'perfect' | 'great' | 'good' =
    pendingBonus > 0 ? 'perfect' : comboCount >= 2 ? 'great' : 'good';

  // 마일스톤(5/10/15) 달성 시 도파민 burst
  const isMilestone = [5, 10, 15].includes(passedLevel);
  useEffect(() => {
    if (isMilestone) fireMilestoneBurst(passedLevel);
  }, [isMilestone, passedLevel]);

  // 20단계 올클리어 — 챔피언 축포 즉시
  const isChampion = passedLevel === 20;
  useEffect(() => {
    if (isChampion) fireChampion();
  }, [isChampion]);

  // DB 기반 퍼센타일 조회 (기본점수 + 보너스 반영)
  const stageTotal = Math.round(pendingScore) + pendingBonus;
  useEffect(() => {
    const currentScore = calcNextStageScore(perStageResults, stageTotal);
    const nextScore = calcWithNextStage(perStageResults, stageTotal, 80);
    getPercentilePreview(currentScore, nextScore)
      .then(({ currentPercentile, nextPercentile }) =>
        setPercentile({ current: currentPercentile, next: nextPercentile })
      )
      .catch(() => setPercentile({ current: 50, next: 45 }));
  }, [perStageResults, stageTotal]);

  useEffect(() => {
    if (count <= 0) {
      setFinalPhase('ready');
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 400);
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
      ? '다음 스테이지부터 난이도가 올라가요 📈'
      : passedLevel === 14
        ? '다음이 상위 구간이에요. 집중!'
        : passedLevel === 15
          ? '🎉 15단계 통과! 상위 구간 돌입!'
          : null;

  const championMsg = passedLevel === 20 ? '👑 챔피언! 상위 0.1% · 정말 잘했어요!' : null;

  const milestoneMsg =
    passedLevel === 5
      ? '🏆 5단계 마일스톤!'
      : passedLevel === 10
        ? '🌟 10단계 마일스톤!'
        : passedLevel === 15
          ? '👑 15단계 마일스톤!'
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
        {/* 티어 배지 */}
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 12 }}
          className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold mb-2 ${
            tier === 'perfect'
              ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white shadow-lg shadow-amber-300/50'
              : tier === 'great'
                ? 'bg-gradient-to-r from-violet-400 to-purple-500 text-white shadow-lg shadow-violet-300/50'
                : 'bg-toss-blue/15 text-toss-blue'
          }`}
        >
          {tier === 'perfect' && '✨ PERFECT!'}
          {tier === 'great' && '🔥 GREAT!'}
          {tier === 'good' && '👍 GOOD!'}
        </motion.div>
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
            이번 스테이지 +{stageTotal}점
          </p>
          {pendingBonus > 0 && (
            <p className="text-sm font-bold text-amber-600 animate-pulse">
              ⚡ 3초 보너스 +{pendingBonus}점 포함!
            </p>
          )}
        </motion.div>

        {/* 핵심만: 진행률 + 마일스톤/난이도 예고 */}
        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="text-sm text-toss-sub mb-3"
        >
          {passedLevel === 20 ? '20/20 완료! 🎉' : `${passedLevel}/20`}
        </motion.p>
        {(championMsg || difficultyMsg || milestoneMsg) && (
          <motion.p
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.08 }}
            className={`text-sm mb-4 ${
              championMsg ? 'text-lg font-black text-amber-600' : milestoneMsg ? 'font-bold text-amber-600' : 'text-toss-sub'
            }`}
          >
            {championMsg ?? milestoneMsg ?? difficultyMsg}
          </motion.p>
        )}

        <p className="text-toss-sub text-xs mb-3">화면 터치 시 바로 시작</p>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleSkip(); }}
          className="mb-3 px-4 py-1.5 rounded-lg bg-toss-blue/10 text-toss-blue text-sm font-medium hover:bg-toss-blue/20 transition"
        >
          바로 시작
        </button>
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
