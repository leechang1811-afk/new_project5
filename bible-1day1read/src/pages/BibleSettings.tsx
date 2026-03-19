import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BIBLE_BOOKS_ORDER } from '../data/bibleSchedule';
import { useBibleStore } from '../store/bibleStore';
import { useTranslation } from '../hooks/useTranslation';
import { getBookName } from '../services/bibleText';

export default function BibleSettings() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { startBookId, bibleVersion, setBibleVersion, setStartBook, setCurrentDay } = useBibleStore();
  const [selected, setSelected] = useState(startBookId);

  const handleApply = () => {
    setStartBook(selected);
    setCurrentDay(1);
    navigate('/read');
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#f8fafc] pb-24 overflow-x-hidden w-full max-w-full">
      <header className="sticky top-0 z-10 bg-white border-b border-[#E6EAF2] shadow-sm pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between px-3 xs:px-4 py-2.5 xs:py-3">
          <button
            onClick={() => navigate('/')}
            className="text-[#5B6475] text-sm font-medium"
          >
            {t('back')}
          </button>
          <span className="text-[#0B1220] font-semibold">{t('readSettings')}</span>
          <span className="w-12" />
        </div>
      </header>

      <div className="p-3 xs:p-4 sm:p-6 max-w-2xl mx-auto w-full box-border">
        <div className="mb-4 xs:mb-6">
          <p className="text-[#5B6475] text-xs xs:text-sm mb-2 font-medium">{t('bibleVersionLabel')}</p>
          <div className="flex rounded-lg xs:rounded-xl overflow-hidden border border-[#E6EAF2] bg-white">
            <button
              onClick={() => setBibleVersion('ko')}
              className={`flex-1 min-h-[48px] py-2.5 xs:py-3 text-sm font-medium ${bibleVersion === 'ko' ? 'bg-[#1B64F2] text-white' : 'text-[#5B6475]'}`}
            >
              {t('krvLabel')}
            </button>
            <button
              onClick={() => setBibleVersion('en')}
              className={`flex-1 min-h-[48px] py-2.5 xs:py-3 text-sm font-medium ${bibleVersion === 'en' ? 'bg-[#1B64F2] text-white' : 'text-[#5B6475]'}`}
            >
              {t('kjvLabel')}
            </button>
          </div>
        </div>

        <p className="text-[#5B6475] text-sm mb-4">
          {t('startBookPrompt')}
        </p>

        <div className="bg-white rounded-xl xs:rounded-2xl border border-[#E6EAF2] overflow-hidden">
          <div className="max-h-[50dvh] overflow-y-auto overscroll-contain">
            {BIBLE_BOOKS_ORDER.map((book) => (
              <button
                key={book.id}
                onClick={() => setSelected(book.id)}
                className={`w-full min-h-[48px] text-left px-4 xs:px-6 py-3 xs:py-4 flex items-center justify-between border-b border-[#E6EAF2] last:border-0 text-sm xs:text-base ${
                  selected === book.id ? 'bg-[#EEF4FF] text-[#1B64F2]' : 'text-[#0B1220]'
                }`}
              >
                <span className="font-medium">{getBookName(book.id, bibleVersion)}</span>
                {selected === book.id && <span>✓</span>}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleApply}
          className="w-full mt-4 xs:mt-6 min-h-[48px] py-3.5 xs:py-4 rounded-xl xs:rounded-2xl bg-[#1B64F2] text-white font-semibold text-sm xs:text-base"
        >
          {t('startFromBook')}
        </button>

        <p className="text-[#94a3b8] text-xs mt-4 text-center">
          {t('chronologicalNote')}
        </p>
      </div>
    </div>
  );
}
