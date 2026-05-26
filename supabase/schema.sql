-- Run this in Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  sharing_token UUID UNIQUE DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sharing_token UUID UNIQUE DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  thumb_path TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE access_logs (
  id SERIAL PRIMARY KEY,
  sharing_token UUID,
  ip_address TEXT,
  accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on companies"
  ON companies FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin full access on folders"
  ON folders FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin full access on assets"
  ON assets FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Client reads company by token"
  ON companies FOR SELECT
  USING (sharing_token = current_setting('app.sharing_token', true)::UUID);

CREATE POLICY "Client reads folders by company token"
  ON folders FOR SELECT
  USING (
    company_id IN (
      SELECT id FROM companies
      WHERE sharing_token = current_setting('app.sharing_token', true)::UUID
    )
  );

CREATE POLICY "Client reads assets by folder token"
  ON assets FOR SELECT
  USING (
    folder_id IN (
      SELECT f.id FROM folders f
      JOIN companies c ON c.id = f.company_id
      WHERE f.sharing_token = current_setting('app.sharing_token', true)::UUID
        OR c.sharing_token = current_setting('app.sharing_token', true)::UUID
    )
  );
