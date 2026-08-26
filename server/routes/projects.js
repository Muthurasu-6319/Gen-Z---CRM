// server/routes/projects.js — Firebase Firestore version
const router = require('express').Router();
const auth = require('../middleware/auth');
const { createTransporter } = require('../mailer');
const { getCollection, addDoc, updateDoc, deleteDoc, getDoc } = require('../mongodb-admin');

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
      notifyAssignedUsers(assigned_to, newProject, null, req.user ? req.user.id : null);
    }

    // Send email to Lead Generator
    if (newProject.lead_generator_id) {
      notifyLeadGenerator(newProject);
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
    if (assigned_to && assigned_to.length > 0) {
      notifyAssignedUsers(assigned_to, doc, oldProject, req.user ? req.user.id : null);
    }

    res.json(doc);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/projects/bulk-delete
router.post('/bulk-delete', auth, async (req, res) => {
  const { projectIds } = req.body;
  if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
    return res.status(400).json({ error: 'No projects provided' });
  }

  try {
    let deleterName = 'System/Admin';
    if (req.user && req.user.id) {
        try {
            const { getDoc: getProfileDoc } = require('../mongodb-admin');
            const deleter = await getProfileDoc('profiles', req.user.id);
            if (deleter && deleter.username) deleterName = deleter.username;
        } catch(e) {}
    }

    const deletedProjects = [];
    for (const id of projectIds) {
      const project = await getDoc('projects', id);
      if (project) {
        // Can only delete if admin or created it
        if (req.user.role === 'Admin' || project.created_by === req.user.id) {
          await deleteDoc('projects', id);
          deletedProjects.push(project);
        }
      }
    }
    
    if (deletedProjects.length > 0) {
      let projectsTableRows = deletedProjects.map((project, index) => `
        <div style="background-color: #ffffff; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
          <h3 style="margin-top: 0; margin-bottom: 10px; color: #111827; font-size: 16px; border-bottom: 1px solid #f3f4f6; padding-bottom: 8px;">#${index + 1} - ${project.name || 'Unnamed Project'}</h3>
          <table style="width: 100%; text-align: left; border-collapse: collapse; font-size: 14px; color: #374151;">
            <tr><td style="padding: 4px 0; width: 120px; font-weight: bold;">Client Name:</td><td style="padding: 4px 0;">${project.client_name || 'N/A'}</td></tr>
            <tr><td style="padding: 4px 0; font-weight: bold;">Mobile:</td><td style="padding: 4px 0;">${project.client_mobile || 'N/A'}</td></tr>
            <tr><td style="padding: 4px 0; font-weight: bold;">Status:</td><td style="padding: 4px 0;">${project.status || 'N/A'}</td></tr>
            <tr><td style="padding: 4px 0; font-weight: bold; vertical-align: top;">Description:</td><td style="padding: 4px 0;">${project.description || 'N/A'}</td></tr>
          </table>
        </div>
      `).join('');

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #ef4444; margin-top: 0;">Bulk Projects Deleted</h2>
          <p style="font-size: 15px; color: #4b5563;"><strong>${deletedProjects.length}</strong> Projects have been deleted from the CRM by <strong>${deleterName}</strong>.</p>
          <div style="margin-top: 20px;">
            ${projectsTableRows}
          </div>
        </div>
      `;
      const { notifyAllStaff } = require('../mailer');
      notifyAllStaff(`Bulk Projects Deleted (${deletedProjects.length})`, html, req.user ? req.user.id : null);
    }
    
    res.json({ message: 'Projects deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const projectToDelete = await getDoc('projects', req.params.id);
    await deleteDoc('projects', req.params.id);
    
    if (projectToDelete) {
        let deleterName = 'System/Admin';
        if (req.user && req.user.id) {
            try {
                const deleter = await getDoc('profiles', req.user.id);
                if (deleter && deleter.username) deleterName = deleter.username;
            } catch(e) {}
        }
        const { notifyAllStaff } = require('../mailer');
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
            <h2 style="color: #ef4444;">Project Deleted</h2>
            <p>A Project has been deleted from the CRM by <strong>${deleterName}</strong>.</p>
            <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p><strong>Project Name:</strong> ${projectToDelete.name}</p>
            </div>
          </div>
        `;
        notifyAllStaff(`Project Deleted: ${projectToDelete.name}`, html, req.user ? req.user.id : null);
    }
    
    res.json({ message: 'Project deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Helper function to send email notification to assigned users
async function notifyAssignedUsers(userIds, project, oldProject, excludeUserId = null) {
  if (!process.env.GMAIL_USER) return;

  const transporter = await createTransporter();
  
  let creatorName = 'Admin';
  if (project.created_by) {
    try {
      const creator = await getDoc('profiles', project.created_by);
      if (creator) creatorName = creator.username || creatorName;
    } catch (e) {}
  }

  let leadGenName = 'N/A';
  if (project.lead_generator_id) {
    try {
      const leadGen = await getDoc('profiles', project.lead_generator_id);
      if (leadGen) leadGenName = leadGen.username || leadGenName;
    } catch (e) {}
  }
  
  for (const userId of userIds) {
    if (String(userId) === String(excludeUserId)) continue;
    
    try {
      const user = await getDoc('profiles', userId);
      if (!user || !user.email) continue;
      
      const assignedAmount = project.assigned_amounts && project.assigned_amounts[userId] ? project.assigned_amounts[userId] : null;
      let costInfo = 'N/A';
      if (assignedAmount !== null) {
         costInfo = `₹${Number(assignedAmount).toFixed(2)}`;
      }
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #4f46e5;">Project Assignment Notification</h2>
          <p>Hello <strong>${user.username}</strong>,</p>
          <p>You have been assigned to a project in the Gen Z CRM system.</p>
          
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #111827;">Project Details</h3>
            <table style="width: 100%; text-align: left; border-collapse: collapse;">
              <tr><td style="padding: 4px 0;"><strong>Project Name:</strong></td><td>${project.name}</td></tr>
              <tr><td style="padding: 4px 0;"><strong>Created By:</strong></td><td>${creatorName}</td></tr>
              <tr><td style="padding: 4px 0;"><strong>Client Name:</strong></td><td>${project.client_name || 'N/A'}</td></tr>
              <tr><td style="padding: 4px 0;"><strong>Client Mobile:</strong></td><td>${project.client_mobile || 'N/A'}</td></tr>
              <tr><td style="padding: 4px 0;"><strong>Lead Generator:</strong></td><td>${leadGenName}</td></tr>
              <tr><td style="padding: 4px 0;"><strong>Category:</strong></td><td>${project.category || 'N/A'}</td></tr>
              <tr><td style="padding: 4px 0;"><strong>Tags:</strong></td><td>${Array.isArray(project.tags) ? project.tags.join(', ') : 'N/A'}</td></tr>
              <tr><td style="padding: 4px 0;"><strong>Status:</strong></td><td>${project.status}</td></tr>
              <tr><td style="padding: 4px 0;"><strong>Timeline:</strong></td><td>${project.start_date || 'N/A'} to ${project.end_date || 'N/A'}</td></tr>
              <tr><td style="padding: 4px 0;"><strong>Assigned Amount:</strong></td><td><span style="color: #059669; font-weight: bold;">${costInfo}</span></td></tr>
            </table>
            ${project.description ? `<div style="margin-top: 15px;"><strong>Description:</strong><p style="margin-top: 5px; color: #555;">${project.description}</p></div>` : ''}
          </div>
          
          <p>Please log in to your CRM dashboard to view more details.</p>
          <p style="margin-top: 30px; font-size: 12px; color: #6b7280;">
            Warm Regards,<br>
            GENZ Team
          </p>
        </div>
      `;

      await transporter.sendMail({
        from: process.env.GMAIL_USER || 'no-reply@genzneuralx.com',
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

async function notifyLeadGenerator(project) {
  if (!process.env.GMAIL_USER || !project.lead_generator_id) return;

  try {
    const leadGenerator = await getDoc('profiles', project.lead_generator_id);
    if (!leadGenerator || !leadGenerator.email) return;

    let creatorName = 'Admin';
    if (project.created_by) {
      try {
        const creator = await getDoc('profiles', project.created_by);
        if (creator) creatorName = creator.username || creatorName;
      } catch (e) {}
    }

    const transporter = await createTransporter();
    
    let incentive = 'N/A';
    if (project.lead_generator_incentive !== null && project.lead_generator_incentive !== undefined) {
       incentive = `₹${Number(project.lead_generator_incentive).toFixed(2)}`;
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #4f46e5;">Project Lead Assignment Notification</h2>
        <p>Hello <strong>${leadGenerator.username}</strong>,</p>
        <p>A new project has been created from your lead in the Gen Z CRM system.</p>
        
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #111827;">Project Details</h3>
          <table style="width: 100%; text-align: left; border-collapse: collapse;">
            <tr><td style="padding: 4px 0;"><strong>Project Name:</strong></td><td>${project.name}</td></tr>
            <tr><td style="padding: 4px 0;"><strong>Created By:</strong></td><td>${creatorName}</td></tr>
            <tr><td style="padding: 4px 0;"><strong>Client Name:</strong></td><td>${project.client_name || 'N/A'}</td></tr>
            <tr><td style="padding: 4px 0;"><strong>Client Mobile:</strong></td><td>${project.client_mobile || 'N/A'}</td></tr>
            <tr><td style="padding: 4px 0;"><strong>Status:</strong></td><td>${project.status}</td></tr>
            <tr><td style="padding: 4px 0;"><strong>Timeline:</strong></td><td>${project.start_date || 'N/A'} to ${project.end_date || 'N/A'}</td></tr>
            <tr><td style="padding: 4px 0;"><strong>Lead Incentive:</strong></td><td><span style="color: #059669; font-weight: bold;">${incentive}</span></td></tr>
          </table>
        </div>
        
        <p>Thank you for generating this lead!</p>
        <p style="margin-top: 30px; font-size: 12px; color: #6b7280;">
          Warm Regards,<br>
          GENZ Team
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.GMAIL_USER || 'no-reply@genzneuralx.com',
      to: leadGenerator.email,
      subject: `Project Created from your Lead: ${project.name}`,
      html,
    });
    
  } catch (e) {
    console.error('Failed to notify lead generator', e);
  }
}

module.exports = router;
