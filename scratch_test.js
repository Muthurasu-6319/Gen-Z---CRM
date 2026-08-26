require('dotenv').config({path: './server/.env'});
const { getDb } = require('./server/mongodb-admin');
const pool = require('./server/db');

async function test() {
  const db = getDb();
  if (!db) {
      console.log('No db');
      return;
  }
  
  // 1. Add lead
  const leadData = {
      client_name: 'TestLead',
      mobile_no: '1234567890',
      requirements: 'Needs a website',
      location: 'Chennai',
      notes: 'Urgent'
  };
  const docRefId = Math.random().toString(36).substring(2,15);
  await db.collection('leads').doc(docRefId).set(leadData);
  console.log('Added lead:', docRefId);
  
  // 2. Simulate convert in leads.js
  const doc = await db.collection('leads').doc(docRefId).get();
  const lead = doc.data();
  console.log('Lead before conversion:', lead);
  
  await pool.query(
    `INSERT INTO profiles (username, email, password, role, mobile, address, requirements, location, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [lead.client_name, '', '', 'Client', lead.mobile_no || null, '', lead.requirements || null, lead.location || null, lead.notes || null]
  );
  
  const snapshot = await db.collection('profiles').where('username', '==', 'TestLead').get();
  snapshot.docs.forEach(doc => {
      console.log('Created profile:', doc.data());
  });
  process.exit(0);
}

setTimeout(test, 1000);
