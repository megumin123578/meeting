const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const { findUserByUsername, findUserById, createUser } = require('../utils/db');
const { signToken, requireAuth } = require('../utils/auth');

const router = express.Router();

const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,32}$/;

router.post('/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Cần username và password.' });
    }
    if (!USERNAME_RE.test(username)) {
      return res.status(400).json({ error: 'Username 3–32 ký tự, chỉ chứa chữ/số/._-' });
    }
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password tối thiểu 6 ký tự.' });
    }
    if (findUserByUsername(username)) {
      return res.status(409).json({ error: 'Username đã tồn tại.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = {
      id: crypto.randomUUID(),
      username,
      passwordHash,
      createdAt: new Date().toISOString(),
      apiKeyEnc: '',
      model: '',
    };
    createUser(user);
    const token = signToken(user);
    return res.json({ token, user: { id: user.id, username: user.username } });
  } catch (err) {
    console.error('register error:', err);
    return res.status(500).json({ error: err.message || 'Đăng ký thất bại.' });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Cần username và password.' });
    }
    const user = findUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Username hoặc password không đúng.' });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'Username hoặc password không đúng.' });
    }
    const token = signToken(user);
    return res.json({ token, user: { id: user.id, username: user.username } });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ error: err.message || 'Đăng nhập thất bại.' });
  }
});

router.get('/auth/me', requireAuth, (req, res) => {
  const u = findUserById(req.user.id);
  if (!u) return res.status(404).json({ error: 'Không tìm thấy user.' });
  return res.json({ user: { id: u.id, username: u.username } });
});

module.exports = router;
