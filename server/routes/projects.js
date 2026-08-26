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
  const { name, category, description, client_name, client_mobile, total_cost, project_asset, start_date, end_date, status, tags, assigned_to, assigned_amounts, assigned_by, lead_generator_id, lead_generator_incentive, converting_client_id } = req.body;
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

    if (converting_client_id) {
       await deleteDoc('profiles', converting_client_id);
    }

    // Send comprehensive emails for project creation
    handleProjectCreationEmails(doc).catch(console.error);

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

    // Send email if status was changed by non-creator
    if (oldProject.status !== doc.status && String(req.user.id) !== String(oldProject.created_by)) {
        try {
            const creator = await getDoc('profiles', oldProject.created_by);
            if (creator && creator.email) {
                const transporter = await createTransporter();
                const mainAdminEmail = process.env.GMAIL_USER || 'gency.dev.off@gmail.com';
                const modifier = await getDoc('profiles', req.user.id);
                const modifierName = modifier ? modifier.username : 'An assigned user';
                const html = `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                    <h2 style="color: #4f46e5;">Project Status Updated</h2>
                    <p>The status of your project <strong>${doc.name}</strong> was updated by ${modifierName}.</p>
                    <p><strong>Old Status:</strong> ${oldProject.status}</p>
                    <p><strong>New Status:</strong> ${doc.status}</p>
                  </div>
                `;
                transporter.sendMail({ from: mainAdminEmail, to: creator.email, subject: `Project Status Updated: ${doc.name}`, html }).catch(console.error);
            }
        } catch(e) { console.error('Error sending status update email', e); }
    }

    // Send email to newly assigned staff
    const oldAssigned = oldProject.assigned_to || [];
    const newAssigned = doc.assigned_to || [];
    const newlyAssignedIds = newAssigned.filter(id => !oldAssigned.includes(id));
    if (newlyAssignedIds.length > 0) {
        handleNewAssignmentsEmail(doc, newlyAssignedIds).catch(console.error);
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

async function handleProjectCreationEmails(project) {
  const transporter = await createTransporter();
  if (!transporter) return;

  const profiles = await getCollection('profiles');
  const mainAdminEmail = process.env.GMAIL_USER || 'gency.dev.off@gmail.com';
  
  const getUser = (id) => profiles.find(p => String(p.id || p._id) === String(id));
  const creator = project.created_by ? getUser(project.created_by) : null;
  const creatorName = creator ? creator.username : 'Admin';
  const leadGen = project.lead_generator_id ? getUser(project.lead_generator_id) : null;
  const leadGenName = leadGen ? leadGen.username : 'N/A';
  const assignedIds = Array.isArray(project.assigned_to) ? project.assigned_to.map(String) : [];
  
  // 1. Admin Email
  const adminHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
      <h2 style="color: #4f46e5;">New Project Created</h2>
      <table style="width: 100%; text-align: left; border-collapse: collapse;">
        <tr><td style="padding: 4px 0;"><strong>Project Name:</strong></td><td>${project.name}</td></tr>
        <tr><td style="padding: 4px 0;"><strong>Created By:</strong></td><td>${creatorName}</td></tr>
        <tr><td style="padding: 4px 0;"><strong>Category:</strong></td><td>${project.category || 'N/A'}</td></tr>
        <tr><td style="padding: 4px 0;"><strong>Tags:</strong></td><td>${Array.isArray(project.tags) ? project.tags.join(', ') : 'N/A'}</td></tr>
        <tr><td style="padding: 4px 0;"><strong>Description:</strong></td><td>${project.description || 'N/A'}</td></tr>
        <tr><td style="padding: 4px 0;"><strong>Client Name:</strong></td><td>${project.client_name || 'N/A'}</td></tr>
        <tr><td style="padding: 4px 0;"><strong>Client Mobile:</strong></td><td>${project.client_mobile || 'N/A'}</td></tr>
        <tr><td style="padding: 4px 0;"><strong>Total Cost:</strong></td><td>${project.total_cost !== null ? `₹${project.total_cost}` : 'N/A'}</td></tr>
        <tr><td style="padding: 4px 0;"><strong>Timeline:</strong></td><td>${project.start_date || 'N/A'} to ${project.end_date || 'N/A'}</td></tr>
        <tr><td style="padding: 4px 0;"><strong>Lead Generator:</strong></td><td>${leadGenName}</td></tr>
        <tr><td style="padding: 4px 0;"><strong>Lead Incentive:</strong></td><td>${project.lead_generator_incentive !== null ? `₹${project.lead_generator_incentive}` : 'N/A'}</td></tr>
        <tr><td style="padding: 4px 0;"><strong>Assigned To:</strong></td><td>${assignedIds.length > 0 ? assignedIds.map(id => getUser(id)?.username).join(', ') : 'None'}</td></tr>
        <tr><td style="padding: 4px 0;"><strong>Status:</strong></td><td>${project.status}</td></tr>
      </table>
      ${project.project_asset ? `<div style="margin-top: 15px;"><strong>Project Assets:</strong> <a href="${project.project_asset}">View Assets</a></div>` : ''}
    </div>
  `;
  transporter.sendMail({ from: mainAdminEmail, to: mainAdminEmail, subject: `New Project Created: ${project.name}`, html: adminHtml }).catch(console.error);

  // 2. Lead Generator Email
  if (leadGen && leadGen.email) {
    const lgHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #4f46e5;">Project Created from your Lead</h2>
        <table style="width: 100%; text-align: left; border-collapse: collapse;">
          <tr><td style="padding: 4px 0;"><strong>Project Name:</strong></td><td>${project.name}</td></tr>
          <tr><td style="padding: 4px 0;"><strong>Created By:</strong></td><td>${creatorName}</td></tr>
          <tr><td style="padding: 4px 0;"><strong>Category:</strong></td><td>${project.category || 'N/A'}</td></tr>
          <tr><td style="padding: 4px 0;"><strong>Description:</strong></td><td>${project.description || 'N/A'}</td></tr>
          <tr><td style="padding: 4px 0;"><strong>Client Name:</strong></td><td>${project.client_name || 'N/A'}</td></tr>
          <tr><td style="padding: 4px 0;"><strong>Client Mobile:</strong></td><td>${project.client_mobile || 'N/A'}</td></tr>
          <tr><td style="padding: 4px 0;"><strong>Timeline:</strong></td><td>${project.start_date || 'N/A'} to ${project.end_date || 'N/A'}</td></tr>
          <tr><td style="padding: 4px 0;"><strong>Lead Generator:</strong></td><td>You</td></tr>
          <tr><td style="padding: 4px 0;"><strong>Your Incentive:</strong></td><td>${project.lead_generator_incentive !== null ? `₹${project.lead_generator_incentive}` : 'N/A'}</td></tr>
          <tr><td style="padding: 4px 0;"><strong>Status:</strong></td><td>${project.status}</td></tr>
        </table>
      </div>
    `;
    transporter.sendMail({ from: mainAdminEmail, to: leadGen.email, subject: `Project Created from your Lead: ${project.name}`, html: lgHtml }).catch(console.error);
  }

  // 3. Assigned Staff Emails
  for (const id of assignedIds) {
    const user = getUser(id);
    if (user && user.email) {
      const amt = project.assigned_amounts && project.assigned_amounts[id] ? project.assigned_amounts[id] : 'N/A';
      const staffHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #4f46e5;">You have been assigned to a new project</h2>
          <table style="width: 100%; text-align: left; border-collapse: collapse;">
            <tr><td style="padding: 4px 0;"><strong>Project Name:</strong></td><td>${project.name}</td></tr>
            <tr><td style="padding: 4px 0;"><strong>Created By:</strong></td><td>${creatorName}</td></tr>
            <tr><td style="padding: 4px 0;"><strong>Category:</strong></td><td>${project.category || 'N/A'}</td></tr>
            <tr><td style="padding: 4px 0;"><strong>Tags:</strong></td><td>${Array.isArray(project.tags) ? project.tags.join(', ') : 'N/A'}</td></tr>
            <tr><td style="padding: 4px 0;"><strong>Description:</strong></td><td>${project.description || 'N/A'}</td></tr>
            <tr><td style="padding: 4px 0;"><strong>Client Name:</strong></td><td>${project.client_name || 'N/A'}</td></tr>
            <tr><td style="padding: 4px 0;"><strong>Client Mobile:</strong></td><td>${project.client_mobile || 'N/A'}</td></tr>
            <tr><td style="padding: 4px 0;"><strong>Timeline:</strong></td><td>${project.start_date || 'N/A'} to ${project.end_date || 'N/A'}</td></tr>
            <tr><td style="padding: 4px 0;"><strong>Assigned Amount:</strong></td><td>${amt !== 'N/A' ? `₹${amt}` : 'N/A'}</td></tr>
            <tr><td style="padding: 4px 0;"><strong>Status:</strong></td><td>${project.status}</td></tr>
          </table>
        </div>
      `;
      transporter.sendMail({ from: mainAdminEmail, to: user.email, subject: `Project Assignment: ${project.name}`, html: staffHtml }).catch(console.error);
      
      addDoc('notifications', {
        recipient_profile_id: user.id || user._id,
        message: `You were assigned to project: ${project.name}`,
        related_item_type: 'project',
        related_item_id: project.id || null,
        is_read: 0
      }).catch(console.error);
    }
  }

  // 4. Other Users Email
  const otherUsers = profiles.filter(p => {
    const pId = String(p.id || p._id);
    const isClient = p.role === 'Client';
    const isLeadGen = pId === String(project.lead_generator_id);
    const isAssigned = assignedIds.includes(pId);
    const isAdmin = p.role === 'Admin' || p.role === 'Administrator' || p.email === mainAdminEmail;
    return !isClient && !isLeadGen && !isAssigned && !isAdmin && p.email;
  });

  const othersHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
      <h2 style="color: #4f46e5;">New Project Added to CRM</h2>
      <table style="width: 100%; text-align: left; border-collapse: collapse;">
        <tr><td style="padding: 4px 0;"><strong>Project Name:</strong></td><td>${project.name}</td></tr>
        <tr><td style="padding: 4px 0;"><strong>Created By:</strong></td><td>${creatorName}</td></tr>
        <tr><td style="padding: 4px 0;"><strong>Category:</strong></td><td>${project.category || 'N/A'}</td></tr>
        <tr><td style="padding: 4px 0;"><strong>Tags:</strong></td><td>${Array.isArray(project.tags) ? project.tags.join(', ') : 'N/A'}</td></tr>
        <tr><td style="padding: 4px 0;"><strong>Description:</strong></td><td>${project.description || 'N/A'}</td></tr>
        <tr><td style="padding: 4px 0;"><strong>Client Name:</strong></td><td>${project.client_name || 'N/A'}</td></tr>
        <tr><td style="padding: 4px 0;"><strong>Client Mobile:</strong></td><td>${project.client_mobile || 'N/A'}</td></tr>
        <tr><td style="padding: 4px 0;"><strong>Timeline:</strong></td><td>${project.start_date || 'N/A'} to ${project.end_date || 'N/A'}</td></tr>
        <tr><td style="padding: 4px 0;"><strong>Status:</strong></td><td>${project.status}</td></tr>
      </table>
    </div>
  `;
  for (const user of otherUsers) {
    transporter.sendMail({ from: mainAdminEmail, to: user.email, subject: `New Project: ${project.name}`, html: othersHtml }).catch(console.error);
  }
}

async function handleNewAssignmentsEmail(project, newlyAssignedIds) {
  const transporter = await createTransporter();
  if (!transporter) return;
  const profiles = await getCollection('profiles');
  const mainAdminEmail = process.env.GMAIL_USER || 'gency.dev.off@gmail.com';
  
  const getUser = (id) => profiles.find(p => String(p.id || p._id) === String(id));
  const creator = project.created_by ? getUser(project.created_by) : null;
  const creatorName = creator ? creator.username : 'Admin';
  
  for (const id of newlyAssignedIds) {
    const user = getUser(id);
    if (user && user.email) {
      const amt = project.assigned_amounts && project.assigned_amounts[id] ? project.assigned_amounts[id] : 'N/A';
      const assignerName = project.assigned_by && project.assigned_by[id] ? project.assigned_by[id] : creatorName;
      const staffHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #4f46e5;">You have been assigned to a project</h2>
          <table style="width: 100%; text-align: left; border-collapse: collapse;">
            <tr><td style="padding: 4px 0;"><strong>Project Name:</strong></td><td>${project.name}</td></tr>
            <tr><td style="padding: 4px 0;"><strong>Created By:</strong></td><td>${creatorName}</td></tr>
            <tr><td style="padding: 4px 0;"><strong>Assigned By:</strong></td><td>${assignerName}</td></tr>
            <tr><td style="padding: 4px 0;"><strong>Category:</strong></td><td>${project.category || 'N/A'}</td></tr>
            <tr><td style="padding: 4px 0;"><strong>Tags:</strong></td><td>${Array.isArray(project.tags) ? project.tags.join(', ') : 'N/A'}</td></tr>
            <tr><td style="padding: 4px 0;"><strong>Description:</strong></td><td>${project.description || 'N/A'}</td></tr>
            <tr><td style="padding: 4px 0;"><strong>Client Name:</strong></td><td>${project.client_name || 'N/A'}</td></tr>
            <tr><td style="padding: 4px 0;"><strong>Client Mobile:</strong></td><td>${project.client_mobile || 'N/A'}</td></tr>
            <tr><td style="padding: 4px 0;"><strong>Timeline:</strong></td><td>${project.start_date || 'N/A'} to ${project.end_date || 'N/A'}</td></tr>
            <tr><td style="padding: 4px 0;"><strong>Assigned Amount:</strong></td><td>${amt !== 'N/A' ? `₹${amt}` : 'N/A'}</td></tr>
            <tr><td style="padding: 4px 0;"><strong>Status:</strong></td><td>${project.status}</td></tr>
          </table>
        </div>
      `;
      transporter.sendMail({ from: mainAdminEmail, to: user.email, subject: `Project Assignment: ${project.name}`, html: staffHtml }).catch(console.error);
      
      addDoc('notifications', {
        recipient_profile_id: user.id || user._id,
        message: `You were assigned to project: ${project.name} by ${assignerName}`,
        related_item_type: 'project',
        related_item_id: project.id || null,
        is_read: 0
      }).catch(console.error);
    }
  }
}

module.exports = router;
