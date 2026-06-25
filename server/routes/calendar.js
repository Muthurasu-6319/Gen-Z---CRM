// server/routes/calendar.js
const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM calendar_events ORDER BY start_time ASC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  const { title, start_time, end_time, description, color, assigned_to } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO calendar_events (title, start_time, end_time, description, color, assigned_to, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title, start_time || null, end_time || null, description || null, color || null, assigned_to ? JSON.stringify(assigned_to) : null, req.user.id]
    );
    const [rows] = await db.query('SELECT * FROM calendar_events WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  const { title, start_time, end_time, description, color, assigned_to } = req.body;
  try {
    await db.query(
      `UPDATE calendar_events SET title=?, start_time=?, end_time=?, description=?, color=?, assigned_to=? WHERE id=?`,
      [title, start_time || null, end_time || null, description || null, color || null, assigned_to ? JSON.stringify(assigned_to) : null, req.params.id]
    );
    const [rows] = await db.query('SELECT * FROM calendar_events WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM calendar_events WHERE id = ?', [req.params.id]);
    res.json({ message: 'Event deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
