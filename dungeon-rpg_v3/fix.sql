-- ════════════════════════════════════════════════════
--  fix.sql — 아이템/레벨 저장 오류 수정
--  Supabase → SQL Editor → 붙여넣기 → Run
-- ════════════════════════════════════════════════════

-- inventory, equipped 컬럼 확실히 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS inventory JSONB DEFAULT '[]';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS equipped  JSONB DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS defense   INT   DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS level     INT   DEFAULT 1;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS exp       INT   DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gold      INT   DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kills     INT   DEFAULT 0;
