// server/routes/auth.js
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  // Admin fallback: check env vars first
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPass = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPass && email === adminEmail && password === adminPass) {
    const adminUser = {
      id: 0,
      email: adminEmail,
      role: 'Admin',
      username: 'Administrator',
    };
    const token = jwt.sign(
      { id: adminUser.id, email: adminUser.email, role: adminUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    return res.json({ token, user: adminUser });
  }

  try {
    const [rows] = await db.query('SELECT * FROM profiles WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    const { password: _pw, ...profile } = user;
    res.json({ token, user: profile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me  (returns current user profile from token)
router.get('/me', authMiddleware, async (req, res) => {
  try {
    // Admin fallback: token id 0 means built‑in admin
    if (req.user.id === 0) {
      return res.json({ id: 0, username: 'Administrator', email: process.env.ADMIN_EMAIL, role: 'Admin' });
    }
    const [rows] = await db.query(
      'SELECT id, username, email, role, designation, mobile, address, gpay, bank_details, blood_group, permissions, created_at FROM profiles WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Profile not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
