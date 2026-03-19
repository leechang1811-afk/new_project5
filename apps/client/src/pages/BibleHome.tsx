import { useNavigate } from 'react-router-dom';

export default function BibleHome() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="flex items-center justify-between px-4 py-3 border-b border-[#E6EAF2]">
        <div className="w-12" />
        <button onClick={() => navigate('/settings')} className="text-[#5B6475] text-sm font-medium hover:text-[#1B64F2]">
          설정
        </button>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-md rounded-3xl p-8 pb-12 bg-[#EEF4FF] border border-[#E6EAF2]">
          <div className="flex flex-col items-center pb-6">
            <p className="text-[#5B6475] text-sm font-medium">
              온세대가 영적 근육을 키우는
            </p>
            <h1 className="text-[#1B64F2] text-2xl font-bold mt-2">
              성경 1일1독
            </h1>
            <span className="mt-2 px-3 py-1 rounded-full text-xs font-medium text-[#1B64F2] bg-white">
              연대기순
            </span>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => navigate('/verse-picker')}
              className="w-full py-4 rounded-2xl font-semibold text-white bg-[#1B64F2] hover:bg-[#1557e0]"
            >
              📜 오늘의 하나님 말씀 뽑기
            </button>
            <button
              onClick={() => navigate('/read')}
              className="w-full py-4 rounded-2xl font-semibold text-[#1B64F2] bg-white border-2 border-[#1B64F2]"
            >
              시작하기
            </button>
            <button
              onClick={() => navigate('/journal')}
              className="w-full py-4 rounded-2xl font-semibold text-[#1B64F2] bg-white border border-[#E6EAF2]"
            >
              나의 메모 보러가기
            </button>
            <button
              onClick={() => navigate('/journal?tab=bookmarks')}
              className="w-full py-4 rounded-2xl font-semibold text-[#1B64F2] bg-white border border-[#E6EAF2]"
            >
              좋아요 구절 보러가기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
