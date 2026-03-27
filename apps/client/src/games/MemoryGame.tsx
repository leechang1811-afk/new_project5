import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getMemoryParams, normalizeStageScore, timeLimitForLevel } from 'shared';
import { playFail, playReveal } from '../services/sounds';

interface MemoryGameProps {
  level: number;
  onSuccess: (score: number, bonus?: number) => void;
  onFail: () => void;
}

function randomDigits(n: number): string {
  return Array.from({ length: n }, () =>
    Math.floor(Math.random() * 10)
  ).join('');
}

function randomPattern(size: number): boolean[] {
  const arr = Array.from({ length: size * size }, () =>
    Math.random() > 0.5
  );
  return arr;
}

export default function MemoryGame({ level, onSuccess, onFail }: MemoryGameProps) {
  const params = getMemoryParams(level);
  const timeLimit = timeLimitForLevel(level);
  const [phase, setPhase] = useState<'show' | 'answer'>('show');
  const [target, setTarget] = useState<string | boolean[] | null>(null);
  const [userInput, setUserInput] = useState('');
  const [selectedCells, setSelectedCells] = useState<number[]>([]);
  const [patternAnswer, setPatternAnswer] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const answerStartRef = useRef<number>(0);

  const startRound = useCallback(() => {
    if (params.usePattern && params.patternSize) {
      const p = randomPattern(params.patternSize);
      setTarget(p);
      setPhase('show');
      setPatternAnswer(p.map((v, i) => (v ? i : -1)).filter((i) => i >= 0));
      setSelectedCells([]);
    } else {
      const digits = randomDigits(params.digitCount);
      setTarget(digits);
      setPhase('show');
      setUserInput('');
    }
  }, [params]);

  useEffect(() => {
    startRound();
  }, [startRound]);

  useEffect(() => {
    if (phase !== 'show') return;
    const t = setTimeout(() => {
      playReveal();
      answerStartRef.current = Date.now();
      setPhase('answer');
      setTimeLeft(timeLimit);
    }, params.exposeMs);
    return () => clearTimeout(t);
  }, [phase, params.exposeMs, timeLimit]);

  useEffect(() => {
    if (phase !== 'answer' || timeLeft <= 0) return;
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
  }, [phase, timeLeft, onFail]);

  const handleCellClick = (idx: number) => {
    setSelectedCells((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx].sort((a, b) => a - b)
    );
  };

  const handlePatternSubmit = () => {
    if (!Array.isArray(target)) return;
    const correct = patternAnswer.length;
    const selected = [...selectedCells].sort((a, b) => a - b);
    const match = selected.filter((i) => patternAnswer.includes(i)).length;
    const wrong = selected.filter((i) => !patternAnswer.includes(i)).length;
    if (wrong > 0 || match < correct) {
      playFail();
      onFail();
      return;
    }
    const elapsed = (Date.now() - answerStartRef.current) / 1000;
    const baseRawScore = (match / correct) * 100;
    const bonusAmount = elapsed < 3 ? Math.min(20, 10 + Math.min(level, 10)) : 0;
    const baseScore = normalizeStageScore(baseRawScore, 100, true);
    onSuccess(baseScore, bonusAmount);
  };

  const handleSubmit = () => {
    if (params.usePattern && Array.isArray(target)) {
      handlePatternSubmit();
    } else if (typeof target === 'string') {
      if (userInput.trim() === target) {
        const elapsed = (Date.now() - answerStartRef.current) / 1000;
        const baseRawScore = 100;
        const bonusAmount = elapsed < 3 ? Math.min(20, 10 + Math.min(level, 10)) : 0;
        const baseScore = normalizeStageScore(baseRawScore, 100, true);
        onSuccess(baseScore, bonusAmount);
      } else {
        playFail();
        onFail();
      }
    }
  };

  if (!target) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto overflow-x-hidden pt-0 pb-3 px-3 touch-manipulation select-none sm:pb-4 sm:px-4">
      <div className="mb-2 text-toss-sub">
        제한시간 {phase === 'show' ? timeLimit : timeLeft}초
      </div>

      <AnimatePresence mode="wait">
        {phase === 'show' && (
          <motion.div
            key="show"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-md"
          >
            {params.usePattern && Array.isArray(target) ? (
              <div
                className="grid gap-2 mx-auto mb-6"
                style={{
                  gridTemplateColumns: `repeat(${params.patternSize}, 1fr)`,
                  width: 'min(240px, min(90vw, 280px))',
                }}
              >
                {target.map((v, i) => (
                  <div
                    key={i}
                    className={`aspect-square rounded-xl border-2 flex items-center justify-center ${
                      v ? 'bg-toss-blue border-toss-blue' : 'bg-toss-bg border-toss-border'
                    }`}
                  />
                ))}
              </div>
            ) : (
              <p className="text-3xl font-mono text-center text-toss-text tracking-widest mb-6">
                {target}
              </p>
            )}
            <p className="text-center text-toss-sub">기억하세요</p>
          </motion.div>
        )}
        {phase === 'answer' && (
          <motion.div
            key="answer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-md"
          >
            {params.usePattern ? (
              <>
                <p className="text-center text-toss-sub mb-4">
                  파란색이었던 칸을 클릭해서 선택하세요
                </p>
                <div
                  className="grid gap-2 mx-auto mb-4"
                  style={{
                    gridTemplateColumns: `repeat(${params.patternSize}, 1fr)`,
                    width: 'min(240px, min(90vw, 280px))',
                  }}
                >
                  {Array.from({ length: (params.patternSize ?? 3) ** 2 }, (_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleCellClick(i)}
                      className={`aspect-square rounded-xl border-2 flex items-center justify-center transition-colors ${
                        selectedCells.includes(i)
                          ? 'bg-toss-blue border-toss-blue'
                          : 'bg-toss-bg border-toss-border hover:border-toss-blue'
                      }`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handlePatternSubmit();
                  }}
                  className="w-full py-3 rounded-2xl bg-toss-blue text-white font-semibold"
                >
                  확인
                </button>
              </>
            ) : (
              <>
                <input
                  type="text"
                  inputMode="numeric"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="숫자 입력"
                  className="w-full px-4 py-3 rounded-2xl border border-toss-border text-toss-text text-xl text-center"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleSubmit();
                  }}
                  className="mt-4 w-full py-3 rounded-2xl bg-toss-blue text-white font-semibold"
                >
                  확인
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
