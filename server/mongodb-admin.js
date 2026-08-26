// server/mongodb-admin.js — MongoDB Mongoose Adapter
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']); // Bypass buggy local DNS server for SRV record lookup

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is not set in .env!");
} else {
  mongoose.connect(MONGODB_URI)
    .then(() => console.log("🔌 Connected successfully to MongoDB Atlas."))
    .catch(err => console.error("❌ MongoDB Atlas connection failed:", err.message));
}

// Flexible Dynamic Mongoose Schema (allowing custom string IDs)
const DynamicSchema = new mongoose.Schema({
  _id: { type: String }
}, { strict: false, versionKey: false });

function getModel(collectionName) {
  const modelName = collectionName.charAt(0).toUpperCase() + collectionName.slice(1).toLowerCase();
  if (mongoose.models[modelName]) {
    return mongoose.models[modelName];
  }
  return mongoose.model(modelName, DynamicSchema, collectionName);
}

// Convert Mongoose doc to standard object and map _id to id
function toStandardDoc(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  const standard = { ...obj, id: obj._id || obj.id };
  delete standard._id;
  return standard;
}

async function getCollection(collectionName) {
  try {
    const Model = getModel(collectionName);
    const docs = await Model.find({});
    return docs.map(toStandardDoc);
  } catch (err) {
    console.error(`Error listing collection ${collectionName}:`, err.message);
    return [];
  }
}

async function getDoc(collectionName, id) {
  try {
    const Model = getModel(collectionName);
    const doc = await Model.findById(String(id));
    return toStandardDoc(doc);
  } catch (err) {
    console.error(`Error getting doc ${id} from ${collectionName}:`, err.message);
    return null;
  }
}

async function setDoc(collectionName, id, data) {
  try {
    const Model = getModel(collectionName);
    const finalId = String(id);
    const parsedDoc = {
      _id: finalId,
      ...data,
      created_at: data.created_at || new Date().toISOString()
    };
    delete parsedDoc.id;

    const doc = await Model.findByIdAndUpdate(finalId, parsedDoc, { upsert: true, new: true });
    const standard = toStandardDoc(doc);

    // Trigger system change notification
    try {
      const { notifySystemChange } = require('./services/notificationService');
      notifySystemChange('CREATE', collectionName, standard).catch(console.error);
    } catch(e) { console.error('Notification Service Error:', e); }

    return standard;
  } catch (err) {
    console.error(`Error setting doc ${id} in ${collectionName}:`, err.message);
    throw err;
  }
}

async function addDoc(collectionName, data) {
  try {
    const Model = getModel(collectionName);
    const finalId = data.id || Math.random().toString(36).substring(2, 15);
    const parsedDoc = {
      _id: String(finalId),
      ...data,
      created_at: data.created_at || new Date().toISOString()
    };
    delete parsedDoc.id;

    const doc = await Model.create(parsedDoc);
    const standard = toStandardDoc(doc);

    // Trigger system change notification
    try {
      const { notifySystemChange } = require('./services/notificationService');
      notifySystemChange('CREATE', collectionName, standard).catch(console.error);
    } catch(e) { console.error('Notification Service Error:', e); }

    return standard;
  } catch (err) {
    console.error(`Error adding doc to ${collectionName}:`, err.message);
    throw err;
  }
}

async function updateDoc(collectionName, id, data) {
  try {
    const Model = getModel(collectionName);
    const finalId = String(id);
    
    const updateObj = { ...data };
    delete updateObj.id;
    delete updateObj._id;

    const doc = await Model.findByIdAndUpdate(finalId, { $set: updateObj }, { new: true });
    const standard = toStandardDoc(doc);

    // Trigger system change notification
    try {
      const { notifySystemChange } = require('./services/notificationService');
      notifySystemChange('UPDATE', collectionName, standard).catch(console.error);
    } catch(e) { console.error('Notification Service Error:', e); }

    return standard;
  } catch (err) {
    console.error(`Error updating doc ${id} in ${collectionName}:`, err.message);
    throw err;
  }
}

async function deleteDoc(collectionName, id) {
  try {
    const Model = getModel(collectionName);
    const finalId = String(id);
    await Model.findByIdAndDelete(finalId);

    // Trigger system change notification
    try {
      const { notifySystemChange } = require('./services/notificationService');
      notifySystemChange('DELETE', collectionName, { id: finalId }).catch(console.error);
    } catch(e) { console.error('Notification Service Error:', e); }

    return true;
  } catch (err) {
    console.error(`Error deleting doc ${id} from ${collectionName}:`, err.message);
    throw err;
  }
}

async function findOne(collectionName, field, value) {
  try {
    const Model = getModel(collectionName);
    const query = {};
    query[field === 'id' ? '_id' : field] = value;
    const doc = await Model.findOne(query);
    return toStandardDoc(doc);
  } catch (err) {
    console.error(`Error in findOne on ${collectionName}:`, err.message);
    return null;
  }
}

const FieldValue = {
  serverTimestamp: () => new Date().toISOString()
};

const createQueryBuilder = (collectionName, initialQuery = {}) => {
  const query = { ...initialQuery };
  return {
    where: (field, op, val) => {
      const key = field === 'id' ? '_id' : field;
      if (op === '==' || op === undefined) {
        query[key] = val;
      } else {
        query[key] = val;
      }
      return createQueryBuilder(collectionName, query);
    },
    limit: (n) => ({
      get: async () => {
        try {
          const Model = getModel(collectionName);
          const docs = await Model.find(query).limit(n);
          const standardDocs = docs.map(toStandardDoc);
          return {
            docs: standardDocs.map(d => ({
              id: d.id,
              ref: {
                update: (data) => updateDoc(collectionName, d.id, data),
                delete: () => deleteDoc(collectionName, d.id)
              },
              data: () => d
            })),
            empty: standardDocs.length === 0
          };
        } catch (err) {
          console.error(`Error in query builder limit on ${collectionName}:`, err.message);
          return { docs: [], empty: true };
        }
      }
    }),
    get: async () => {
      try {
        const Model = getModel(collectionName);
        const docs = await Model.find(query);
        const standardDocs = docs.map(toStandardDoc);
        return {
          docs: standardDocs.map(d => ({
            id: d.id,
            ref: {
              update: (data) => updateDoc(collectionName, d.id, data),
              delete: () => deleteDoc(collectionName, d.id)
            },
            data: () => d
          })),
          empty: standardDocs.length === 0
        };
      } catch (err) {
        console.error(`Error in query builder get on ${collectionName}:`, err.message);
        return { docs: [], empty: true };
      }
    }
  };
};

function getDb() {
  return {
    collection: (name) => {
      const builder = createQueryBuilder(name);
      return {
        ...builder,
        doc: (id) => ({
          set: (data) => setDoc(name, id, data),
          get: async () => {
            const doc = await getDoc(name, id);
            return {
              exists: !!doc,
              id: doc ? doc.id : id,
              data: () => doc
            };
          },
          delete: () => deleteDoc(name, id)
        })
      };
    },
    batch: () => {
      const operations = [];
      return {
        update: (ref, data) => operations.push(() => ref.update(data)),
        delete: (ref) => operations.push(() => ref.delete()),
        commit: async () => {
          for (const op of operations) {
            await op();
          }
        }
      };
    }
  };
}

module.exports = {
  getCollection,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  findOne,
  FieldValue,
  getDb
};
