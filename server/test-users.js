const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { getCollection } = require('./firebase-admin');

async function test() {
  try {
    const users = await getCollection('profiles');
    console.log("All users in Firebase:", users);
  } catch (err) {
    console.error(err);
  }
}

test();
