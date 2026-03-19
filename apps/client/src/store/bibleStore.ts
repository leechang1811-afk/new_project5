import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ReadingItem } from '../data/bibleSchedule';

export interface BibleMemo {
  id: string;
  dayIndex: number;
  readingRef: string;
  date: string;
  question1: string;
  question2: string;
  memo1: string;
  memo2: string;
  dailyNote: string;
  createdAt: number;
}

export interface BibleBookmark {
  id: string;
  dayIndex: number;
  readingRef: string;
  date: string;
  createdAt: number;
}

interface BibleState {
  // 읽기 설정
  startBookId: string;
  customOrder: string[] | null;
  currentDayIndex: number;

  // 찜/북마크
  bookmarks: BibleBookmark[];

  // 메모
  memos: BibleMemo[];

  // 액션
  setStartBook: (bookId: string) => void;
  setCustomOrder: (order: string[] | null) => void;
  setCurrentDay: (day: number) => void;
  addBookmark: (item: ReadingItem, date: string) => void;
  removeBookmark: (id: string) => void;
  isBookmarked: (dayIndex: number, date: string) => boolean;
  saveMemo: (memo: Omit<BibleMemo, 'id' | 'createdAt'>) => void;
  updateMemo: (id: string, updates: Partial<BibleMemo>) => void;
  deleteMemo: (id: string) => void;
  getMemosByDate: () => { date: string; items: (BibleMemo | BibleBookmark)[] }[];
  searchMemos: (query: string) => (BibleMemo | BibleBookmark)[];
}

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const useBibleStore = create<BibleState>()(
  persist(
    (set, get) => ({
      startBookId: 'genesis',
      customOrder: null,
      currentDayIndex: 1,
      bookmarks: [],
      memos: [],

      setStartBook: (bookId) => set({ startBookId: bookId }),
      setCustomOrder: (order) => set({ customOrder: order }),
      setCurrentDay: (day) => set({ currentDayIndex: Math.max(1, day) }),

      addBookmark: (item, date) => {
        const { bookmarks } = get();
        if (bookmarks.some((b) => b.dayIndex === item.dayIndex && b.date === date)) return;
        set({
          bookmarks: [
            ...bookmarks,
            {
              id: genId(),
              dayIndex: item.dayIndex,
              readingRef: `${item.book} ${item.startCh}${item.endCh !== item.startCh ? `-${item.endCh}` : ''}장`,
              date,
              createdAt: Date.now(),
            },
          ],
        });
      },

      removeBookmark: (id) =>
        set((s) => ({ bookmarks: s.bookmarks.filter((b) => b.id !== id) })),

      isBookmarked: (dayIndex, date) =>
        get().bookmarks.some((b) => b.dayIndex === dayIndex && b.date === date),

      saveMemo: (memo) =>
        set((s) => ({
          memos: [
            ...s.memos,
            {
              ...memo,
              id: genId(),
              createdAt: Date.now(),
            },
          ],
        })),

      updateMemo: (id, updates) =>
        set((s) => ({
          memos: s.memos.map((m) => (m.id === id ? { ...m, ...updates } : m)),
        })),

      deleteMemo: (id) =>
        set((s) => ({ memos: s.memos.filter((m) => m.id !== id) })),

      getMemosByDate: () => {
        const { memos, bookmarks } = get();
        const map = new Map<string, (BibleMemo | BibleBookmark)[]>();
        const add = (date: string, item: BibleMemo | BibleBookmark) => {
          if (!map.has(date)) map.set(date, []);
          map.get(date)!.push(item);
        };
        memos.forEach((m) => add(m.date, m));
        bookmarks.forEach((b) => add(b.date, b));
        return Array.from(map.entries())
          .sort(([a], [b]) => (b as string).localeCompare(a as string))
          .map(([date, items]) => ({
            date,
            items: items.sort((x, y) => {
              const t1 = 'createdAt' in x ? x.createdAt : 0;
              const t2 = 'createdAt' in y ? y.createdAt : 0;
              return t2 - t1;
            }),
          }));
      },

      searchMemos: (query) => {
        const q = query.trim().toLowerCase();
        if (!q) return [];
        const { memos, bookmarks } = get();
        const matches: (BibleMemo | BibleBookmark)[] = [];
        const check = (text: string) => text.toLowerCase().includes(q);
        memos.forEach((m) => {
          if (
            check(m.readingRef) ||
            check(m.memo1) ||
            check(m.memo2) ||
            check(m.dailyNote) ||
            check(m.question1) ||
            check(m.question2)
          ) {
            matches.push(m);
          }
        });
        bookmarks.forEach((b) => {
          if (check(b.readingRef)) matches.push(b);
        });
        return matches.sort((a, b) => {
          const t1 = 'createdAt' in a ? a.createdAt : 0;
          const t2 = 'createdAt' in b ? b.createdAt : 0;
          return t2 - t1;
        });
      },
    }),
    { name: 'bible-daily-storage' }
  )
);
