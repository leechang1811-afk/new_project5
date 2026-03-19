import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BIBLE_BOOKS_ORDER } from '../data/bibleSchedule';
import { useBibleStore } from '../store/bibleStore';

export default function BibleSettings() {
  const navigate = useNavigate();
  const { startBookId, setStartBook, setCurrentDay } = useBibleStore();
  const [selected, setSelected] = useState(startBookId);

  const handleApply = () => {
    setStartBook(selected);
    setCurrentDay(1);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-24">
      <header className="sticky top-0 z-10 bg-white border-b border-[#E6EAF2] shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate('/read')}
            className="text-[#5B6475] text-sm font-medium"
          >
            ← 뒤로
          </button>
          <span className="text-[#0B1220] font-semibold">읽기 설정</span>
          <span className="w-12" />
        </div>
      </header>

      <div className="p-6 max-w-2xl mx-auto">
        <p className="text-[#5B6475] text-sm mb-4">
          어느 전서부터 1일1독을 시작할지 선택하세요. 선택한 책부터 차례대로
          지구촌교회 연대기순으로 진행됩니다.
        </p>

        <div className="bg-white rounded-2xl border border-[#E6EAF2] overflow-hidden">
          <div className="max-h-[50vh] overflow-y-auto">
            {BIBLE_BOOKS_ORDER.map((book) => (
              <button
                key={book.id}
                onClick={() => setSelected(book.id)}
                className={`w-full text-left px-6 py-4 flex items-center justify-between border-b border-[#E6EAF2] last:border-0 ${
                  selected === book.id ? 'bg-[#EEF4FF] text-[#1B64F2]' : 'text-[#0B1220]'
                }`}
              >
                <span className="font-medium">{book.name}</span>
                {selected === book.id && <span>✓</span>}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleApply}
          className="w-full mt-6 py-4 rounded-2xl bg-[#1B64F2] text-white font-semibold"
        >
          이 책부터 시작하기
        </button>

        <p className="text-[#94a3b8] text-xs mt-4 text-center">
          지구촌교회 공동체 성경읽기표 기준
        </p>
      </div>
    </div>
  );
}
