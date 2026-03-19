import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getRandomVerse } from '../services/bibleText';
import { useBibleStore } from '../store/bibleStore';
import { useTranslation } from '../hooks/useTranslation';

function getTodayDateString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type Step = 'prayer' | 'ready';

export default function BibleVersePicker() {
  const navigate = useNavigate();
  const addDailyVerse = useBibleStore((s) => s.addDailyVerse);
  const bibleVersion = useBibleStore((s) => s.bibleVersion);
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('prayer');
  const [verse, setVerse] = useState<{
    bookName: string;
    chapter: number;
    verse: number;
    text: string;
    explanation?: string;
  } | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showScroll, setShowScroll] = useState(false);
  const [showContent, setShowContent] = useState(false);

  // 1단계: "말씀 받기 전 기도 먼저 시작해 주세요" 표시 후 사라짐
  useEffect(() => {
    const t = setTimeout(() => setStep('ready'), 3500);
    return () => clearTimeout(t);
  }, []);

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
      const v = await getRandomVerse(bibleVersion);
      setVerse(v);
      setShowContent(true);
    } catch (e) {
      const fallback = {
        bookName: bibleVersion === 'ko' ? '창세기' : 'Genesis',
        chapter: 1,
        verse: 1,
        text: 'In the beginning God created the heaven and the earth.',
      };
      setVerse(fallback);
      setShowContent(true);
    } finally {
      setIsDrawing(false);
    }
  };

  const handleSaveVerse = () => {
    if (verse) {
      addDailyVerse(verse, getTodayDateString());
      alert(t('wordSaved'));
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col bg-white overflow-x-hidden w-full max-w-full">
      <header className="flex items-center justify-between px-3 xs:px-4 py-2.5 xs:py-3 pt-[max(0.75rem,env(safe-area-inset-top))] border-b border-[#E6EAF2]">
        <button
          onClick={() => navigate('/')}
          className="text-[#5B6475] text-sm font-medium hover:text-[#1B64F2]"
        >
          {t('back')}
        </button>
        <span className="text-[#0B1220] font-semibold text-sm">{t('todayGodWord')}</span>
        <span className="w-12" />
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-3 xs:px-4 sm:px-6 py-5 xs:py-6 sm:py-8 overflow-x-hidden w-full box-border">
        <AnimatePresence mode="wait">
          {step === 'prayer' && (
            <motion.div
              key="prayer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-[min(28rem,calc(100vw-1.5rem))] text-center"
            >
              <p className="text-[#0B1220] text-base xs:text-lg leading-relaxed font-medium px-2">
                {t('prayerFirst')}
              </p>
            </motion.div>
          )}

          {step === 'ready' && !showScroll && (
            <motion.div
              key="ready"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-[min(28rem,calc(100vw-1.5rem))] flex flex-col items-center gap-5 xs:gap-6"
            >
              <p className="text-[#5B6475] text-sm xs:text-base text-center px-2">
                {t('readyPrompt')}
              </p>
              <button
                onClick={handleDrawVerse}
                disabled={isDrawing}
                className="w-full min-h-[48px] py-3.5 xs:py-4 rounded-xl xs:rounded-2xl bg-[#1B64F2] text-white font-semibold text-sm xs:text-base disabled:opacity-70"
              >
                {isDrawing ? t('gettingWord') : t('getWord')}
              </button>
            </motion.div>
          )}

          {showScroll && (
            <motion.div
              key="verse"
              initial={{ opacity: 0, y: -200 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-[min(28rem,calc(100vw-1.5rem))] flex flex-col items-center gap-3 xs:gap-4"
            >
              {/* 최상단: 오늘 읽은 말씀 저장하기 */}
              {verse && (
                <button
                  onClick={handleSaveVerse}
                  className="w-full min-h-[44px] py-2.5 xs:py-3 rounded-xl xs:rounded-2xl font-semibold text-sm xs:text-base text-[#1B64F2] bg-[#EEF4FF] border border-[#1B64F2]"
                >
                  {t('saveWord')}
                </button>
              )}
              <motion.div
                initial={{ height: 0, opacity: 0.5 }}
                animate={{ height: 'auto', opacity: 1 }}
                transition={{ delay: 0.4, duration: 1, ease: 'easeOut' }}
                className="w-full rounded-2xl overflow-hidden border-2 border-[#E6EAF2] bg-[#EEF4FF]"
              >
                <div className="p-5 xs:p-6 sm:p-8 min-h-[180px] xs:min-h-[200px] flex flex-col items-center justify-center">
                  {showContent && verse ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="text-center"
                    >
                      <p className="text-[#0B1220] text-[15px] xs:text-base sm:text-xl leading-relaxed font-medium break-words px-1">
                        {verse.text}
                      </p>
                      {verse.explanation && (
                        <div className="mt-3 text-left border-l-2 border-[#E6EAF2] pl-3">
                          <span className="text-[#94a3b8] text-xs font-medium">{t('explanationLabel')}</span>
                          <p className="text-[#5B6475] text-sm mt-1 leading-relaxed">{verse.explanation}</p>
                        </div>
                      )}
                      <p className="text-[#1B64F2] text-base mt-4 font-semibold">
                        {verse.bookName} {verse.chapter}:{verse.verse}
                      </p>
                    </motion.div>
                  ) : (
                    <div className="text-[#5B6475] text-base">{t('wordUnfolding')}</div>
                  )}
                </div>
              </motion.div>

              <button
                onClick={handleDrawVerse}
                disabled={isDrawing}
                className="w-full min-h-[48px] py-3.5 xs:py-4 rounded-xl xs:rounded-2xl font-semibold text-sm xs:text-base text-[#1B64F2] bg-white border-2 border-[#1B64F2] disabled:opacity-70"
              >
                {isDrawing ? t('gettingWord') : t('getAgain')}
              </button>

              <button
                onClick={() => navigate('/')}
                className="w-full min-h-[48px] py-3.5 xs:py-4 rounded-xl xs:rounded-2xl font-semibold text-sm xs:text-base text-[#5B6475] bg-white border border-[#E6EAF2]"
              >
                {t('goHome')}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
