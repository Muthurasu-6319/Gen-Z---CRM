const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { notifyAssignedUsers } = require('../mailer');

router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM leads ORDER BY created_at DESC');
    if (req.user.role !== 'Admin') {
        const myLeads = rows.filter(r => r.assigned_to === req.user.id);
        res.json(myLeads);
    } else {
        res.json(rows);
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  const { client_name, requirements, mobile_no, notes, location, assigned_to } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO leads (client_name, requirements, mobile_no, notes, location, assigned_to, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [client_name, requirements || null, mobile_no || null, notes || null, location || null, assigned_to || null, req.user.id]
    );
    const [rows] = await db.query('SELECT * FROM leads WHERE id = ?', [result.insertId]);
    
    if (assigned_to) {
        notifyAssignedUsers([assigned_to], 'Lead', client_name, requirements);
    }
    
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  const { client_name, requirements, mobile_no, notes, location, assigned_to } = req.body;
  try {
    const [oldRows] = await db.query('SELECT assigned_to FROM leads WHERE id = ?', [req.params.id]);
    const oldAssignedTo = oldRows[0]?.assigned_to;

    await db.query(
      `UPDATE leads SET client_name=?, requirements=?, mobile_no=?, notes=?, location=?, assigned_to=? WHERE id=?`,
      [client_name, requirements || null, mobile_no || null, notes || null, location || null, assigned_to || null, req.params.id]
    );
    const [rows] = await db.query('SELECT * FROM leads WHERE id = ?', [req.params.id]);

    if (assigned_to && assigned_to !== oldAssignedTo) {
        notifyAssignedUsers([assigned_to], 'Lead', client_name, requirements);
    }

    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM leads WHERE id = ?', [req.params.id]);
    res.json({ message: 'Lead deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/bulk-delete', auth, async (req, res) => {
  const { leadIds } = req.body;
  if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
    return res.status(400).json({ error: 'No leads provided' });
  }
  try {
    for (const id of leadIds) {
      await db.query(`DELETE FROM leads WHERE id = ?`, [id]);
    }
    res.json({ message: 'Leads deleted successfully' });
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
