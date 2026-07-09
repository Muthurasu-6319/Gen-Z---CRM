// server/routes/leave.js
const router = require('express').Router();
const auth = require('../middleware/auth');
const { getCollection, addDoc, updateDoc, deleteDoc, getDoc } = require('../firebase-admin');

router.get('/', auth, async (req, res) => {
  try {
    const allLeaves = await getCollection('leaves');
    const profiles = await getCollection('profiles');
    
    const enriched = allLeaves.map(l => {
      const p = profiles.find(pr => pr.id === l.profile_id);
      return { ...l, username: p ? p.username : 'Unknown' };
    });

    if (req.user.role === 'Admin') {
      enriched.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      res.json(enriched);
    } else {
      const myLeaves = enriched.filter(l => l.profile_id === req.user.id);
      myLeaves.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      res.json(myLeaves);
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  const { start_date, end_date, reason } = req.body;
  try {
    const doc = await addDoc('leaves', {
      profile_id: req.user.id,
      start_date,
      end_date,
      reason: reason || null,
      status: 'Pending',
      approved_by: null
    });
    res.status(201).json(doc);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  const { status, approved_by, start_date, end_date, reason } = req.body;
  try {
    const updateData = {
      status,
      approved_by: approved_by || null
    };
    if (start_date) updateData.start_date = start_date;
    if (end_date) updateData.end_date = end_date;
    if (reason !== undefined) updateData.reason = reason;

    const updated = await updateDoc('leaves', req.params.id, updateData);
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await deleteDoc('leaves', req.params.id);
    res.json({ message: 'Leave request deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
