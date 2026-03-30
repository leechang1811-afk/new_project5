import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Home from './pages/Home';

const Run = lazy(() => import('./pages/Run'));
const Result = lazy(() => import('./pages/Result'));
const ResultGate = lazy(() => import('./pages/ResultGate'));
const RecordAndRank = lazy(() => import('./pages/RecordAndRank'));
const ScreenshotCombo = lazy(() => import('./pages/ScreenshotCombo'));

function RouteFallback() {
  return (
    <div className="min-h-[100svh] flex items-center justify-center bg-white text-sm text-[#5B6475] px-4">
      불러오는 중…
    </div>
  );
}

export default function App() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Suspense fallback={<RouteFallback />}>
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/screenshot" element={<ScreenshotCombo />} />
            <Route path="/run" element={<Run />} />
            <Route path="/result-gate" element={<ResultGate />} />
            <Route path="/result" element={<Result />} />
            <Route path="/record" element={<RecordAndRank />} />
            <Route path="/leaderboard" element={<Navigate to="/record" replace />} />
            <Route path="/my-stats" element={<Navigate to="/record" replace />} />
          </Routes>
        </AnimatePresence>
      </Suspense>
    </div>
  );
}
