// server/routes/reports.js
const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.get('/performance', auth, async (req, res) => {
  const targetId = req.query.profile_id || req.user.id;
  
  // Security check: Only admin can view others' performance
  if (req.query.profile_id && req.user.role !== 'Admin' && req.query.profile_id !== String(req.user.id)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const { getDoc, getCollection } = require('../firebase-admin');
    const profile = await getDoc('profiles', targetId);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    // Projects completed
    const allProjects = await getCollection('projects');
    const completedProjects = allProjects.filter(p => 
      p.status === 'Completed' && p.assigned_to && p.assigned_to.includes(targetId)
    );

    // Leads taken
    const [leads] = await db.query('SELECT * FROM leads WHERE created_by = ?', [targetId]);

    res.json({
      total_paid: profile.total_paid || 0,
      total_pending: profile.total_pending || 0,
      projects_completed: completedProjects.length,
      leads_taken: leads.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', auth, async (req, res) => {
  const { profile_id, month } = req.query;
  try {
    let query, params;

    if (req.user.role === 'Admin') {
      // Admin: optionally filter by profile_id and/or month (YYYY-MM)
      let conditions = [];
      params = [];
      if (profile_id) { conditions.push('r.profile_id = ?'); params.push(profile_id); }
      if (month) {
        conditions.push('DATE_FORMAT(r.report_date, "%Y-%m") = ?');
        params.push(month);
      }
      const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
      query = `SELECT r.*, p.username FROM daily_reports r LEFT JOIN profiles p ON r.profile_id = p.id ${where} ORDER BY r.report_date DESC`;
    } else {
      // Staff: only see their own reports
      query = `SELECT r.*, p.username FROM daily_reports r LEFT JOIN profiles p ON r.profile_id = p.id WHERE r.profile_id=? ORDER BY r.report_date DESC`;
      params = [req.user.id];
    }

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  const { report_date, tasks_completed, hours_spent } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO daily_reports (profile_id, report_date, tasks_completed, hours_spent) VALUES (?, ?, ?, ?)`,
      [req.user.id, report_date, tasks_completed || null, hours_spent || null]
    );
    const [rows] = await db.query('SELECT * FROM daily_reports WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  const { report_date, tasks_completed, hours_spent } = req.body;
  try {
    await db.query(
      `UPDATE daily_reports SET report_date=?, tasks_completed=?, hours_spent=? WHERE id=?`,
      [report_date, tasks_completed || null, hours_spent || null, req.params.id]
    );
    const [rows] = await db.query('SELECT * FROM daily_reports WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM daily_reports WHERE id = ?', [req.params.id]);
    res.json({ message: 'Report deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
