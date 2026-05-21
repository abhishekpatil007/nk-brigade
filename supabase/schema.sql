CREATE TABLE mak_data (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE mak_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read" ON mak_data FOR SELECT USING (true);
CREATE POLICY "Public write" ON mak_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update" ON mak_data FOR UPDATE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE mak_data;
