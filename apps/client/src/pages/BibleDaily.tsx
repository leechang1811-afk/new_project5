import { useMemo, useState, useEffect } from 'react';
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
import { getVerses } from '../services/bibleText';

const JIGUCHON_LINK = 'https://www.jiguchon.or.kr/contents_tmp.php?gr=2&page=1';

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
  const [q1, q2] = reading ? getMeditationQuestions(reading.bookId) : ['', ''];

  const [memo1, setMemo1] = useState('');
  const [memo2, setMemo2] = useState('');
  const [dailyNote, setDailyNote] = useState('');
  const [verses, setVerses] = useState<{ chapter: number; verse: number; text: string }[]>([]);
  const [versesLoading, setVersesLoading] = useState(true);

  useEffect(() => {
    if (!reading) return;
    setVersesLoading(true);
    getVerses(reading.bookId, reading.startCh, reading.endCh)
      .then(setVerses)
      .catch(() => setVerses([]))
      .finally(() => setVersesLoading(false));
  }, [reading?.bookId, reading?.startCh, reading?.endCh]);

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

  const { speak, stop, getReadingTextForTTS } = useBibleTTS();

  useEffect(() => {
    if ('speechSynthesis' in window) {
      speechSynthesis.getVoices();
      const load = () => speechSynthesis.getVoices();
      speechSynthesis.onvoiceschanged = load;
    }
  }, []);

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

  const handleTTS = () => {
    if (!reading) return;
    stop();
    if (verses.length > 0) {
      const fullText = verses.map((v) => `${v.chapter}장 ${v.verse}절. ${v.text}`).join(' ');
      speak(fullText);
    } else {
      const text = getReadingTextForTTS(reading.book, reading.startCh, reading.endCh);
      speak(text);
    }
  };

  if (!reading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] p-6 flex flex-col items-center justify-center">
        <p className="text-[#64748b]">해당 일차의 읽기가 없습니다.</p>
        <button
          onClick={() => setCurrentDay(1)}
          className="mt-4 px-6 py-2 rounded-xl bg-[#1B64F2] text-white"
        >
          제1일로
        </button>
      </div>
    );
  }

  const refText = `${reading.book} ${reading.startCh}${reading.endCh !== reading.startCh ? `-${reading.endCh}` : ''}장`;

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-24">
      {/* 상단 헤더 */}
      <header className="sticky top-0 z-10 bg-white border-b border-[#E6EAF2] shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate('/')}
            className="text-[#5B6475] text-sm font-medium"
          >
            ← 뒤로
          </button>
          <span className="text-[#0B1220] font-semibold text-sm">
            지구촌교회 1일1독
          </span>
          <button
            onClick={() => navigate('/journal')}
            className="text-[#1B64F2] text-sm font-medium"
          >
            일기장
          </button>
        </div>
      </header>

      <div className="p-6 max-w-2xl mx-auto">
        {/* Day selector */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setCurrentDay(Math.max(1, currentDayIndex - 1))}
            disabled={currentDayIndex <= 1}
            className="w-10 h-10 rounded-full bg-white border border-[#E6EAF2] flex items-center justify-center disabled:opacity-40"
          >
            ‹
          </button>
          <span className="text-[#0B1220] font-bold text-lg">
            제 {currentDayIndex}일
          </span>
          <button
            onClick={() => setCurrentDay(currentDayIndex + 1)}
            disabled={currentDayIndex >= schedule.length}
            className="w-10 h-10 rounded-full bg-white border border-[#E6EAF2] flex items-center justify-center disabled:opacity-40"
          >
            ›
          </button>
        </div>

        {/* Reading card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-[#E6EAF2] overflow-hidden"
        >
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-[#1B64F2] font-semibold text-sm mb-1">
                  오늘의 말씀
                </p>
                <h2 className="text-xl font-bold text-[#0B1220]">{refText}</h2>
                {reading.hasOverview && (
                  <p className="text-[#5B6475] text-xs mt-1">※ 개관 영상 포함</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleTTS}
                  className="p-2 rounded-lg bg-[#EEF4FF] text-[#1B64F2] hover:bg-[#1B64F2]/10"
                  title="들어보기"
                >
                  🔊
                </button>
                <button
                  onClick={handleBookmark}
                  className={`p-2 rounded-lg ${bookmarked ? 'text-red-500 bg-red-50' : 'bg-[#EEF4FF] text-[#5B6475]'} hover:opacity-80`}
                  title={bookmarked ? '찜 해제' : '찜하기'}
                >
                  {bookmarked ? '❤️' : '🤍'}
                </button>
              </div>
            </div>

            {/* 본문 내용 */}
            <div className="mt-6 pt-6 border-t border-[#E6EAF2]">
              <p className="text-[#5B6475] text-xs mb-4 font-medium">개역한글 성경</p>
              {versesLoading ? (
                <p className="text-[#94a3b8] text-sm">본문을 불러오는 중...</p>
              ) : verses.length > 0 ? (
                <div className="space-y-3 text-[#0B1220] leading-relaxed">
                  {verses.map((v, i) => (
                    <p key={i}>
                      <span className="text-[#1B64F2] font-medium text-sm">
                        {v.chapter}:{v.verse}{' '}
                      </span>
                      {v.text}
                    </p>
                  ))}
                </div>
              ) : (
                <a
                  href={JIGUCHON_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-[#1B64F2] hover:underline"
                >
                  지구촌교회 공동체 성경읽기에서 본문 보기 →
                </a>
              )}
            </div>
          </div>
        </motion.div>

        {/* 묵상 질문 */}
        <div className="mt-6 space-y-4">
          <h3 className="text-[#0B1220] font-semibold">묵상 질문</h3>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E6EAF2]">
            <p className="text-[#5B6475] text-sm mb-2 font-medium">질문 1</p>
            <p className="text-[#0B1220] mb-4">{q1}</p>
            <textarea
              value={memo1}
              onChange={(e) => setMemo1(e.target.value)}
              placeholder="묵상한 내용을 적어보세요..."
              className="w-full min-h-[80px] p-4 rounded-xl border border-[#E6EAF2] text-[#0B1220] placeholder-[#94a3b8] resize-none"
            />
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E6EAF2]">
            <p className="text-[#5B6475] text-sm mb-2 font-medium">질문 2</p>
            <p className="text-[#0B1220] mb-4">{q2}</p>
            <textarea
              value={memo2}
              onChange={(e) => setMemo2(e.target.value)}
              placeholder="묵상한 내용을 적어보세요..."
              className="w-full min-h-[80px] p-4 rounded-xl border border-[#E6EAF2] text-[#0B1220] placeholder-[#94a3b8] resize-none"
            />
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E6EAF2]">
            <p className="text-[#5B6475] text-sm mb-2 font-medium">오늘 하루</p>
            <textarea
              value={dailyNote}
              onChange={(e) => setDailyNote(e.target.value)}
              placeholder="오늘 하루는 어땠는지, 느낀 점을 적어보세요..."
              className="w-full min-h-[100px] p-4 rounded-xl border border-[#E6EAF2] text-[#0B1220] placeholder-[#94a3b8] resize-none"
            />
          </div>

          <button
            onClick={handleSaveMemo}
            className="w-full py-4 rounded-2xl bg-[#1B64F2] text-white font-semibold"
          >
            {existingMemo ? '수정 저장' : '저장하기'}
          </button>
        </div>
      </div>

      {/* 하단 네비 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E6EAF2] flex justify-around py-3 px-4">
        <button
          onClick={() => navigate('/settings')}
          className="flex flex-col items-center gap-1 text-[#5B6475] text-xs"
        >
          <span>⚙️</span> 설정
        </button>
        <button
          onClick={() => navigate('/read')}
          className="flex flex-col items-center gap-1 text-[#1B64F2] text-xs font-medium"
        >
          <span>📖</span> 오늘 읽기
        </button>
        <button
          onClick={() => navigate('/journal')}
          className="flex flex-col items-center gap-1 text-[#5B6475] text-xs"
        >
          <span>📓</span> 일기장
        </button>
      </nav>
    </div>
  );
}
