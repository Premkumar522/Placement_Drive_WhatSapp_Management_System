import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-placement-key-2026';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// Admin Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const admin = db.prepare(`SELECT * FROM admins WHERE username = ? OR email = ?`).get(username, username);

  if (!admin) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const validPassword = bcrypt.compareSync(password, admin.password);
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = jwt.sign(
    { id: admin.id, username: admin.username, email: admin.email, name: admin.name },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  return res.json({
    message: 'Login successful',
    token,
    user: {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      name: admin.name
    }
  });
});

// Get Current User Profile
router.get('/me', authenticateToken, (req, res) => {
  return res.json({ user: req.user });
});

export default router;
