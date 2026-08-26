// server/mailer.js — Nodemailer Email Client
const nodemailer = require('nodemailer');
const db = require('./db');

let transporter = null;

function getTransporter() {
  if (!transporter) {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;
    
    if (!user || !pass) {
      console.warn('[mailer] GMAIL_USER or GMAIL_APP_PASSWORD not set. Emails will be skipped.');
      return null;
    }
    
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: user,
        pass: pass.replace(/"/g, '') // Remove quotes if any
      }
    });
  }
  return transporter;
}

function getFromAddress() {
  return `GenZ CRM <${process.env.GMAIL_USER || 'no-reply@genzneuralx.com'}>`;
}

// Compatibility shim: returns an object with sendMail matching old signature
async function createTransporter() {
  const mailer = getTransporter();
  return {
    sendMail: async ({ from, to, subject, html }) => {
      if (!mailer) {
        console.warn('[mailer] Skipping email — Gmail not configured.');
        return;
      }
      const payload = {
        from: from || getFromAddress(),
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        html
      };
      
      const info = await mailer.sendMail(payload);
      console.log(`[mailer] Email sent via Gmail. ID: ${info.messageId}`);
      return info;
    }
  };
}

/**
 * Sends an assignment email to a specific user.
 */
async function sendAssignmentEmail(userEmail, username, itemType, itemTitle, description = '') {
  const mailer = getTransporter();
  if (!mailer) {
    console.warn('[mailer] Skipping assignment email — Gmail not configured.');
    return;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
      <h2 style="color: #4f46e5;">New ${itemType} Assigned</h2>
      <p>Hello <strong>${username || 'User'}</strong>,</p>
      <p>You have been assigned to a new <strong>${itemType}</strong> in the CRM.</p>
      
      <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #4f46e5;">
        <h3 style="margin-top: 0; color: #333;">${itemTitle}</h3>
        ${description ? `<p style="color: #555; white-space: pre-wrap;">${description}</p>` : ''}
      </div>
      
      <p>You can view all your assignments by logging into the platform:</p>
      <p><a href="https://crm.genzneuralx.com/" style="display: inline-block; padding: 10px 20px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 4px;">Login to CRM</a></p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
        <p style="margin: 0; font-size: 12px; color: #888;">This is an automated notification from GENZ CRM.</p>
      </div>
    </div>
  `;

  try {
    const info = await mailer.sendMail({
      from: getFromAddress(),
      to: userEmail,
      subject: `New Assignment: ${itemTitle}`,
      html
    });
    console.log(`[mailer] Assignment email sent to ${userEmail}. ID: ${info.messageId}`);
  } catch (e) {
    console.error(`[mailer] Failed to send assignment email to ${userEmail}:`, e.message);
  }
}

/**
 * Notifies multiple users by their IDs.
 */
async function notifyAssignedUsers(userIds, itemType, itemTitle, description = '', excludeUserId = null) {
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) return;
  try {
    const placeholders = userIds.map(() => '?').join(',');
    const [users] = await db.query(`SELECT id, username, email FROM profiles WHERE id IN (${placeholders})`, userIds);
    for (const user of users) {
      if (user.email && String(user.id) !== String(excludeUserId)) {
        await sendAssignmentEmail(user.email, user.username, itemType, itemTitle, description);
      }
    }
  } catch (err) {
    console.error('[mailer] Error notifying assigned users:', err);
  }
}

/**
 * Notifies all staff members (excluding 'Client' role and the user who triggered the action)
 */
async function notifyAllStaff(subject, html, excludeUserId = null) {
  try {
    const transporter = await createTransporter();
    if (!transporter) return;

    let staffEmails = [];
    try {
      const { getCollection } = require('./mongodb-admin');
      const profiles = await getCollection('profiles');
      staffEmails = profiles
        .filter(p => p.role && p.role !== 'Client' && p.email && String(p.id || p._id) !== String(excludeUserId))
        .map(p => p.email);
    } catch (e) {
      console.error('[mailer] Error getting profiles for assigned users fallback:', e);
    }

    if (staffEmails.length === 0) return;

    await transporter.sendMail({
      from: getFromAddress(),
      to: staffEmails,
      subject,
      html
    });
    console.log(`[mailer] Notified ${staffEmails.length} staff members.`);
  } catch (err) {
    console.error('[mailer] Error notifying all staff:', err);
  }
}

module.exports = {
  createTransporter,
  sendAssignmentEmail,
  notifyAssignedUsers,
  notifyAllStaff
};
