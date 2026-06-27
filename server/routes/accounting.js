// server/routes/accounting.js
const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT t.*, p.username AS staff_username
       FROM transactions t
       LEFT JOIN profiles p ON t.related_profile_id = p.id
       ORDER BY t.date DESC, t.created_at DESC`
    );
    const mapped = rows.map(r => ({
      ...r,
      transaction_date: r.date,
      amount: Number(r.amount),
      profile: r.staff_username ? { username: r.staff_username } : null
    }));
    res.json(mapped);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  const { type, category, description, amount, date, payment_mode, related_profile_id } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO transactions (type, category, description, amount, date, payment_mode, related_profile_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [type, category || null, description || null, amount, date || null, payment_mode || null, related_profile_id || null, req.user.id]
    );
    const [rows] = await db.query(
      `SELECT t.*, p.username AS staff_username
       FROM transactions t
       LEFT JOIN profiles p ON t.related_profile_id = p.id
       WHERE t.id = ?`,
      [result.insertId]
    );
    if (!rows || rows.length === 0) {
      return res.status(500).json({ error: 'Failed to retrieve transaction. ID: ' + result.insertId });
    }
    res.status(201).json({
      ...rows[0],
      transaction_date: rows[0].date,
      amount: Number(rows[0].amount),
      profile: rows[0].staff_username ? { username: rows[0].staff_username } : null
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  const { type, category, description, amount, date, payment_mode, related_profile_id } = req.body;
  try {
    await db.query(
      `UPDATE transactions SET type=?, category=?, description=?, amount=?, date=?, payment_mode=?, related_profile_id=? WHERE id=?`,
      [type, category || null, description || null, amount, date || null, payment_mode || null, related_profile_id || null, req.params.id]
    );
    const [rows] = await db.query(
      `SELECT t.*, p.username AS staff_username
       FROM transactions t
       LEFT JOIN profiles p ON t.related_profile_id = p.id
       WHERE t.id = ?`,
      [req.params.id]
    );
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found after update. ID: ' + req.params.id });
    }
    res.json({
      ...rows[0],
      transaction_date: rows[0].date,
      amount: Number(rows[0].amount),
      profile: rows[0].staff_username ? { username: rows[0].staff_username } : null
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM transactions WHERE id = ?', [req.params.id]);
    res.json({ message: 'Transaction deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
