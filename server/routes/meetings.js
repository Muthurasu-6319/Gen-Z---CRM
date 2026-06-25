// server/routes/meetings.js
const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM meetings ORDER BY start_time DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  const { title, start_time, end_time, google_meet_link, assigned_to } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO meetings (title, start_time, end_time, google_meet_link, assigned_to, created_by) VALUES (?, ?, ?, ?, ?, ?)`,
      [title, start_time || null, end_time || null, google_meet_link || null,
       assigned_to ? JSON.stringify(assigned_to) : null, req.user.id]
    );
    const [rows] = await db.query('SELECT * FROM meetings WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  const { title, start_time, end_time, google_meet_link, assigned_to } = req.body;
  try {
    await db.query(
      `UPDATE meetings SET title=?, start_time=?, end_time=?, google_meet_link=?, assigned_to=? WHERE id=?`,
      [title, start_time || null, end_time || null, google_meet_link || null,
       assigned_to ? JSON.stringify(assigned_to) : null, req.params.id]
    );
    const [rows] = await db.query('SELECT * FROM meetings WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM meetings WHERE id = ?', [req.params.id]);
    res.json({ message: 'Meeting deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
