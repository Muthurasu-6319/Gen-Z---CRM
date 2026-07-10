// server/routes/meetings.js
const router = require('express').Router();
const auth = require('../middleware/auth');
const { createTransporter } = require('../mailer');
const { getCollection, addDoc, updateDoc, deleteDoc, getDoc } = require('../firebase-admin');

router.get('/', auth, async (req, res) => {
  try {
    const meetings = await getCollection('meetings');
    meetings.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
    res.json(meetings);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  const { title, start_time, end_time, google_meet_link, assigned_to } = req.body;
  try {
    const newMeeting = {
      title,
      start_time: start_time || null,
      end_time: end_time || null,
      google_meet_link: google_meet_link || null,
      assigned_to: assigned_to || [],
      created_by: req.user.id
    };
    const doc = await addDoc('meetings', newMeeting);

    if (assigned_to && assigned_to.length > 0) {
      notifyAssignees(assigned_to, doc);
    }

    res.status(201).json(doc);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  const { title, start_time, end_time, google_meet_link, assigned_to } = req.body;
  try {
    const oldMeeting = await getDoc('meetings', req.params.id);
    if (!oldMeeting) return res.status(404).json({ error: 'Meeting not found' });

    const updateData = {
      title,
      start_time: start_time || null,
      end_time: end_time || null,
      google_meet_link: google_meet_link || null,
      assigned_to: assigned_to || []
    };
    const doc = await updateDoc('meetings', req.params.id, updateData);

    if (assigned_to) {
      const newlyAssigned = assigned_to.filter(id => !oldMeeting.assigned_to?.includes(id));
      if (newlyAssigned.length > 0) {
        notifyAssignees(newlyAssigned, doc);
      }
    }

    res.json(doc);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await deleteDoc('meetings', req.params.id);
    res.json({ message: 'Meeting deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

async function notifyAssignees(userIds, meeting) {
  if (!process.env.RESEND_API_KEY) return;
  const transporter = await createTransporter();
  for (const userId of userIds) {
    try {
      const user = await getDoc('profiles', userId);
      if (!user || !user.email) continue;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #3b82f6;">New Meeting Assigned</h2>
          <p>Hello <strong>${user.username}</strong>,</p>
          <p>You have been invited to a meeting.</p>
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p><strong>Topic:</strong> ${meeting.title}</p>
            <p><strong>Time:</strong> ${meeting.start_time ? new Date(meeting.start_time).toLocaleString() : 'N/A'}</p>
            ${meeting.google_meet_link ? `<p><strong>Meet Link:</strong> <a href="${meeting.google_meet_link}">${meeting.google_meet_link}</a></p>` : ''}
          </div>
        </div>
      `;
      await transporter.sendMail({
        from: process.env.RESEND_FROM || 'onboarding@resend.dev',
        to: user.email,
        subject: `Meeting Invite: ${meeting.title}`,
        html
      });
    } catch (e) {
      console.error('Failed to notify meeting assignee:', e);
    }
  }
}

module.exports = router;
