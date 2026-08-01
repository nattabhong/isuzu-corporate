-- 002: Email/password auth
-- Add password_hash column for email login
ALTER TABLE team_members ADD COLUMN password_hash TEXT;

-- Unique index on email for login lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_email ON team_members(email);
