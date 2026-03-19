import { Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import BibleHome from './pages/BibleHome';
import BibleDaily from './pages/BibleDaily';
import BibleSettings from './pages/BibleSettings';
import BibleJournal from './pages/BibleJournal';
import BibleVersePicker from './pages/BibleVersePicker';
import BibleBookViewer from './pages/BibleBookViewer';

export default function App() {
  return (
    <AnimatePresence mode="wait">
      <Routes>
        <Route path="/" element={<BibleHome />} />
        <Route path="/bible" element={<BibleBookViewer />} />
        <Route path="/verse-picker" element={<BibleVersePicker />} />
        <Route path="/read" element={<BibleDaily />} />
        <Route path="/settings" element={<BibleSettings />} />
        <Route path="/journal" element={<BibleJournal />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}
