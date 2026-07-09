const { getDoc, findOne, addDoc } = require('../firebase-admin');
const { createTransporter } = require('../mailer');
require('dotenv').config();

const transporter = createTransporter();

// Helper to send email safely
async function sendNotification(toEmail, subject, html) {
  if (!toEmail || toEmail === 'admin-env') return;
  try {
    await transporter.sendMail({
      from: `"Gen Z CRM" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject,
      html
    });
  } catch (err) {
    console.error(`[NotificationService] Failed to send email to ${toEmail}:`, err.message);
  }
}

// Get all admin profiles
async function getAdminProfiles() {
  try {
    const { getCollection } = require('../firebase-admin');
    const profiles = await getCollection('profiles');
    return profiles.filter(p => p.role === 'Admin');
  } catch (err) {
    return [];
  }
}

// Get user email
async function getUserEmail(userId) {
  if (!userId) return null;
  try {
    const user = await getDoc('profiles', userId);
    return user ? user.email : null;
  } catch (err) {
    return null;
  }
}

// Helper to format data into HTML table for emails
function formatDataHtml(data) {
  if (!data) return '<p>No data provided.</p>';
  let rows = '';
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'object') continue; // skip nested arrays/objects for simplicity
    rows += `<tr><td style="padding: 8px; border: 1px solid #ddd;"><b>${key}</b></td><td style="padding: 8px; border: 1px solid #ddd;">${value}</td></tr>`;
  }
  return `<table style="border-collapse: collapse; width: 100%; max-width: 600px;">${rows}</table>`;
}

/**
 * Main global interceptor for sending email notifications on DB changes.
 * @param {string} action - 'CREATE', 'UPDATE', 'DELETE'
 * @param {string} collectionName - name of the collection
 * @param {object} data - the full document data (after change)
 * @param {object} prevData - the full document data (before change, mainly for UPDATE/DELETE)
 */
async function notifySystemChange(action, collectionName, data, prevData = null) {
  // 1. Exclude high-volume or noisy collections from Global Admin Alerts
  if (['messages', 'roles', 'settings', 'notifications'].includes(collectionName)) {
      return; 
  }

  try {
    const adminProfiles = await getAdminProfiles();
    
    // Determine Assignee ID
    let assignedToId = null;
    if (data && data.assigned_to) assignedToId = data.assigned_to;
    else if (data && data.staff_id) assignedToId = data.staff_id;

    // --- ASSIGNEE NOTIFICATION ---
    if (assignedToId) {
       let shouldNotifyAssignee = false;
       if (action === 'CREATE') {
           shouldNotifyAssignee = true;
       } else if (action === 'UPDATE' && prevData && prevData.assigned_to !== data.assigned_to) {
           // Assigned to someone else now
           shouldNotifyAssignee = true;
       }

       if (shouldNotifyAssignee) {
           const user = await getDoc('profiles', assignedToId);
           if (user && user.email) {
               const subject = `You have been assigned a new ${collectionName} item`;
               const html = `
                   <h2 style="color: #4F46E5;">New Assignment: ${collectionName.toUpperCase()}</h2>
                   <p>You have been assigned to a new record in the CRM.</p>
                   ${formatDataHtml(data)}
                   <br/>
                   <p>Please log in to the CRM to view your new task/project.</p>
               `;
               await sendNotification(user.email, subject, html);
               
               // Create in-app notification
               await addDoc('notifications', {
                   recipient_profile_id: assignedToId,
                   message: `You have been assigned to a new record in ${collectionName}.`,
                   related_item_type: collectionName,
                   related_item_id: data.id || null,
                   is_read: 0
               });
           }
       }
    }

    // --- ADMIN NOTIFICATION ---
    if (adminProfiles.length > 0 || process.env.ADMIN_EMAIL) {
       // Human friendly action text
       let actionWord = action === 'CREATE' ? 'Created' : action === 'UPDATE' ? 'Updated' : 'Deleted';
       
       let subject = `CRM Alert: ${collectionName.toUpperCase()} ${actionWord}`;
       let headline = `A record in <b>${collectionName}</b> was ${actionWord.toLowerCase()}.`;
       
       // Module Specific Customizations
       if (collectionName === 'attendance') {
           const profileId = (data || prevData).profile_id;
           const user = await getDoc('profiles', profileId);
           const name = user ? user.username : 'A Staff Member';
           
           if (action === 'CREATE') {
               subject = `Attendance: ${name} Checked In`;
               headline = `<b>${name}</b> has checked in for the day.`;
           } else if (action === 'UPDATE') {
               const status = data.status || 'Updated';
               subject = `Attendance: ${name} - ${status}`;
               headline = `<b>${name}</b> updated their attendance status to: <b>${status}</b>.`;
               
               // Extract reason if on break
               if (status === 'On Break' && data.attendance_breaks && data.attendance_breaks.length > 0) {
                   const latestBreak = data.attendance_breaks[data.attendance_breaks.length - 1];
                   if (latestBreak.reason) {
                       headline += ` Reason: <b>${latestBreak.reason}</b>`;
                   }
               }
           }
       } else if (collectionName === 'leave') {
           const profileId = (data || prevData).profile_id;
           const user = await getDoc('profiles', profileId);
           const name = user ? user.username : 'A Staff Member';
           subject = `Leave Request: ${name} (${actionWord})`;
       }
       
       const targetData = action === 'DELETE' ? prevData : data;
       
       // --- OWNER NOTIFICATION (For Leaves & Tickets) ---
       if (collectionName === 'leave' && action === 'UPDATE') {
           const profileId = (data || prevData).profile_id;
           const user = await getDoc('profiles', profileId);
           if (user && user.email) {
               const ownerSubject = `Update on your Leave Request`;
               const status = data.status || 'Updated';
               const ownerHtml = `
                   <h2 style="color: #4F46E5;">Leave Request ${status}</h2>
                   <p>Your leave request has been updated by an Admin.</p>
                   ${formatDataHtml(targetData)}
               `;
               await sendNotification(user.email, ownerSubject, ownerHtml);
               
               await addDoc('notifications', {
                   recipient_profile_id: profileId,
                   message: `Your leave request status was updated to: ${status}.`,
                   related_item_type: 'leave',
                   related_item_id: targetData.id || null,
                   is_read: 0
               });
           }
       } else if (collectionName === 'tickets' && action === 'UPDATE') {
           const clientId = (data || prevData).client_id;
           if (clientId && prevData && data.status !== prevData.status) {
               const user = await getDoc('profiles', clientId);
               if (user && user.email) {
                   const ownerSubject = `Update on your Support Ticket`;
                   const status = data.status || 'Updated';
                   const ownerHtml = `
                       <h2 style="color: #4F46E5;">Ticket Status: ${status}</h2>
                       <p>Your support ticket has been updated by our team.</p>
                       ${formatDataHtml(targetData)}
                   `;
                   await sendNotification(user.email, ownerSubject, ownerHtml);
                   
                   await addDoc('notifications', {
                       recipient_profile_id: clientId,
                       message: `Your ticket status was updated to: ${status}.`,
                       related_item_type: 'ticket',
                       related_item_id: targetData.id || null,
                       is_read: 0
                   });
               }
           }
       }

       
       const html = `
           <h2 style="color: #EF4444;">System Activity Alert</h2>
           <p style="font-size: 16px;">${headline}</p>
           <h3>Record Details:</h3>
           ${formatDataHtml(targetData)}
           <br/>
           <p style="color: #6B7280; font-size: 12px;">You are receiving this because you are the CRM Administrator.</p>
       `;
       
       // Send to DB Admins
       for (const admin of adminProfiles) {
           if (admin.email) {
               await sendNotification(admin.email, subject, html);
           }
           await addDoc('notifications', {
               recipient_profile_id: admin.id,
               message: headline.replace(/<[^>]*>?/gm, ''), // Strip HTML tags for clean text
               related_item_type: collectionName,
               related_item_id: targetData.id || null,
               is_read: 0
           });
       }
       
       // Fallback to ENV admin email if no DB admins found
       if (adminProfiles.length === 0 && process.env.ADMIN_EMAIL) {
           await sendNotification(process.env.ADMIN_EMAIL, subject, html);
       }
    }
  } catch (err) {
      console.error('[NotificationService] Error processing notification:', err);
  }
}

module.exports = { notifySystemChange };
