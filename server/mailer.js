// server/mailer.js — Resend API Email Client
const { Resend } = require('resend');
const db = require('./db');

let resendClient = null;

function getResendClient() {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn('[mailer] RESEND_API_KEY not set. Emails will be skipped.');
      return null;
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

// Compatibility shim: createTransporter() returns a Resend-backed sendMail object
async function createTransporter() {
  const resend = getResendClient();
  return {
    sendMail: async ({ from, to, subject, html }) => {
      if (!resend) {
        console.warn('[mailer] Skipping email — RESEND_API_KEY not configured.');
        return;
      }
      const { data, error } = await resend.emails.send({
        from: from || process.env.RESEND_FROM || 'GenZ CRM <no-reply@genzneuralx.com>',
        to: Array.isArray(to) ? to : [to],
        subject,
        html
      });
      if (error) throw new Error(error.message);
      console.log(`[mailer] Email sent via Resend. ID: ${data?.id}`);
      return data;
    }
  };
}

/**
 * Sends an assignment email to a specific user.
 */
async function sendAssignmentEmail(userEmail, username, itemType, itemTitle, description = '') {
  const resend = getResendClient();
  if (!resend) {
    console.warn('[mailer] Skipping assignment email — RESEND_API_KEY not configured.');
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
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM || 'GenZ CRM <no-reply@genzneuralx.com>',
      to: [userEmail],
      subject: `New Assignment: ${itemTitle}`,
      html
    });
    if (error) throw new Error(error.message);
    console.log(`[mailer] Assignment email sent to ${userEmail}. ID: ${data?.id}`);
  } catch (e) {
    console.error(`[mailer] Failed to send assignment email to ${userEmail}:`, e.message);
  }
}

/**
 * Notifies multiple users by their IDs.
 */
async function notifyAssignedUsers(userIds, itemType, itemTitle, description = '') {
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) return;
  try {
    const placeholders = userIds.map(() => '?').join(',');
    const [users] = await db.query(`SELECT id, username, email FROM profiles WHERE id IN (${placeholders})`, userIds);
    for (const user of users) {
      if (user.email) {
        await sendAssignmentEmail(user.email, user.username, itemType, itemTitle, description);
      }
    }
  } catch (err) {
    console.error('[mailer] Error notifying assigned users:', err);
  }
}

module.exports = {
  createTransporter,
  sendAssignmentEmail,
  notifyAssignedUsers
};
