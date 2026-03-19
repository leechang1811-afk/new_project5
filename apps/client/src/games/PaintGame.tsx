import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getPaintParams,
  paintTimeLimitForLevel,
  normalizeStageScore,
} from 'shared';
import { playFail } from '../services/sounds';

type PaintColor = 'R' | 'G' | 'B' | 'Y' | 'M' | 'C' | 'W' | 'O' | 'L' | 'P' | 'T' | 'K';

const COLOR_HEX: Record<PaintColor, string> = {
  R: '#EF4444',
  G: '#22C55E',
  B: '#3B82F6',
  Y: '#EAB308',
  M: '#D946EF',
  C: '#06B6D4',
  W: '#F8FAFC',
  O: '#F97316',
  L: '#84CC16',
  P: '#8B5CF6',
  T: '#14B8A6',
  K: '#FB7185',
};

const COLOR_NAMES: Record<PaintColor, string> = {
  R: '빨강',
  G: '초록',
  B: '파랑',
  Y: '노랑',
  M: '자홍',
  C: '청록',
  W: '흰색',
  O: '주황',
  L: '연두',
  P: '보라',
  T: '민트',
  K: '분홍',
};

/** 밝은 색: 흰 배경에서 잘 안 보이므로 진한 테두리 필요 */
const LIGHT_COLORS: PaintColor[] = ['W', 'K', 'L', 'Y', 'C', 'T'];
function isLightColor(c: PaintColor): boolean {
  return LIGHT_COLORS.includes(c);
}

/** 색상별 줄임표기 (파랑→ㅍㄹ, 노랑→ㄴㄹ) */
const COLOR_ABBREV: Record<PaintColor, string> = {
  R: 'ㅃㄱ',   // 빨강
  G: 'ㅊㄹ',   // 초록
  B: 'ㅍㄹ',   // 파랑
  Y: 'ㄴㄹ',   // 노랑
  M: 'ㅈㅎ',   // 자홍
  C: '청ㄹ',   // 청록
  W: 'ㅎㅅ',   // 흰색
  O: '주ㅎ',   // 주황
  L: 'ㅇㄷ',   // 연두
  P: 'ㅂㄹ',   // 보라
  T: 'ㅁㄴ',   // 민트
  K: 'ㅂㅎ',   // 분홍
};

/** 목표색→필요한 기본색 목록 (W,K 등 복합색도 전부 전개) */
function getBaseColorsForTarget(target: PaintColor): PaintColor[] {
  const expand: Record<PaintColor, PaintColor[]> = {
    R: ['R'], G: ['G'], B: ['B'],
    Y: ['R', 'G'], M: ['R', 'B'], C: ['G', 'B'],
    O: ['R', 'Y'], L: ['G', 'Y'],
    P: ['R', 'B', 'R'], // M+R = (R+B)+R = 보라
    T: ['G', 'C'], // G+C = 민트
    W: ['R', 'G', 'B'],
    K: ['R', 'G', 'B', 'R'], // W+R = (R+G+B)+R
  };
  return expand[target] ?? [target];
}

/** 섞어야 할 색 전부 초성으로 → "ㅃㄱ+ㅍㄹ을 섞으세요" (2색만) */
function getHintForColor(target: PaintColor): string {
  const colors = getBaseColorsForTarget(target);
  if (colors.length <= 1) return '기본색을 섞어보세요';
  // 2색만 사용: W,K 등 3색 이상은 2색 조합으로 축약
  const twoColors = colors.length > 2 ? [colors[0], colors[1]] : colors;
  const abbrevs = twoColors.map((c) => COLOR_ABBREV[c!]).join('+');
  return `${abbrevs}을 섞으세요`;
}

/** 초반 레벨용 공식 힌트 (빨강+초록=노랑) */
function getFormulaHint(target: PaintColor): string {
  const formulas: Record<PaintColor, string> = {
    Y: '빨강+초록=노랑',
    M: '빨강+파랑=자홍',
    C: '초록+파랑=청록',
    O: '빨강+노랑=주황',
    L: '초록+노랑=연두',
    P: '빨강+파랑=보라',
    T: '초록+청록=민트',
    K: '흰색+빨강=분홍',
    W: '빨강+초록+파랑=흰색',
    R: '빨강',
    G: '초록',
    B: '파랑',
  };
  return formulas[target] ?? getHintForColor(target);
}

