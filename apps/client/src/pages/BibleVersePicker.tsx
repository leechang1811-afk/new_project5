import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getRandomVerse } from '../services/bibleText';

export default function BibleVersePicker() {
  const navigate = useNavigate();
  const [verse, setVerse] = useState<{
    bookName: string;
    chapter: number;
    verse: number;
    text: string;
  } | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showScroll, setShowScroll] = useState(false);
  const [showContent, setShowContent] = useState(false);

  const handleDrawVerse = async () => {
    if (isDrawing) return;
    setIsDrawing(true);
    setVerse(null);
    setShowScroll(false);
    setShowContent(false);

    await new Promise((r) => setTimeout(r, 300));
    setShowScroll(true);
    await new Promise((r) => setTimeout(r, 1200));

    try {
      const v = await getRandomVerse();
      setVerse(v);
      setShowContent(true);
    } catch (e) {
      setVerse({
        bookName: '창세기',
        chapter: 1,
        verse: 1,
        text: '태초에 하나님이 천지를 창조하시니라',
      });
      setShowContent(true);
    } finally {
      setIsDrawing(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setIsDrawing(true);
      setShowScroll(true);
      await new Promise((r) => setTimeout(r, 1200));
      if (!mounted) return;
      try {
        const v = await getRandomVerse();
        setVerse(v);
        setShowContent(true);
      } catch {
        if (mounted) setVerse({ bookName: '창세기', chapter: 1, verse: 1, text: '태초에 하나님이 천지를 창조하시니라' });
        setShowContent(true);
      }
      setIsDrawing(false);
    };
    run();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="flex items-center justify-between px-4 py-3 border-b border-[#E6EAF2]">
        <button
          onClick={() => navigate('/')}
          className="text-[#5B6475] text-sm font-medium hover:text-[#1B64F2]"
        >
          ← 뒤로
        </button>
        <span className="text-[#0B1220] font-semibold text-sm">오늘의 하나님 말씀</span>
        <span className="w-12" />
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <AnimatePresence>
          {showScroll && (
            <motion.div
              initial={{ opacity: 0, y: -200 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-md"
            >
              <motion.div
                initial={{ height: 0, opacity: 0.5 }}
                animate={{ height: 'auto', opacity: 1 }}
                transition={{ delay: 0.4, duration: 1, ease: 'easeOut' }}
                className="w-full rounded-2xl overflow-hidden border-2 border-[#E6EAF2] bg-[#EEF4FF]"
              >
                <div className="p-8 min-h-[200px] flex flex-col items-center justify-center">
                  {showContent && verse ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="text-center"
                    >
                      <p className="text-[#0B1220] text-xl leading-relaxed font-medium">
                        {verse.text}
                      </p>
                      <p className="text-[#1B64F2] text-base mt-4 font-semibold">
                        {verse.bookName} {verse.chapter}:{verse.verse}
                      </p>
                    </motion.div>
                  ) : (
                    <div className="text-[#5B6475] text-base">말씀이 펼쳐지는 중...</div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={handleDrawVerse}
          disabled={isDrawing}
          className="mt-8 w-full max-w-md py-4 rounded-2xl bg-[#1B64F2] text-white font-semibold disabled:opacity-70"
        >
          {isDrawing ? '말씀을 뽑는 중...' : '다시 뽑기'}
        </button>
      </div>
    </div>
  );
}
