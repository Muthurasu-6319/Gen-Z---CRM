// server/routes/users.js — Firebase Firestore version
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const { getCollection, addDoc, updateDoc, deleteDoc, getDoc, findOne, setDoc } = require('../mongodb-admin');
const { createTransporter, notifyAllStaff } = require('../mailer');

async function sendWelcomeEmail(user, rawPassword) {
  if (!process.env.GMAIL_USER) {
    console.warn('Resend not configured, skipping welcome email.');
    return;
  }
  const transporter = await createTransporter();
  try {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #4f46e5;">Welcome to GENZ CRM</h2>
        <p>Hello <strong>${user.username}</strong>,</p>
        <p>Your account has been successfully created. Here are your account details:</p>
        
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p><strong>Name:</strong> ${user.username}</p>
          <p><strong>Email ID:</strong> ${user.email}</p>
          <p><strong>Password:</strong> ${rawPassword}</p>
          <p><strong>Phone Number:</strong> ${user.mobile || 'N/A'}</p>
          <p><strong>Designation:</strong> ${user.designation || 'N/A'}</p>
          <p><strong>Access Role:</strong> ${user.role}</p>
        </div>
        
        <p>You can log into the CRM platform at:</p>
        <p><a href="https://crm.genzneuralx.com/" style="display: inline-block; padding: 10px 20px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 4px;">Login to CRM</a></p>
        <p>URL: <a href="https://crm.genzneuralx.com/">https://crm.genzneuralx.com/</a></p>
        <p>Please log in and change your password as soon as possible.</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <h4 style="margin-bottom: 10px; color: #333;">Contact Details</h4>
            <p style="margin: 0; color: #555;"><strong>GENZ NeuralX</strong></p>
            <p style="margin: 0; color: #555;">Email: support@genzneuralx.com</p>
            <p style="margin: 0; color: #555;">Website: www.genzneuralx.com</p>
        </div>
        
        <p style="font-size: 12px; color: #888; margin-top: 20px;">This is an automated message from GENZ CRM.</p>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.GMAIL_USER || 'no-reply@genzneuralx.com',
      to: user.email,
      subject: 'Welcome to GENZ CRM - Your Login Details',
      html
    });
    console.log('Welcome email sent to', user.email);
  } catch (e) {
    console.error('Failed to send welcome email:', e);
  }
}

