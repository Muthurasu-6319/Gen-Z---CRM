// server/routes/users.js — Firebase Firestore version
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const { getCollection, addDoc, updateDoc, deleteDoc, getDoc, findOne, setDoc } = require('../firebase-admin');

// GET /api/users
router.get('/', auth, async (req, res) => {
  try {
    const users = await getCollection('profiles');
    // Remove password field for safety
    const safeUsers = users.map(({ password, ...user }) => user);
    // Sort by created_at descending (created_at might be a Firestore Timestamp)
    safeUsers.sort((a, b) => {
      const timeA = a.created_at ? (a.created_at._seconds || new Date(a.created_at).getTime()) : 0;
      const timeB = b.created_at ? (b.created_at._seconds || new Date(b.created_at).getTime()) : 0;
      return timeB - timeA;
    });
    res.json(safeUsers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users
router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'Admin')
    return res.status(403).json({ error: 'Admin only' });

  const { username, email, password, role, designation, mobile, address, gpay, bankDetails, bloodGroup, permissions, total_paid, total_pending, services } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ error: 'username, email and password required' });

  try {
    // Check if email already exists
    const existingUser = await findOne('profiles', 'email', email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    
    // Create new profile object
    const newProfile = {
      username,
      email,
      password: hashed,
      role: role || 'Staff',
      designation: designation || null,
      mobile: mobile || null,
      address: address || null,
      gpay: gpay || null,
      bank_details: bankDetails || null,
      blood_group: bloodGroup || null,
      permissions: permissions || null,
      total_paid: total_paid || 0,
      total_pending: total_pending || 0,
      services: services || [],
    };

    const doc = await addDoc('profiles', newProfile);
    const { password: _pw, ...safeUser } = doc;
    res.status(201).json(safeUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id
router.put('/:id', auth, async (req, res) => {
  if (req.user.role !== 'Admin' && req.user.id !== req.params.id)
    return res.status(403).json({ error: 'Forbidden' });

  const { username, email, role, designation, mobile, address, gpay, bankDetails, bloodGroup, permissions, password, total_paid, total_pending, services } = req.body;
  try {
    const updateData = {};
    if (username !== undefined) updateData.username = username;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (designation !== undefined) updateData.designation = designation;
    if (mobile !== undefined) updateData.mobile = mobile;
    if (address !== undefined) updateData.address = address;
    if (gpay !== undefined) updateData.gpay = gpay;
    if (bankDetails !== undefined) updateData.bank_details = bankDetails;
    if (bloodGroup !== undefined) updateData.blood_group = bloodGroup;
    if (permissions !== undefined) updateData.permissions = permissions;
    if (total_paid !== undefined) updateData.total_paid = Number(total_paid);
    if (total_pending !== undefined) updateData.total_pending = Number(total_pending);
    if (services !== undefined) updateData.services = services;
    
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updated = await updateDoc('profiles', req.params.id, updateData);
    const { password: _pw, ...safeUser } = updated;
    res.json(safeUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/:id
router.delete('/:id', auth, async (req, res) => {
  if (req.user.role !== 'Admin')
    return res.status(403).json({ error: 'Admin only' });
  try {
    await deleteDoc('profiles', req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
