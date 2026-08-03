-- Migration 003: Lock permanent admin account with exact password isuzucms1234
INSERT INTO team_members (id, line_user_id, name, email, role, is_active, password_hash, created_at, updated_at)
VALUES (
  'admin-1',
  'admin-line-id',
  'Nattabhong Kongkaew (Admin)',
  'nattabhong.kon@gmail.com',
  'manager',
  1,
  'pbkdf2$100000$eba13dbaf6cb84f796efa4c67c04537a$683897e53fd63361512e00e07d53b17ab3776585f857ea1939b040a9f12bc592',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT(id) DO UPDATE SET
  password_hash = 'pbkdf2$100000$eba13dbaf6cb84f796efa4c67c04537a$683897e53fd63361512e00e07d53b17ab3776585f857ea1939b040a9f12bc592',
  email = 'nattabhong.kon@gmail.com',
  role = 'manager',
  is_active = 1;
