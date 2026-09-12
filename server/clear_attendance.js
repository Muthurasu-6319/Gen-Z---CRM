const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    try {
        const db = mongoose.connection.db;
        const result = await db.collection('attendance').deleteMany({});
        console.log("Deleted attendance documents:", result.deletedCount);
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
  });
