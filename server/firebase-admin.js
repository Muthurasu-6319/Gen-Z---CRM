// server/firebase-admin.js — Pure REST Firestore Client (No Credentials Required)
const projectId = "genzcrm";
const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

// Helper: Convert Firestore value to standard JS value
function fromFirestoreVal(valObj) {
  if (!valObj) return null;
  if ('stringValue' in valObj) return valObj.stringValue;
  if ('integerValue' in valObj) return parseInt(valObj.integerValue, 10);
  if ('doubleValue' in valObj) return parseFloat(valObj.doubleValue);
  if ('booleanValue' in valObj) return valObj.booleanValue;
  if ('nullValue' in valObj) return null;
  if ('timestampValue' in valObj) return valObj.timestampValue;
  if ('arrayValue' in valObj) {
    return (valObj.arrayValue.values || []).map(fromFirestoreVal);
  }
  if ('mapValue' in valObj) {
    const res = {};
    const fields = valObj.mapValue.fields || {};
    for (const k in fields) {
      res[k] = fromFirestoreVal(fields[k]);
    }
    return res;
  }
  return valObj;
}

// Helper: Convert Firestore document to standard JS object
function fromFirestoreDoc(doc) {
  if (!doc || !doc.fields) return null;
  const result = { id: doc.name.split('/').pop() };
  for (const key in doc.fields) {
    result[key] = fromFirestoreVal(doc.fields[key]);
  }
  return result;
}

// Helper: Convert standard JS value to Firestore format
function toFirestoreVal(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map(toFirestoreVal)
      }
    };
  }
  if (typeof val === 'object') {
    const fields = {};
    for (const k in val) {
      fields[k] = toFirestoreVal(val[k]);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

// Helper: Convert standard JS object to Firestore fields
function toFirestoreFields(obj) {
  const fields = {};
  for (const key in obj) {
    if (obj[key] === undefined) continue;
    fields[key] = toFirestoreVal(obj[key]);
  }
  return fields;
}

// ── CRUD Methods using native Node fetch ─────────────────────────────────────

async function getCollection(collectionName) {
  try {
    const res = await fetch(`${baseUrl}/${collectionName}?pageSize=300`);
    if (!res.ok) {
      if (res.status === 404) return [];
      const errText = await res.text();
      throw new Error(`Firestore REST Error: ${errText}`);
    }
    const data = await res.json();
    return (data.documents || []).map(fromFirestoreDoc);
  } catch (err) {
    console.error(`Error listing collection ${collectionName}:`, err.message);
    return [];
  }
}

async function getDoc(collectionName, id) {
  try {
    const res = await fetch(`${baseUrl}/${collectionName}/${id}`);
    if (!res.ok) {
      if (res.status === 404) return null;
      const errText = await res.text();
      throw new Error(`Firestore REST Error: ${errText}`);
    }
    const doc = await res.json();
    return fromFirestoreDoc(doc);
  } catch (err) {
    console.error(`Error getting doc ${id} from ${collectionName}:`, err.message);
    return null;
  }
}

async function setDoc(collectionName, id, data) {
  try {
    const fields = toFirestoreFields({
      ...data,
      created_at: data.created_at || new Date().toISOString()
    });
    const res = await fetch(`${baseUrl}/${collectionName}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Firestore REST Error: ${errText}`);
    }
    const doc = await res.json();
    const parsedDoc = fromFirestoreDoc(doc);
    
    // Trigger global notification interceptor (since setDoc is used for INSERTs via SQL emulator)
    try {
      const { notifySystemChange } = require('./services/notificationService');
      notifySystemChange('CREATE', collectionName, parsedDoc).catch(console.error);
    } catch(e) { console.error('Notification Service Error:', e); }
    
    return parsedDoc;
  } catch (err) {
    console.error(`Error setting doc ${id} in ${collectionName}:`, err.message);
    throw err;
  }
}

async function addDoc(collectionName, data) {
  try {
    const fields = toFirestoreFields({
      ...data,
      created_at: data.created_at || new Date().toISOString()
    });
    const res = await fetch(`${baseUrl}/${collectionName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Firestore REST Error: ${errText}`);
    }
    const doc = await res.json();
    const parsedDoc = fromFirestoreDoc(doc);
    
    // Trigger global notification interceptor
    try {
      const { notifySystemChange } = require('./services/notificationService');
      notifySystemChange('CREATE', collectionName, parsedDoc).catch(console.error);
    } catch(e) { console.error('Notification Service Error:', e); }
    
    return parsedDoc;
  } catch (err) {
    console.error(`Error adding doc to ${collectionName}:`, err.message);
    throw err;
  }
}

