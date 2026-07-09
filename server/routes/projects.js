// server/routes/projects.js — Firebase Firestore version
const router = require('express').Router();
const nodemailer = require('nodemailer');
const auth = require('../middleware/auth');
const { getCollection, addDoc, updateDoc, deleteDoc, getDoc } = require('../firebase-admin');

function createTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false
    },
    family: 4, // Force IPv4
  });
}

router.get('/', auth, async (req, res) => {
  try {
    const projects = await getCollection('projects');
    projects.sort((a, b) => {
      const timeA = a.created_at ? (a.created_at._seconds || new Date(a.created_at).getTime()) : 0;
      const timeB = b.created_at ? (b.created_at._seconds || new Date(b.created_at).getTime()) : 0;
      return timeB - timeA;
    });
    res.json(projects);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const project = await getDoc('projects', req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  const { name, category, description, client_name, client_mobile, total_cost, project_asset, start_date, end_date, status, tags, assigned_to, assigned_amounts, assigned_by, lead_generator_id, lead_generator_incentive } = req.body;
  try {
    const newProject = {
      name,
      category: category || null,
      description: description || null,
      client_name: client_name || null,
      client_mobile: client_mobile || null,
      total_cost: total_cost || null,
      project_asset: project_asset || null,
      start_date: start_date || null,
      end_date: end_date || null,
      status: status || 'Started',
      tags: tags || [],
      created_by: req.user.id,
      assigned_to: assigned_to || [],
      assigned_amounts: assigned_amounts || {},
      assigned_by: assigned_by || {},
      lead_generator_id: lead_generator_id || null,
      lead_generator_incentive: lead_generator_incentive !== undefined ? lead_generator_incentive : null
    };
    
    const doc = await addDoc('projects', newProject);

    // Send email to assigned users
    if (assigned_to && assigned_to.length > 0) {
      notifyAssignedUsers(assigned_to, newProject, null);
    }

    res.status(201).json(doc);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  const { name, category, description, client_name, client_mobile, total_cost, project_asset, start_date, end_date, status, tags, assigned_to, assigned_amounts, assigned_by, lead_generator_id, lead_generator_incentive } = req.body;
  try {
    const oldProject = await getDoc('projects', req.params.id);
    if (!oldProject) return res.status(404).json({ error: 'Project not found' });

    const updateData = {
      name,
      category: category || null,
      description: description || null,
      client_name: client_name || null,
      client_mobile: client_mobile || null,
      total_cost: total_cost || null,
      project_asset: project_asset || null,
      start_date: start_date || null,
      end_date: end_date || null,
      status: status || 'Started',
      tags: tags || [],
      assigned_to: assigned_to || [],
      assigned_amounts: assigned_amounts || {},
      assigned_by: assigned_by || {},
      lead_generator_id: lead_generator_id || null,
      lead_generator_incentive: lead_generator_incentive !== undefined ? lead_generator_incentive : null
    };

    const doc = await updateDoc('projects', req.params.id, updateData);

    // Check newly assigned users and send email
    if (assigned_to) {
      const newlyAssigned = assigned_to.filter(id => !oldProject.assigned_to?.includes(id));
      if (newlyAssigned.length > 0) {
        notifyAssignedUsers(newlyAssigned, doc, oldProject);
      }
    }

    res.json(doc);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await deleteDoc('projects', req.params.id);
    res.json({ message: 'Project deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Helper function to send email notification to assigned users
async function notifyAssignedUsers(userIds, project, oldProject) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return;

  const transporter = createTransporter();
  
  for (const userId of userIds) {
    try {
      const user = await getDoc('profiles', userId);
      if (!user || !user.email) continue;
      
      const assignedAmount = project.assigned_amounts && project.assigned_amounts[userId] ? project.assigned_amounts[userId] : null;
      let costInfo = '';
      if (assignedAmount !== null) {
         costInfo = `<p><strong>Your Allocated Amount:</strong> ₹${Number(assignedAmount).toFixed(2)}</p>`;
      }
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #4f46e5;">Project Assignment Notification</h2>
          <p>Hello <strong>${user.username}</strong>,</p>
          <p>You have been assigned to a project in the Gen Z CRM system.</p>
          
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #111827;">Project Details</h3>
            <p><strong>Name:</strong> ${project.name}</p>
            <p><strong>Category:</strong> ${project.category || 'N/A'}</p>
            ${project.description ? `<p><strong>Description:</strong> ${project.description}</p>` : ''}
            <p><strong>Status:</strong> ${project.status}</p>
            <p><strong>Timeline:</strong> ${project.start_date || 'N/A'} to ${project.end_date || 'N/A'}</p>
            ${costInfo}
          </div>
          
          <p>Please log in to your CRM dashboard to view more details.</p>
          <p style="margin-top: 30px; font-size: 12px; color: #6b7280;">
            Warm Regards,<br>
            GENZ Team
          </p>
        </div>
      `;

      await transporter.sendMail({
        from: `"GenZ - CRM" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: user.email,
        subject: `You have been assigned to project: ${project.name}`,
        html,
      });
      
      // Also send CRM notification
      await addDoc('notifications', {
        recipient_profile_id: userId,
        message: `You were assigned to project: ${project.name}`,
        related_item_type: 'project',
        related_item_id: project.id || null,
        is_read: 0
      });
      
    } catch (e) {
      console.error('Failed to notify assigned user', userId, e);
    }
  }
}

module.exports = router;
