import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { computeRunScore, getStrengthWeakness } from 'shared';
import type { GameType } from 'shared';
import { GAME_TYPE_LABELS } from 'shared';
import { submitRun } from '../services/api';
import { ensureUserHash } from '../store/gameStore';
import { copyShareLink } from '../services/share';
import { recordPlay, getStreakState } from '../services/streak';
import BannerAd from '../components/BannerAd';
import { fireChampion, fireNewBest } from '../utils/confetti';
import type { RunSubmitResponse } from '../services/api';

function getNextGoalPraise(percentileTop: number): string {
  if (percentileTop <= 10) return '순위표 1위를 노려보세요!';
  if (percentileTop <= 30) return '1단계만 더 클리어하면 상위권에 가까워져요';
  if (percentileTop <= 50) return '매일 한 번씩만 해도 실력이 쑥쑥. 내일도 도전해 보세요!';
  return '계속 도전하면 점점 상위권에 가까워져요. 할 수 있어요! 🎯';
}

function computeMyPerTypeSuccess(perStageResults: { game_type: string; success: boolean }[]): Record<string, { successes: number; total: number; rate: number }> {
  const acc: Record<string, { successes: number; total: number }> = {};
  for (const r of perStageResults) {
    if (!acc[r.game_type]) acc[r.game_type] = { successes: 0, total: 0 };
    acc[r.game_type].total += 1;
    if (r.success) acc[r.game_type].successes += 1;
  }
  return Object.fromEntries(
    Object.entries(acc).map(([k, v]) => [
      k,
      { ...v, rate: v.total > 0 ? Math.round((v.successes / v.total) * 100) : 0 },
    ])
  );
}

