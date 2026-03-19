import { supabase } from '../lib/supabase';
import type { BibleMemo, BibleBookmark, BibleDailyVerse } from '../store/bibleStore';

function toDbMemo(m: BibleMemo) {
  return {
    id: m.id,
    user_id: '', // filled by RLS
    day_index: m.dayIndex,
    reading_ref: m.readingRef,
    date: m.date,
    question1: m.question1,
    question2: m.question2,
    memo1: m.memo1,
    memo2: m.memo2,
    daily_note: m.dailyNote,
  };
}

function fromDbMemo(r: Record<string, unknown>): BibleMemo {
  return {
    id: r.id as string,
    dayIndex: r.day_index as number,
    readingRef: r.reading_ref as string,
    date: r.date as string,
    question1: (r.question1 as string) || '',
    question2: (r.question2 as string) || '',
    memo1: (r.memo1 as string) || '',
    memo2: (r.memo2 as string) || '',
    dailyNote: (r.daily_note as string) || '',
    createdAt: new Date(r.created_at as string).getTime(),
  };
}

function fromDbBookmark(r: Record<string, unknown>): BibleBookmark {
  return {
    id: r.id as string,
    dayIndex: r.day_index as number,
    readingRef: r.reading_ref as string,
    date: r.date as string,
    createdAt: new Date(r.created_at as string).getTime(),
  };
}

function fromDbVerse(r: Record<string, unknown>): BibleDailyVerse {
  return {
    id: r.id as string,
    date: r.date as string,
    bookName: r.book_name as string,
    chapter: r.chapter as number,
    verse: r.verse as number,
    text: r.text as string,
    createdAt: new Date(r.created_at as string).getTime(),
  };
}

export async function loadFromSupabase(userId: string) {
  if (!supabase) return null;

  const [memosRes, bookmarksRes, versesRes, settingsRes] = await Promise.all([
    supabase.from('bible_memos').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('bible_bookmarks').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('bible_daily_verses').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('bible_user_settings').select('*').eq('user_id', userId).single(),
  ]);

  if (memosRes.error || bookmarksRes.error || versesRes.error) return null;

  return {
    memos: (memosRes.data || []).map(fromDbMemo),
    bookmarks: (bookmarksRes.data || []).map(fromDbBookmark),
    dailyVerses: (versesRes.data || []).map(fromDbVerse),
    settings: settingsRes.data
      ? {
          startBookId: (settingsRes.data as Record<string, unknown>).start_book_id as string,
          customOrder: (settingsRes.data as Record<string, unknown>).custom_order as string[] | null,
          currentDayIndex: (settingsRes.data as Record<string, unknown>).current_day_index as number,
        }
      : null,
  };
}

export async function saveMemoToSupabase(memo: BibleMemo, userId: string) {
  if (!supabase) return;
  await supabase.from('bible_memos').upsert({
    id: memo.id,
    user_id: userId,
    day_index: memo.dayIndex,
    reading_ref: memo.readingRef,
    date: memo.date,
    question1: memo.question1,
    question2: memo.question2,
    memo1: memo.memo1,
    memo2: memo.memo2,
    daily_note: memo.dailyNote,
  });
}

export async function deleteMemoFromSupabase(id: string) {
  if (!supabase) return;
  await supabase.from('bible_memos').delete().eq('id', id);
}

export async function addBookmarkToSupabase(bookmark: BibleBookmark, userId: string) {
  if (!supabase) return;
  await supabase.from('bible_bookmarks').upsert({
    id: bookmark.id,
    user_id: userId,
    day_index: bookmark.dayIndex,
    reading_ref: bookmark.readingRef,
    date: bookmark.date,
  });
}

export async function removeBookmarkFromSupabase(id: string) {
  if (!supabase) return;
  await supabase.from('bible_bookmarks').delete().eq('id', id);
}

export async function addDailyVerseToSupabase(verse: BibleDailyVerse, userId: string) {
  if (!supabase) return;
  await supabase.from('bible_daily_verses').insert({
    id: verse.id,
    user_id: userId,
    date: verse.date,
    book_name: verse.bookName,
    chapter: verse.chapter,
    verse: verse.verse,
    text: verse.text,
  });
}

export async function removeDailyVerseFromSupabase(id: string) {
  if (!supabase) return;
  await supabase.from('bible_daily_verses').delete().eq('id', id);
}

export async function saveSettingsToSupabase(userId: string, settings: {
  startBookId: string;
  customOrder: string[] | null;
  currentDayIndex: number;
}) {
  if (!supabase) return;
  await supabase.from('bible_user_settings').upsert({
    user_id: userId,
    start_book_id: settings.startBookId,
    custom_order: settings.customOrder,
    current_day_index: settings.currentDayIndex,
    updated_at: new Date().toISOString(),
  });
}

export async function syncAllToSupabase(
  userId: string,
  data: {
    memos: BibleMemo[];
    bookmarks: BibleBookmark[];
    dailyVerses: BibleDailyVerse[];
    startBookId: string;
    customOrder: string[] | null;
    currentDayIndex: number;
  }
) {
  if (!supabase) return;

  await supabase.from('bible_memos').delete().eq('user_id', userId);
  await supabase.from('bible_bookmarks').delete().eq('user_id', userId);
  await supabase.from('bible_daily_verses').delete().eq('user_id', userId);

  if (data.memos.length > 0) {
    await supabase.from('bible_memos').insert(
      data.memos.map((m) => ({
        id: m.id,
        user_id: userId,
        day_index: m.dayIndex,
        reading_ref: m.readingRef,
        date: m.date,
        question1: m.question1,
        question2: m.question2,
        memo1: m.memo1,
        memo2: m.memo2,
        daily_note: m.dailyNote,
      }))
    );
  }
  if (data.bookmarks.length > 0) {
    await supabase.from('bible_bookmarks').insert(
      data.bookmarks.map((b) => ({
        id: b.id,
        user_id: userId,
        day_index: b.dayIndex,
        reading_ref: b.readingRef,
        date: b.date,
      }))
    );
  }
  if (data.dailyVerses.length > 0) {
    await supabase.from('bible_daily_verses').insert(
      data.dailyVerses.map((v) => ({
        id: v.id,
        user_id: userId,
        date: v.date,
        book_name: v.bookName,
        chapter: v.chapter,
        verse: v.verse,
        text: v.text,
      }))
    );
  }

  await saveSettingsToSupabase(userId, {
    startBookId: data.startBookId,
    customOrder: data.customOrder,
    currentDayIndex: data.currentDayIndex,
  });
}
