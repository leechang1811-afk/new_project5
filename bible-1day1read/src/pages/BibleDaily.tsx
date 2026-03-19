import { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  getScheduleFromBook,
  getReadingByDayIndex,
  type ReadingItem,
} from '../data/bibleSchedule';
import { getMeditationQuestions } from '../data/meditationQuestions';
import { useBibleStore } from '../store/bibleStore';
import { useBibleTTS } from '../hooks/useBibleTTS';
import { getVerses, getBookName } from '../services/bibleText';
import { useTranslation } from '../hooks/useTranslation';

function getTodayDateString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function BibleDaily() {
  const navigate = useNavigate();
  const today = getTodayDateString();

  const {
    startBookId,
    customOrder,
    currentDayIndex,
    bibleVersion,
    setBibleVersion,
    setCurrentDay,
    addBookmark,
    removeBookmark,
    isBookmarked,
    saveMemo,
    memos,
  } = useBibleStore();

  const schedule = useMemo(
    () => getScheduleFromBook(startBookId, customOrder ?? undefined),
    [startBookId, customOrder]
  );

  const reading = getReadingByDayIndex(schedule, currentDayIndex);
  const { t, locale } = useTranslation();
  const [q1, q2] = reading ? getMeditationQuestions(reading.bookId, locale) : ['', ''];

  const [memo1, setMemo1] = useState('');
  const [memo2, setMemo2] = useState('');
  const [dailyNote, setDailyNote] = useState('');
  const [verses, setVerses] = useState<{ chapter: number; verse: number; text: string; explanation?: string }[]>([]);
  const [versesLoading, setVersesLoading] = useState(true);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const ttsCurrentVerseRef = useRef(0);
  const [ttsStoppedAtIndex, setTtsStoppedAtIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!reading) return;
    setVersesLoading(true);
    getVerses(reading.bookId, reading.startCh, reading.endCh, bibleVersion)
      .then(setVerses)
      .catch(() => setVerses([]))
      .finally(() => setVersesLoading(false));
  }, [reading?.bookId, reading?.startCh, reading?.endCh, bibleVersion]);

  const existingMemo = useMemo(
    () => memos.find((m) => m.dayIndex === currentDayIndex && m.date === today),
    [memos, currentDayIndex, today]
  );

  useEffect(() => {
    if (existingMemo) {
      setMemo1(existingMemo.memo1);
      setMemo2(existingMemo.memo2);
      setDailyNote(existingMemo.dailyNote);
    } else {
      setMemo1('');
      setMemo2('');
      setDailyNote('');
    }
  }, [existingMemo, currentDayIndex, today]);

  const { speak, speakVerses, stop, getReadingTextForTTS, toSinoKorean } = useBibleTTS();

  useEffect(() => {
    if ('speechSynthesis' in window) {
      speechSynthesis.getVoices();
      const load = () => speechSynthesis.getVoices();
      speechSynthesis.onvoiceschanged = load;
    }
  }, []);

  useEffect(() => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setTtsPlaying(false);
    setTtsStoppedAtIndex(null);
  }, [reading?.bookId, reading?.startCh, reading?.endCh]);

  const bookmarked = reading && isBookmarked(reading.dayIndex, today);

  const handleBookmark = () => {
    if (!reading) return;
    if (bookmarked) {
      const b = useBibleStore.getState().bookmarks.find(
        (x) => x.dayIndex === reading.dayIndex && x.date === today
      );
      if (b) useBibleStore.getState().removeBookmark(b.id);
    } else {
      addBookmark(reading, today);
    }
  };

  const handleSaveMemo = () => {
    if (!reading) return;
    if (existingMemo) {
      useBibleStore.getState().updateMemo(existingMemo.id, {
        memo1,
        memo2,
        dailyNote,
      });
    } else {
      saveMemo({
        dayIndex: reading.dayIndex,
        readingRef: `${reading.book} ${reading.startCh}${reading.endCh !== reading.startCh ? `-${reading.endCh}` : ''}장`,
        date: today,
        question1: q1,
        question2: q2,
        memo1,
        memo2,
        dailyNote,
      });
    }
  };

  const startPlayback = (fromIndex: number) => {
    if (!reading) return;
    const onEnd = () => {
      setTtsPlaying(false);
      setTtsStoppedAtIndex(null);
    };
    setTtsPlaying(true);
    setTtsStoppedAtIndex(null);
    if (verses.length > 0) {
      const verseTexts = verses.map((v) => `Chapter ${v.chapter}, verse ${v.verse}. ${v.text}`);
      speakVerses(
        verseTexts,
        1000,
        'en-US',
        onEnd,
        fromIndex,
        (i) => { ttsCurrentVerseRef.current = i; }
      );
    } else {
      const text = getReadingTextForTTS(bookDisplay, reading.startCh, reading.endCh, bibleVersion);
      speak(text, bibleVersion === 'ko' ? 'ko-KR' : 'en-US', onEnd);
    }
  };

  const handleListen = () => {
    if (!reading) return;
    if (ttsPlaying) return;
    const startFrom = ttsStoppedAtIndex ?? 0;
    startPlayback(startFrom);
  };

  const handleStop = () => {
    if (!ttsPlaying) return;
    setTtsStoppedAtIndex(ttsCurrentVerseRef.current);
    stop();
    setTtsPlaying(false);
  };

  const handleReplayFromStart = () => {
    if (!reading) return;
    if (ttsPlaying) stop();
    startPlayback(0);
  };

  if (!reading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] p-6 flex flex-col items-center justify-center">
        <p className="text-[#64748b]">{t('noReading')}</p>
        <button
          onClick={() => setCurrentDay(1)}
          className="mt-4 px-6 py-2 rounded-xl bg-[#1B64F2] text-white"
        >
          {t('goToDay1')}
        </button>
      </div>
    );
  }

  const bookDisplay = getBookName(reading.bookId, bibleVersion);
  const refText =
    bibleVersion === 'ko'
      ? `${bookDisplay} ${reading.startCh}${reading.endCh !== reading.startCh ? `-${reading.endCh}` : ''}장`
      : `${bookDisplay} ${reading.startCh}${reading.endCh !== reading.startCh ? `-${reading.endCh}` : ''}`;

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#f8fafc] pb-24 xs:pb-28 overflow-x-hidden w-full max-w-full">
      {/* 상단 헤더 */}
      <header className="sticky top-0 z-10 bg-white border-b border-[#E6EAF2] shadow-sm pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between px-3 xs:px-4 py-2.5 xs:py-3">
          <button
            onClick={() => navigate('/')}
            className="text-[#5B6475] text-sm font-medium"
          >
            {t('back')}
          </button>
          <span className="text-[#0B1220] font-semibold text-sm">
            {t('appTitle')}
          </span>
          <button
            onClick={() => navigate('/journal')}
            className="text-[#1B64F2] text-sm font-medium"
          >
            {t('journal')}
          </button>
        </div>
      </header>

      <div className="p-3 xs:p-4 sm:p-6 max-w-2xl mx-auto w-full box-border">
        {/* Day selector */}
        <div className="flex items-center gap-2 xs:gap-3 mb-4 xs:mb-6">
          <button
            onClick={() => setCurrentDay(Math.max(1, currentDayIndex - 1))}
            disabled={currentDayIndex <= 1}
            className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full bg-white border border-[#E6EAF2] flex items-center justify-center disabled:opacity-40 touch-target"
          >
            ‹
          </button>
          <span className="text-[#0B1220] font-bold text-base xs:text-lg">
            {t('dayN', { n: currentDayIndex })}
          </span>
          <button
            onClick={() => setCurrentDay(currentDayIndex + 1)}
            disabled={currentDayIndex >= schedule.length}
            className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full bg-white border border-[#E6EAF2] flex items-center justify-center disabled:opacity-40 touch-target"
          >
            ›
          </button>
        </div>

        {/* Reading card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl xs:rounded-2xl shadow-sm border border-[#E6EAF2] overflow-hidden"
        >
          <div className="p-4 xs:p-5 sm:p-6">
            {/* 1행: 한국어 / 영어 번역 */}
            <div className="mb-4">
              <div className="flex rounded-lg overflow-hidden border border-[#E6EAF2] w-fit">
                <button
                  onClick={() => setBibleVersion('ko')}
                  className={`min-h-[36px] px-3 py-1.5 text-xs font-medium ${bibleVersion === 'ko' ? 'bg-[#1B64F2] text-white' : 'bg-white text-[#5B6475] hover:bg-[#f1f5f9]'}`}
                >
                  {t('korean')}
                </button>
                <button
                  onClick={() => setBibleVersion('en')}
                  className={`min-h-[36px] px-3 py-1.5 text-xs font-medium ${bibleVersion === 'en' ? 'bg-[#1B64F2] text-white' : 'bg-white text-[#5B6475] hover:bg-[#f1f5f9]'}`}
                >
                  {t('english')}
                </button>
              </div>
            </div>

            {/* 2행: 음향 버튼들 + 찜하기 */}
            <div className="flex flex-wrap items-center gap-2 mb-8">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={handleListen}
                  disabled={ttsPlaying}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium min-h-[36px] flex items-center gap-1 ${
                    !ttsPlaying ? 'bg-[#1B64F2] text-white' : 'bg-[#E6EAF2] text-[#94a3b8]'
                  }`}
                  title={t('listen')}
                >
                  🔊 {t('listen')}
                </button>
                <button
                  onClick={handleStop}
                  disabled={!ttsPlaying}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium min-h-[36px] flex items-center gap-1 ${
                    ttsPlaying ? 'bg-[#dc2626] text-white' : 'bg-[#E6EAF2] text-[#94a3b8]'
                  }`}
                  title={t('stopTTS')}
                >
                  ⏹ {t('stopTTS')}
                </button>
                <button
                  onClick={handleReplayFromStart}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium min-h-[36px] flex items-center gap-1 bg-[#EEF4FF] text-[#1B64F2] hover:bg-[#1B64F2]/10"
                  title={t('replayFromStart')}
                >
                  🔄 {t('replayFromStartShort')}
                </button>
              </div>
              <button
                onClick={handleBookmark}
                className={`p-2 rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center ${bookmarked ? 'text-red-500 bg-red-50' : 'bg-[#EEF4FF] text-[#5B6475]'} hover:opacity-80`}
                title={bookmarked ? t('unbookmark') : t('bookmark')}
              >
                {bookmarked ? '❤️' : '🤍'}
              </button>
            </div>

            {/* 오늘의 말씀 (토글 아래, 여백 두고) */}
            <div>
              <p className="text-[#1B64F2] font-semibold text-sm mb-1">
                {t(locale === 'ko' ? 'todayWord' : 'todayWordEn')}
              </p>
              <h2 className="text-lg xs:text-xl font-bold text-[#0B1220] break-words">{refText}</h2>
            </div>

            {/* 본문 내용 */}
            <div className="mt-6 pt-6 border-t border-[#E6EAF2]">
              <p className="text-[#5B6475] text-xs mb-4 font-medium">
                {t('bibleSourceKJV')}
              </p>
              {versesLoading ? (
                <p className="text-[#94a3b8] text-sm">
                  {t('loading')}
                </p>
              ) : verses.length > 0 ? (
                <div className="space-y-2 xs:space-y-3 text-[#0B1220] text-[15px] xs:text-base leading-[1.7] xs:leading-relaxed break-words">
                  {verses.map((v, i) => (
                    <div key={i} className="space-y-1">
                      <p>
                        <span className="text-[#1B64F2] font-medium text-sm">
                          {v.chapter}:{v.verse}{' '}
                        </span>
                        {v.text}
                      </p>
                      {v.explanation && (
                        <p className="text-[#5B6475] text-sm pl-1 border-l-2 border-[#E6EAF2] ml-1">
                          <span className="text-[#94a3b8] text-xs font-medium">{t('explanationLabel')}</span> {v.explanation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[#94a3b8] text-sm">
                  {t('loadError')}
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* 묵상 질문 */}
        <div className="mt-4 xs:mt-6 space-y-3 xs:space-y-4">
          <h3 className="text-[#0B1220] font-semibold text-base xs:text-lg">{t('meditationTitle')}</h3>

          <div className="bg-white rounded-xl xs:rounded-2xl p-4 xs:p-5 sm:p-6 shadow-sm border border-[#E6EAF2]">
            <p className="text-[#5B6475] text-sm mb-2 font-medium">{t('question1')}</p>
            <p className="text-[#0B1220] mb-4">{q1}</p>
            <textarea
              value={memo1}
              onChange={(e) => setMemo1(e.target.value)}
              placeholder={t('memoPlaceholder')}
              className="w-full min-h-[72px] xs:min-h-[80px] p-3 xs:p-4 rounded-xl border border-[#E6EAF2] text-[15px] xs:text-base text-[#0B1220] placeholder-[#94a3b8] resize-none"
            />
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E6EAF2]">
            <p className="text-[#5B6475] text-sm mb-2 font-medium">{t('question2')}</p>
            <p className="text-[#0B1220] mb-4">{q2}</p>
            <textarea
              value={memo2}
              onChange={(e) => setMemo2(e.target.value)}
              placeholder={t('memoPlaceholder')}
              className="w-full min-h-[72px] xs:min-h-[80px] p-3 xs:p-4 rounded-xl border border-[#E6EAF2] text-[15px] xs:text-base text-[#0B1220] placeholder-[#94a3b8] resize-none"
            />
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E6EAF2]">
            <p className="text-[#5B6475] text-sm mb-2 font-medium">{t('todayNote')}</p>
            <textarea
              value={dailyNote}
              onChange={(e) => setDailyNote(e.target.value)}
              placeholder={t('todayPlaceholder')}
              className="w-full min-h-[88px] xs:min-h-[100px] p-3 xs:p-4 rounded-xl border border-[#E6EAF2] text-[15px] xs:text-base text-[#0B1220] placeholder-[#94a3b8] resize-none"
            />
          </div>

          <button
            onClick={handleSaveMemo}
            className="w-full min-h-[48px] py-3.5 xs:py-4 rounded-xl xs:rounded-2xl bg-[#1B64F2] text-white font-semibold text-sm xs:text-base"
          >
            {existingMemo ? t('updateSave') : t('save')}
          </button>
        </div>
      </div>

      {/* 하단 네비 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E6EAF2] flex justify-around py-2.5 xs:py-3 px-3 xs:px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]">
        <button
          onClick={() => navigate('/settings')}
          className="flex flex-col items-center gap-1 text-[#5B6475] text-xs"
        >
          <span>⚙️</span> {t('settings')}
        </button>
        <button
          onClick={() => navigate('/read')}
          className="flex flex-col items-center gap-1 text-[#1B64F2] text-xs font-medium"
        >
          <span>📖</span> {t('todayRead')}
        </button>
        <button
          onClick={() => navigate('/journal')}
          className="flex flex-col items-center gap-1 text-[#5B6475] text-xs"
        >
          <span>📓</span> {t('journal')}
        </button>
      </nav>
    </div>
  );
}
