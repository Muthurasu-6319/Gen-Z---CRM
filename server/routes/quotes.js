// server/routes/quotes.js
const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM quotes ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  const { title, description, document_url, client_id } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO quotes (title, description, document_url, client_id, created_by) VALUES (?, ?, ?, ?, ?)`,
      [title, description || null, document_url || null, client_id || null, req.user.id]
    );
    const [rows] = await db.query('SELECT * FROM quotes WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  const { title, description, document_url, client_id } = req.body;
  try {
    await db.query(
      `UPDATE quotes SET title=?, description=?, document_url=?, client_id=? WHERE id=?`,
      [title, description || null, document_url || null, client_id || null, req.params.id]
    );
    const [rows] = await db.query('SELECT * FROM quotes WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM quotes WHERE id = ?', [req.params.id]);
    res.json({ message: 'Quote deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
