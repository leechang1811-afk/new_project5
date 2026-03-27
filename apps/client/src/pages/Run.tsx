import { useEffect, useLayoutEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { fireSuccess, fireCombo } from '../utils/confetti';
import { playSuccess, playPerfect, playCombo } from '../services/sounds';
import {
  useGameStore,
  ensureUserHash,
} from '../store/gameStore';
import StageHeader from '../components/StageHeader';
import GameFloatingHud from '../components/GameFloatingHud';
import ReactionGame from '../games/ReactionGame';
import Tap10Game from '../games/Tap10Game';
import MemoryGame from '../games/MemoryGame';
import CalcGame from '../games/CalcGame';
import PaintGame from '../games/PaintGame';
import FailOverlay from './FailOverlay';
import PassOverlay from '../components/PassOverlay';

export default function Run() {
  const navigate = useNavigate();
  const {
    run,
    startRun,
    nextLevel,
    triggerFail,
    useRevive,
    confirmGameOver,
    getCurrentGameType,
    getComboCount,
    setUserHash,
  } = useGameStore();
  const lastCompletedRun = useGameStore((s) => s.lastCompletedRun);
  const cumulativeScore = useGameStore((s) => s.run?.cumulativeScore ?? 0);

  useEffect(() => {
    ensureUserHash().then(setUserHash);
  }, [setUserHash]);

  // 게임 종료 직후: result-gate로 이동. 새 게임 시작 시: startRun (홈→시작 시 리다이렉트 방지)
  useLayoutEffect(() => {
    if (!run && lastCompletedRun) {
      navigate('/result-gate', { replace: true });
      return;
    }
    if (!run && !lastCompletedRun) {
      startRun();
    }
  }, [run, lastCompletedRun, navigate, startRun]);

  const gameType = getCurrentGameType();
  const level = run?.level ?? 1;
  const showFailOverlay = run?.failed ?? false;
  const [showDifficultyUpgrade, setShowDifficultyUpgrade] = useState(false);
  const [showUpperLevelMsg, setShowUpperLevelMsg] = useState(false);
  const [showPassOverlay, setShowPassOverlay] = useState(false);
  const [pendingScore, setPendingScore] = useState<number | null>(null);
  const [pendingBonus, setPendingBonus] = useState<number>(0);
  const [passedLevelForOverlay, setPassedLevelForOverlay] = useState(1);
  const hasShownUpgradeRef = useRef(false);
  const hasShownUpperLevelRef = useRef(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const gameScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (level === 9 && !hasShownUpgradeRef.current) {
      hasShownUpgradeRef.current = true;
      setShowDifficultyUpgrade(true);
      const t = setTimeout(() => setShowDifficultyUpgrade(false), 2000);
      return () => clearTimeout(t);
    }
  }, [level]);

  useEffect(() => {
    if (level === 15 && !hasShownUpperLevelRef.current) {
      hasShownUpperLevelRef.current = true;
      setShowUpperLevelMsg(true);
      const t = setTimeout(() => setShowUpperLevelMsg(false), 2000);
      return () => clearTimeout(t);
    }
  }, [level]);

  // 단계/유형이 바뀔 때마다 스크롤을 맨 위로 (상단 점수 헤더가 잘리는 현상 완화)
  useLayoutEffect(() => {
    gameScrollRef.current?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }, [level, gameType]);

  useEffect(() => {
    if (typeof window === 'undefined' || showOnboarding) return;
    if (localStorage.getItem('ux_onboarding_v1')) return;
    if (run && level === 1 && (run?.perStageResults?.length ?? 0) === 0 && !showFailOverlay) {
      setShowOnboarding(true);
    }
  }, [run, level, showFailOverlay, showOnboarding]);
  useEffect(() => {
    if (!showOnboarding) return;
    const t = setTimeout(() => {
      setShowOnboarding(false);
      localStorage.setItem('ux_onboarding_v1', '1');
    }, 2500);
    return () => clearTimeout(t);
  }, [showOnboarding]);

  const handleSuccess = (score: number, bonus: number = 0) => {
    const gt = getCurrentGameType();
    if (!gt || !run) return;
    setPassedLevelForOverlay(level);
    setPendingScore(score);
    setPendingBonus(bonus);
    setShowPassOverlay(true);
    const combo = getComboCount();
    if (combo >= 1) {
      fireCombo(combo + 1, level);
    } else {
      fireSuccess(level);
    }
    if (bonus > 0) playPerfect();
    else if (combo >= 1) playCombo();
    else playSuccess();
    // 즉시 nextLevel 호출 → 누적점수(기본+보너스)가 바로 반영됨
    const r = useGameStore.getState().run;
    const effectiveLevel = r?.isRevivedLevel ? Math.max(1, (r?.level ?? 1) - 1) : level;
    const totalScore = Math.round(score) + bonus;
    nextLevel(
      {
        game_type: gt,
        level: effectiveLevel,
        success: true,
        score: totalScore,
      },
      bonus
    );
  };

  const handlePassComplete = () => {
    const nextRun = useGameStore.getState().run;
    if (nextRun && nextRun.level > 20) {
      // 20단계 클리어 시: 즉시 confirm 후 이동 (빈 화면 방지)
      useGameStore.getState().confirmGameOver();
      navigate('/result-gate', { replace: true });
      return;
    }
    setShowPassOverlay(false);
    setPendingScore(null);
    setPendingBonus(0);
  };

  const handleFail = (reason?: string) => {
    triggerFail(reason);
  };

  const [revivingInProgress, setRevivingInProgress] = useState(false);

  const handleRevive = async () => {
    const r = useGameStore.getState().run;
    if (!r || r.usedReviveCount >= 2 || revivingInProgress) return;
    setRevivingInProgress(true);
    try {
      const { adsService } = await import('../services/ads');
      const shown = await adsService.showRewarded('revive');
      const state = useGameStore.getState().run;
      if (shown && state && state.usedReviveCount < 2) {
        useGameStore.getState().useRevive();
      } else if (!shown) {
        confirmGameOver();
        navigate('/result-gate');
      }
    } finally {
      setRevivingInProgress(false);
    }
  };

  const handleGameOver = () => {
    confirmGameOver();
    navigate('/result-gate');
  };

  if (!run) {
    if (lastCompletedRun) return null;
    return (
      <div className="flex min-h-[100svh] flex-col items-center justify-center gap-4 bg-white p-4">
        <div className="w-10 h-10 border-2 border-toss-blue border-t-transparent rounded-full animate-spin" />
        <p className="text-toss-sub">게임을 준비하고 있어요</p>
      </div>
    );
  }

  const gameProps = { level, onSuccess: handleSuccess, onFail: handleFail };

  return (
    <div className="relative flex min-h-0 h-[100svh] max-h-[100dvh] flex-col overflow-hidden bg-white touch-manipulation select-none">
      {showOnboarding && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-6"
          onClick={() => { setShowOnboarding(false); localStorage.setItem('ux_onboarding_v1', '1'); }}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="bg-white rounded-2xl p-6 max-w-sm text-center shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-lg font-bold text-toss-text mb-2">총 20단계!</p>
            <p className="text-toss-sub text-sm mb-3">실패해도 부활 2회 가능</p>
            <p className="text-toss-sub text-xs">화면 터치로 닫기</p>
          </motion.div>
        </motion.div>
      )}
      <div className="shrink-0 z-30">
        <StageHeader
          gameType={gameType!}
          level={level}
          cumulativeScore={cumulativeScore}
          comboCount={getComboCount()}
          remainingRevives={2 - (run.usedReviveCount ?? 0)}
          lastAddedScore={run.lastAddedScore}
          lastAddedBonus={run.lastAddedBonus}
          onClearLastAddedScore={useGameStore.getState().clearLastAddedScore}
        />
      </div>
      <div
        ref={gameScrollRef}
        className="flex min-h-0 flex-1 flex-col overflow-hidden overscroll-none"
      >
      {showDifficultyUpgrade ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center"
        >
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', damping: 12 }}
            className="text-4xl mb-4"
          >
            🎯
          </motion.span>
          <p className="text-xl font-bold text-toss-text mb-2">
            난이도 업그레이드!
          </p>
          <p className="text-toss-sub">
            여기까지 오신 분들만의 특별한 구간이에요
          </p>
        </motion.div>
      ) : showUpperLevelMsg ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center"
        >
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', damping: 12 }}
            className="text-4xl mb-4"
          >
            🚀
          </motion.span>
          <p className="text-xl font-bold text-toss-blue mb-2">
            상위 레벨 구간
          </p>
          <p className="text-toss-text font-medium">
            집중! 여기가 진짜 실력 갈림길
          </p>
        </motion.div>
      ) : showPassOverlay ? (
        <div className="min-h-[60vh]" />
      ) : !gameType ? (
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-toss-blue border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={`${gameType ?? 'loading'}-${level}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex min-h-0 flex-1 flex-col pt-5 pb-[calc(2.75rem+env(safe-area-inset-bottom,0px))]"
          >
            {gameType === 'REACTION' && (
              <ReactionGame level={level} onSuccess={handleSuccess} onFail={handleFail} />
            )}
            {gameType === 'TAP10' && (
              <Tap10Game level={level} onSuccess={handleSuccess} onFail={handleFail} />
            )}
            {gameType === 'MEMORY' && (
              <MemoryGame level={level} onSuccess={handleSuccess} onFail={handleFail} />
            )}
            {gameType === 'CALCULATION' && (
              <CalcGame level={level} onSuccess={handleSuccess} onFail={handleFail} />
            )}
            {gameType === 'PAINT' && (
              <PaintGame level={level} onSuccess={handleSuccess} onFail={handleFail} />
            )}
          </motion.div>
        </AnimatePresence>
      )}
      </div>

      {gameType &&
        !showPassOverlay &&
        !showFailOverlay &&
        !showDifficultyUpgrade &&
        !showUpperLevelMsg && <GameFloatingHud gameType={gameType} />}

      {showPassOverlay && pendingScore !== null && run && (
        <PassOverlay
          passedLevel={passedLevelForOverlay}
          perStageResults={run.perStageResults.map((r) => ({ score: r.score }))}
          pendingScore={pendingScore}
          pendingBonus={pendingBonus}
          comboCount={getComboCount() + 1}
          onComplete={handlePassComplete}
        />
      )}

      {showFailOverlay && (
        <FailOverlay
          canRevive={run.usedReviveCount < 2}
          remainingRevives={2 - run.usedReviveCount}
          failedLevel={level}
          maxLevel={20}
          failedReason={run.lastFailedReason}
          revivingInProgress={revivingInProgress}
          onRevive={handleRevive}
          onExit={handleGameOver}
        />
      )}
    </div>
  );
}
