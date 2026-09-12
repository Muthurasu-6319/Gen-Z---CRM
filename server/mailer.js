// server/mailer.js — Email System (Disabled / Cleared for fresh setup)
const nodemailer = require('nodemailer');

function getTransporter() {
  return null;
}

function getFromAddress() {
  return 'no-reply@genzneuralx.com';
}

// Safe NO-OP implementation: all email sending is completely disabled
async function createTransporter() {
  return {
    sendMail: async () => {
      console.log('[mailer] Email sending is completely disabled.');
      return { messageId: 'disabled' };
    }
  };
}

async function sendAssignmentEmail() {
  console.log('[mailer] Email sending is completely disabled.');
}

async function notifyAssignedUsers() {
  console.log('[mailer] Email sending is completely disabled.');
}

async function notifyAllStaff() {
  console.log('[mailer] Email sending is completely disabled.');
}

module.exports = {
  createTransporter,
  sendAssignmentEmail,
  notifyAssignedUsers,
  notifyAllStaff
};
