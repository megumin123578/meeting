const jwt = require('jsonwebtoken');
const { findUserById } = require('./db');

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('JWT_SECRET env var is required (>= 16 chars).');
  }
  return secret;
}

function signToken(user) {
  return jwt.sign({ sub: user.id, username: user.username }, getJwtSecret(), { expiresIn: '30d' });
}

function verifyToken(token) {
  return jwt.verify(token, getJwtSecret());
}

function requireAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing auth token.' });
  try {
    const payload = verifyToken(token);
    const user = findUserById(payload.sub);
    if (!user) return res.status(401).json({ error: 'User not found.' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

module.exports = { signToken, verifyToken, requireAuth };
