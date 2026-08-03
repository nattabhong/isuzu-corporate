-- Migration 003: Lock permanent admin account with password isuzucms1234
INSERT INTO team_members (id, line_user_id, name, email, role, is_active, password_hash, created_at, updated_at)
VALUES (
  'admin-1',
  'admin-line-id',
  'Nattabhong Kongkaew (Admin)',
  'nattabhong.kon@gmail.com',
  'manager',
  1,
  'pbkdf2$100000$42b93d893b23337456d629ee29337503$ed5551cdcd65ce883a6749b0f0722af8cffa20a39441a8a4bdafb2bbfe956eea',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT(id) DO UPDATE SET
  password_hash = 'pbkdf2$100000$42b93d893b23337456d629ee29337503$ed5551cdcd65ce883a6749b0f0722af8cffa20a39441a8a4bdafb2bbfe956eea',
  email = 'nattabhong.kon@gmail.com',
  role = 'manager',
  is_active = 1;
