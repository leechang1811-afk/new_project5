import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCalcParams, normalizeStageScore, timeLimitForLevel } from 'shared';
import { playFail } from '../services/sounds';

interface CalcGameProps {
  level: number;
  onSuccess: (score: number, bonus?: number) => void;
  onFail: () => void;
}

function randomExpr(maxNum: number, ops: ('+' | '-')[]): { expr: string; result: number } {
  const a = Math.floor(Math.random() * maxNum) + 1;
  const b = Math.floor(Math.random() * maxNum) + 1;
  const op = ops[Math.floor(Math.random() * ops.length)]!;
  if (op === '+') {
    return { expr: `${a} + ${b}`, result: a + b };
  }
  const big = Math.max(a, b);
  const small = Math.min(a, b);
  return { expr: `${big} - ${small}`, result: big - small };
}

/** 키보드·주소창 등으로 시각 뷰포트가 줄었는지 (논리력 전용 레이아웃 전환) */
function useKeyboardNarrowViewport(): boolean {
  const [narrow, setNarrow] = useState(false);
  const prevRef = useRef(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const sync = () => {
      const overlap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      const next = overlap > 72;
      setNarrow(next);
      if (next && !prevRef.current) {
        document.getElementById('run-game-scroll')?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      }
      prevRef.current = next;
    };

    vv.addEventListener('resize', sync);
    vv.addEventListener('scroll', sync);
    sync();
    return () => {
      vv.removeEventListener('resize', sync);
      vv.removeEventListener('scroll', sync);
    };
  }, []);

  return narrow;
}

export default function CalcGame({ level, onSuccess, onFail }: CalcGameProps) {
  const params = getCalcParams(level);
  const [expr, setExpr] = useState<{ expr: string; result: number } | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const timeLimit = timeLimitForLevel(level);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [oxMode, setOxMode] = useState(false);
  const [oxStatement, setOxStatement] = useState('');
  const [oxCorrect, setOxCorrect] = useState(false);
  const questionStartRef = useRef<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const numberBlockRef = useRef<HTMLDivElement>(null);
  const keyboardNarrow = useKeyboardNarrowViewport();

  const scrollPanelTop = useCallback(() => {
    document.getElementById('run-game-scroll')?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  const scrollNumberBlockIntoView = useCallback(() => {
    const el = numberBlockRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      setTimeout(() => {
        el.scrollIntoView({
          block: 'start',
          behavior: keyboardNarrow ? 'instant' : 'smooth',
          inline: 'nearest',
        });
      }, keyboardNarrow ? 24 : 80);
    });
  }, [keyboardNarrow]);

  useEffect(() => {
    if (!keyboardNarrow) return;
    scrollPanelTop();
    const t = window.setTimeout(() => {
      numberBlockRef.current?.scrollIntoView({ block: 'start', behavior: 'instant', inline: 'nearest' });
    }, 40);
    return () => window.clearTimeout(t);
  }, [keyboardNarrow, scrollPanelTop]);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      if (document.activeElement === inputRef.current) {
        scrollPanelTop();
        numberBlockRef.current?.scrollIntoView({ block: 'start', behavior: 'instant', inline: 'nearest' });
      }
    };
    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, [scrollPanelTop]);

  const nextQuestion = useCallback(() => {
    questionStartRef.current = Date.now();
    if (params.useOX) {
      const { expr: e, result } = randomExpr(params.maxNum, params.ops);
      const wrongResult = result + (Math.random() > 0.5 ? 1 : -1);
      const isCorrect = Math.random() > 0.5;
      setOxStatement(`${e} = ${isCorrect ? result : wrongResult}`);
      setOxCorrect(isCorrect);
      setOxMode(true);
    } else {
      setExpr(randomExpr(params.maxNum, params.ops));
      setUserAnswer('');
      setOxMode(false);
    }
  }, [params]);

  useEffect(() => {
    nextQuestion();
  }, [nextQuestion]);

  useEffect(() => {
    const id = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          playFail();
          onFail();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [onFail]);

  const reportSuccess = () => {
    const elapsed = (Date.now() - questionStartRef.current) / 1000;
    const baseRawScore = 100;
    const bonusAmount = elapsed < 3 ? Math.min(20, 10 + Math.min(level, 10)) : 0;
    const baseScore = normalizeStageScore(baseRawScore, 100, true);
    onSuccess(baseScore, bonusAmount);
  };

  const handleSubmit = () => {
    if (oxMode) {
      const correct = userAnswer.toLowerCase() === 'o' || userAnswer === '1';
      if (correct === oxCorrect) {
        reportSuccess();
      } else {
        playFail();
        onFail();
      }
    } else if (expr) {
      const num = parseInt(userAnswer, 10);
      if (num === expr.result) {
        reportSuccess();
      } else {
        playFail();
        onFail();
      }
    }
  };

  const handleInputFocus = () => {
    scrollPanelTop();
    scrollNumberBlockIntoView();
  };

  const rootClass = keyboardNarrow
    ? 'flex min-h-0 flex-1 flex-col items-center justify-start overflow-x-hidden overflow-y-auto px-3 pb-1 pt-0 touch-manipulation select-none sm:px-4'
    : 'flex min-h-0 flex-1 flex-col items-center justify-center overflow-x-hidden overflow-y-auto px-3 pb-3 pt-0 touch-manipulation select-none sm:pb-4 sm:px-4 -translate-y-3 sm:-translate-y-2';

  const numberBlockPad = keyboardNarrow ? 'pb-4' : 'pb-28 sm:pb-20';

  return (
    <div className={rootClass}>
      <div className="mb-2 shrink-0 text-toss-sub">제한시간 {timeLeft}초</div>

      <AnimatePresence mode="wait">
        {oxMode ? (
          <motion.div
            key="ox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-md text-center"
          >
            <p className="text-2xl font-medium text-toss-text mb-6">{oxStatement}</p>
            <p className="text-toss-sub mb-4">맞으면 O, 틀리면 X</p>
            <div className="flex gap-3 sm:gap-4 justify-center">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  if (oxCorrect) {
                    reportSuccess();
                  } else {
                    playFail();
                    onFail();
                  }
                }}
                className="min-h-[44px] min-w-[64px] touch-manipulation rounded-2xl border-2 border-toss-border px-6 py-3 transition hover:border-toss-blue sm:px-8"
              >
                O
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  if (!oxCorrect) {
                    reportSuccess();
                  } else {
                    playFail();
                    onFail();
                  }
                }}
                className="min-h-[44px] min-w-[64px] touch-manipulation rounded-2xl border-2 border-toss-border px-6 py-3 transition hover:border-toss-blue sm:px-8"
              >
                X
              </button>
            </div>
          </motion.div>
        ) : (
          expr && (
            <motion.div
              key="calc"
              ref={numberBlockRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`w-full max-w-md scroll-mt-2 ${numberBlockPad}`}
            >
              <p className="mb-4 text-center text-2xl font-medium text-toss-text">
                {expr.expr} = ?
              </p>
              <input
                ref={inputRef}
                type="number"
                inputMode="numeric"
                enterKeyHint="done"
                autoComplete="off"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                onFocus={handleInputFocus}
                className="w-full rounded-2xl border border-toss-border px-4 py-3 text-center text-xl text-toss-text"
                autoFocus
              />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  handleSubmit();
                }}
                className="mt-4 min-h-[48px] w-full touch-manipulation rounded-2xl bg-toss-blue py-3 font-semibold text-white active:opacity-90"
              >
                확인
              </button>
            </motion.div>
          )
        )}
      </AnimatePresence>
    </div>
  );
}
