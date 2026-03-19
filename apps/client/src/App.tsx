import { Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Home from './pages/Home';
import Run from './pages/Run';
import Result from './pages/Result';
import ResultGate from './pages/ResultGate';
import RecordAndRank from './pages/RecordAndRank';
import BibleHome from './pages/BibleHome';
import BibleDaily from './pages/BibleDaily';
import BibleSettings from './pages/BibleSettings';
import BibleJournal from './pages/BibleJournal';
import BibleVersePicker from './pages/BibleVersePicker';

export default function App() {
  return (
    <AnimatePresence mode="wait">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/bible" element={<BibleHome />} />
        <Route path="/bible/verse-picker" element={<BibleVersePicker />} />
        <Route path="/bible/read" element={<BibleDaily />} />
        <Route path="/bible/settings" element={<BibleSettings />} />
        <Route path="/bible/journal" element={<BibleJournal />} />
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
