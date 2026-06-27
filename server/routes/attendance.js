// server/routes/attendance.js
const router = require('express').Router();
const auth = require('../middleware/auth');
const { getCollection, addDoc, updateDoc, deleteDoc, getDoc, findOne } = require('../firebase-admin');

// GET all (admin) or own records
router.get('/', auth, async (req, res) => {
  try {
    const allAttendance = await getCollection('attendance');
    const profiles = await getCollection('profiles');
    
    // Map profile names
    const enriched = allAttendance.map(a => {
      const p = profiles.find(pr => pr.id === a.profile_id);
      return { ...a, username: p ? p.username : 'Unknown' };
    });

    if (req.user.role === 'Admin') {
      enriched.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return new Date(b.check_in_time).getTime() - new Date(a.check_in_time).getTime();
      });
      res.json(enriched);
    } else {
      const myAttendance = enriched.filter(a => a.profile_id === req.user.id);
      myAttendance.sort((a, b) => b.date.localeCompare(a.date));
      res.json(myAttendance);
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST check-in
router.post('/checkin', auth, async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const all = await getCollection('attendance');
    const existing = all.find(a => a.profile_id === req.user.id && a.date === today);
    
    if (existing) {
      return res.status(400).json({ error: 'Already checked in today' });
    }
    
    const doc = await addDoc('attendance', {
      profile_id: req.user.id,
      date: today,
      check_in_time: new Date().toISOString(),
      check_out_time: null,
      status: 'Checked In',
      attendance_breaks: []
    });
    res.status(201).json(doc);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST checkout
router.post('/checkout/:id', auth, async (req, res) => {
  try {
    const doc = await getDoc('attendance', req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    if (doc.profile_id !== req.user.id && req.user.role !== 'Admin') return res.status(403).json({ error: 'Forbidden' });

    const updated = await updateDoc('attendance', req.params.id, {
      check_out_time: new Date().toISOString(),
      status: 'Checked Out'
    });
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST start break
router.post('/break/start/:id', auth, async (req, res) => {
  try {
    const { reason } = req.body;
    const doc = await getDoc('attendance', req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    if (doc.profile_id !== req.user.id && req.user.role !== 'Admin') return res.status(403).json({ error: 'Forbidden' });

    const breaks = doc.attendance_breaks || [];
    const newBreak = {
      id: Date.now().toString(),
      break_start_time: new Date().toISOString(),
      break_end_time: null,
      reason: reason || 'Break'
    };
    breaks.push(newBreak);

    const updated = await updateDoc('attendance', req.params.id, {
      status: 'On Break',
      attendance_breaks: breaks
    });
    // Send back the created break id so frontend knows it
    res.status(201).json({ id: newBreak.id, ...updated });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST end break
router.post('/break/end/:breakId', auth, async (req, res) => {
  try {
    const { breakId } = req.params;
    const all = await getCollection('attendance');
    const doc = all.find(a => (a.attendance_breaks || []).some(b => b.id === breakId));
    
    if (!doc) return res.status(404).json({ error: 'Break not found' });
    if (doc.profile_id !== req.user.id && req.user.role !== 'Admin') return res.status(403).json({ error: 'Forbidden' });

    const breaks = doc.attendance_breaks.map(b => {
      if (b.id === breakId) {
        return { ...b, break_end_time: new Date().toISOString() };
      }
      return b;
    });

    const updated = await updateDoc('attendance', doc.id, {
      status: 'Checked In',
      attendance_breaks: breaks
    });
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  if (req.user.role !== 'Admin') return res.status(403).json({ error: 'Admin only' });
  try {
    await deleteDoc('attendance', req.params.id);
    res.json({ message: 'Attendance entry deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
