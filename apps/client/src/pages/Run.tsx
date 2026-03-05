import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useGameStore,
  ensureUserHash,
} from '../store/gameStore';
import StageHeader from '../components/StageHeader';
import ReactionGame from '../games/ReactionGame';
import Tap10Game from '../games/Tap10Game';
import MemoryGame from '../games/MemoryGame';
import CalcGame from '../games/CalcGame';
import FailOverlay from './FailOverlay';

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
    getCumulativeScore,
    setUserHash,
  } = useGameStore();

  useEffect(() => {
    ensureUserHash().then(setUserHash);
  }, [setUserHash]);

  useEffect(() => {
    if (!run) startRun();
  }, []);

  const gameType = getCurrentGameType();
  const cumulativeScore = getCumulativeScore();
  const level = run?.level ?? 1;
  const showFailOverlay = run?.failed ?? false;
  const [showDifficultyUpgrade, setShowDifficultyUpgrade] = useState(false);
  const [showUpperLevelMsg, setShowUpperLevelMsg] = useState(false);
  const hasShownUpgradeRef = useRef(false);
  const hasShownUpperLevelRef = useRef(false);

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

  const handleSuccess = (score: number) => {
    const gt = getCurrentGameType();
    if (!gt || !run) return;
    const effectiveLevel = run.isRevivedLevel ? Math.max(1, run.level - 1) : run.level;
    nextLevel({
      game_type: gt,
      level: effectiveLevel,
      success: true,
      score,
    });
    const nextRun = useGameStore.getState().run;
    if (nextRun && nextRun.level > 20) {
      useGameStore.getState().confirmGameOver();
      requestAnimationFrame(() => {
        navigate('/result-gate', { replace: true });
      });
    }
  };

  const handleFail = () => {
    triggerFail();
  };

  const handleRevive = async () => {
    const { adsService } = await import('../services/ads');
    const shown = await adsService.showRewarded('revive');
    if (shown) {
      useRevive();
    } else {
      confirmGameOver();
      navigate('/result-gate');
    }
  };

  const handleGameOver = () => {
    confirmGameOver();
    navigate('/result-gate');
  };

  const lastCompletedRun = useGameStore((s) => s.lastCompletedRun);

  useEffect(() => {
    if (!run && lastCompletedRun) {
      navigate('/result-gate', { replace: true });
    }
  }, [run, lastCompletedRun, navigate]);

  if (!run) {
    if (lastCompletedRun) return null;
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-toss-sub">준비 중...</p>
      </div>
    );
  }

  const GameComponent = () => {
    if (!gameType) return null;
    const common = { level, onSuccess: handleSuccess, onFail: handleFail };
    switch (gameType) {
      case 'REACTION':
        return <ReactionGame {...common} />;
      case 'TAP10':
        return <Tap10Game {...common} />;
      case 'MEMORY':
        return <MemoryGame {...common} />;
      case 'CALCULATION':
        return <CalcGame {...common} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white relative">
      <StageHeader
        gameType={gameType!}
        level={level}
        cumulativeScore={cumulativeScore}
      />
      {showDifficultyUpgrade ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center"
        >
          <p className="text-xl font-medium text-toss-text mb-2">
            여기까지 오신 똑똑한 분을 위해
          </p>
          <p className="text-lg text-toss-sub">
            난이도 업그레이드하겠습니다.
          </p>
        </motion.div>
      ) : showUpperLevelMsg ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center"
        >
          <p className="text-xl font-medium text-toss-text mb-2">
            여기서부터는 상위레벨 구간입니다.
          </p>
          <p className="text-lg text-toss-blue font-semibold">
            집중해주세요!
          </p>
        </motion.div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={`${gameType ?? 'loading'}-${level}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <GameComponent />
          </motion.div>
        </AnimatePresence>
      )}

      {showFailOverlay && (
        <FailOverlay
          canRevive={!run.usedRevive}
          onRevive={handleRevive}
          onExit={handleGameOver}
        />
      )}
    </div>
  );
}
