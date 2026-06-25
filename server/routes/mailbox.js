// server/routes/mailbox.js
const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const nodemailer = require('nodemailer');

// Helper: create nodemailer transporter from env
function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// GET /api/mailbox — list mails for current user
router.get('/', auth, async (req, res) => {
  const { folder = 'inbox' } = req.query;
  try {
    const [rows] = await db.query(
      `SELECT m.*, 
        s.username AS sender_name, 
        r.username AS recipient_name
       FROM mails m
       LEFT JOIN profiles s ON m.sender_id = s.id
       LEFT JOIN profiles r ON m.recipient_id = r.id
       WHERE (m.recipient_id=? AND m.folder='inbox' AND ? = 'inbox')
          OR (m.sender_id=? AND m.folder='sent' AND ? = 'sent')
          OR (m.sender_id=? AND m.folder='draft' AND ? = 'draft')
          OR (m.recipient_id=? AND m.folder='trash' AND ? = 'trash')
       ORDER BY m.created_at DESC`,
      [req.user.id, folder, req.user.id, folder, req.user.id, folder, req.user.id, folder]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/mailbox/templates — list email templates
router.get('/templates', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM email_templates ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    // Table may not exist — return empty array gracefully
    res.json([]);
  }
});

// POST /api/mailbox/send — send an email via SMTP and log it
router.post('/send', auth, async (req, res) => {
  const { to, subject, html, recipient_id } = req.body;
  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'to, subject, and html are required' });
  }

  try {
    // Log to mails table
    await db.query(
      `INSERT INTO mails (sender_id, recipient_id, subject, body, folder) VALUES (?, ?, ?, ?, 'sent')`,
      [req.user.id, recipient_id || null, subject, html]
    );

    // Send via SMTP if configured
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = createTransporter();
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject,
        html,
      });
    } else {
      console.warn('SMTP not configured — email logged but not sent.');
    }

    res.json({ message: 'Email sent successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mailbox — save a mail (e.g., draft)
router.post('/', auth, async (req, res) => {
  const { recipient_id, subject, body, folder } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO mails (sender_id, recipient_id, subject, body, folder) VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, recipient_id || null, subject || '', body || '', folder || 'sent']
    );
    const [rows] = await db.query('SELECT * FROM mails WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/mailbox/:id/read
router.put('/:id/read', auth, async (req, res) => {
  try {
    await db.query('UPDATE mails SET is_read=1 WHERE id=?', [req.params.id]);
    res.json({ message: 'Marked as read' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/mailbox/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM mails WHERE id = ?', [req.params.id]);
    res.json({ message: 'Mail deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