export default function Result() {
  const navigate = useNavigate();
  const { lastCompletedRun, userHash, setUserHash, endRun } = useGameStore();
  const [res, setRes] = useState<RunSubmitResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [streak, setStreak] = useState(0);
  const hasFiredConfettiRef = useRef(false);
  const shareCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ensureUserHash().then(setUserHash);
  }, [setUserHash]);

  const submitAgain = async () => {
    if (!lastCompletedRun) return;
    setError(null);
    setLoading(true);
    try {
      const hash = userHash || (await ensureUserHash());
      const runScore = computeRunScore(lastCompletedRun.perStageResults.map((r) => ({ score: r.score })));
      const apiRes = await submitRun({
        user_hash: hash,
        run_score: runScore,
        max_level: lastCompletedRun.maxLevel,
        game_breakdown: lastCompletedRun.gameBreakdown,
        per_stage: lastCompletedRun.perStageResults.map((r) => ({
          game_type: r.game_type,
          level: r.level,
          success: r.success,
          score: r.score,
        })),
        client_time: new Date().toISOString(),
      });
      setRes(apiRes);
    } catch (e) {
      setError('잠시 후 다시 시도해 주세요');
      setRes({
        percentileTop: 50,
        successRatePct: null,
        successBaseN: 0,
        nextGoalHint: '데이터베이스 기반으로 1단계만 더 오르면 상위 5%가 될 수 있어요',
      });
    } finally {
      setLoading(false);
      const newStreak = recordPlay();
      setStreak(newStreak);
    }
  };

  useEffect(() => {
    if (!lastCompletedRun) {
      navigate('/', { replace: true });
      return;
    }
    submitAgain();
  }, [lastCompletedRun]);

  const handleRetry = () => {
    endRun();
    useGameStore.getState().startRun();
    navigate('/run');
  };

  const handleHome = () => {
    endRun();
    navigate('/');
  };

  if (!lastCompletedRun) return null;

  const runScore = computeRunScore(lastCompletedRun.perStageResults.map((r) => ({ score: r.score })));
  const breakdown = lastCompletedRun.gameBreakdown as Record<GameType, number>;
  const { strength, weakness, weaknessTip } = getStrengthWeakness({
    REACTION: breakdown.REACTION ?? 0,
    TAP10: breakdown.TAP10 ?? 0,
    MEMORY: breakdown.MEMORY ?? 0,
    CALCULATION: breakdown.CALCULATION ?? 0,
    PAINT: breakdown.PAINT ?? 0,
  });

  const myPerType = computeMyPerTypeSuccess(lastCompletedRun.perStageResults);
  const isNewBest = res?.me && runScore >= res.me.best_score && res.me.best_score > 0;
  const koreanAvg = res?.koreanAvgScore ?? null;
  const perTypeKorean = res?.perTypeKoreanSuccess ?? {};
  const bestScore = res?.me?.best_score ?? runScore;

  const shareData = {
    percentileTop: res?.percentileTop ?? 50,
    runScore,
    maxLevel: lastCompletedRun.maxLevel,
    isChampion: lastCompletedRun.maxLevel === 20,
  };

  const handleCopyLink = async () => {
    try {
      await copyShareLink(shareData);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      setLinkCopied(false);
    }
  };

  const gameTypes = ['REACTION', 'TAP10', 'MEMORY', 'CALCULATION', 'PAINT'] as const;

  // Confetti: Champion (Lv20) or New Best
  useEffect(() => {
    if (loading || hasFiredConfettiRef.current) return;
    hasFiredConfettiRef.current = true;
    if (lastCompletedRun.maxLevel === 20) {
      setTimeout(() => fireChampion(), 400);
    } else if (isNewBest) {
      setTimeout(() => fireNewBest(), 500);
    }
  }, [loading, lastCompletedRun.maxLevel, isNewBest]);

  const [showDetail, setShowDetail] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative min-h-screen bg-gradient-to-b from-slate-50 to-white pb-[calc(7rem+env(safe-area-inset-bottom))]"
    >
      <img
        src="/brand-logo.png"
        alt="내 두뇌 몇 등? 로고"
        width={52}
        height={52}
        className="absolute top-4 left-4 sm:top-6 sm:left-6 w-12 h-12 sm:w-14 sm:h-14 rounded-xl border border-toss-border/70 shadow-sm bg-white object-cover"
        loading="eager"
        decoding="async"
      />
      <div className="max-w-md mx-auto px-4 sm:px-6 pt-4 sm:pt-6">
        {loading ? (
          <div className="py-20 text-center">
            <p className="text-toss-sub text-lg">결과 분석 중...</p>
            <div className="mt-4 h-1 w-24 mx-auto bg-toss-border rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-toss-blue"
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 1.5, repeat: Infinity, repeatType: 'reverse' }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* 🎯 Hero - 한눈에 보는 핵심 */}
            <motion.div
              ref={shareCardRef}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 20 }}
              className={`rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-center shadow-xl ${
                lastCompletedRun.maxLevel === 20
                  ? 'bg-gradient-to-br from-amber-400 via-yellow-300 to-amber-200 ring-4 ring-amber-300/60 shadow-amber-200/50'
                  : 'bg-gradient-to-br from-toss-blue to-blue-600'
              }`}
            >
              {lastCompletedRun.maxLevel === 20 && (
                <>
                  <motion.p
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 12, delay: 0.1 }}
                    className="text-5xl mb-2"
                  >
                    👑
                  </motion.p>
                  <p className="text-2xl font-black text-amber-800 mb-1">챔피언!</p>
                  <p className="text-base font-bold text-amber-700 mb-3">정말 잘했어요! 🎉 축하해요!</p>
                </>
              )}
              <p className={`text-4xl sm:text-5xl md:text-6xl font-black ${lastCompletedRun.maxLevel === 20 ? 'text-amber-900' : 'text-white'}`}>
                상위 {lastCompletedRun.maxLevel === 20 ? '0.1' : res?.percentileTop ?? '-'}%
              </p>
              <p className={`mt-1 text-xs ${lastCompletedRun.maxLevel === 20 ? 'text-amber-700' : 'text-white/80'}`}>
                {lastCompletedRun.maxLevel === 20 ? '100명 중 1등 안' : `100명 중 ${res?.percentileTop ?? 50}등 안`}
              </p>
              <p className={`mt-2 text-lg font-semibold ${lastCompletedRun.maxLevel === 20 ? 'text-amber-800' : 'text-white/95'}`}>
                {runScore.toLocaleString()}점 · {lastCompletedRun.maxLevel}단계
              </p>
              {streak > 0 && (
                <p className={`mt-1 text-sm font-medium ${lastCompletedRun.maxLevel === 20 ? 'text-amber-700' : 'text-white/90'}`}>
                  🔥 두뇌 건강 지키기 {streak}일차
                </p>
              )}
              {/* Share - 컴팩트 */}
              <button
                type="button"
                onClick={handleCopyLink}
                className="mt-6 px-6 py-3 rounded-xl bg-white/20 hover:bg-white/30 text-white font-semibold text-sm transition flex items-center gap-2 mx-auto"
              >
                {linkCopied ? (
                  <>
                    <span>✓</span> 복사됨! 친구에게 보내보세요
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    링크 복사
                  </>
                )}
              </button>
            </motion.div>

            {/* 📊 한 줄 요약 - 내 최고가 메인 */}
            <motion.div
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm border border-slate-100"
            >
              <div className="text-center flex-1">
                <p className="text-slate-500 text-xs mb-0.5">내 최고 점수</p>
                <p className="text-2xl font-bold text-toss-blue flex items-center justify-center gap-1">
                  {bestScore.toLocaleString()}
                  {isNewBest && <span className="text-[10px] bg-toss-blue text-white px-1.5 py-0.5 rounded-full font-bold">NEW</span>}
                </p>
              </div>
              <div className="text-center flex-1 border-x border-slate-100">
                <p className="text-slate-500 text-xs mb-0.5">이번 점수</p>
                <p className="text-2xl font-bold text-toss-text">{runScore.toLocaleString()}</p>
              </div>
              {koreanAvg != null ? (
                <div className="text-center flex-1">
                  <p className="text-slate-500 text-xs mb-0.5">한국 평균 대비</p>
                  <p className={`text-lg font-bold ${runScore >= koreanAvg ? 'text-green-600' : 'text-slate-600'}`}>
                    {runScore >= koreanAvg ? '+' : '-'}{Math.abs(runScore - koreanAvg).toLocaleString()}점
                  </p>
                </div>
              ) : null}
            </motion.div>

            {/* 💡 강점+보완점 (기본 펼침) */}
            <motion.div
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="rounded-2xl bg-amber-50 border border-amber-100 p-4"
            >
              <p className="text-amber-800 font-medium text-sm">💪 {strength}</p>
              {weaknessTip && (
                <p className="text-amber-700 text-xs mt-1">💡 {weaknessTip}</p>
              )}
            </motion.div>

            {/* 📈 상세 분석 (접기/펼치기) */}
            <motion.div
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-sm"
            >
              <button
                onClick={() => setShowDetail(!showDetail)}
                className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition"
              >
                <span className="font-semibold text-toss-text">유형별 분석</span>
                <span className="text-toss-sub text-sm">{showDetail ? '접기 ↑' : '펼치기 ↓'}</span>
              </button>
              {showDetail && (
                <div className="px-5 pb-5 pt-0 space-y-4 border-t border-slate-100">
                  {koreanAvg != null && (
                    <div>
                      <p className="text-slate-500 text-xs mb-2">한국인 평균 vs 나</p>
                      <div className="flex gap-2 h-4 rounded-full overflow-hidden bg-slate-100">
                        <div className="bg-slate-300 rounded-full" style={{ width: `${(koreanAvg / Math.max(runScore, koreanAvg, 1)) * 100}%` }} />
                        <div className="bg-toss-blue rounded-full flex-1" />
                      </div>
                      <p className="text-slate-600 text-xs mt-1">
                        {runScore >= koreanAvg ? `평균보다 ${(runScore - koreanAvg).toLocaleString()}점 높아요 🚀` : `평균까지 ${(koreanAvg - runScore).toLocaleString()}점 남았어요`}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-slate-500 text-xs mb-2">유형별 성공률</p>
                    <div className="space-y-2">
                      {gameTypes.map((gt) => {
                        const mine = myPerType[gt];
                        const kr = perTypeKorean[gt] ?? 50;
                        if (!mine) return null;
                        const better = mine.rate >= kr;
                        return (
                          <div key={gt} className="flex items-center gap-3">
                            <span className="text-slate-600 text-xs w-16">{GAME_TYPE_LABELS[gt]}</span>
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${better ? 'bg-toss-blue' : 'bg-amber-400'}`} style={{ width: `${mine.rate}%` }} />
                            </div>
                            <span className={`text-xs font-medium w-8 ${better ? 'text-toss-blue' : 'text-slate-500'}`}>{mine.rate}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <p className="text-slate-500 text-xs pt-2 border-t border-slate-100">
                    📌 보완점: {weakness}
                  </p>
                </div>
              )}
            </motion.div>

            {/* 🎯 다음 목표 - CTA 바로 위 */}
            {lastCompletedRun.maxLevel < 20 && (
              <motion.div
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="rounded-2xl bg-toss-blue/10 border-2 border-toss-blue/30 p-5"
              >
                <p className="text-toss-blue font-bold text-base">
                  🎯 다음 목표: {lastCompletedRun.maxLevel + 1}단계!
                </p>
                <p className="text-toss-text text-sm mt-1 font-medium">
                  {res?.nextGoalHint ?? getNextGoalPraise(res?.percentileTop ?? 50)}
                </p>
              </motion.div>
            )}

            {/* CTAs - 주 CTA 명확 */}
            <div className="flex flex-col gap-3 pt-2">
              <motion.button
                onClick={handleRetry}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full py-4 rounded-2xl bg-toss-blue text-white font-bold text-lg shadow-lg shadow-toss-blue/30"
              >
                {streak > 0 ? `한 번 더! 🔥 (${streak}일)` : '한 번 더 도전!'}
              </motion.button>
              <button onClick={handleHome} className="text-toss-sub text-sm font-medium py-2">
                홈으로 돌아가기
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-center">
            <p className="text-red-600 text-sm font-medium">{error}</p>
            <button
              type="button"
              onClick={submitAgain}
              className="mt-3 px-6 py-2 rounded-xl bg-red-100 text-red-700 text-sm font-medium hover:bg-red-200 transition"
            >
              다시 시도
            </button>
          </div>
        )}
        <div className="mt-6">
          <BannerAd />
        </div>
      </div>
    </motion.div>
  );
}
