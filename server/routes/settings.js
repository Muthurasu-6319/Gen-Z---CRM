// server/routes/settings.js
const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.get('/public', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM settings WHERE key_name IN (?, ?, ?)', ['logo_url', 'company_name', 'crm_details']);
    const result = {};
    rows.forEach(r => { result[r.key_name] = r.value; });
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM settings');
    const result = {};
    rows.forEach(r => { result[r.key_name] = r.value; });
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/', auth, async (req, res) => {
  if (req.user.role !== 'Admin') return res.status(403).json({ error: 'Admin only' });
  const entries = Object.entries(req.body);
  try {
    for (const [key, value] of entries) {
      await db.query(
        `INSERT INTO settings (key_name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value=?`,
        [key, value, value]
      );
    }
    res.json({ message: 'Settings saved' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
