// server/seedAdmin.js
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./db');

(async () => {
  try {
    const email = 'admin@gmail.com';
    const [rows] = await pool.query('SELECT id FROM profiles WHERE email = ?', [email]);
    if (rows.length > 0) {
      console.log('Admin user already exists.');
      process.exit(0);
    }
    const password = '12345';
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO profiles (id, username, email, password, role, designation) VALUES (?, ?, ?, ?, ?, ? )`,
      ['admin-uuid-0001-0001-000000000001', 'Admin', email, hash, 'Admin', 'System Administrator']
    );
    console.log('Admin user created.');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding admin:', err);
    process.exit(1);
  }
})();
