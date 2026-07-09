// server/mailer.js
const nodemailer = require('nodemailer');
const db = require('./db');

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 10000, // 10 seconds timeout
    greetingTimeout: 5000,
    socketTimeout: 10000
  });
}

/**
 * Sends an assignment email to a specific user.
 * @param {string} userEmail 
 * @param {string} username 
 * @param {string} itemType (e.g., 'Project', 'Task', 'Meeting', 'Lead')
 * @param {string} itemTitle 
 * @param {string} description 
 */
async function sendAssignmentEmail(userEmail, username, itemType, itemTitle, description = '') {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('SMTP credentials not configured, skipping assignment email.');
      return;
  }
  const transporter = createTransporter();
  
  try {
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

    await transporter.sendMail({
      from: `"GenZ - CRM" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: userEmail,
      subject: `New Assignment: ${itemTitle}`,
      html
    });
    console.log(`Assignment email sent to ${userEmail} for ${itemType}`);
  } catch (e) {
    console.error(`Failed to send assignment email to ${userEmail}:`, e);
  }
}

/**
 * Notifies multiple users by their IDs.
 */
async function notifyAssignedUsers(userIds, itemType, itemTitle, description = '') {
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) return;
    try {
        // Query users
        const placeholders = userIds.map(() => '?').join(',');
        const [users] = await db.query(`SELECT id, username, email FROM profiles WHERE id IN (${placeholders})`, userIds);
        
        for (const user of users) {
            if (user.email) {
                await sendAssignmentEmail(user.email, user.username, itemType, itemTitle, description);
            }
        }
    } catch (err) {
        console.error('Error notifying assigned users:', err);
    }
}

module.exports = {
  createTransporter,
  sendAssignmentEmail,
  notifyAssignedUsers
};
