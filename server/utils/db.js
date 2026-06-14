const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'app.db');
const LEGACY_JSON = path.join(DATA_DIR, 'users.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id           TEXT PRIMARY KEY,
    username     TEXT NOT NULL UNIQUE COLLATE NOCASE,
    passwordHash TEXT NOT NULL,
    createdAt    TEXT NOT NULL,
    apiKeyEnc    TEXT NOT NULL DEFAULT '',
    model        TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id        TEXT PRIMARY KEY,
    userId    TEXT NOT NULL,
    title     TEXT NOT NULL DEFAULT '',
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(userId, updatedAt DESC);

  CREATE TABLE IF NOT EXISTS transcripts (
    id             TEXT PRIMARY KEY,
    sessionId      TEXT NOT NULL,
    userId         TEXT NOT NULL,
    originalText   TEXT NOT NULL,
    translatedText TEXT NOT NULL,
    sourceLang     TEXT NOT NULL,
    targetLang     TEXT NOT NULL,
    createdAt      TEXT NOT NULL,
    FOREIGN KEY (sessionId) REFERENCES sessions(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_transcripts_session ON transcripts(sessionId, createdAt DESC);
`);

// One-time migration from legacy users.json (if present)
(function migrateLegacyJson() {
  if (!fs.existsSync(LEGACY_JSON)) return;
  try {
    const raw = fs.readFileSync(LEGACY_JSON, 'utf8');
    const parsed = JSON.parse(raw);
    const users = Array.isArray(parsed?.users) ? parsed.users : [];
    if (users.length === 0) {
      fs.renameSync(LEGACY_JSON, LEGACY_JSON + '.migrated');
      return;
    }
    const insert = db.prepare(`
      INSERT OR IGNORE INTO users (id, username, passwordHash, createdAt, apiKeyEnc, model)
      VALUES (@id, @username, @passwordHash, @createdAt, @apiKeyEnc, @model)
    `);
    const tx = db.transaction((rows) => {
      for (const u of rows) {
        insert.run({
          id: u.id,
          username: u.username,
          passwordHash: u.passwordHash,
          createdAt: u.createdAt || new Date().toISOString(),
          apiKeyEnc: u.apiKeyEnc || '',
          model: u.model || '',
        });
      }
    });
    tx(users);
    fs.renameSync(LEGACY_JSON, LEGACY_JSON + '.migrated');
    console.log(`[db] Migrated ${users.length} user(s) from users.json -> SQLite`);
  } catch (err) {
    console.warn('[db] Legacy JSON migration skipped:', err.message);
  }
})();

const findByUsernameStmt = db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE');
const findByIdStmt = db.prepare('SELECT * FROM users WHERE id = ?');
const insertStmt = db.prepare(`
  INSERT INTO users (id, username, passwordHash, createdAt, apiKeyEnc, model)
  VALUES (@id, @username, @passwordHash, @createdAt, @apiKeyEnc, @model)
`);

function findUserByUsername(username) {
  return findByUsernameStmt.get(username);
}

function findUserById(id) {
  return findByIdStmt.get(id);
}

function createUser(user) {
  insertStmt.run({
    id: user.id,
    username: user.username,
    passwordHash: user.passwordHash,
    createdAt: user.createdAt,
    apiKeyEnc: user.apiKeyEnc || '',
    model: user.model || '',
  });
}

const ALLOWED_PATCH_COLS = new Set(['username', 'passwordHash', 'apiKeyEnc', 'model']);

function updateUser(id, patch) {
  const cols = Object.keys(patch).filter((k) => ALLOWED_PATCH_COLS.has(k));
  if (cols.length === 0) return findUserById(id);
  const setSql = cols.map((c) => `${c} = @${c}`).join(', ');
  const params = { id };
  for (const c of cols) params[c] = patch[c];
  const stmt = db.prepare(`UPDATE users SET ${setSql} WHERE id = @id`);
  const result = stmt.run(params);
  if (result.changes === 0) return null;
  return findUserById(id);
}

// ---- Sessions ----
const insertSessionStmt = db.prepare(`
  INSERT INTO sessions (id, userId, title, createdAt, updatedAt)
  VALUES (@id, @userId, @title, @createdAt, @updatedAt)
`);
const listSessionsStmt = db.prepare(`
  SELECT s.id, s.title, s.createdAt, s.updatedAt,
         (SELECT COUNT(*) FROM transcripts t WHERE t.sessionId = s.id) AS count
  FROM sessions s
  WHERE s.userId = ?
  ORDER BY s.updatedAt DESC
`);
const findSessionStmt = db.prepare('SELECT * FROM sessions WHERE id = ? AND userId = ?');
const renameSessionStmt = db.prepare(
  'UPDATE sessions SET title = @title, updatedAt = @updatedAt WHERE id = @id AND userId = @userId'
);
const touchSessionStmt = db.prepare('UPDATE sessions SET updatedAt = @updatedAt WHERE id = @id');
const deleteSessionStmt = db.prepare('DELETE FROM sessions WHERE id = ? AND userId = ?');

function createSession(session) {
  insertSessionStmt.run(session);
}
function listSessions(userId) {
  return listSessionsStmt.all(userId);
}
function findSession(userId, id) {
  return findSessionStmt.get(id, userId);
}
function renameSession(userId, id, title) {
  const res = renameSessionStmt.run({ id, userId, title, updatedAt: new Date().toISOString() });
  return res.changes > 0;
}
function touchSession(id) {
  touchSessionStmt.run({ id, updatedAt: new Date().toISOString() });
}
function deleteSession(userId, id) {
  const res = deleteSessionStmt.run(id, userId);
  return res.changes > 0;
}

// ---- Transcripts ----
const insertTranscriptStmt = db.prepare(`
  INSERT INTO transcripts (id, sessionId, userId, originalText, translatedText, sourceLang, targetLang, createdAt)
  VALUES (@id, @sessionId, @userId, @originalText, @translatedText, @sourceLang, @targetLang, @createdAt)
`);
const listTranscriptsStmt = db.prepare(
  'SELECT * FROM transcripts WHERE sessionId = ? ORDER BY createdAt DESC'
);
const deleteTranscriptStmt = db.prepare('DELETE FROM transcripts WHERE id = ? AND userId = ?');
const clearTranscriptsStmt = db.prepare('DELETE FROM transcripts WHERE sessionId = ? AND userId = ?');

function insertTranscript(row) {
  insertTranscriptStmt.run(row);
}
function listTranscripts(sessionId) {
  return listTranscriptsStmt.all(sessionId);
}
function deleteTranscript(userId, id) {
  const res = deleteTranscriptStmt.run(id, userId);
  return res.changes > 0;
}
function clearTranscripts(userId, sessionId) {
  clearTranscriptsStmt.run(sessionId, userId);
}

module.exports = {
  findUserByUsername,
  findUserById,
  createUser,
  updateUser,
  createSession,
  listSessions,
  findSession,
  renameSession,
  touchSession,
  deleteSession,
  insertTranscript,
  listTranscripts,
  deleteTranscript,
  clearTranscripts,
  _db: db,
};
