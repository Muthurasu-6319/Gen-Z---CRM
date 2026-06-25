// server/routes/leads.js
const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM leads ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  const { client_name, requirements, mobile_no, notes } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO leads (client_name, requirements, mobile_no, notes, created_by) VALUES (?, ?, ?, ?, ?)`,
      [client_name, requirements || null, mobile_no || null, notes || null, req.user.id]
    );
    const [rows] = await db.query('SELECT * FROM leads WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  const { client_name, requirements, mobile_no, notes } = req.body;
  try {
    await db.query(
      `UPDATE leads SET client_name=?, requirements=?, mobile_no=?, notes=? WHERE id=?`,
      [client_name, requirements || null, mobile_no || null, notes || null, req.params.id]
    );
    const [rows] = await db.query('SELECT * FROM leads WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM leads WHERE id = ?', [req.params.id]);
    res.json({ message: 'Lead deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
