// server/routes/userNotes.js
const router = require('express').Router();
const auth = require('../middleware/auth');
const { getCollection, addDoc, updateDoc, deleteDoc, findOne, getDb } = require('../firebase-admin');

// GET /api/user-notes
router.get('/', auth, async (req, res) => {
  try {
    const db = getDb();
    const snapshot = await db.collection('user_notes')
                             .where('profile_id', '==', req.user.id)
                             .get();
    const notes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Sort by updated_at descending
    notes.sort((a, b) => {
        const timeA = a.updated_at ? (a.updated_at._seconds || new Date(a.updated_at).getTime()) : 0;
        const timeB = b.updated_at ? (b.updated_at._seconds || new Date(b.updated_at).getTime()) : 0;
        return timeB - timeA;
    });
    res.json(notes);
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

// POST /api/user-notes
router.post('/', auth, async (req, res) => {
  const { title, content } = req.body;
  try {
    const newNote = {
      profile_id: req.user.id,
      title: title || 'Untitled Note',
      content: content || '',
      updated_at: new Date().toISOString()
    };
    const doc = await addDoc('user_notes', newNote);
    res.status(201).json(doc);
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

// PUT /api/user-notes/:id
router.put('/:id', auth, async (req, res) => {
  const { title, content } = req.body;
  try {
    const updateData = {
        updated_at: new Date().toISOString()
    };
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    
    const updated = await updateDoc('user_notes', req.params.id, updateData);
    res.json(updated);
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

// DELETE /api/user-notes/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await deleteDoc('user_notes', req.params.id);
    res.json({ message: 'Note deleted' });
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

module.exports = router;
