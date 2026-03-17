import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ensureUserHash, useGameStore } from '../store/gameStore';
import { useEffect, useState } from 'react';
import { getStreakState } from '../services/streak';
import { API_BASE } from '../services/api';

interface MeSummary {
  best_score?: number;
  best_level?: number;
  alltime_percentile_top?: number | null;
  percentile_top?: number | null;
  alltime_rank?: number | null;
}

export default function Home() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sharedPercentile = searchParams.get('p');
  const endRun = useGameStore((s) => s.endRun);
  const [streakState, setStreakState] = useState(() => getStreakState());
  const [meData, setMeData] = useState<MeSummary | null>(null);

  useEffect(() => {
    ensureUserHash();
  }, []);

  useEffect(() => {
    endRun();
  }, [endRun]);

  useEffect(() => {
    setStreakState(getStreakState());
  }, []);

  useEffect(() => {
    ensureUserHash().then((hash) =>
      fetch(`${API_BASE}/me/summary?user_hash=${encodeURIComponent(hash)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then(setMeData)
    );
  }, []);

  const startGame = () => {
    navigate('/run');
  };

  const { count: streakCount, playedToday, canExtend } = streakState;
  const percentileTop = meData?.alltime_percentile_top ?? meData?.percentile_top ?? null;
  const bestLevel = meData?.best_level ?? null;

  // 오늘의 목표: 최고 기록이 있으면 "1단계 더", 20이면 "기록 갱신", 없으면 "상위 50% 달성"
  const todayGoal = bestLevel != null
    ? bestLevel >= 20
      ? 'Champion! 오늘도 20단계 도전해서 기록 갱신해 보세요'
      : `지난번 ${bestLevel}단계 → 오늘은 ${bestLevel + 1}단계 도전!`
    : '오늘의 목표: 상위 50% 달성';

  // Loss aversion: 스트릭이 끊기기 전에!
  const streakAtRisk = canExtend && streakCount > 0;

  // 스트릭 배지 (7, 14, 30일)
  const streakBadge = streakCount >= 30 ? '🏆' : streakCount >= 14 ? '⭐' : streakCount >= 7 ? '🎖️' : null;

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md w-full"
      >
        <h1 className="text-2xl md:text-3xl font-bold text-toss-text mb-3 leading-tight">
          내 두뇌 몇 등?
        </h1>
        <p className="text-toss-text text-base mb-2 font-medium">
          대한민국에서 내 두뇌 순위 확인
        </p>
        <p className="text-toss-sub text-sm mb-4 leading-relaxed">
          5가지 게임으로 5분 만에 결과 확인 · 한국인 평균과 비교해 드려요
        </p>

        {/* 내 최고 기록 + 오늘의 목표 */}
        {(percentileTop != null || bestLevel != null) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 rounded-2xl bg-toss-blue/5 border border-toss-blue/20 text-left"
          >
            {percentileTop != null && (
              <p className="text-toss-text font-semibold text-sm">
                내 최고: 상위 <span className="text-toss-blue">{percentileTop}%</span>
                {meData?.alltime_rank != null && (
                  <span className="text-toss-sub font-medium ml-1">· 전체 #{meData.alltime_rank}등</span>
                )}
              </p>
            )}
            <p className="text-toss-sub text-xs mt-1">{todayGoal}</p>
          </motion.div>
        )}

        {/* Streak badge - Investment 표시 + 7/14/30일 배지 */}
        {streakCount > 0 && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium mb-4 ${
              streakAtRisk
                ? 'bg-red-50 border-2 border-red-200 text-red-700'
                : 'bg-amber-50 border border-amber-200 text-amber-700'
            }`}
          >
            <span>{streakBadge ?? '🔥'}</span>
            <span>내 두뇌 건강 지키기 {streakCount}일차</span>
            {streakBadge && <span className="text-xs">({streakCount >= 30 ? '30일' : streakCount >= 14 ? '14일' : '7일'} 달성!)</span>}
          </motion.div>
        )}

        {/* Trigger 메시지 - Loss aversion / Scarcity / Curiosity */}
        {streakAtRisk && (
          <p className="text-red-600 text-sm font-medium mb-4">
            지금 도전하면 {streakCount + 1}일차 달성!
          </p>
        )}
        {!playedToday && !canExtend && streakCount === 0 && (
          <p className="text-toss-sub text-sm mb-4">
            오늘의 도전, 시작해볼까요?
          </p>
        )}
        {playedToday && (
          <p className="text-toss-blue text-sm font-medium mb-4">
            오늘 이미 한 번! 한 번 더하면 실력이 쑥쑥 🚀
          </p>
        )}

        <div className="text-toss-sub text-sm mb-6 bg-toss-bg rounded-xl py-4 px-5 text-left">
          <p className="font-medium text-toss-text mb-2">게임 내용</p>
          <ul className="space-y-1 text-sm">
            <li>① 민첩성</li>
            <li>② 순발력</li>
            <li>③ 집중력</li>
            <li>④ 논리력</li>
            <li>⑤ 시각 추론</li>
          </ul>
        </div>

        <motion.button
          onClick={startGame}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`w-full py-4 rounded-2xl text-white font-semibold shadow-lg text-lg transition-all ${
            streakAtRisk
              ? 'bg-red-500 shadow-red-500/30 hover:shadow-red-500/40'
              : 'bg-toss-blue shadow-toss-blue/25 hover:shadow-toss-blue/40'
          }`}
        >
          {streakAtRisk ? '🔥 오늘도 지키기!' : playedToday ? '한 번 더 도전!' : '시작하기'}
        </motion.button>

        <p className="text-toss-sub text-sm mt-5 leading-relaxed">
          친구와 함께 두뇌 점수를 겨뤄 보세요
        </p>

        {sharedPercentile && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 rounded-2xl bg-amber-50 border-2 border-amber-200"
          >
            <p className="text-amber-700 font-bold text-lg mb-1">
              친구가 상위 {sharedPercentile}%를 달성했어요! 🏆
            </p>
            <p className="text-amber-600 text-sm mb-3">나도 해볼까요?</p>
            <button
              onClick={() => navigate('/run')}
              className="w-full py-3 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 transition"
            >
              나도 도전하기!
            </button>
          </motion.div>
        )}

        <div className="mt-8 flex justify-center">
          <button
            onClick={() => navigate('/record')}
            className="text-base text-toss-sub hover:text-toss-blue transition font-medium py-1"
          >
            기록 & 순위 보기
          </button>
        </div>
      </motion.div>
    </div>
  );
}
