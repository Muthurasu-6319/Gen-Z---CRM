// server/routes/attendance.js
const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET all (admin) or own records
router.get('/', auth, async (req, res) => {
  try {
    let rows, breaks;
    if (req.user.role === 'Admin') {
      [rows] = await db.query(
        `SELECT a.*, p.username FROM attendance a
         LEFT JOIN profiles p ON a.profile_id = p.id
         ORDER BY a.date DESC, a.check_in_time DESC`
      );
      [breaks] = await db.query('SELECT * FROM attendance_breaks');
    } else {
      [rows] = await db.query(
        `SELECT a.*, p.username FROM attendance a
         LEFT JOIN profiles p ON a.profile_id = p.id
         WHERE a.profile_id = ? ORDER BY a.date DESC`,
        [req.user.id]
      );
      [breaks] = await db.query('SELECT * FROM attendance_breaks WHERE entry_id IN (?)',
        [rows.length ? rows.map(r => r.id) : [0]]);
    }
    const result = rows.map(r => ({
      ...r,
      attendance_breaks: breaks.filter(b => b.entry_id === r.id)
    }));
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST check-in
router.post('/checkin', auth, async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const [existing] = await db.query(
      'SELECT * FROM attendance WHERE profile_id=? AND date=?', [req.user.id, today]
    );
    if (existing.length > 0) return res.status(400).json({ error: 'Already checked in today' });
    const [result] = await db.query(
      `INSERT INTO attendance (profile_id, date, check_in_time, status) VALUES (?, ?, NOW(), 'Checked In')`,
      [req.user.id, today]
    );
    const [rows] = await db.query('SELECT * FROM attendance WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST checkout
router.post('/checkout/:id', auth, async (req, res) => {
  try {
    await db.query(
      `UPDATE attendance SET check_out_time=NOW(), status='Checked Out' WHERE id=?`,
      [req.params.id]
    );
    const [rows] = await db.query('SELECT * FROM attendance WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST start break
router.post('/break/start/:id', auth, async (req, res) => {
  try {
    await db.query(`UPDATE attendance SET status='On Break' WHERE id=?`, [req.params.id]);
    const [result] = await db.query(
      `INSERT INTO attendance_breaks (entry_id, break_start_time) VALUES (?, NOW())`, [req.params.id]
    );
    const [rows] = await db.query('SELECT * FROM attendance_breaks WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST end break
router.post('/break/end/:breakId', auth, async (req, res) => {
  try {
    await db.query(`UPDATE attendance_breaks SET break_end_time=NOW() WHERE id=?`, [req.params.breakId]);
    const [brk] = await db.query('SELECT * FROM attendance_breaks WHERE id=?', [req.params.breakId]);
    await db.query(`UPDATE attendance SET status='Checked In' WHERE id=?`, [brk[0].entry_id]);
    res.json(brk[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  if (req.user.role !== 'Admin') return res.status(403).json({ error: 'Admin only' });
  try {
    await db.query('DELETE FROM attendance WHERE id = ?', [req.params.id]);
    res.json({ message: 'Attendance entry deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
