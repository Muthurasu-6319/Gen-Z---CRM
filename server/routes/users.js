// server/routes/users.js
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const auth = require('../middleware/auth');

// GET /api/users
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, username, email, role, designation, mobile, address, gpay, bank_details, blood_group, permissions, created_at FROM profiles ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users
router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'Admin')
    return res.status(403).json({ error: 'Admin only' });

  const { username, email, password, role, designation, mobile, address, gpay, bankDetails, bloodGroup, permissions } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ error: 'username, email and password required' });

  try {
    const hashed = await bcrypt.hash(password, 10);
    const id = uuidv4();
    await db.query(
      `INSERT INTO profiles (id, username, email, password, role, designation, mobile, address, gpay, bank_details, blood_group, permissions)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, username, email, hashed, role || 'Staff', designation || null, mobile || null,
       address || null, gpay || null, bankDetails || null, bloodGroup || null,
       permissions ? JSON.stringify(permissions) : null]
    );
    const [rows] = await db.query(
      'SELECT id, username, email, role, designation, mobile, address, gpay, bank_details, blood_group, permissions, created_at FROM profiles WHERE id = ?',
      [id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id
router.put('/:id', auth, async (req, res) => {
  if (req.user.role !== 'Admin' && req.user.id !== req.params.id)
    return res.status(403).json({ error: 'Forbidden' });

  const { username, email, role, designation, mobile, address, gpay, bankDetails, bloodGroup, permissions, password } = req.body;
  try {
    let query, params;
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      query = `UPDATE profiles SET username=?, email=?, role=?, designation=?, mobile=?, address=?, gpay=?, bank_details=?, blood_group=?, permissions=?, password=? WHERE id=?`;
      params = [username, email, role, designation, mobile, address, gpay, bankDetails, bloodGroup, permissions ? JSON.stringify(permissions) : null, hashed, req.params.id];
    } else {
      query = `UPDATE profiles SET username=?, email=?, role=?, designation=?, mobile=?, address=?, gpay=?, bank_details=?, blood_group=?, permissions=? WHERE id=?`;
      params = [username, email, role, designation, mobile, address, gpay, bankDetails, bloodGroup, permissions ? JSON.stringify(permissions) : null, req.params.id];
    }
    await db.query(query, params);
    const [rows] = await db.query(
      'SELECT id, username, email, role, designation, mobile, address, gpay, bank_details, blood_group, permissions, created_at FROM profiles WHERE id = ?',
      [req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/:id
router.delete('/:id', auth, async (req, res) => {
  if (req.user.role !== 'Admin')
    return res.status(403).json({ error: 'Admin only' });
  try {
    await db.query('DELETE FROM profiles WHERE id = ?', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
