const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { notifyAssignedUsers, notifyAllStaff } = require('../mailer');

router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM leads ORDER BY created_at DESC');
    if (req.user.role === 'Client') {
        res.json([]);
    } else {
        res.json(rows);
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/bulk-import', auth, async (req, res) => {
  const { leads } = req.body;
  if (!leads || !Array.isArray(leads) || leads.length === 0) {
    return res.status(400).json({ error: 'No leads provided' });
  }

  try {
    let creatorName = 'System/Admin';
    if (req.user && req.user.id) {
        try {
            const [userRows] = await db.query('SELECT username FROM profiles WHERE id = ?', [req.user.id]);
            if (userRows && userRows.length > 0) creatorName = userRows[0].username;
        } catch(e) {}
    }

    const insertedLeads = [];
    for (const lead of leads) {
        const { client_name, requirements, mobile_no, notes, location, assigned_to } = lead;
        const [result] = await db.query(
          `INSERT INTO leads (client_name, requirements, mobile_no, notes, location, assigned_to, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [client_name, requirements || null, mobile_no || null, notes || null, location || null, assigned_to || null, req.user.id]
        );
        const [rows] = await db.query('SELECT * FROM leads WHERE id = ?', [result.insertId]);
        insertedLeads.push(rows[0]);
    }

    let leadsTableRows = insertedLeads.map((lead, index) => `
      <div style="background-color: #ffffff; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
        <h3 style="margin-top: 0; margin-bottom: 10px; color: #111827; font-size: 16px; border-bottom: 1px solid #f3f4f6; padding-bottom: 8px;">#${index + 1} - ${lead.client_name || 'Unnamed Lead'}</h3>
        <table style="width: 100%; text-align: left; border-collapse: collapse; font-size: 14px; color: #374151;">
          <tr><td style="padding: 4px 0; width: 120px; font-weight: bold;">Mobile:</td><td style="padding: 4px 0;">${lead.mobile_no || 'N/A'}</td></tr>
          <tr><td style="padding: 4px 0; font-weight: bold;">Location:</td><td style="padding: 4px 0;">${lead.location || 'N/A'}</td></tr>
          <tr><td style="padding: 4px 0; font-weight: bold; vertical-align: top;">Requirements:</td><td style="padding: 4px 0;">${lead.requirements || 'N/A'}</td></tr>
          <tr><td style="padding: 4px 0; font-weight: bold; vertical-align: top;">Notes:</td><td style="padding: 4px 0;">${lead.notes || 'N/A'}</td></tr>
        </table>
      </div>
    `).join('');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #4f46e5; margin-top: 0;">Bulk Leads Imported</h2>
        <p style="font-size: 15px; color: #4b5563;"><strong>${insertedLeads.length}</strong> new Leads have been added to the CRM by <strong>${creatorName}</strong>.</p>
        <div style="margin-top: 20px;">
          ${leadsTableRows}
        </div>
      </div>
    `;
    notifyAllStaff(`Bulk Leads Imported (${insertedLeads.length})`, html, req.user ? req.user.id : null);

    if (req.io) req.io.emit('leads_updated');
    res.status(201).json({ message: 'Leads imported successfully', count: insertedLeads.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  const { client_name, requirements, mobile_no, notes, location, assigned_to } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO leads (client_name, requirements, mobile_no, notes, location, assigned_to, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [client_name, requirements || null, mobile_no || null, notes || null, location || null, assigned_to || null, req.user.id]
    );
    const [rows] = await db.query('SELECT * FROM leads WHERE id = ?', [result.insertId]);
    
    if (assigned_to) {
        notifyAssignedUsers([assigned_to], 'Lead', client_name, requirements, req.user ? req.user.id : null);
    }
    
    // Fetch creator name
    let creatorName = 'System/Admin';
    if (req.user && req.user.id) {
        try {
            const [userRows] = await db.query('SELECT username FROM profiles WHERE id = ?', [req.user.id]);
            if (userRows && userRows.length > 0) creatorName = userRows[0].username;
        } catch(e) {}
    }
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #4f46e5;">New Lead Added</h2>
        <p>A new Lead has been added to the CRM.</p>
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p><strong>Added By:</strong> ${creatorName}</p>
          <p><strong>Client Name:</strong> ${client_name}</p>
          <p><strong>Mobile:</strong> ${mobile_no || 'N/A'}</p>
          <p><strong>Requirements:</strong> ${requirements || 'N/A'}</p>
          <p><strong>Location:</strong> ${location || 'N/A'}</p>
          <p><strong>Notes:</strong> ${notes || 'N/A'}</p>
        </div>
      </div>
    `;
    notifyAllStaff(`New Lead Added: ${client_name}`, html, req.user ? req.user.id : null);

    if (req.io) req.io.emit('leads_updated');
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  const { client_name, requirements, mobile_no, notes, location, assigned_to } = req.body;
  try {
    const [oldRows] = await db.query('SELECT * FROM leads WHERE id = ?', [req.params.id]);
    const oldLead = oldRows[0] || {};
    const oldAssignedTo = oldLead.assigned_to;

    await db.query(
      `UPDATE leads SET client_name=?, requirements=?, mobile_no=?, notes=?, location=?, assigned_to=? WHERE id=?`,
      [client_name, requirements || null, mobile_no || null, notes || null, location || null, assigned_to || null, req.params.id]
    );
    const [rows] = await db.query('SELECT * FROM leads WHERE id = ?', [req.params.id]);

    if (assigned_to && assigned_to !== oldAssignedTo) {
        notifyAssignedUsers([assigned_to], 'Lead', client_name, requirements, req.user ? req.user.id : null);
    }
    
    // Fetch updater name
    let updaterName = 'System/Admin';
    if (req.user && req.user.id) {
        try {
            const [userRows] = await db.query('SELECT username FROM profiles WHERE id = ?', [req.user.id]);
            if (userRows && userRows.length > 0) updaterName = userRows[0].username;
        } catch(e) {}
    }
    
    // Find what changed
    let changes = [];
    if (oldLead.client_name !== client_name) changes.push(`<b>Client Name:</b> changed to ${client_name}`);
    if (oldLead.mobile_no !== mobile_no) changes.push(`<b>Mobile:</b> changed to ${mobile_no}`);
    if (oldLead.requirements !== requirements) changes.push(`<b>Requirements:</b> changed to ${requirements}`);
    if (oldLead.location !== location) changes.push(`<b>Location:</b> changed to ${location}`);
    if (oldLead.notes !== notes) changes.push(`<b>Notes:</b> changed`);
    
    const changesHtml = changes.length > 0 
        ? `<div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd;"><h4>Changes Made:</h4><ul>${changes.map(c => `<li>${c}</li>`).join('')}</ul></div>` 
        : '';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #4f46e5;">Lead Updated</h2>
        <p>A Lead has been updated in the CRM by <strong>${updaterName}</strong>.</p>
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p><strong>Client Name:</strong> ${client_name}</p>
          <p><strong>Mobile:</strong> ${mobile_no || 'N/A'}</p>
          <p><strong>Location:</strong> ${location || 'N/A'}</p>
          <p><strong>Requirements:</strong> ${requirements || 'N/A'}</p>
          <p><strong>Notes:</strong> ${notes || 'N/A'}</p>
          ${changesHtml}
        </div>
      </div>
    `;
    notifyAllStaff(`Lead Updated: ${client_name}`, html, req.user ? req.user.id : null);

    if (req.io) req.io.emit('leads_updated');
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const [leads] = await db.query('SELECT * FROM leads WHERE id = ?', [req.params.id]);
    const lead = leads[0];
    
    await db.query('DELETE FROM leads WHERE id = ?', [req.params.id]);
    
    if (lead) {
        let deleterName = 'System/Admin';
        if (req.user && req.user.id) {
            try {
                const [userRows] = await db.query('SELECT username FROM profiles WHERE id = ?', [req.user.id]);
                if (userRows && userRows.length > 0) deleterName = userRows[0].username;
            } catch(e) {}
        }
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
            <h2 style="color: #ef4444;">Lead Deleted</h2>
            <p>A Lead has been deleted from the CRM by <strong>${deleterName}</strong>.</p>
            <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <table style="width: 100%; text-align: left; border-collapse: collapse;">
                <tr><td style="padding: 4px 0;"><strong>Client Name:</strong></td><td>${lead.client_name}</td></tr>
                <tr><td style="padding: 4px 0;"><strong>Mobile:</strong></td><td>${lead.mobile_no || 'N/A'}</td></tr>
                <tr><td style="padding: 4px 0;"><strong>Location:</strong></td><td>${lead.location || 'N/A'}</td></tr>
                <tr><td style="padding: 4px 0;"><strong>Requirements:</strong></td><td>${lead.requirements || 'N/A'}</td></tr>
                <tr><td style="padding: 4px 0;"><strong>Notes:</strong></td><td>${lead.notes || 'N/A'}</td></tr>
              </table>
            </div>
          </div>
        `;
        notifyAllStaff(`Lead Deleted: ${lead.client_name}`, html, req.user ? req.user.id : null);
    }
    
    if (req.io) req.io.emit('leads_updated');
    res.json({ message: 'Lead deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/bulk-delete', auth, async (req, res) => {
  const { leadIds } = req.body;
  if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
    return res.status(400).json({ error: 'No leads provided' });
  }
  try {
    let deleterName = 'System/Admin';
    if (req.user && req.user.id) {
        try {
            const [userRows] = await db.query('SELECT username FROM profiles WHERE id = ?', [req.user.id]);
            if (userRows && userRows.length > 0) deleterName = userRows[0].username;
        } catch(e) {}
    }
    const deletedLeads = [];
    for (const id of leadIds) {
      const [leads] = await db.query('SELECT * FROM leads WHERE id = ?', [id]);
      const lead = leads[0];
      await db.query(`DELETE FROM leads WHERE id = ?`, [id]);
      if (lead) {
        deletedLeads.push(lead);
      }
    }
    
    if (deletedLeads.length > 0) {
      let leadsTableRows = deletedLeads.map((lead, index) => `
        <div style="background-color: #ffffff; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
          <h3 style="margin-top: 0; margin-bottom: 10px; color: #111827; font-size: 16px; border-bottom: 1px solid #f3f4f6; padding-bottom: 8px;">#${index + 1} - ${lead.client_name || 'Unnamed Lead'}</h3>
          <table style="width: 100%; text-align: left; border-collapse: collapse; font-size: 14px; color: #374151;">
            <tr><td style="padding: 4px 0; width: 120px; font-weight: bold;">Mobile:</td><td style="padding: 4px 0;">${lead.mobile_no || 'N/A'}</td></tr>
            <tr><td style="padding: 4px 0; font-weight: bold;">Location:</td><td style="padding: 4px 0;">${lead.location || 'N/A'}</td></tr>
            <tr><td style="padding: 4px 0; font-weight: bold; vertical-align: top;">Requirements:</td><td style="padding: 4px 0;">${lead.requirements || 'N/A'}</td></tr>
            <tr><td style="padding: 4px 0; font-weight: bold; vertical-align: top;">Notes:</td><td style="padding: 4px 0;">${lead.notes || 'N/A'}</td></tr>
          </table>
        </div>
      `).join('');

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #ef4444; margin-top: 0;">Bulk Leads Deleted</h2>
          <p style="font-size: 15px; color: #4b5563;"><strong>${deletedLeads.length}</strong> Leads have been deleted from the CRM by <strong>${deleterName}</strong>.</p>
          <div style="margin-top: 20px;">
            ${leadsTableRows}
          </div>
        </div>
      `;
      notifyAllStaff(`Bulk Leads Deleted (${deletedLeads.length})`, html, req.user ? req.user.id : null);
    }
    if (req.io) req.io.emit('leads_updated');
    res.json({ message: 'Leads deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/convert', auth, async (req, res) => {
  try {
    const [leads] = await db.query('SELECT * FROM leads WHERE id = ?', [req.params.id]);
    if (!leads || leads.length === 0) return res.status(404).json({ error: 'Lead not found' });
    const lead = leads[0];
    
    // Create profile
    const dummyEmail = lead.client_name.replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random()*1000) + '@client.com';
    const bcrypt = require('bcryptjs');
    const hashed = await bcrypt.hash('12345', 10);
    
    await db.query(
      `INSERT INTO profiles (username, email, password, role, mobile, address, requirements, notes, location) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [lead.client_name, dummyEmail, hashed, 'Client', lead.mobile_no || null, '', lead.requirements || null, lead.notes || null, lead.location || null]
    );

    await db.query('DELETE FROM leads WHERE id = ?', [req.params.id]);
    
    // Fetch converter name
    let converterName = 'System/Admin';
    if (req.user && req.user.id) {
        try {
            const [userRows] = await db.query('SELECT username FROM profiles WHERE id = ?', [req.user.id]);
            if (userRows && userRows.length > 0) converterName = userRows[0].username;
        } catch(e) {}
    }
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #4f46e5;">Lead Converted to Client</h2>
        <p>A Lead has been successfully converted to a Client.</p>
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <table style="width: 100%; text-align: left; border-collapse: collapse;">
            <tr><td style="padding: 4px 0;"><strong>Converted By:</strong></td><td>${converterName}</td></tr>
            <tr><td style="padding: 4px 0;"><strong>Client Name:</strong></td><td>${lead.client_name}</td></tr>
            <tr><td style="padding: 4px 0;"><strong>Mobile:</strong></td><td>${lead.mobile_no || 'N/A'}</td></tr>
            <tr><td style="padding: 4px 0;"><strong>Location:</strong></td><td>${lead.location || 'N/A'}</td></tr>
            <tr><td style="padding: 4px 0;"><strong>Requirements:</strong></td><td>${lead.requirements || 'N/A'}</td></tr>
            <tr><td style="padding: 4px 0;"><strong>Notes:</strong></td><td>${lead.notes || 'N/A'}</td></tr>
          </table>
        </div>
      </div>
    `;
    notifyAllStaff(`Lead Converted to Client: ${lead.client_name}`, html, req.user ? req.user.id : null);

    if (req.io) req.io.emit('leads_updated');
    res.json({ message: 'Lead converted to Client successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
