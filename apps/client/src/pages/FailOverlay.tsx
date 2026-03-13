import { motion } from 'framer-motion';

interface FailOverlayProps {
  canRevive: boolean;
  remainingRevives?: number;
  failedLevel?: number;
  maxLevel?: number;
  onRevive: () => void;
  onExit: () => void;
  revivingInProgress?: boolean;
}

const ZEIGARNIK_MESSAGES: Record<number, string> = {
  1: '1단계에서 막혔네요. 다음엔 통과!',
  5: '5단계까지 오셨는데... 한 번만 더 도전해볼까요?',
  8: '8단계! 난이도 상승 직전이었어요. 아까워요!',
  10: '10단계까지 왔어요! 반이에요. 다시 해보세요.',
  15: '15단계! 상위 구간 문턱이었어요. 거의 다 왔는데!',
  18: '18단계! 20까지 2개 남았는데... 정말 아까워요!',
  19: '19단계! 하나만 더 했으면 Champion이었는데! 🎯',
};

function getZeigarnikMessage(level: number): string {
  return ZEIGARNIK_MESSAGES[level] ?? `${level}단계까지 오셨어요. 다시 도전하면 더 잘할 수 있어요!`;
}

export default function FailOverlay({ canRevive, remainingRevives = 0, failedLevel = 0, maxLevel = 20, onRevive, onExit, revivingInProgress = false }: FailOverlayProps) {
  const progressPct = maxLevel > 0 ? Math.round((failedLevel / maxLevel) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 20 }}
        className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full"
      >
        <p className="text-center text-toss-text font-medium mb-1">
          아쉽게도 {failedLevel}단계에서 멈췄어요
        </p>
        <p className="text-center text-toss-sub text-sm mb-4">
          {getZeigarnikMessage(failedLevel)}
        </p>
        {progressPct >= 50 && (
          <p className="text-center text-toss-blue text-xs mb-4">
            전체의 {progressPct}% 완주! 한 번 더 도전해 보시겠어요?
          </p>
        )}
        <div className="flex flex-col gap-3">
          {canRevive && (
            <button
              type="button"
              onClick={onRevive}
              disabled={revivingInProgress}
              className="w-full py-3.5 rounded-2xl bg-toss-blue text-white font-semibold shadow-md hover:opacity-95 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className="block">짧은 광고 시청 후 같은 단계부터 다시!</span>
              <span className="block mt-0.5 text-white/90 text-sm font-medium">
                남은 부활 {remainingRevives}회
              </span>
            </button>
          )}
          <button
            onClick={onExit}
            className="w-full py-3 rounded-2xl border border-toss-border text-toss-sub hover:bg-toss-bg transition"
          >
            결과 보기
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