// RGB 가산혼합: R+G=Y, R+B=M, G+B=C, R+G+B=W
// 2색/3색 혼합 결과 (흰색 W 포함)
const MIX_MAP: Record<string, PaintColor> = {
  // 기본 2색 (primary)
  BG: 'C',
  BR: 'M',
  GR: 'Y',
  // 2색 → W (R+G+B 경로)
  BY: 'W', // B+(R+G)
  GM: 'W', // G+(R+B)
  RC: 'W', // R+(G+B)
  // 2색 → 2차색
  RY: 'O',
  GY: 'L',
  CG: 'T',
  BC: 'T',
  MB: 'P',
  MR: 'P',
  // 2차+2차
  YM: 'O',
  YC: 'L',
  MC: 'P',
  LM: 'W', // L+M = (G+Y)+(R+B) = R+G+B+Y
  // 결과색 + 기본색 (3색 경로)
  OB: 'W', // O+B = (R+Y)+B
  OC: 'W',
  OG: 'L',
  OY: 'O',
  OM: 'P',
  LB: 'W', // L+B = (G+Y)+B (L+R도 W가능하지만 LB가 명확)
  LR: 'W',
  LG: 'L',
  LY: 'L',
  LP: 'T',
  LT: 'T',
  PB: 'P',
  PG: 'W', // P+G = (R+M)+G
  PR: 'P',
  PM: 'P',
  PC: 'P',
  PT: 'P',
  TB: 'T',
  TR: 'W', // T+R = (G+C)+R
  TG: 'T',
  TC: 'T',
  TM: 'P',
  TY: 'L',
  // W + 기본색 → 분홍(연한색)
  BW: 'K',
  GW: 'K',
  RW: 'K',
  MW: 'K',
  CW: 'K',
  YW: 'K',
  OW: 'K',
  LW: 'K',
  PW: 'K',
  TW: 'K',
  // K + 기본색 (4색 이상용)
  BK: 'K',
  GK: 'K',
  KR: 'K',
  KG: 'K',
  KB: 'K',
  KY: 'K',
  KM: 'K',
  KC: 'K',
};

function mixTwo(a: PaintColor, b: PaintColor): PaintColor | null {
  if (a === b) return a;
  const key = [a, b].sort().join('');
  return MIX_MAP[key] ?? null;
}

/** N개 물감 순차 혼합: mix(mix(a,b), c) ... */
function mixColors(colors: PaintColor[]): PaintColor | null {
  if (colors.length === 0) return null;
  if (colors.length === 1) return colors[0]!;
  let result: PaintColor = colors[0]!;
  for (let i = 1; i < colors.length; i++) {
    const next = mixTwo(result, colors[i]!);
    if (!next) return null;
    result = next;
  }
  return result;
}

const TEARDROP_STYLE = {
  clipPath: 'path("M 50% 0% C 95% 25% 95% 75% 50% 100% C 5% 75% 5% 25% 50% 0%")' as const,
  WebkitClipPath: 'path("M 50% 0% C 95% 25% 95% 75% 50% 100% C 5% 75% 5% 25% 50% 0%")' as const,
};

interface PaintGameProps {
  level: number;
  onSuccess: (score: number, bonus?: number) => void;
  onFail: () => void;
}

interface Drop {
  id: number;
  color: PaintColor;
  x: number;
}

interface FallingDrop extends Drop {
  startY: number;
}

const POOL_TOP = 400;

/** 물감 게임은 항상 2색만 섞기 (고정) */
const REQUIRED_MIX_COUNT = 2;

