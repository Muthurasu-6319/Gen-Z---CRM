// server/routes/products.js
const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM products ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  const { name, category, tags, end_date, collaborators, notes, status } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO products (name, category, tags, end_date, collaborators, notes, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, category || null, tags ? JSON.stringify(tags) : null, end_date || null,
       collaborators ? JSON.stringify(collaborators) : null, notes || null, status || 'Started', req.user.id]
    );
    const [rows] = await db.query('SELECT * FROM products WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  const { name, category, tags, end_date, collaborators, notes, status } = req.body;
  try {
    await db.query(
      `UPDATE products SET name=?, category=?, tags=?, end_date=?, collaborators=?, notes=?, status=? WHERE id=?`,
      [name, category || null, tags ? JSON.stringify(tags) : null, end_date || null,
       collaborators ? JSON.stringify(collaborators) : null, notes || null, status, req.params.id]
    );
    const [rows] = await db.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ message: 'Product deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
