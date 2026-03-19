-- 2단계: RLS 활성화 및 정책 생성
-- 1단계가 성공한 후 실행하세요

ALTER TABLE bible_memos ENABLE ROW LEVEL SECURITY;
ALTER TABLE bible_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE bible_daily_verses ENABLE ROW LEVEL SECURITY;
ALTER TABLE bible_user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users CRUD own memos" ON bible_memos
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users CRUD own bookmarks" ON bible_bookmarks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users CRUD own daily_verses" ON bible_daily_verses
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users CRUD own settings" ON bible_user_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
