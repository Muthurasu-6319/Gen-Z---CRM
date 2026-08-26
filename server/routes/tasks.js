const router = require('express').Router();
const auth = require('../middleware/auth');
const { getCollection, addDoc, updateDoc, deleteDoc, getDoc } = require('../mongodb-admin');
const { createTransporter } = require('../mailer');

router.get('/', auth, async (req, res) => {
  try {
    const rows = await getCollection('tasks');
    const profiles = await getCollection('profiles');
    const profileMap = {};
    for (const p of profiles) {
        profileMap[p.id] = p.username;
    }
    
    const rowsWithNames = rows.map(r => ({
        ...r,
        assignee_name: r.assignee_id ? profileMap[r.assignee_id] : null
    }));

    const myTasks = rowsWithNames.filter(r => r.assignee_id === req.user.id || r.created_by === req.user.id);
    res.json(myTasks);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  const { title, description, assignee_id, start_date, due_date, priority } = req.body;
  try {
    const newTask = {
      title,
      description: description || null,
      assignee_id: assignee_id || null,
      start_date: start_date || null,
      due_date: due_date || null,
      priority: priority || 'Medium',
      status: 'To Do',
      created_by: req.user.id
    };
    const doc = await addDoc('tasks', newTask);

    if (assignee_id) {
      notifyAssignee(assignee_id, doc, req.user.id);
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

    // Only the creator can edit fields other than status. Everyone else (even admins/assignees) can only change status.
    const isJustAssignee = req.user.id !== oldTask.created_by;
    if (isJustAssignee) {
      updateData.title = oldTask.title;
      updateData.description = oldTask.description;
      updateData.assignee_id = oldTask.assignee_id;
      updateData.start_date = oldTask.start_date;
      updateData.due_date = oldTask.due_date;
      updateData.priority = oldTask.priority;
    }
    
    // Check if status changed
    const isStatusChanged = status && oldTask.status !== status;
    
    let doc;
    if (status === 'Completed') {
       await deleteDoc('tasks', req.params.id);
       doc = { ...oldTask, ...updateData, id: req.params.id, status: 'Completed' };
    } else {
       doc = await updateDoc('tasks', req.params.id, updateData);
    }

    if (assignee_id) {
      const isAssigneeChanged = assignee_id !== oldTask.assignee_id;
      // Don't send assignee notification if the assignee is just updating their own task status
      if (isAssigneeChanged || req.user.id !== assignee_id) {
         notifyAssignee(assignee_id, doc, req.user.id, !isAssigneeChanged);
      }
    }

    // If status changed by assignee, notify assigner
    if (isStatusChanged && oldTask.created_by && req.user.id !== oldTask.created_by) {
        notifyAssigner(oldTask.created_by, doc, req.user.id);
    }

    res.json(doc);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const oldTask = await getDoc('tasks', req.params.id);
    await deleteDoc('tasks', req.params.id);
    
    if (oldTask && oldTask.assignee_id) {
       notifyAssigneeDeleted(oldTask.assignee_id, oldTask, req.user.id);
    }
    
    res.json({ message: 'Task deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

async function notifyAssignee(userId, task, assignerId, isUpdate = false) {
  if (!process.env.GMAIL_USER) return;
  const transporter = await createTransporter();
  try {
    const user = await getDoc('profiles', userId);
    if (!user || !user.email) return;

    let assignerName = 'Admin';
    if (assignerId) {
        const assigner = await getDoc('profiles', assignerId);
        if (assigner) assignerName = assigner.username;
    }

    const titleStr = isUpdate ? 'Task Updated' : 'New Task Assigned';
    const descStr = isUpdate ? 'An existing task assigned to you has been updated.' : 'You have been assigned to a new task in the Gen Z CRM system.';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #4f46e5;">${titleStr}</h2>
        <p>Hello <strong>${user.username}</strong>,</p>
        <p>${descStr}</p>
        
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #111827;">Task Details</h3>
          <table style="width: 100%; text-align: left; border-collapse: collapse;">
            <tr><td style="padding: 4px 0;"><strong>Title:</strong></td><td>${task.title}</td></tr>
            <tr><td style="padding: 4px 0;"><strong>${isUpdate ? 'Updated By' : 'Assigned By'}:</strong></td><td>${assignerName}</td></tr>
            <tr><td style="padding: 4px 0;"><strong>Start Date:</strong></td><td>${task.start_date || 'N/A'}</td></tr>
            <tr><td style="padding: 4px 0;"><strong>Due Date:</strong></td><td>${task.due_date || 'N/A'}</td></tr>
            <tr><td style="padding: 4px 0;"><strong>Priority:</strong></td><td><span style="color: ${task.priority === 'High' ? '#dc2626' : task.priority === 'Medium' ? '#d97706' : '#059669'};">${task.priority}</span></td></tr>
            <tr><td style="padding: 4px 0;"><strong>Status:</strong></td><td>${task.status}</td></tr>
          </table>
          ${task.description ? `<div style="margin-top: 15px;"><strong>Description:</strong><p style="margin-top: 5px; color: #555;">${task.description}</p></div>` : ''}
        </div>
        
        <p>Please log in to your CRM dashboard to view and manage this task.</p>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.GMAIL_USER || 'no-reply@genzneuralx.com',
      to: user.email,
      subject: `${titleStr}: ${task.title}`,
      html,
    });
  } catch (e) {
    console.error('Failed to notify task assignee', userId, e);
  }
}

async function notifyAssigner(assignerId, task, assigneeId) {
  if (!process.env.GMAIL_USER) return;
  const transporter = await createTransporter();
  try {
    const assigner = await getDoc('profiles', assignerId);
    if (!assigner || !assigner.email) return;

    let assigneeName = 'A user';
    if (assigneeId) {
        const assignee = await getDoc('profiles', assigneeId);
        if (assignee) assigneeName = assignee.username;
    }

    let subjectStr = '';
    let descStr = '';

    if (task.status === 'Completed') {
        subjectStr = `Task Completed: ${task.title}`;
        descStr = `The task you assigned has been completed by <strong>${assigneeName}</strong>.`;
    } else if (task.status === 'In Progress') {
        subjectStr = `Task In Progress: ${task.title}`;
        descStr = `The task you assigned has been picked up by <strong>${assigneeName}</strong> and is currently in progress.`;
    } else {
        subjectStr = `Task Status Updated: ${task.title}`;
        descStr = `The status of the task you assigned has been updated to <strong>${task.status}</strong> by <strong>${assigneeName}</strong>.`;
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #4f46e5;">${subjectStr}</h2>
        <p>Hello <strong>${assigner.username}</strong>,</p>
        <p>${descStr}</p>
        
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #111827;">Task Details</h3>
          <table style="width: 100%; text-align: left; border-collapse: collapse;">
            <tr><td style="padding: 4px 0;"><strong>Title:</strong></td><td>${task.title}</td></tr>
            <tr><td style="padding: 4px 0;"><strong>Updated By:</strong></td><td>${assigneeName}</td></tr>
            <tr><td style="padding: 4px 0;"><strong>Status:</strong></td><td><span style="color: ${task.status === 'Completed' ? '#059669' : '#d97706'}; font-weight: bold;">${task.status}</span></td></tr>
          </table>
          ${task.description ? `<div style="margin-top: 15px;"><strong>Description:</strong><p style="margin-top: 5px; color: #555;">${task.description}</p></div>` : ''}
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.GMAIL_USER || 'no-reply@genzneuralx.com',
      to: assigner.email,
      subject: subjectStr,
      html,
    });
  } catch (e) {
    console.error('Failed to notify task assigner', assignerId, e);
  }
}

async function notifyAssigneeDeleted(userId, task, assignerId) {
  if (!process.env.GMAIL_USER) return;
  const transporter = await createTransporter();
  try {
    const user = await getDoc('profiles', userId);
    if (!user || !user.email) return;

    let assignerName = 'Admin';
    if (assignerId) {
        const assigner = await getDoc('profiles', assignerId);
        if (assigner) assignerName = assigner.username;
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #ef4444;">Task Deleted</h2>
        <p>Hello <strong>${user.username}</strong>,</p>
        <p>A task assigned to you has been deleted by <strong>${assignerName}</strong>.</p>
        
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #111827;">Task Details</h3>
          <table style="width: 100%; text-align: left; border-collapse: collapse;">
            <tr><td style="padding: 4px 0;"><strong>Title:</strong></td><td>${task.title}</td></tr>
            <tr><td style="padding: 4px 0;"><strong>Deleted By:</strong></td><td>${assignerName}</td></tr>
            <tr><td style="padding: 4px 0;"><strong>Priority:</strong></td><td><span style="color: ${task.priority === 'High' ? '#dc2626' : task.priority === 'Medium' ? '#d97706' : '#059669'};">${task.priority}</span></td></tr>
            <tr><td style="padding: 4px 0;"><strong>Status:</strong></td><td>${task.status}</td></tr>
          </table>
          ${task.description ? `<div style="margin-top: 15px;"><strong>Description:</strong><p style="margin-top: 5px; color: #555;">${task.description}</p></div>` : ''}
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.GMAIL_USER || 'no-reply@genzneuralx.com',
      to: user.email,
      subject: `Task Deleted: ${task.title}`,
      html,
    });
  } catch (e) {
    console.error('Failed to notify task assignee about deletion', userId, e);
  }
}

module.exports = router;
