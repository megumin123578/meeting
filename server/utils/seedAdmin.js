const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { findUserByUsername, createUser } = require('./db');

// Ensure the admin account configured in .env (ADMIN_USERNAME / ADMIN_PASSWORD)
// exists. Runs once on server startup. The username is what grants admin
// rights (see isAdminUsername); this just makes sure the account is usable on
// a fresh database without manual registration.
async function ensureAdminUser() {
  const username = (process.env.ADMIN_USERNAME || '').trim();
  const password = process.env.ADMIN_PASSWORD || '';

  if (!username) {
    console.warn('[admin] ADMIN_USERNAME not set — no admin account configured.');
    return;
  }
  if (findUserByUsername(username)) return; // already exists

  if (!password || password.length < 6) {
    console.warn(
      `[admin] Admin "${username}" does not exist and ADMIN_PASSWORD is missing/too short ` +
        '(>= 6 chars) — cannot seed. Set ADMIN_PASSWORD or register the account manually.'
    );
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  createUser({
    id: crypto.randomUUID(),
    username,
    passwordHash,
    createdAt: new Date().toISOString(),
    apiKeyEnc: '',
    model: '',
  });
  console.log(`[admin] Seeded admin user "${username}".`);
}

module.exports = { ensureAdminUser };