async function updateDoc(collectionName, id, data) {
  try {
    // Fetch previous document before updating so we can detect assignee changes
    const prevDoc = await getDoc(collectionName, id);

    // For PATCH updates, we construct the updateMask parameters so it only changes specified fields
    const fields = toFirestoreFields(data);
    const updateMaskQueryParams = Object.keys(data)
      .map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
      .join('&');

    const res = await fetch(`${baseUrl}/${collectionName}/${id}?${updateMaskQueryParams}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Firestore REST Error: ${errText}`);
    }
    const doc = await res.json();
    const parsedDoc = fromFirestoreDoc(doc);
    
    try {
      const { notifySystemChange } = require('./services/notificationService');
      notifySystemChange('UPDATE', collectionName, parsedDoc, prevDoc).catch(console.error);
    } catch(e) { console.error('Notification Service Error:', e); }
    
    return parsedDoc;
  } catch (err) {
    console.error(`Error updating doc ${id} in ${collectionName}:`, err.message);
    throw err;
  }
}

async function deleteDoc(collectionName, id) {
  try {
    // Fetch previous document before deleting so we can email details
    const prevDoc = await getDoc(collectionName, id);
    
    const res = await fetch(`${baseUrl}/${collectionName}/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Firestore REST Error: ${errText}`);
    }
    
    // Trigger global notification interceptor
    try {
      if (prevDoc) {
        const { notifySystemChange } = require('./services/notificationService');
        notifySystemChange('DELETE', collectionName, null, prevDoc).catch(console.error);
      }
    } catch(e) { console.error('Notification Service Error:', e); }
    
    return { id, deletedData: prevDoc };
  } catch (err) {
    console.error(`Error deleting doc ${id} from ${collectionName}:`, err.message);
    throw err;
  }
}

async function findOne(collectionName, field, value) {
  try {
    const docs = await getCollection(collectionName);
    return docs.find(doc => doc[field] === value) || null;
  } catch (err) {
    console.error(`Error in findOne on ${collectionName}:`, err.message);
    return null;
  }
}

// FieldValue Mock for Compatibility
const FieldValue = {
  serverTimestamp: () => new Date().toISOString()
};

module.exports = {
  getCollection,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  findOne,
  FieldValue,
  getDb: () => ({
    collection: (name) => {
      const colRef = {
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
        }),
        where: (field, op, val) => ({
          get: async () => {
            const all = await getCollection(name);
            const filtered = all.filter(d => d[field] === val);
            return {
              docs: filtered.map(d => ({
                id: d.id,
                ref: {
                  update: (data) => updateDoc(name, d.id, data),
                  delete: () => deleteDoc(name, d.id)
                },
                data: () => d
              })),
              empty: filtered.length === 0
            };
          }
        }),
        limit: (n) => ({
          get: async () => {
            const all = await getCollection(name);
            const sliced = all.slice(0, n);
            return {
              docs: sliced.map(d => ({
                id: d.id,
                ref: {
                  update: (data) => updateDoc(name, d.id, data),
                  delete: () => deleteDoc(name, d.id)
                },
                data: () => d
              })),
              empty: sliced.length === 0
            };
          }
        }),
        get: async () => {
          const all = await getCollection(name);
          return {
            docs: all.map(d => ({
              id: d.id,
              ref: {
                update: (data) => updateDoc(name, d.id, data),
                delete: () => deleteDoc(name, d.id)
              },
              data: () => d
            })),
            empty: all.length === 0
          };
        }
      };
      return colRef;
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
  })
};
