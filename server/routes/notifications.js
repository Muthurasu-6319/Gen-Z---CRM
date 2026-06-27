// server/routes/notifications.js — Firebase Firestore version
const router = require('express').Router();
const auth = require('../middleware/auth');
const { getCollection, updateDoc, addDoc, getDb } = require('../firebase-admin');

router.get('/', auth, async (req, res) => {
  try {
    const allNotifs = await getCollection('notifications');
    const myNotifs = allNotifs.filter(n => n.recipient_profile_id === req.user.id);
    
    // Sort desc by created_at
    myNotifs.sort((a, b) => {
      const timeA = a.created_at ? (a.created_at._seconds || new Date(a.created_at).getTime()) : 0;
      const timeB = b.created_at ? (b.created_at._seconds || new Date(b.created_at).getTime()) : 0;
      return timeB - timeA;
    });

    res.json(myNotifs.slice(0, 50));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/read', auth, async (req, res) => {
  try {
    await updateDoc('notifications', req.params.id, { is_read: 1 });
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/read-all', auth, async (req, res) => {
  try {
    const dbInstance = getDb();
    if (!dbInstance) throw new Error('Firebase not initialized');
    
    const snapshot = await dbInstance.collection('notifications')
      .where('recipient_profile_id', '==', req.user.id)
      .get();
      
    const batch = dbInstance.batch();
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { is_read: 1 });
    });
    await batch.commit();

    res.json({ message: 'All marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  const { recipient_profile_id, message, related_item_type, related_item_id } = req.body;
  try {
    await addDoc('notifications', {
      recipient_profile_id,
      message,
      related_item_type: related_item_type || null,
      related_item_id: related_item_id || null,
      is_read: 0,
    });
    res.status(201).json({ message: 'Notification created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
