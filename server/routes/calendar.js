// server/routes/calendar.js
const router = require('express').Router();
const nodemailer = require('nodemailer');
const auth = require('../middleware/auth');
const { getCollection, addDoc, updateDoc, deleteDoc, getDoc } = require('../firebase-admin');

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

router.get('/', auth, async (req, res) => {
  try {
    const events = await getCollection('calendar_events');
    events.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    res.json(events);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  const { title, start_time, end_time, description, color, assigned_to } = req.body;
  try {
    const newEvent = {
      title,
      start_time: start_time || null,
      end_time: end_time || null,
      description: description || null,
      color: color || null,
      assigned_to: assigned_to || [],
      created_by: req.user.id
    };
    const doc = await addDoc('calendar_events', newEvent);

    if (assigned_to && assigned_to.length > 0) {
      notifyAssignees(assigned_to, doc);
    }

    res.status(201).json(doc);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  const { title, start_time, end_time, description, color, assigned_to } = req.body;
  try {
    const oldEvent = await getDoc('calendar_events', req.params.id);
    if (!oldEvent) return res.status(404).json({ error: 'Event not found' });

    const updateData = {
      title,
      start_time: start_time || null,
      end_time: end_time || null,
      description: description || null,
      color: color || null,
      assigned_to: assigned_to || []
    };
    const doc = await updateDoc('calendar_events', req.params.id, updateData);

    if (assigned_to) {
      const newlyAssigned = assigned_to.filter(id => !oldEvent.assigned_to?.includes(id));
      if (newlyAssigned.length > 0) {
        notifyAssignees(newlyAssigned, doc);
      }
    }

    res.json(doc);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await deleteDoc('calendar_events', req.params.id);
    res.json({ message: 'Event deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

async function notifyAssignees(userIds, event) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return;
  const transporter = createTransporter();
  for (const userId of userIds) {
    try {
      const user = await getDoc('profiles', userId);
      if (!user || !user.email) continue;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #f59e0b;">Calendar Event Scheduled</h2>
          <p>Hello <strong>${user.username}</strong>,</p>
          <p>You have been added to a calendar event.</p>
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p><strong>Title:</strong> ${event.title}</p>
            <p><strong>Start:</strong> ${event.start_time ? new Date(event.start_time).toLocaleString() : 'N/A'}</p>
            <p><strong>End:</strong> ${event.end_time ? new Date(event.end_time).toLocaleString() : 'N/A'}</p>
            ${event.description ? `<p><strong>Description:</strong> ${event.description}</p>` : ''}
          </div>
        </div>
      `;
      await transporter.sendMail({
        from: `"GenZ - CRM" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: user.email,
        subject: `Event Scheduled: ${event.title}`,
        html
      });
    } catch (e) {
      console.error('Failed to notify calendar assignee:', e);
    }
  }
}

module.exports = router;
