// server/routes/client-reports.js
const router = require('express').Router();
const auth = require('../middleware/auth');
const { getCollection, addDoc, updateDoc, deleteDoc, getDoc } = require('../firebase-admin');

// GET /api/client-reports
router.get('/', auth, async (req, res) => {
  try {
    const allReports = await getCollection('client_reports');
    
    // Sort by latest first
    allReports.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    if (req.user.role === 'Client') {
      // Clients can only see their own reports
      const myReports = allReports.filter(r => r.client_id === req.user.id);
      return res.json(myReports);
    }
    
    // Admin/Staff can see all reports
    res.json(allReports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/client-reports
router.post('/', auth, async (req, res) => {
  if (req.user.role === 'Client') {
    return res.status(403).json({ error: 'Clients cannot upload reports' });
  }
  
  const { client_id, title, category, file_url, file_name, notes } = req.body;
  if (!client_id || !title || !file_url || !file_name) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const doc = await addDoc('client_reports', {
      client_id,
      title,
      category: category || 'Other',
      file_url,
      file_name,
      notes: notes || null,
      created_by: req.user.id
    });
    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/client-reports/:id
router.delete('/:id', auth, async (req, res) => {
  if (req.user.role === 'Client') {
    return res.status(403).json({ error: 'Clients cannot delete reports' });
  }

  try {
    await deleteDoc('client_reports', req.params.id);
    res.json({ message: 'Report deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
