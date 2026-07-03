// server/routes/tasks.js
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
    const tasks = await getCollection('tasks');
    
    const populatedTasks = await Promise.all(tasks.map(async (t) => {
      let assignee_name = 'Unassigned';
      if (t.assignee_id) {
        const user = await getDoc('profiles', t.assignee_id);
        if (user) assignee_name = user.username;
      }
      return { ...t, assignee_name };
    }));
    
    populatedTasks.sort((a, b) => {
      const timeA = a.created_at ? (a.created_at._seconds || new Date(a.created_at).getTime()) : 0;
      const timeB = b.created_at ? (b.created_at._seconds || new Date(b.created_at).getTime()) : 0;
      return timeB - timeA;
    });

    res.json(populatedTasks);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  const { title, description, assignee_id, start_date, due_date, priority, status } = req.body;
  try {
    const newTask = {
      title,
      description: description || null,
      assignee_id: assignee_id || null,
      start_date: start_date || null,
      due_date: due_date || null,
      priority: priority || 'Medium',
      status: status || 'To Do',
      created_by: req.user.id
    };
    const doc = await addDoc('tasks', newTask);

    if (assignee_id) {
      notifyAssignee(assignee_id, doc);
    }

    res.status(201).json(doc);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  const { title, description, assignee_id, start_date, due_date, priority, status } = req.body;
  try {
    const oldTask = await getDoc('tasks', req.params.id);
    if (!oldTask) return res.status(404).json({ error: 'Task not found' });

    const updateData = {
      title,
      description: description || null,
      assignee_id: assignee_id || null,
      start_date: start_date || null,
      due_date: due_date || null,
      priority,
      status
    };
    
    const doc = await updateDoc('tasks', req.params.id, updateData);

    if (assignee_id && assignee_id !== oldTask.assignee_id) {
      notifyAssignee(assignee_id, doc);
    }

    res.json(doc);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await deleteDoc('tasks', req.params.id);
    res.json({ message: 'Task deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

async function notifyAssignee(userId, task) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return;
  const transporter = createTransporter();
  try {
    const user = await getDoc('profiles', userId);
    if (!user || !user.email) return;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #ec4899;">New Task Assigned</h2>
        <p>Hello <strong>${user.username}</strong>,</p>
        <p>You have been assigned to a new task.</p>
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p><strong>Title:</strong> ${task.title}</p>
          <p><strong>Priority:</strong> ${task.priority}</p>
          <p><strong>Due Date:</strong> ${task.due_date || 'N/A'}</p>
          ${task.description ? `<p><strong>Description:</strong> ${task.description}</p>` : ''}
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"GenZ - CRM" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: user.email,
      subject: `New Task Assigned: ${task.title}`,
      html
    });
  } catch (e) {
    console.error('Failed to notify assignee:', e);
  }
}

module.exports = router;
