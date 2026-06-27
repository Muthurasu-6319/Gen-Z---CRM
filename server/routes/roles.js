// server/routes/roles.js
const router = require('express').Router();
const auth = require('../middleware/auth');
const { getCollection, addDoc, updateDoc, deleteDoc, findOne } = require('../firebase-admin');

// GET all roles
router.get('/', auth, async (req, res) => {
  try {
    const roles = await getCollection('roles');
    res.json(roles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new role
router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'Admin') return res.status(403).json({ error: 'Admin only' });
  const { name, permissions } = req.body;
  if (!name) return res.status(400).json({ error: 'Role name required' });
  
  try {
    const existing = await findOne('roles', 'name', name);
    if (existing) return res.status(409).json({ error: 'Role already exists' });
    
    const doc = await addDoc('roles', { name, permissions: permissions || {} });
    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update role
router.put('/:id', auth, async (req, res) => {
  if (req.user.role !== 'Admin') return res.status(403).json({ error: 'Admin only' });
  const { name, permissions } = req.body;
  try {
    const doc = await updateDoc('roles', req.params.id, { name, permissions });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE role
router.delete('/:id', auth, async (req, res) => {
  if (req.user.role !== 'Admin') return res.status(403).json({ error: 'Admin only' });
  try {
    await deleteDoc('roles', req.params.id);
    res.json({ message: 'Role deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