// GET /api/users
router.get('/', auth, async (req, res) => {
  try {
    const users = await getCollection('profiles');
    // Return raw_password as password for the UI if it exists
    const safeUsers = users.map(({ password, raw_password, ...user }) => ({ ...user, password: raw_password || '' }));
    // Sort by created_at descending (created_at might be a Firestore Timestamp)
    safeUsers.sort((a, b) => {
      const timeA = a.created_at ? (a.created_at._seconds || new Date(a.created_at).getTime()) : 0;
      const timeB = b.created_at ? (b.created_at._seconds || new Date(b.created_at).getTime()) : 0;
      return timeB - timeA;
    });
    res.json(safeUsers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users
router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'Admin')
    return res.status(403).json({ error: 'Admin only' });

  const { username, email, password, role, designation, mobile, address, gpay, bankDetails, bloodGroup, permissions, total_paid, total_pending, services, emp_id, requirements, location, notes } = req.body;
  if (!username) return res.status(400).json({ error: 'username required' });
  if (role !== 'Client' && (!email || !password)) {
    return res.status(400).json({ error: 'email and password required for staff' });
  }

  try {
    // Check if email already exists
    const existingUser = await findOne('profiles', 'email', email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    let hashed = '';
    if (password) {
      hashed = await bcrypt.hash(password, 10);
    }
    
    // Create new profile object
    const newProfile = {
      username,
      email: email || '',
      password: hashed,
      role: role || 'Staff',
      designation: designation || null,
      mobile: mobile || null,
      address: address || null,
      gpay: gpay || null,
      bank_details: bankDetails || null,
      blood_group: bloodGroup || null,
      permissions: permissions || null,
      total_paid: total_paid || 0,
      total_pending: total_pending || 0,
      services: services || [],
      emp_id: emp_id || null,
      raw_password: password,
      requirements: requirements || null,
      location: location || null,
      notes: notes || null,
    };

    const doc = await addDoc('profiles', newProfile);
    const { password: _pw, ...safeUser } = doc;
    
    // Send email asynchronously without blocking the response
    if (role !== 'Client' && email && password) {
      sendWelcomeEmail(newProfile, password);
    } else if (role === 'Client') {
      
      let creatorName = 'System/Admin';
      if (req.user && req.user.id) {
          try {
              const creator = await getDoc('profiles', req.user.id);
              if (creator && creator.username) creatorName = creator.username;
          } catch(e) {}
      }

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #4f46e5;">New Client Added</h2>
          <p>A new Client has been added to the CRM.</p>
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p><strong>Added By:</strong> ${creatorName}</p>
            <p><strong>Name:</strong> ${username}</p>
            <p><strong>Mobile:</strong> ${mobile || 'N/A'}</p>
            <p><strong>Email:</strong> ${email || 'N/A'}</p>
            <p><strong>Requirements:</strong> ${requirements || 'N/A'}</p>
            <p><strong>Location:</strong> ${location || 'N/A'}</p>
            <p><strong>Notes:</strong> ${notes || 'N/A'}</p>
          </div>
        </div>
      `;
      notifyAllStaff(`New Client Added: ${username}`, html, req.user ? req.user.id : null);
    }
    
    res.status(201).json(safeUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id
router.put('/:id', auth, async (req, res) => {
  if (req.user.role !== 'Admin' && req.user.id !== req.params.id)
    return res.status(403).json({ error: 'Forbidden' });

  const { username, email, role, designation, mobile, address, gpay, bankDetails, bloodGroup, permissions, password, total_paid, total_pending, services, profile_picture, emp_id, requirements, location, notes } = req.body;
  try {
    const updateData = {};
    if (username !== undefined) updateData.username = username;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (designation !== undefined) updateData.designation = designation;
    if (mobile !== undefined) updateData.mobile = mobile;
    if (address !== undefined) updateData.address = address;
    if (gpay !== undefined) updateData.gpay = gpay;
    if (bankDetails !== undefined) updateData.bank_details = bankDetails;
    if (bloodGroup !== undefined) updateData.blood_group = bloodGroup;
    if (permissions !== undefined) updateData.permissions = permissions;
    if (total_paid !== undefined) updateData.total_paid = Number(total_paid);
    if (total_pending !== undefined) updateData.total_pending = Number(total_pending);
    if (services !== undefined) updateData.services = services;
    if (emp_id !== undefined) updateData.emp_id = emp_id;
    if (profile_picture !== undefined) updateData.profile_picture = profile_picture;
    if (requirements !== undefined) updateData.requirements = requirements;
    if (location !== undefined) updateData.location = location;
    if (notes !== undefined) updateData.notes = notes;
    
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
      updateData.raw_password = password;
    }

    if (req.params.id === 'admin-env') {
      return res.status(403).json({ error: 'Cannot update the environment fallback Admin profile from the UI. Please update the .env file directly or use a database Admin account.' });
    }

    // Fetch old user for comparison
    const oldUser = await getDoc('profiles', req.params.id);
    if (!oldUser) {
      return res.status(404).json({ error: 'Profile not found in database' });
    }

    const updated = await updateDoc('profiles', req.params.id, updateData);
    if (!updated) {
      return res.status(404).json({ error: 'Profile not found in database' });
    }
    const { password: _pw, ...safeUser } = updated;
    
    if (updated.role === 'Client') {
      // Fetch updater name
      let updaterName = 'System/Admin';
      if (req.user && req.user.id) {
          try {
              const updater = await getDoc('profiles', req.user.id);
              if (updater && updater.username) updaterName = updater.username;
          } catch(e) {}
      }

      // Find what changed
      let changes = [];
      if (oldUser.username !== updated.username) changes.push(`<b>Client Name:</b> changed to ${updated.username}`);
      if (oldUser.mobile !== updated.mobile) changes.push(`<b>Mobile:</b> changed to ${updated.mobile}`);
      if (oldUser.location !== updated.location) changes.push(`<b>Location:</b> changed to ${updated.location}`);
      if (oldUser.requirements !== updated.requirements) changes.push(`<b>Requirements:</b> changed to ${updated.requirements}`);
      if (oldUser.notes !== updated.notes) changes.push(`<b>Notes:</b> changed`);
      if (oldUser.email !== updated.email) changes.push(`<b>Email:</b> changed to ${updated.email}`);
      
      const changesHtml = changes.length > 0 
          ? `<div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd;"><h4>Changes Made:</h4><ul>${changes.map(c => `<li>${c}</li>`).join('')}</ul></div>` 
          : '';

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #4f46e5;">Client Updated</h2>
          <p>Client details have been updated in the CRM by <strong>${updaterName}</strong>.</p>
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <table style="width: 100%; text-align: left; border-collapse: collapse;">
              <tr><td style="padding: 4px 0;"><strong>Client Name:</strong></td><td>${updated.username}</td></tr>
              <tr><td style="padding: 4px 0;"><strong>Mobile:</strong></td><td>${updated.mobile || 'N/A'}</td></tr>
              <tr><td style="padding: 4px 0;"><strong>Location:</strong></td><td>${updated.location || 'N/A'}</td></tr>
              <tr><td style="padding: 4px 0;"><strong>Requirements:</strong></td><td>${updated.requirements || 'N/A'}</td></tr>
              <tr><td style="padding: 4px 0;"><strong>Notes:</strong></td><td>${updated.notes || 'N/A'}</td></tr>
            </table>
            ${changesHtml}
          </div>
        </div>
      `;
      notifyAllStaff(`Client Updated: ${updated.username}`, html, req.user ? req.user.id : null);
    }

    res.json(safeUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users/bulk-delete
router.post('/bulk-delete', auth, async (req, res) => {
  if (req.user.role !== 'Admin')
    return res.status(403).json({ error: 'Admin only' });

  const { userIds } = req.body;
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ error: 'No users provided' });
  }

  try {
    let deleterName = 'System/Admin';
    if (req.user && req.user.id) {
        try {
            const deleter = await getDoc('profiles', req.user.id);
            if (deleter && deleter.username) deleterName = deleter.username;
        } catch(e) {}
    }

    const deletedClients = [];
    for (const id of userIds) {
      const userToDelete = await getDoc('profiles', id);
      if (userToDelete) {
        await deleteDoc('profiles', id);
        if (userToDelete.role === 'Client') {
            deletedClients.push(userToDelete);
        }
      }
    }
    
    if (deletedClients.length > 0) {
      let clientsTableRows = deletedClients.map((client, index) => `
        <div style="background-color: #ffffff; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
          <h3 style="margin-top: 0; margin-bottom: 10px; color: #111827; font-size: 16px; border-bottom: 1px solid #f3f4f6; padding-bottom: 8px;">#${index + 1} - ${client.username || 'Unnamed Client'}</h3>
          <table style="width: 100%; text-align: left; border-collapse: collapse; font-size: 14px; color: #374151;">
            <tr><td style="padding: 4px 0; width: 120px; font-weight: bold;">Mobile:</td><td style="padding: 4px 0;">${client.mobile || 'N/A'}</td></tr>
            <tr><td style="padding: 4px 0; font-weight: bold;">Location:</td><td style="padding: 4px 0;">${client.location || 'N/A'}</td></tr>
            <tr><td style="padding: 4px 0; font-weight: bold; vertical-align: top;">Requirements:</td><td style="padding: 4px 0;">${client.requirements || 'N/A'}</td></tr>
            <tr><td style="padding: 4px 0; font-weight: bold; vertical-align: top;">Notes:</td><td style="padding: 4px 0;">${client.notes || 'N/A'}</td></tr>
          </table>
        </div>
      `).join('');

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #ef4444; margin-top: 0;">Bulk Clients Deleted</h2>
          <p style="font-size: 15px; color: #4b5563;"><strong>${deletedClients.length}</strong> Clients have been deleted from the CRM by <strong>${deleterName}</strong>.</p>
          <div style="margin-top: 20px;">
            ${clientsTableRows}
          </div>
        </div>
      `;
      notifyAllStaff(`Bulk Clients Deleted (${deletedClients.length})`, html, req.user ? req.user.id : null);
    }
    
    res.json({ message: 'Users deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/users/:id
router.delete('/:id', auth, async (req, res) => {
  if (req.user.role !== 'Admin')
    return res.status(403).json({ error: 'Admin only' });
  try {
    const userToDelete = await getDoc('profiles', req.params.id);
    await deleteDoc('profiles', req.params.id);
    
    if (userToDelete && userToDelete.role === 'Client') {
        let deleterName = 'System/Admin';
        if (req.user && req.user.id) {
            try {
                const deleter = await getDoc('profiles', req.user.id);
                if (deleter && deleter.username) deleterName = deleter.username;
            } catch(e) {}
        }
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
            <h2 style="color: #ef4444;">Client Deleted</h2>
            <p>A Client has been deleted from the CRM by <strong>${deleterName}</strong>.</p>
            <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <table style="width: 100%; text-align: left; border-collapse: collapse;">
                <tr><td style="padding: 4px 0;"><strong>Client Name:</strong></td><td>${userToDelete.username}</td></tr>
                <tr><td style="padding: 4px 0;"><strong>Mobile:</strong></td><td>${userToDelete.mobile || 'N/A'}</td></tr>
                <tr><td style="padding: 4px 0;"><strong>Location:</strong></td><td>${userToDelete.location || 'N/A'}</td></tr>
                <tr><td style="padding: 4px 0;"><strong>Requirements:</strong></td><td>${userToDelete.requirements || 'N/A'}</td></tr>
                <tr><td style="padding: 4px 0;"><strong>Notes:</strong></td><td>${userToDelete.notes || 'N/A'}</td></tr>
              </table>
            </div>
          </div>
        `;
        notifyAllStaff(`Client Deleted: ${userToDelete.username}`, html, req.user ? req.user.id : null);
    }
    
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
