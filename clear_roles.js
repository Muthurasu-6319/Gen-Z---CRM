require('dotenv').config();
const { getDb } = require('./server/mongodb-admin');

async function clearRoles() {
    console.log("Connecting to db and getting roles...");
    const db = getDb();
    const rolesColl = db.collection('roles');
    const snapshot = await rolesColl.get();
    console.log(`Found ${snapshot.docs.length} roles. Deleting...`);
    
    for (const doc of snapshot.docs) {
        await doc.ref.delete();
        console.log(`Deleted role ${doc.id}`);
    }
    console.log("All roles deleted.");
    process.exit(0);
}

clearRoles().catch(console.error);