export default function PaintGame({ level, onSuccess, onFail }: PaintGameProps) {
  const params = getPaintParams(level);
  const timeLimit = paintTimeLimitForLevel(level);
  const [phase, setPhase] = useState<'idle' | 'instruction' | 'playing'>('idle');
  const [targetColor, setTargetColor] = useState<PaintColor | null>(null);
  const [selectedDrops, setSelectedDrops] = useState<Drop[]>([]);
  const [fallingDrops, setFallingDrops] = useState<FallingDrop[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [mergeFeedback, setMergeFeedback] = useState<'correct' | 'wrong' | 'cannot_mix' | null>(null);
  const [bursting, setBursting] = useState(false);
  const burstingRef = useRef(false);
  const dropIdRef = useRef(0);
  const hasEndedRef = useRef(false);
  const handledIdsRef = useRef<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedDropsRef = useRef<Drop[]>([]);
  const targetColorRef = useRef<PaintColor | null>(null);
  const startTimeRef = useRef<number>(0);

  const showColorLabels = level <= 6;
  const showFormulaHint = level <= 2;
  const tipMessage = level === 1 ? '2색을 섞어 목표색을 맞추세요 (예: 빨강+초록=노랑)' : null;

  // 2색 혼합으로 만들 수 있는 목표색 (Y,M,C,O,L,T)
  const TWO_COLOR_TARGETS: PaintColor[] = ['Y', 'M', 'C', 'O', 'L', 'T'];
  /** 현재 baseColors로 2색을 섞어 만들 수 있는 목표만 반환 (해당 색이 안 나오는 오류 방지) */
  const getAchievableTargets = useCallback((): PaintColor[] => {
    const baseSet = new Set(params.baseColors as PaintColor[]);
    return TWO_COLOR_TARGETS.filter((t) => {
      const needed = getBaseColorsForTarget(t);
      return needed.every((c) => baseSet.has(c));
    });
  }, [params.baseColors]);

  const getTargetForTwoColors = useCallback((): PaintColor => {
    const achievable = getAchievableTargets();
    if (achievable.length === 0) return TWO_COLOR_TARGETS[0]!; // fallback: Y (R,G는 대부분 있음)
    return achievable[Math.floor(Math.random() * achievable.length)]!;
  }, [getAchievableTargets]);

  const startGame = useCallback(() => {
    hasEndedRef.current = false;
    burstingRef.current = false;
    setBursting(false);
    handledIdsRef.current = new Set();
    selectedDropsRef.current = [];
    setMergeFeedback(null);
    const target = getTargetForTwoColors();
    targetColorRef.current = target;
    setTargetColor(target);
    setSelectedDrops([]);
    setFallingDrops([]);
    setPhase('instruction');
  }, [getTargetForTwoColors]);

  useLayoutEffect(() => {
    startGame();
  }, [startGame]);

  useEffect(() => {
    if (phase !== 'instruction') return;
    const t = setTimeout(() => {
      const now = Date.now();
      startTimeRef.current = now;
      setPhase('playing');
      setTimeLeft(timeLimit);
      setStartTime(now);
    }, 1500);
    return () => clearTimeout(t);
  }, [phase, timeLimit]);

  // Spawn falling drops periodically (필수 색상 가중: 목표에 필요한 색이 더 자주 나옴)
  useEffect(() => {
    if (phase !== 'playing' || hasEndedRef.current) return;
    const container = containerRef.current;
    const width = container?.clientWidth ?? 300;
    const baseSet = new Set(params.baseColors);
    const target = targetColorRef.current;
    const needed = target ? [...new Set(getBaseColorsForTarget(target))] : [];
    const requiredColors = needed.filter((c) => baseSet.has(c as (typeof params.baseColors)[number]));
    const spawn = () => {
      if (hasEndedRef.current) return;
      let color: PaintColor;
      if (requiredColors.length >= 2 && Math.random() < 0.65) {
        color = requiredColors[Math.floor(Math.random() * requiredColors.length)]!;
      } else {
        color = params.baseColors[
          Math.floor(Math.random() * params.baseColors.length)
        ]!;
      }
      const x = 24 + Math.random() * Math.max(0, width - 96);
      const id = ++dropIdRef.current;
      setFallingDrops((prev) => [...prev, { id, color, x, startY: 0 }]);
    };
    spawn();
    const interval = setInterval(spawn, params.dropIntervalMs);
    return () => clearInterval(interval);
  }, [phase, params.baseColors, params.dropIntervalMs]);

  const doSuccess = useCallback(() => {
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    const baseRawScore = Math.max(0, 100 - elapsed * 3);
    const bonusAmount = elapsed < 3 ? Math.min(20, 10 + Math.min(level, 10)) : 0;
    const baseScore = normalizeStageScore(baseRawScore, 100, true);
    setTimeout(() => onSuccess(baseScore, bonusAmount), 500);
  }, [level, onSuccess]);

  const handleDropClicked = useCallback(
    (id: number, color: PaintColor, x: number) => {
      if (handledIdsRef.current.has(id) || hasEndedRef.current) return;
      handledIdsRef.current.add(id);
      setFallingDrops((prev) => prev.filter((d) => d.id !== id));

      const prevSelected = selectedDropsRef.current;
      const newSelected = [...prevSelected, { id, color, x }].slice(0, REQUIRED_MIX_COUNT);
      selectedDropsRef.current = newSelected;
      setSelectedDrops(newSelected);

      if (newSelected.length < REQUIRED_MIX_COUNT) return;

      const colors = newSelected.map((d) => d.color);
      const mixed = mixColors(colors);
      const target = targetColorRef.current;

      selectedDropsRef.current = [];
      setSelectedDrops([]);

      if (!mixed) {
        playFail();
        setMergeFeedback('cannot_mix');
        setTimeout(() => setMergeFeedback(null), 1500);
        return;
      }

      if (target && mixed === target) {
        hasEndedRef.current = true;
        burstingRef.current = true;
        setMergeFeedback('correct');
        setBursting(true);
        doSuccess();
      } else {
        playFail();
        setMergeFeedback('wrong');
        setTimeout(() => setMergeFeedback(null), 1500);
      }
    },
    [doSuccess]
  );

  const handleDropMissed = useCallback((id: number) => {
    if (handledIdsRef.current.has(id) || burstingRef.current) return;
    handledIdsRef.current.add(id);
    setFallingDrops((prev) => prev.filter((d) => d.id !== id));
  }, []);

  // Time limit
  useEffect(() => {
    if (phase !== 'playing' || timeLeft <= 0) return;
    const id = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (!hasEndedRef.current) {
            hasEndedRef.current = true;
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

  const previewColor: PaintColor | null =
    selectedDrops.length >= 2
      ? mixColors(selectedDrops.map((d) => d.color))
      : selectedDrops.length === 1
        ? selectedDrops[0]!.color
        : null;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
      <div ref={containerRef} className="w-full max-w-md relative min-h-[280px]">
        <AnimatePresence mode="wait">
          {(phase === 'instruction' || phase === 'playing') && targetColor && (
            <motion.div
              key="play"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full"
            >
              <p className="text-lg font-medium text-toss-text mb-2 text-center">
                이 색을 맞추세요
              </p>
              <div className="flex justify-center items-start gap-4 mb-4">
                <div className="flex flex-col items-center">
                  <div className={`rounded-xl overflow-hidden ${isLightColor(targetColor) ? 'bg-slate-300 p-1.5 ring-2 ring-slate-500' : 'border-2 border-toss-border'}`}>
                    <div
                      className="w-20 h-20 rounded-lg flex-shrink-0"
                      style={{ backgroundColor: COLOR_HEX[targetColor] }}
                    />
                  </div>
                  <p className="text-toss-sub text-xs mt-1">목표</p>
                  <p className={`font-bold text-toss-text mt-0.5 ${level <= 6 ? 'text-base' : 'text-sm'}`}>
                    {COLOR_NAMES[targetColor]}
                  </p>
                </div>
                {previewColor != null && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center px-6 py-4 rounded-2xl bg-toss-bg border-2 border-toss-blue shadow-lg shadow-toss-blue/20"
                  >
                    <p className="text-toss-blue font-bold text-sm mb-2">내가 섞은 색 ✨</p>
                    <div className={`rounded-xl overflow-hidden ${isLightColor(previewColor) ? 'bg-slate-300 p-1.5 ring-2 ring-slate-500' : 'border-2 border-toss-blue ring-4 ring-toss-blue/30'}`}>
                      <div
                        className="w-20 h-20 rounded-lg flex-shrink-0"
                        style={{ backgroundColor: COLOR_HEX[previewColor] }}
                      />
                    </div>
                    <p className="text-toss-text font-medium text-sm mt-2">{COLOR_NAMES[previewColor]}</p>
                  </motion.div>
                )}
              </div>
              <div className="flex justify-center gap-2 mb-4">
                <span className="text-toss-sub">제한시간</span>
                <span className="font-medium text-toss-blue">{timeLeft}초</span>
              </div>
              {tipMessage && (
                <p className="text-toss-blue text-sm mb-2 text-center font-medium bg-toss-blue/5 px-4 py-2 rounded-xl">
                  💡 {tipMessage}
                </p>
              )}
              <p className="text-toss-sub text-xs mb-2 text-center">
                물감 2개를 골라 섞어 목표색을 맞추세요
              </p>
              {showFormulaHint && targetColor && (
                <p className="text-amber-600 text-sm mb-2 text-center font-medium bg-amber-50 px-4 py-2 rounded-xl border border-amber-200">
                  {getFormulaHint(targetColor)}
                </p>
              )}
              {!showFormulaHint && timeLeft <= 10 && timeLeft > 0 && targetColor && (
                <p className="text-amber-600 text-xs mb-2 text-center bg-amber-50 px-4 py-2 rounded-xl border border-amber-200">
                  💡 {getHintForColor(targetColor)}
                </p>
              )}

              {mergeFeedback && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`text-center py-2 px-4 rounded-xl text-sm font-medium mb-2 ${
                    mergeFeedback === 'correct'
                      ? 'bg-green-100 text-green-700'
                      : mergeFeedback === 'wrong'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {mergeFeedback === 'correct' && '정답!'}
                  {mergeFeedback === 'wrong' && '아니에요. 다른 조합을 시도해보세요'}
                  {mergeFeedback === 'cannot_mix' && '이 두 색은 섞을 수 없어요'}
                </motion.div>
              )}

              {/* Falling zone - 모바일 터치 영역 확대 (최소 48px), onPointerDown 즉시 반응 */}
              <div className="relative h-[380px] bg-slate-100 border border-dashed border-toss-border rounded-lg overflow-hidden" style={{ touchAction: 'manipulation' }}>
                <AnimatePresence>
                  {fallingDrops.map((d) => (
                    <motion.div
                      key={d.id}
                      role="button"
                      tabIndex={0}
                      initial={{ y: 0, scale: 1, opacity: 1 }}
                      animate={
                        bursting
                          ? { scale: 2.5, opacity: 0 }
                          : { y: POOL_TOP - 20, scale: params.dropScale, opacity: 1 }
                      }
                      transition={
                        bursting
                          ? { duration: 0.35, ease: 'easeOut' }
                          : { duration: params.fallDurationSec, ease: 'linear' }
                      }
                      onAnimationComplete={() => !bursting && handleDropMissed(d.id)}
                      className="absolute"
                      style={{
                        left: d.x,
                        top: 0,
                        width: Math.round(72 * params.dropScale),
                        height: Math.round(80 * params.dropScale),
                        marginLeft: -14,
                        marginTop: -12,
                        touchAction: 'manipulation',
                        WebkitTapHighlightColor: 'transparent',
                        WebkitTouchCallout: 'none',
                        userSelect: 'none',
                        cursor: bursting ? 'default' : 'pointer',
                        zIndex: 10,
                      }}
                      onPointerDown={(e) => {
                        if (bursting) return;
                        e.preventDefault();
                        e.stopPropagation();
                        handleDropClicked(d.id, d.color, d.x);
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    >
                      <div
                        className={`w-11 h-14 shadow-md select-none pointer-events-none ${
                          isLightColor(d.color) ? 'border-2 border-slate-400 ring-1 ring-slate-400/60' : 'border border-white/50'
                        }`}
                        style={{
                          marginLeft: 14,
                          marginTop: 12,
                          backgroundColor: COLOR_HEX[d.color],
                          ...TEARDROP_STYLE,
                        }}
                      />
                      {showColorLabels && (
                        <span
                          className={`absolute left-0 right-0 bottom-0 text-[10px] font-bold text-center pointer-events-none ${
                            isLightColor(d.color) ? 'text-slate-800' : 'text-white'
                          }`}
                          style={{
                            textShadow: isLightColor(d.color)
                              ? '0 0 2px #fff, 0 1px 2px #fff, 0 0 3px #fff'
                              : '0 0 2px #000, 0 1px 2px #000',
                          }}
                        >
                          {COLOR_NAMES[d.color]}
                        </span>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* 선택한 물감 표시 */}
              <div className="mt-4 min-h-[64px] flex items-center justify-center gap-4 p-4 bg-toss-bg rounded-xl">
                {selectedDrops.length > 0 ? (
                  <div className="flex items-center gap-3 flex-wrap justify-center">
                    {selectedDrops.map((d) => (
                      <motion.div
                        key={d.id}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex flex-col items-center gap-1"
                      >
                        <div
                          className={`w-10 h-14 shadow-md ${isLightColor(d.color) ? 'border-2 border-slate-500 ring-1 ring-slate-500/50' : 'border-2 border-toss-blue ring-2 ring-toss-blue/30'}`}
                          style={{
                            backgroundColor: COLOR_HEX[d.color],
                            ...TEARDROP_STYLE,
                          }}
                        />
                        <span className="text-xs text-toss-sub">
                          {COLOR_NAMES[d.color]}
                        </span>
                      </motion.div>
                    ))}
                    <span className="text-toss-sub text-sm self-center">
                      {selectedDrops.length < REQUIRED_MIX_COUNT
                        ? `+ ${REQUIRED_MIX_COUNT - selectedDrops.length}개 더 클릭`
                        : '→ 섞는 중...'}
                    </span>
                  </div>
                ) : (
                  <p className="text-toss-sub text-sm">
                    물감 2개를 골라 섞어 목표색을 맞추세요
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
