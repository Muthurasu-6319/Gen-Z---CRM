// server/routes/projects.js
const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM projects ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM projects WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Project not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  const { name, category, client_name, client_mobile, total_cost, project_asset, start_date, end_date, status, tags, assigned_to } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO projects (name, category, client_name, client_mobile, total_cost, project_asset, start_date, end_date, status, tags, created_by, assigned_to)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, category || null, client_name || null, client_mobile || null, total_cost || null, project_asset || null, start_date || null, end_date || null, status || 'Started',
       tags ? JSON.stringify(tags) : null, req.user.id,
       assigned_to ? JSON.stringify(assigned_to) : null]
    );
    const [rows] = await db.query('SELECT * FROM projects WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  const { name, category, client_name, client_mobile, total_cost, project_asset, start_date, end_date, status, tags, assigned_to } = req.body;
  try {
    await db.query(
      `UPDATE projects SET name=?, category=?, client_name=?, client_mobile=?, total_cost=?, project_asset=?, start_date=?, end_date=?, status=?, tags=?, assigned_to=? WHERE id=?`,
      [name, category || null, client_name || null, client_mobile || null, total_cost || null, project_asset || null, start_date || null, end_date || null, status,
       tags ? JSON.stringify(tags) : null,
       assigned_to ? JSON.stringify(assigned_to) : null, req.params.id]
    );
    const [rows] = await db.query('SELECT * FROM projects WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM projects WHERE id = ?', [req.params.id]);
    res.json({ message: 'Project deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
