// server/routes/auth.js — Firebase Firestore version
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/auth');
const { findOne, getDoc } = require('../firebase-admin');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password required' });

  // Built-in env admin fallback
  if (process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign({ id: 'admin-env', email, role: 'Admin' }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token, user: { id: 'admin-env', email, role: 'Admin', username: 'Administrator' } });
  }

  try {
    const user = await findOne('profiles', 'email', email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    const { password: _pw, ...profile } = user;
    res.json({ token, user: profile });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    if (req.user.id === 'admin-env' || req.user.id === 0) {
      return res.json({ id: req.user.id, username: 'Administrator', email: process.env.ADMIN_EMAIL, role: 'Admin' });
    }
    const profile = await getDoc('profiles', req.user.id);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    
    // Inject permissions from role if it's a custom role or Client
    if (profile.role && profile.role !== 'Admin') {
      const { findOne } = require('../firebase-admin');
      const roleDoc = await findOne('roles', 'name', profile.role);
      if (roleDoc && roleDoc.permissions) {
        profile.permissions = roleDoc.permissions;
      }
    }

    const { password: _pw, ...safe } = profile;
    res.json(safe);
  } catch (err) {
    console.error('Me error:', err.message);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

module.exports = router;
