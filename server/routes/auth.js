// server/routes/auth.js — Firebase Firestore version
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/auth');
const { findOne, getDoc, updateDoc } = require('../mongodb-admin');
const { createTransporter } = require('../mailer');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password required' });

  const safeEmail = email.trim();
  console.log(`[LOGIN ATTEMPT] Email: '${safeEmail}', Password length: ${password.length}`);

  try {
    const user = await findOne('profiles', 'email', safeEmail);
    
    // Fallback to .env admin only if no database user matches
    if (!user && process.env.ADMIN_EMAIL && safeEmail === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
      console.log(`[LOGIN] Using .env admin fallback for ${safeEmail}`);
      const token = jwt.sign({ id: 'admin-env', email: safeEmail, role: 'Admin' }, process.env.JWT_SECRET, { expiresIn: '7d' });
      return res.json({ token, user: { id: 'admin-env', email: safeEmail, role: 'Admin', username: 'Administrator' } });
    }

    if (!user) {
      console.log(`[LOGIN FAILED] User not found for email: '${safeEmail}'`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      console.log(`[LOGIN FAILED] Invalid password for email: '${safeEmail}'`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log(`[LOGIN SUCCESS] User logged in: '${safeEmail}'`);

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
      const { findOne } = require('../mongodb-admin');
      const roleDoc = await findOne('roles', 'name', profile.role);
      if (roleDoc && roleDoc.permissions) {
        profile.permissions = roleDoc.permissions;
      }
    }

    const { password: _pw, raw_password, ...safe } = profile;
    safe.password = raw_password || '';
    res.json(safe);
  } catch (err) {
    console.error('Me error:', err.message);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  
  try {
    const user = await findOne('profiles', 'email', email);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 15 * 60000).toISOString();
    
    await updateDoc('profiles', user.id, { otp, otpExpiry });
    
    const transporter = await createTransporter();
    await transporter.sendMail({
      from: process.env.GMAIL_USER || 'no-reply@genzneuralx.com',
      to: email,
      subject: 'Password Reset OTP',
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #4f46e5;">Password Reset</h2>
        <p>Your OTP for resetting your password is:</p>
        <h3 style="background-color: #f3f4f6; padding: 10px; display: inline-block; letter-spacing: 2px;">${otp}</h3>
        <p>This OTP is valid for 15 minutes. If you didn't request a password reset, please ignore this email.</p>
      </div>`
    });
    
    res.json({ message: 'OTP sent to email' });
  } catch (err) {
    console.error('Forgot password error:', err.message);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) return res.status(400).json({ error: 'All fields required' });
  
  try {
    const user = await findOne('profiles', 'email', email);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    if (user.otp !== otp || new Date() > new Date(user.otpExpiry)) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }
    
    const hashed = await bcrypt.hash(newPassword, 10);
    await updateDoc('profiles', user.id, { password: hashed, otp: null, otpExpiry: null });
    
    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('Reset password error:', err.message);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

module.exports = router;
