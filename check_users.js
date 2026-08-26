require('dotenv').config();
const { getCollection } = require('./server/mongodb-admin');

async function checkUsers() {
    const users = await getCollection('profiles');
    console.log(users.map(u => ({ username: u.username, emp_id: u.emp_id, raw_password: u.raw_password, password: u.password })));
    process.exit(0);
}

checkUsers().catch(console.error);
