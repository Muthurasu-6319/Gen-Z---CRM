// server/routes/attendance.js
const router = require('express').Router();
const auth = require('../middleware/auth');
const { getCollection, addDoc, updateDoc, deleteDoc, getDoc, findOne } = require('../mongodb-admin');

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

    const userProfile = profiles.find(pr => pr.id === req.user.id);
    let hasAllAccess = req.user.role !== 'Client';
    
    if (!hasAllAccess && userProfile && userProfile.permissions) {
       let perms = userProfile.permissions;
       if (typeof perms === 'string') {
           try { perms = JSON.parse(perms); } catch (e) {}
       }
       if (perms && perms['attendance'] && (perms['attendance'].view === true || perms['attendance'].view === 'true' || perms['attendance'].view === 1)) {
           hasAllAccess = true;
       }
    }

    if (hasAllAccess) {
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
    notifyAdminOfAttendance(req.user.id, 'Checked In');
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
    notifyAdminOfCheckout(req.user.id, updated);
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
  try {
    let hasDeleteAccess = req.user.role === 'Admin';
    if (!hasDeleteAccess) {
        const profiles = await getCollection('profiles');
        const userProfile = profiles.find(pr => pr.id === req.user.id);
        if (userProfile && userProfile.permissions) {
           let perms = userProfile.permissions;
           if (typeof perms === 'string') {
               try { perms = JSON.parse(perms); } catch (e) {}
           }
           if (perms && perms['attendance'] && (perms['attendance'].delete === true || perms['attendance'].delete === 'true' || perms['attendance'].delete === 1)) {
               hasDeleteAccess = true;
           }
        }
    }
    
    if (!hasDeleteAccess) return res.status(403).json({ error: 'Permission denied' });
    
    await deleteDoc('attendance', req.params.id);
    res.json({ message: 'Attendance entry deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const calculateDuration = (start, end) => {
  if (!end) return 'Ongoing';
  const diff = new Date(end).getTime() - new Date(start).getTime();
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
};

async function notifyAdminOfAttendance(userId, action, details = '') {
  try {
    const user = await getDoc('profiles', userId);
    if (user && user.email === 'genzdevoff@gmail.com') return;
    if (userId === 'admin-env' && process.env.ADMIN_EMAIL === 'genzdevoff@gmail.com') return;
    const username = user ? user.username : 'Unknown User';
    
    const { createTransporter } = require('../mailer');
    const transporter = await createTransporter();
    const actionText = action === 'Checked In' 
      ? '<strong>This user has logged in today.</strong>'
      : `has just performed an attendance action: <strong>${action}</strong>.`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #4f46e5;">Attendance Update: ${username}</h2>
        <p><strong>${username}</strong> ${actionText}</p>
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Status:</strong> ${action}</p>
          ${details ? `<p><strong>Details:</strong> ${details}</p>` : ''}
        </div>
      </div>
    `;
    await transporter.sendMail({
      from: process.env.GMAIL_USER || 'no-reply@genzneuralx.com',
      to: 'genzdevoff@gmail.com',
      subject: `Attendance Update: ${username} - ${action}`,
      html
    });
  } catch (err) {
    console.error('Failed to notify admin of attendance:', err);
  }
}

async function notifyAdminOfCheckout(userId, record) {
  try {
    const user = await getDoc('profiles', userId);
    if (user && user.email === 'genzdevoff@gmail.com') return;
    if (userId === 'admin-env' && process.env.ADMIN_EMAIL === 'genzdevoff@gmail.com') return;
    const username = user ? user.username : 'Unknown User';
    
    const { createTransporter } = require('../mailer');
    const transporter = await createTransporter();
    
    const totalDuration = calculateDuration(record.check_in_time, record.check_out_time);
    const breaksHtml = (record.attendance_breaks || []).map(b => 
      `<li>${new Date(b.break_start_time).toLocaleTimeString()} to ${new Date(b.break_end_time).toLocaleTimeString()} (${calculateDuration(b.break_start_time, b.break_end_time)}) - <em>Reason: ${b.reason || 'N/A'}</em></li>`
    ).join('');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #4f46e5;">End of Day Summary: ${username}</h2>
        <p><strong>${username}</strong> has checked out for the day.</p>
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p><strong>Check-In Time:</strong> ${new Date(record.check_in_time).toLocaleString()}</p>
          <p><strong>Check-Out Time:</strong> ${new Date(record.check_out_time).toLocaleString()}</p>
          <p><strong>Total Working Hours:</strong> ${totalDuration}</p>
          
          <h4 style="margin-bottom: 5px;">Breaks Taken:</h4>
          ${breaksHtml ? `<ul>${breaksHtml}</ul>` : '<p>No breaks taken today.</p>'}
        </div>
      </div>
    `;
    await transporter.sendMail({
      from: process.env.GMAIL_USER || 'no-reply@genzneuralx.com',
      to: 'genzdevoff@gmail.com',
      subject: `End of Day Attendance: ${username}`,
      html
    });
  } catch (err) {
    console.error('Failed to notify admin of checkout:', err);
  }
}

module.exports = router;
