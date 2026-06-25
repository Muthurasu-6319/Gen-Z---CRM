// server/routes/tasks.js
const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT t.*, p.username AS assignee_name
       FROM tasks t
       LEFT JOIN profiles p ON t.assignee_id = p.id
       ORDER BY t.created_at DESC`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  const { title, description, assignee_id, start_date, due_date, priority, status } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO tasks (title, description, assignee_id, start_date, due_date, priority, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description || null, assignee_id || null, start_date || null, due_date || null, priority || 'Medium', status || 'To Do', req.user.id]
    );
    const [rows] = await db.query('SELECT * FROM tasks WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  const { title, description, assignee_id, start_date, due_date, priority, status } = req.body;
  try {
    await db.query(
      `UPDATE tasks SET title=?, description=?, assignee_id=?, start_date=?, due_date=?, priority=?, status=? WHERE id=?`,
      [title, description || null, assignee_id || null, start_date || null, due_date || null, priority, status, req.params.id]
    );
    const [rows] = await db.query('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM tasks WHERE id = ?', [req.params.id]);
    res.json({ message: 'Task deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
