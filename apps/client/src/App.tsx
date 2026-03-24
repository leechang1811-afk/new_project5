import { Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Home from './pages/Home';
import Run from './pages/Run';
import Result from './pages/Result';
import ResultGate from './pages/ResultGate';
import RecordAndRank from './pages/RecordAndRank';
import ScreenshotCombo from './pages/ScreenshotCombo';

export default function App() {
  return (
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
  );
}
