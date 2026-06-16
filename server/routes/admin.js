const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const {
  listAllUsers,
  deleteUserById,
  createUser,
  updateUser,
  findUserByUsername,
  findUserById,
} = require('../utils/db');
const { requireAuth, requireAdmin, isAdminUsername } = require('../utils/auth');

const router = express.Router();
const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,32}$/;

// Every /admin/* route requires a logged-in admin.
router.use('/admin', requireAuth, requireAdmin);

function publicUser(u) {
  return {
    id: u.id,
    username: u.username,
    createdAt: u.createdAt,
    model: u.model || '',
    hasApiKey: !!u.hasApiKey,
    sessionCount: u.sessionCount ?? 0,
    transcriptCount: u.transcriptCount ?? 0,
    isAdmin: isAdminUsername(u.username),
    role: isAdminUsername(u.username) ? 'admin' : 'user',
  };
}

// List all users with stats
router.get('/admin/users', (req, res) => {
  res.json({ users: listAllUsers().map(publicUser) });
});

// Create a new user
router.post('/admin/users', async (req, res) => {
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
    return res.json({ user: publicUser({ ...user, hasApiKey: 0, sessionCount: 0, transcriptCount: 0 }) });
  } catch (err) {
    console.error('admin create user error:', err);
    return res.status(500).json({ error: err.message || 'Tạo user thất bại.' });
  }
});

// Reset a user's password
router.post('/admin/users/:id/reset-password', async (req, res) => {
  try {
    const { password } = req.body || {};
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password tối thiểu 6 ký tự.' });
    }
    const target = findUserById(req.params.id);
    if (!target) return res.status(404).json({ error: 'Không tìm thấy user.' });
    const passwordHash = await bcrypt.hash(password, 10);
    updateUser(target.id, { passwordHash });
    return res.json({ ok: true });
  } catch (err) {
    console.error('admin reset-password error:', err);
    return res.status(500).json({ error: err.message || 'Đặt lại mật khẩu thất bại.' });
  }
});

// Delete a user (cascades to their sessions/transcripts)
router.delete('/admin/users/:id', (req, res) => {
  const target = findUserById(req.params.id);
  if (!target) return res.status(404).json({ error: 'Không tìm thấy user.' });
  if (target.id === req.user.id) {
    return res.status(400).json({ error: 'Không thể xoá chính tài khoản của bạn.' });
  }
  if (isAdminUsername(target.username)) {
    return res.status(400).json({ error: 'Không thể xoá tài khoản admin.' });
  }
  deleteUserById(target.id);
  return res.json({ ok: true });
});

module.exports = router;
