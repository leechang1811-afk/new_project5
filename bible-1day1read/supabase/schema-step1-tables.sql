-- 1단계: 테이블만 먼저 생성 (RLS 없이)
-- Supabase SQL Editor에서 이것만 먼저 실행하세요

CREATE TABLE bible_memos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_index INT NOT NULL,
  reading_ref TEXT NOT NULL,
  date TEXT NOT NULL,
  question1 TEXT NOT NULL DEFAULT '',
  question2 TEXT NOT NULL DEFAULT '',
  memo1 TEXT NOT NULL DEFAULT '',
  memo2 TEXT NOT NULL DEFAULT '',
  daily_note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE bible_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_index INT NOT NULL,
  reading_ref TEXT NOT NULL,
  date TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, day_index, date)
);

CREATE TABLE bible_daily_verses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  book_name TEXT NOT NULL,
  chapter INT NOT NULL,
  verse INT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE bible_user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  start_book_id TEXT NOT NULL DEFAULT 'genesis',
  custom_order JSONB,
  current_day_index INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT now()
);
