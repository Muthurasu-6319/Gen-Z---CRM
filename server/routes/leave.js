// server/routes/leave.js
const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    let rows;
    if (req.user.role === 'Admin') {
      [rows] = await db.query(
        `SELECT l.*, p.username FROM leaves l LEFT JOIN profiles p ON l.profile_id = p.id ORDER BY l.created_at DESC`
      );
    } else {
      [rows] = await db.query(
        `SELECT l.*, p.username FROM leaves l LEFT JOIN profiles p ON l.profile_id = p.id WHERE l.profile_id=? ORDER BY l.created_at DESC`,
        [req.user.id]
      );
    }
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  const { start_date, end_date, reason } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO leaves (profile_id, start_date, end_date, reason) VALUES (?, ?, ?, ?)`,
      [req.user.id, start_date, end_date, reason || null]
    );
    const [rows] = await db.query('SELECT * FROM leaves WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  const { status, approved_by } = req.body;
  try {
    await db.query(
      `UPDATE leaves SET status=?, approved_by=? WHERE id=?`,
      [status, approved_by || null, req.params.id]
    );
    const [rows] = await db.query('SELECT * FROM leaves WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM leaves WHERE id = ?', [req.params.id]);
    res.json({ message: 'Leave request deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
