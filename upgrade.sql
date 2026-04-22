-- ════════════════════════════════════════════════════
--  upgrade.sql — 인벤토리/장비 컬럼 추가
--  Supabase → SQL Editor → 붙여넣기 → Run
-- ════════════════════════════════════════════════════

-- profiles 테이블에 인벤토리/장비 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS inventory JSONB DEFAULT '[]';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS equipped  JSONB DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS defense   INT  DEFAULT 0;

-- presence 테이블 (없으면 생성)
CREATE TABLE IF NOT EXISTS presence (
  id       UUID PRIMARY KEY,
  username TEXT,
  cls      TEXT DEFAULT '전사',
  x        INT  DEFAULT 400,
  y        INT  DEFAULT 300,
  ts       BIGINT DEFAULT 0
);
ALTER TABLE presence ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "public read presence" ON presence FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "auth manage presence" ON presence FOR ALL USING (auth.role() = 'authenticated');

-- monsters 테이블 (맵에 배치된 몬스터 상태 공유)
CREATE TABLE IF NOT EXISTS monsters (
  id         TEXT PRIMARY KEY,
  name       TEXT,
  icon       TEXT,
  x          INT,
  y          INT,
  hp         INT,
  max_hp     INT,
  atk_min    INT,
  atk_max    INT,
  exp_reward INT,
  gold_reward INT,
  alive      BOOLEAN DEFAULT true,
  respawn_at BIGINT  DEFAULT 0
);
ALTER TABLE monsters ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "public read monsters"  ON monsters FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "auth update monsters"  ON monsters FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS "auth insert monsters"  ON monsters FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- drops 테이블 (드랍 아이템)
CREATE TABLE IF NOT EXISTS drops (
  id         TEXT PRIMARY KEY,
  item       JSONB,
  x          INT,
  y          INT,
  created_at BIGINT DEFAULT 0
);
ALTER TABLE drops ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "public read drops"   ON drops FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "auth manage drops"   ON drops FOR ALL USING (auth.role() = 'authenticated');
