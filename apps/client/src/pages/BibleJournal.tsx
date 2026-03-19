import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useBibleStore, type BibleMemo, type BibleBookmark } from '../store/bibleStore';

function isMemo(x: BibleMemo | BibleBookmark): x is BibleMemo {
  return 'memo1' in x && 'question1' in x;
}

export default function BibleJournal() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab'); // 'bookmarks' = 좋아요 구절만
  const { getMemosByDate, searchMemos, deleteMemo, removeBookmark, memos, bookmarks } = useBibleStore();
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'search'>('list');

  const byDate = useMemo(() => {
    const data = getMemosByDate();
    if (tab === 'bookmarks') {
      return data.map((d) => ({
        ...d,
        items: d.items.filter((x) => !isMemo(x)),
      })).filter((d) => d.items.length > 0);
    }
    return data;
  }, [getMemosByDate, memos, bookmarks, tab]);
  const searchResults = useMemo(
    () => (search.trim() ? searchMemos(search) : []),
    [search, searchMemos, memos, bookmarks]
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-24">
      <header className="sticky top-0 z-10 bg-white border-b border-[#E6EAF2] shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate('/')}
            className="text-[#5B6475] text-sm font-medium"
          >
            ← 뒤로
          </button>
          <span className="text-[#0B1220] font-semibold">내 일기장</span>
          <span className="w-12" />
        </div>
      </header>

      <div className="p-6 max-w-2xl mx-auto">
        {/* 검색 */}
        <div className="mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setViewMode(e.target.value.trim() ? 'search' : 'list');
            }}
            placeholder="메모 검색..."
            className="w-full px-4 py-3 rounded-xl border border-[#E6EAF2] text-[#0B1220] placeholder-[#94a3b8]"
          />
        </div>

        {viewMode === 'search' && search.trim() ? (
          <div className="space-y-4">
            <h3 className="text-[#5B6475] text-sm font-medium">
              검색 결과 ({searchResults.length}건)
            </h3>
            {searchResults.length === 0 ? (
              <p className="text-[#94a3b8] text-center py-8">검색 결과가 없습니다.</p>
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
              {tab === 'bookmarks' ? '찜한 구절 (날짜별)' : '날짜별 (최신순)'}
            </h3>
            {byDate.length === 0 ? (
              <p className="text-[#94a3b8] text-center py-12">
                {tab === 'bookmarks' ? '아직 찜한 구절이 없습니다.' : '아직 저장한 메모가 없습니다.'}
                <br />
                <button
                  onClick={() => navigate('/read')}
                  className="text-[#1B64F2] mt-2 inline-block"
                >
                  {tab === 'bookmarks' ? '읽으면서 찜하기 →' : '1일1독 하러 가기 →'}
                </button>
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

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E6EAF2] flex justify-around py-3 px-4">
        <button
          onClick={() => navigate('/settings')}
          className="flex flex-col items-center gap-1 text-[#5B6475] text-xs"
        >
          <span>⚙️</span> 설정
        </button>
        <button
          onClick={() => navigate('/read')}
          className="flex flex-col items-center gap-1 text-[#5B6475] text-xs"
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

function JournalCard({
  item,
  onDelete,
}: {
  item: BibleMemo | BibleBookmark;
  onDelete?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isBk = !isMemo(item);
  const deleteLabel = isBk ? '찜 해제' : '삭제';

  return (
    <motion.div
      layout
      className="bg-white rounded-2xl border border-[#E6EAF2] overflow-hidden shadow-sm"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-6 py-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          {isBk && <span className="text-red-500">❤️</span>}
          <span className="font-semibold text-[#0B1220]">{item.readingRef}</span>
        </div>
        <span className="text-[#94a3b8]">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="px-6 pb-6 pt-0 border-t border-[#E6EAF2]">
          {isMemo(item) && (
            <>
              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-[#5B6475] text-xs mb-1">질문 1</p>
                  <p className="text-[#0B1220] text-sm">{item.question1}</p>
                  <p className="text-[#64748b] text-sm mt-1">{item.memo1 || '-'}</p>
                </div>
                <div>
                  <p className="text-[#5B6475] text-xs mb-1">질문 2</p>
                  <p className="text-[#0B1220] text-sm">{item.question2}</p>
                  <p className="text-[#64748b] text-sm mt-1">{item.memo2 || '-'}</p>
                </div>
                {item.dailyNote && (
                  <div>
                    <p className="text-[#5B6475] text-xs mb-1">오늘 하루</p>
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
              <p className="text-[#94a3b8] text-sm mt-2">찜한 구절</p>
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
