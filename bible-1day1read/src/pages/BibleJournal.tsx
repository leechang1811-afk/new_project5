import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useBibleStore, type BibleMemo, type BibleBookmark, type BibleDailyVerse } from '../store/bibleStore';
import { useTranslation } from '../hooks/useTranslation';

function isMemo(x: BibleMemo | BibleBookmark): x is BibleMemo {
  return 'memo1' in x && 'question1' in x;
}

export default function BibleJournal() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab');
  const { t } = useTranslation();
  const { getMemosByDate, getDailyVersesByDate, searchMemos, searchDailyVerses, deleteMemo, removeBookmark, removeDailyVerse, memos, bookmarks, dailyVerses } = useBibleStore();
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'search'>('list');

  const byDateRaw = useMemo(() => {
    const data = getMemosByDate();
    if (tab === 'bookmarks') {
      return data.map((d) => ({
        ...d,
        items: d.items.filter((x) => !isMemo(x)),
      })).filter((d) => d.items.length > 0);
    }
    return data;
  }, [getMemosByDate, memos, bookmarks, tab]);

  const byDate = useMemo(() => {
    if (!dateFilter.trim()) return byDateRaw;
    return byDateRaw.filter((d) => d.date === dateFilter);
  }, [byDateRaw, dateFilter]);

  const versesByDateRaw = useMemo(
    () => getDailyVersesByDate(),
    [getDailyVersesByDate, dailyVerses]
  );

  const versesByDate = useMemo(() => {
    if (!dateFilter.trim()) return versesByDateRaw;
    return versesByDateRaw.filter((d) => d.date === dateFilter);
  }, [versesByDateRaw, dateFilter]);

  const searchResults = useMemo(
    () => (search.trim() ? searchMemos(search) : []),
    [search, searchMemos, memos, bookmarks]
  );

  const verseSearchResults = useMemo(
    () => (search.trim() ? searchDailyVerses(search) : []),
    [search, searchDailyVerses, dailyVerses]
  );

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#f8fafc] pb-24 xs:pb-28 overflow-x-hidden w-full max-w-full">
      <header className="sticky top-0 z-10 bg-white border-b border-[#E6EAF2] shadow-sm pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between px-3 xs:px-4 py-2.5 xs:py-3">
          <button
            onClick={() => navigate('/')}
            className="text-[#5B6475] text-sm font-medium"
          >
            {t('back')}
          </button>
          <span className="text-[#0B1220] font-semibold">{t('myJournal')}</span>
          <span className="w-12" />
        </div>
      </header>

      <div className="p-3 xs:p-4 sm:p-6 max-w-2xl mx-auto w-full box-border">
        {/* 탭 */}
        <div className="flex gap-1.5 xs:gap-2 mb-4 xs:mb-6 overflow-x-auto -mx-3 xs:-mx-4 px-3 xs:px-4 scrollbar-none">
          <button
            onClick={() => navigate('/journal')}
            className={`flex-shrink-0 px-3 xs:px-4 py-2 min-h-[40px] rounded-lg xs:rounded-xl text-xs xs:text-sm font-medium ${tab !== 'bookmarks' && tab !== 'verses' ? 'bg-[#1B64F2] text-white' : 'bg-[#E6EAF2] text-[#5B6475]'}`}
          >
            {t('tabMemo')}
          </button>
          <button
            onClick={() => navigate('/journal?tab=bookmarks')}
            className={`flex-shrink-0 px-3 xs:px-4 py-2 min-h-[40px] rounded-lg xs:rounded-xl text-xs xs:text-sm font-medium ${tab === 'bookmarks' ? 'bg-[#1B64F2] text-white' : 'bg-[#E6EAF2] text-[#5B6475]'}`}
          >
            {t('tabBookmarks')}
          </button>
          <button
            onClick={() => navigate('/journal?tab=verses')}
            className={`flex-shrink-0 px-3 xs:px-4 py-2 min-h-[40px] rounded-lg xs:rounded-xl text-xs xs:text-sm font-medium ${tab === 'verses' ? 'bg-[#1B64F2] text-white' : 'bg-[#E6EAF2] text-[#5B6475]'}`}
          >
            {t('tabVerses')}
          </button>
        </div>
        {/* 일자별 · 검색 */}
        <div className="mb-4 xs:mb-6 space-y-2 xs:space-y-3">
          <div className="flex gap-2">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="flex-1 min-w-0 px-3 xs:px-4 py-2.5 xs:py-3 rounded-lg xs:rounded-xl border border-[#E6EAF2] text-[#0B1220] text-sm"
            />
            <button
              onClick={() => setDateFilter('')}
              className="flex-shrink-0 px-3 xs:px-4 py-2.5 xs:py-3 min-h-[44px] rounded-lg xs:rounded-xl border border-[#E6EAF2] text-[#5B6475] text-sm"
            >
              {t('reset')}
            </button>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setViewMode(e.target.value.trim() ? 'search' : 'list');
            }}
            placeholder={tab === 'verses' ? t('searchVerse') : t('searchMemo')}
            className="w-full px-3 xs:px-4 py-2.5 xs:py-3 rounded-lg xs:rounded-xl border border-[#E6EAF2] text-sm text-[#0B1220] placeholder-[#94a3b8]"
          />
        </div>

        {tab === 'verses' ? (
          viewMode === 'search' && search.trim() ? (
            <div className="space-y-4">
              <h3 className="text-[#5B6475] text-sm font-medium">{t('searchResultsCount', { count: verseSearchResults.length })}</h3>
              {verseSearchResults.length === 0 ? (
                <p className="text-[#94a3b8] text-center py-8">{t('noResults')}</p>
              ) : (
                verseSearchResults.map((item) => (
                  <div key={item.id}>
                    <p className="text-[#5B6475] text-xs mb-1">{item.date}</p>
                    <DailyVerseCard
                      item={item}
                      onDelete={() => removeDailyVerse(item.id)}
                    />
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <h3 className="text-[#5B6475] text-sm font-medium">
                {dateFilter ? t('receivedByDateFilter', { date: dateFilter }) : t('receivedByDate')}
              </h3>
              {versesByDate.length === 0 ? (
                <p className="text-[#94a3b8] text-center py-12">
                  {dateFilter ? t('noVersesDate') : t('noVerses')}
                  <br />
                  {dateFilter ? (
                    <button
                      onClick={() => setDateFilter('')}
                      className="text-[#1B64F2] mt-2 inline-block"
                    >
                      {t('resetDate')}
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate('/verse-picker')}
                      className="text-[#1B64F2] mt-2 inline-block"
                    >
                      {t('goGetWord')}
                    </button>
                  )}
                </p>
              ) : (
                versesByDate.map(({ date, items }) => (
                  <div key={date}>
                    <p className="text-[#5B6475] text-sm font-medium mb-3">{date}</p>
                    <div className="space-y-3">
                      {items.map((item) => (
                        <DailyVerseCard
                          key={item.id}
                          item={item}
                          onDelete={() => removeDailyVerse(item.id)}
                        />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )
        ) : viewMode === 'search' && search.trim() ? (
          <div className="space-y-4">
            <h3 className="text-[#5B6475] text-sm font-medium">
              {t('searchResultsCount', { count: searchResults.length })}
            </h3>
            {searchResults.length === 0 ? (
              <p className="text-[#94a3b8] text-center py-8">{t('noResults')}</p>
            ) : (
              searchResults.map((item) => (
                <JournalCard
                  key={item.id}
                  item={item}
                  onDelete={isMemo(item) ? () => deleteMemo(item.id) : () => removeBookmark(item.id)}
                />
              ))
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <h3 className="text-[#5B6475] text-sm font-medium">
              {dateFilter
                ? (tab === 'bookmarks' ? t('bookmarksFiltered', { date: dateFilter }) : t('memoFiltered', { date: dateFilter }))
                : (tab === 'bookmarks' ? t('bookmarksByDate') : t('memoByDate'))}
            </h3>
            {byDate.length === 0 ? (
              <p className="text-[#94a3b8] text-center py-12">
                {dateFilter
                  ? t('noDataDate')
                  : tab === 'bookmarks'
                    ? t('noBookmarks')
                    : t('noMemos')}
                <br />
                {dateFilter ? (
                  <button
                    onClick={() => setDateFilter('')}
                    className="text-[#1B64F2] mt-2 inline-block"
                  >
                    {t('resetDate')}
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('/read')}
                    className="text-[#1B64F2] mt-2 inline-block"
                  >
                    {tab === 'bookmarks' ? t('goRead') : t('goDailyRead')}
                  </button>
                )}
              </p>
            ) : (
              byDate.map(({ date, items }) => (
                <div key={date}>
                  <p className="text-[#5B6475] text-sm font-medium mb-3">{date}</p>
                  <div className="space-y-3">
                    {items.map((item) => (
                      <JournalCard
                        key={item.id}
                        item={item}
                        onDelete={isMemo(item) ? () => deleteMemo(item.id) : () => removeBookmark(item.id)}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E6EAF2] flex justify-around py-2.5 xs:py-3 px-3 xs:px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]">
        <button
          onClick={() => navigate('/settings')}
          className="flex flex-col items-center gap-1 text-[#5B6475] text-xs"
        >
          <span>⚙️</span> {t('settings')}
        </button>
        <button
          onClick={() => navigate('/read')}
          className="flex flex-col items-center gap-1 text-[#5B6475] text-xs"
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

function DailyVerseCard({
  item,
  onDelete,
}: {
  item: BibleDailyVerse;
  onDelete?: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const { t } = useTranslation();

  return (
    <motion.div
      layout
      className="bg-white rounded-xl xs:rounded-2xl border border-[#E6EAF2] overflow-hidden shadow-sm"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full min-h-[48px] text-left px-4 xs:px-6 py-3 xs:py-4 flex items-center justify-between gap-2"
      >
        <span className="font-semibold text-[#1B64F2] text-sm xs:text-base truncate">
          {item.bookName} {item.chapter}:{item.verse}
        </span>
        <span className="text-[#94a3b8]">{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        <div className="px-4 xs:px-6 pb-4 xs:pb-6 pt-0 border-t border-[#E6EAF2]">
          <p className="text-[#0B1220] text-sm xs:text-base leading-relaxed mt-3 xs:mt-4 break-words">{item.text}</p>
          {onDelete && (
            <button onClick={onDelete} className="mt-4 text-red-500 text-sm">
              {t('delete')}
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}

function JournalCard({
  item,
  onDelete,
}: {
  item: BibleMemo | BibleBookmark;
  onDelete?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useTranslation();
  const isBk = !isMemo(item);
  const deleteLabel = isBk ? t('unbookmark') : t('delete');

  return (
    <motion.div
      layout
      className="bg-white rounded-xl xs:rounded-2xl border border-[#E6EAF2] overflow-hidden shadow-sm"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full min-h-[48px] text-left px-4 xs:px-6 py-3 xs:py-4 flex items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {isBk && <span className="text-red-500 flex-shrink-0">❤️</span>}
          <span className="font-semibold text-[#0B1220] text-sm xs:text-base truncate">{item.readingRef}</span>
        </div>
        <span className="text-[#94a3b8]">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="px-4 xs:px-6 pb-4 xs:pb-6 pt-0 border-t border-[#E6EAF2]">
          {isMemo(item) && (
            <>
              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-[#5B6475] text-xs mb-1">{t('question1')}</p>
                  <p className="text-[#0B1220] text-sm">{item.question1}</p>
                  <p className="text-[#64748b] text-sm mt-1">{item.memo1 || '-'}</p>
                </div>
                <div>
                  <p className="text-[#5B6475] text-xs mb-1">{t('question2')}</p>
                  <p className="text-[#0B1220] text-sm">{item.question2}</p>
                  <p className="text-[#64748b] text-sm mt-1">{item.memo2 || '-'}</p>
                </div>
                {item.dailyNote && (
                  <div>
                    <p className="text-[#5B6475] text-xs mb-1">{t('todayNote')}</p>
                    <p className="text-[#64748b] text-sm">{item.dailyNote}</p>
                  </div>
                )}
              </div>
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="mt-4 text-red-500 text-sm"
                >
                  {deleteLabel}
                </button>
              )}
            </>
          )}
          {isBk && (
            <>
              <p className="text-[#94a3b8] text-sm mt-2">{t('bookmarkedVerse')}</p>
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="mt-2 text-red-500 text-sm"
                >
                  {deleteLabel}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </motion.div>
  );
}
