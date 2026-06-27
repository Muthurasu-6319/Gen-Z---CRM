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

router.post('/:id/convert', auth, async (req, res) => {
  try {
    const [leads] = await db.query('SELECT * FROM leads WHERE id = ?', [req.params.id]);
    if (!leads || leads.length === 0) return res.status(404).json({ error: 'Lead not found' });
    const lead = leads[0];
    
    // Create profile
    const dummyEmail = lead.client_name.replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random()*1000) + '@client.com';
    const bcrypt = require('bcryptjs');
    const hashed = await bcrypt.hash('12345', 10);
    
    await db.query(
      `INSERT INTO profiles (username, email, password, role, mobile, address) VALUES (?, ?, ?, ?, ?, ?)`,
      [lead.client_name, dummyEmail, hashed, 'Client', lead.mobile_no || null, '']
    );

    await db.query('DELETE FROM leads WHERE id = ?', [req.params.id]);
    res.json({ message: 'Lead converted to Client successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
