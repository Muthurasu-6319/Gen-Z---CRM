const cron = require('node-cron');
const { createTransporter } = require('./mailer');
const { getCollection, getDoc, addDoc } = require('./mongodb-admin');

function initCronJobs() {
  // Run everyday at 23:55 to mark absent staff as Leave
  cron.schedule('55 23 * * *', async () => {
    console.log('Running daily attendance check cron job...');
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const profiles = await getCollection('profiles');
      const attendance = await getCollection('attendance');
      
      for (const profile of profiles) {
        if (profile.role === 'Staff' || profile.role === 'Admin') {
          // Check if there is an attendance record for today
          const hasAttendance = attendance.some(a => a.profile_id === profile.id && a.date === todayStr);
          if (!hasAttendance) {
            console.log(`Marking ${profile.username} as Leave for ${todayStr}`);
            await addDoc('attendance', {
              profile_id: profile.id,
              date: todayStr,
              check_in_time: null,
              check_out_time: null,
              status: 'Leave',
              attendance_breaks: []
            });
          }
        }
      }
    } catch (e) {
      console.error('Error running daily attendance check:', e);
    }
  });

  // Run everyday at 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('Running daily reminder cron job...');
    if (!process.env.GMAIL_USER) {
      console.log('Resend not configured, skipping reminders.');
      return;
    }
    const transporter = await createTransporter();
    const now = new Date();
    // One day from now
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    try {
      // 1. Calendar Events Reminders
      const events = await getCollection('calendar_events');
      for (const event of events) {
        if (!event.start_time) continue;
        const eventDateStr = new Date(event.start_time).toISOString().split('T')[0];
        
        if (eventDateStr === tomorrowStr && event.assigned_to && event.assigned_to.length > 0) {
          for (const userId of event.assigned_to) {
            const user = await getDoc('profiles', userId);
            if (user && user.email) {
              const html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                  <h2 style="color: #f59e0b;">Upcoming Event Reminder</h2>
                  <p>Hello <strong>${user.username}</strong>,</p>
                  <p>This is a reminder for an event scheduled for tomorrow.</p>
                  <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <p><strong>Title:</strong> ${event.title}</p>
                    <p><strong>Time:</strong> ${new Date(event.start_time).toLocaleString()}</p>
                    ${event.description ? `<p><strong>Description:</strong> ${event.description}</p>` : ''}
                  </div>
                </div>
              `;
              await transporter.sendMail({
                from: process.env.GMAIL_USER || 'no-reply@genzneuralx.com',
                to: user.email,
                subject: `Reminder: ${event.title} is tomorrow`,
                html
              }).catch(e => console.error(e));
            }
          }
        }
      }

      // 2. Meetings Reminders
      const meetings = await getCollection('meetings');
      for (const meeting of meetings) {
        if (!meeting.start_time) continue;
        const meetingDateStr = new Date(meeting.start_time).toISOString().split('T')[0];
        
        if (meetingDateStr === tomorrowStr && meeting.assigned_to && meeting.assigned_to.length > 0) {
          for (const userId of meeting.assigned_to) {
            const user = await getDoc('profiles', userId);
            if (user && user.email) {
              const html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                  <h2 style="color: #3b82f6;">Upcoming Meeting Reminder</h2>
                  <p>Hello <strong>${user.username}</strong>,</p>
                  <p>This is a reminder for a meeting scheduled for tomorrow.</p>
                  <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <p><strong>Topic:</strong> ${meeting.title}</p>
                    <p><strong>Time:</strong> ${new Date(meeting.start_time).toLocaleString()}</p>
                    ${meeting.google_meet_link ? `<p><strong>Link:</strong> <a href="${meeting.google_meet_link}">${meeting.google_meet_link}</a></p>` : ''}
                  </div>
                </div>
              `;
              await transporter.sendMail({
                from: process.env.GMAIL_USER || 'no-reply@genzneuralx.com',
                to: user.email,
                subject: `Reminder: Meeting "${meeting.title}" is tomorrow`,
                html
              }).catch(e => console.error(e));
            }
          }
        }
      }
    } catch (e) {
      console.error('Error running reminder cron job:', e);
    }
  });
}

module.exports = { initCronJobs };
