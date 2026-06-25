// server/routes/messages.js
const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET last 100 messages with username
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT m.*, p.username FROM messages m
       LEFT JOIN profiles p ON m.profile_id = p.id
       ORDER BY m.created_at ASC LIMIT 100`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST new message (also used as fallback when socket is unavailable)
router.post('/', auth, async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'content required' });
  try {
    const [result] = await db.query(
      `INSERT INTO messages (profile_id, content) VALUES (?, ?)`,
      [req.user.id, content]
    );
    const [rows] = await db.query(
      `SELECT m.*, p.username FROM messages m LEFT JOIN profiles p ON m.profile_id = p.id WHERE m.id = ?`,
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
