-- ════════════════════════════════════════════════════
--  rls_fix.sql — RLS 정책 수정
--  Supabase → SQL Editor → 붙여넣기 → Run
-- ════════════════════════════════════════════════════

-- 기존 정책 모두 삭제
DROP POLICY IF EXISTS "own profile update" ON profiles;
DROP POLICY IF EXISTS "public read profiles" ON profiles;
DROP POLICY IF EXISTS "auth insert profiles" ON profiles;
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;

-- 새 정책 3개 추가 (읽기/쓰기/수정 모두 허용)
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 확인
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles';
