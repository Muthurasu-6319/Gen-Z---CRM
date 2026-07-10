const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const { getCollection, setDoc, addDoc } = require('../firebase-admin');

const COLLECTIONS = [
  'profiles', 'roles', 'projects', 'tasks', 'attendance', 'leave_requests', 
  'products', 'quotes', 'invoices', 'leads', 'mailbox', 'messages', 
  'notifications', 'settings', 'tickets', 'user_notes', 'meetings', 
  'calendar_events', 'accounting', 'client_reports'
];

// GET /api/backup/export
router.get('/export', authMiddleware, async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Admin only access' });
  }

  try {
    const data = {};
    for (const col of COLLECTIONS) {
      const docs = await getCollection(col);
      data[col] = docs;
    }
    res.json(data);
  } catch (err) {
    console.error('Backup export error:', err);
    res.status(500).json({ error: 'Failed to export database' });
  }
});

// POST /api/backup/import
router.post('/import', authMiddleware, async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Admin only access' });
  }

  const data = req.body;
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Invalid backup file format' });
  }

  try {
    let importedCollections = 0;
    let importedDocs = 0;

    for (const col of Object.keys(data)) {
      if (!COLLECTIONS.includes(col)) continue;
      
      const docs = data[col];
      if (Array.isArray(docs)) {
        importedCollections++;
        // Sequential import to avoid overwhelming the REST API emulator
        for (const doc of docs) {
          if (doc.id) {
            await setDoc(col, doc.id, doc);
          } else {
            await addDoc(col, doc);
          }
          importedDocs++;
        }
      }
    }

    res.json({ 
      success: true, 
      message: `Successfully imported ${importedDocs} records across ${importedCollections} collections.`
    });
  } catch (err) {
    console.error('Backup import error:', err);
    res.status(500).json({ error: 'Failed to import database: ' + err.message });
  }
});

module.exports = router;
