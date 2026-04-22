-- ════════════════════════════════════════════════════
--  verify_and_fix.sql
--  Supabase → SQL Editor → 붙여넣기 → Run
--  이 SQL 하나로 컬럼 추가 + 확인을 한 번에 합니다
-- ════════════════════════════════════════════════════

-- 1. 컬럼 추가 (이미 있어도 오류 안 남)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS inventory JSONB DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS equipped  JSONB DEFAULT '{}'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS defense   INT   DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS level     INT   DEFAULT 1;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS exp       INT   DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gold      INT   DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kills     INT   DEFAULT 0;

-- 2. 현재 profiles 테이블 컬럼 목록 확인
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;
