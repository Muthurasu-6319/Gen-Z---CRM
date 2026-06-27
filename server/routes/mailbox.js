// server/routes/mailbox.js — Firebase Firestore version
const router = require('express').Router();
const nodemailer = require('nodemailer');
const auth = require('../middleware/auth');
const { getCollection, addDoc, updateDoc, deleteDoc, getDoc, admin } = require('../firebase-admin');

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
    const allMails = await getCollection('mails');
    
    // Filter based on query
    // In MySQL:
    // (m.recipient_id=? AND m.folder='inbox' AND ? = 'inbox')
    // OR (m.sender_id=? AND m.folder='sent' AND ? = 'sent')
    // OR (m.sender_id=? AND m.folder='draft' AND ? = 'draft')
    // OR (m.recipient_id=? AND m.folder='trash' AND ? = 'trash')
    const filteredMails = allMails.filter(m => {
      if (folder === 'inbox') {
        return m.recipient_id === req.user.id && m.folder === 'inbox';
      } else if (folder === 'sent') {
        return m.sender_id === req.user.id && m.folder === 'sent';
      } else if (folder === 'draft') {
        return m.sender_id === req.user.id && m.folder === 'draft';
      } else if (folder === 'trash') {
        return m.recipient_id === req.user.id && m.folder === 'trash';
      }
      return false;
    });

    // Populate sender_name and recipient_name
    const populated = await Promise.all(filteredMails.map(async m => {
      let sender_name = 'Unknown';
      let recipient_name = 'Unknown';
      
      if (m.sender_id) {
        const sender = await getDoc('profiles', m.sender_id);
        if (sender) sender_name = sender.username;
      }
      if (m.recipient_id) {
        const recipient = await getDoc('profiles', m.recipient_id);
        if (recipient) recipient_name = recipient.username;
      }

      return {
        ...m,
        sender_name,
        recipient_name,
      };
    }));

    // Sort by created_at desc
    populated.sort((a, b) => {
      const timeA = a.created_at ? (a.created_at._seconds || new Date(a.created_at).getTime()) : 0;
      const timeB = b.created_at ? (b.created_at._seconds || new Date(b.created_at).getTime()) : 0;
      return timeB - timeA;
    });

    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/mailbox/templates — list email templates
router.get('/templates', auth, async (req, res) => {
  try {
    const templates = await getCollection('email_templates');
    templates.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    res.json(templates);
  } catch (err) {
    res.json([]);
  }
});

// POST /api/mailbox/templates — create a template
router.post('/templates', auth, async (req, res) => {
  const { name, subject, body } = req.body;
  if (!name || !subject || !body) {
    return res.status(400).json({ error: 'name, subject, and body are required' });
  }
  try {
    const doc = await addDoc('email_templates', { name, subject, body });
    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/mailbox/templates/:id — update a template
router.put('/templates/:id', auth, async (req, res) => {
  const { name, subject, body } = req.body;
  try {
    const doc = await updateDoc('email_templates', req.params.id, { name, subject, body });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/mailbox/templates/:id — delete a template
router.delete('/templates/:id', auth, async (req, res) => {
  try {
    await deleteDoc('email_templates', req.params.id);
    res.json({ message: 'Template deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mailbox/send — send an email via SMTP and log it
router.post('/send', auth, async (req, res) => {
  const { to, subject, html, recipient_id } = req.body;
  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'to, subject, and html are required' });
  }

  try {
    // 1. Save to sender's SENT folder
    await addDoc('mails', {
      sender_id: req.user.id,
      recipient_id: recipient_id || null,
      subject,
      body: html,
      folder: 'sent',
      is_read: 1
    });

    // 2. Save to recipient's INBOX folder (so they see it in CRM)
    if (recipient_id) {
      await addDoc('mails', {
        sender_id: req.user.id,
        recipient_id,
        subject,
        body: html,
        folder: 'inbox',
        is_read: 0
      });

      // 3. Also fire a CRM notification for the recipient
      try {
        const sender = await getDoc('profiles', req.user.id);
        const senderName = sender ? sender.username : 'Someone';
        await addDoc('notifications', {
          recipient_profile_id: recipient_id,
          message: `📧 New mail from ${senderName}: "${subject}"`,
          related_item_type: 'mail',
          is_read: 0
        });
      } catch (notifErr) {
        console.warn('Notification insert failed (non-fatal):', notifErr.message);
      }
    }

    // 4. Send via SMTP if configured
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = createTransporter();
      await transporter.sendMail({
        from: `"GENZ Team" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to,
        subject,
        html,
      });
    } else {
      console.warn('SMTP not configured — email logged to DB only.');
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
    const doc = await addDoc('mails', {
      sender_id: req.user.id,
      recipient_id: recipient_id || null,
      subject: subject || '',
      body: body || '',
      folder: folder || 'sent',
      is_read: 0
    });
    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/mailbox/:id/read
router.put('/:id/read', auth, async (req, res) => {
  try {
    await updateDoc('mails', req.params.id, { is_read: 1 });
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/mailbox/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await deleteDoc('mails', req.params.id);
    res.json({ message: 'Mail deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
