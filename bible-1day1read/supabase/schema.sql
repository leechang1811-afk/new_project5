-- 성경 1일1독 - Supabase 테이블 생성
-- Supabase 대시보드 > SQL Editor에서 실행하세요

-- 1. 메모
CREATE TABLE IF NOT EXISTS bible_memos (
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

-- 2. 찜(북마크)
CREATE TABLE IF NOT EXISTS bible_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_index INT NOT NULL,
  reading_ref TEXT NOT NULL,
  date TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, day_index, date)
);

-- 3. 받은 말씀
CREATE TABLE IF NOT EXISTS bible_daily_verses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  book_name TEXT NOT NULL,
  chapter INT NOT NULL,
  verse INT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 사용자 설정
CREATE TABLE IF NOT EXISTS bible_user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  start_book_id TEXT NOT NULL DEFAULT 'genesis',
  custom_order JSONB,
  current_day_index INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS 활성화
ALTER TABLE bible_memos ENABLE ROW LEVEL SECURITY;
ALTER TABLE bible_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE bible_daily_verses ENABLE ROW LEVEL SECURITY;
ALTER TABLE bible_user_settings ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 본인 데이터만 접근
CREATE POLICY "Users can CRUD own memos" ON bible_memos
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can CRUD own bookmarks" ON bible_bookmarks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can CRUD own daily_verses" ON bible_daily_verses
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can CRUD own settings" ON bible_user_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
