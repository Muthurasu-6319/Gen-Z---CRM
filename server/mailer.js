const nodemailer = require('nodemailer');
const db = require('./db');
const dns = require('dns');

// Force IPv4 resolution first to prevent ENETUNREACH IPv6 errors on some servers
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

// Pre-resolve smtp.gmail.com to an IPv4 address so Nodemailer never
// does its own DNS lookup (which returns IPv6 on Render/Node 24+).
async function resolveSmtpHost(hostname) {
  return new Promise((resolve) => {
    dns.resolve4(hostname, (err, addresses) => {
      if (err || !addresses || !addresses.length) {
        console.warn('[mailer] dns.resolve4 failed, falling back to hostname:', err?.message);
        resolve(hostname); // fallback
      } else {
        resolve(addresses[0]); // e.g. "142.251.163.108"
      }
    });
  });
}

async function createTransporter() {
  const smtpHost = 'smtp.gmail.com';
  const resolvedIp = await resolveSmtpHost(smtpHost);
  console.log(`[mailer] Resolved ${smtpHost} -> ${resolvedIp}`);

  return nodemailer.createTransport({
    host: resolvedIp,
    port: 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
      servername: smtpHost // Required for SNI/TLS cert validation
    },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 15000
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
