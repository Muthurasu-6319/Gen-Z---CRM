// server/routes/notifications.js
const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM notifications WHERE recipient_profile_id=? ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/read', auth, async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read=1 WHERE id=?', [req.params.id]);
    res.json({ message: 'Marked as read' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/read-all', auth, async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read=1 WHERE recipient_profile_id=?', [req.user.id]);
    res.json({ message: 'All marked as read' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  const { recipient_profile_id, message, related_item_type, related_item_id } = req.body;
  try {
    await db.query(
      `INSERT INTO notifications (recipient_profile_id, message, related_item_type, related_item_id)
       VALUES (?, ?, ?, ?)`,
      [recipient_profile_id, message, related_item_type || null, related_item_id || null]
    );
    res.status(201).json({ message: 'Notification created' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
