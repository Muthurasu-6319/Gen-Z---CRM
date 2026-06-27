// server/db.js — Firebase Firestore Emulator Wrapper
const fs = require('fs');
const path = require('path');
const { getDb, FieldValue } = require('./firebase-admin');

// Seed default profiles into Firestore if the profiles collection is empty
async function seedDefaultFirestore() {
  const db = getDb();
  if (!db) return;

  try {
    const snapshot = await db.collection('profiles').limit(1).get();
    if (snapshot.empty) {
      console.log('🌱 Seeding default profiles to Firebase Firestore...');
      const defaultProfiles = [
        {
          id: 'admin-uuid-0001-0001-000000000001',
          username: 'Admin',
          email: 'admin@crm.com',
          password: '$2b$10$IcH820CAncuUhXimAuWfEuVeroiwxEYrcKHub3TuXReO45Sfx.Fye', // admin123 or 12345
          role: 'Admin',
          designation: 'System Administrator',
          created_at: FieldValue.serverTimestamp()
        },
        {
          id: 'admin-gmail-fallback',
          username: 'Admin Gmail',
          email: 'admin@gmail.com',
          password: '$2b$10$IcH820CAncuUhXimAuWfEuVeroiwxEYrcKHub3TuXReO45Sfx.Fye', // admin123 or 12345
          role: 'Admin',
          designation: 'System Administrator',
          created_at: FieldValue.serverTimestamp()
        },
        {
          id: 'staff-uuid-0001-0001-000000000001',
          username: 'Siva',
          email: 'siva@crm.com',
          password: '$2b$10$IcH820CAncuUhXimAuWfEuVeroiwxEYrcKHub3TuXReO45Sfx.Fye',
          role: 'Staff',
          designation: 'Developer',
          created_at: FieldValue.serverTimestamp()
        },
        {
          id: 'staff-uuid-0001-0001-000000000002',
          username: 'Kumar',
          email: 'kumar@crm.com',
          password: '$2b$10$IcH820CAncuUhXimAuWfEuVeroiwxEYrcKHub3TuXReO45Sfx.Fye',
          role: 'Staff',
          designation: 'Designer',
          created_at: FieldValue.serverTimestamp()
        }
      ];

      for (const profile of defaultProfiles) {
        await db.collection('profiles').doc(profile.id).set(profile);
      }
      console.log('✅ Default profiles successfully seeded.');
    }
  } catch (err) {
    console.error('⚠️ Firestore seeding failed:', err.message);
  }
}

// Helper to parse values clause
function parseValuesClause(valsStr) {
  const values = [];
  let current = '';
  let inString = false;
  let quoteChar = null;
  
  for (let i = 0; i < valsStr.length; i++) {
    const char = valsStr[i];
    if ((char === "'" || char === '"') && valsStr[i - 1] !== '\\') {
      if (!inString) {
        inString = true;
        quoteChar = char;
      } else if (char === quoteChar) {
        inString = false;
      }
    }
    
    if (char === ',' && !inString) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current) {
    values.push(current.trim());
  }
  return values;
}

// Convert Simple SQL Query to Firebase Firestore Operation
async function executeFirestoreQuery(sql, params = []) {
  const db = getDb();
  if (!db) {
    console.warn('⚠️ Firestore connection unavailable.');
    return [[], null];
  }

  const sqlClean = sql.replace(/\s+/g, ' ').trim();

  // 1. INSERT INTO
  const insertMatch = sqlClean.match(/INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
  if (insertMatch) {
    const table = insertMatch[1].toLowerCase();
    const cols = insertMatch[2].split(',').map(s => s.trim());
    const parsedVals = parseValuesClause(insertMatch[3]);
    
    const newRow = {};
    let paramIndex = 0;
    
    cols.forEach((col, index) => {
      const rawVal = parsedVals[index];
      let val = undefined;
      
      if (rawVal === '?') {
        val = params[paramIndex++];
      } else if (rawVal !== undefined) {
        const trimmed = rawVal.trim();
        if ((trimmed.startsWith("'") && trimmed.endsWith("'")) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
          val = trimmed.substring(1, trimmed.length - 1);
        } else if (trimmed === 'NULL' || trimmed === 'null') {
          val = null;
        } else if (trimmed.toUpperCase() === 'NOW()') {
          val = new Date().toISOString();
        } else if (!isNaN(trimmed)) {
          val = Number(trimmed);
        } else {
          val = trimmed;
        }
      }
      
      if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) {
        try {
          val = JSON.parse(val);
        } catch(e) {}
      }
      newRow[col] = val;
    });

    // Determine ID
    let finalId = newRow.id;
    if (!finalId) {
      finalId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
    newRow.id = finalId;

    if (!newRow.created_at) {
      newRow.created_at = FieldValue.serverTimestamp();
    }

    await db.collection(table).doc(String(finalId)).set(newRow);
    return [{ insertId: finalId, affectedRows: 1 }, null];
  }

  // 2. UPDATE
  const updateMatch = sqlClean.match(/UPDATE\s+(\w+)\s+SET\s+(.+?)\s+WHERE\s+(.+)/i);
  if (updateMatch) {
    const table = updateMatch[1].toLowerCase();
    const setClause = updateMatch[2];
    const whereClause = updateMatch[3];
    
    const setPairs = parseValuesClause(setClause);
    const whereFieldMatch = whereClause.match(/(?:[a-zA-Z0-9_]+\.)?([a-zA-Z0-9_]+)\s*=\s*\?/);
    if (whereFieldMatch) {
      const whereField = whereFieldMatch[1];
      const whereVal = params[params.length - 1]; // Where parameter is typically the last parameter

      const snapshot = await db.collection(table).where(whereField, '==', whereVal).get();
      let affectedRows = 0;

      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        affectedRows++;
        const updateData = {};
        let paramIndex = 0;
        
        setPairs.forEach((pair) => {
          const parts = pair.split('=');
          if (parts.length >= 2) {
            const col = parts[0].trim();
            const rawVal = parts.slice(1).join('=').trim();
            
            let val = undefined;
            if (rawVal === '?') {
              val = params[paramIndex++];
            } else {
              const trimmed = rawVal.trim();
              if ((trimmed.startsWith("'") && trimmed.endsWith("'")) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
                val = trimmed.substring(1, trimmed.length - 1);
              } else if (trimmed === 'NULL' || trimmed === 'null') {
                val = null;
              } else if (trimmed.toUpperCase() === 'NOW()') {
                val = new Date().toISOString();
              } else if (!isNaN(trimmed)) {
                val = Number(trimmed);
              } else {
                val = trimmed;
              }
            }
            
            if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) {
              try {
                val = JSON.parse(val);
              } catch(e) {}
            }
            updateData[col] = val;
          }
        });
        batch.update(doc.ref, updateData);
      });
      
      await batch.commit();
      return [{ affectedRows }, null];
    }
  }

  // 3. DELETE
  const deleteMatch = sqlClean.match(/DELETE\s+FROM\s+(\w+)\s+WHERE\s+(.+)/i);
  if (deleteMatch) {
    const table = deleteMatch[1].toLowerCase();
    const whereClause = deleteMatch[2];
    
    const whereFieldMatch = whereClause.match(/(?:[a-zA-Z0-9_]+\.)?([a-zA-Z0-9_]+)\s*=\s*\?/);
    if (whereFieldMatch) {
      const whereField = whereFieldMatch[1];
      const whereVal = params[0];
      
      const snapshot = await db.collection(table).where(whereField, '==', whereVal).get();
      let affectedRows = 0;
      
      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        affectedRows++;
        batch.delete(doc.ref);
      });
      await batch.commit();
      return [{ affectedRows }, null];
    }
  }

  // 4. SELECT
  if (sqlClean.toUpperCase().startsWith('SELECT')) {
    const fromIndex = sqlClean.toUpperCase().indexOf(' FROM ');
    if (fromIndex !== -1) {
      const afterFrom = sqlClean.substring(fromIndex + 6).trim();
      const tableNameMatch = afterFrom.match(/^(\w+)/);
      if (tableNameMatch) {
        const table = tableNameMatch[1].toLowerCase();
        const originalTable = (table === 'users' ? 'profiles' : table);
        
        let queryRef = db.collection(originalTable);
        let rows = [];
        let fetchedDirectly = false;
        
        const whereIndex = sqlClean.toUpperCase().indexOf(' WHERE ');
        if (whereIndex !== -1) {
          let afterWhere = sqlClean.substring(whereIndex + 7).trim();
          const orderByIndex = afterWhere.toUpperCase().indexOf(' ORDER BY ');
          if (orderByIndex !== -1) {
            afterWhere = afterWhere.substring(0, orderByIndex).trim();
          }
          
          // Match all column = ? patterns
          const matches = [...afterWhere.matchAll(/(?:[a-zA-Z0-9_]+\.)?([a-zA-Z0-9_]+)\s*=\s*\?/g)];
          if (matches.length === 1 && matches[0][1] === 'id') {
            const val = params[0];
            const doc = await db.collection(originalTable).doc(String(val)).get();
            if (doc.exists) {
              const docData = doc.data();
              for (const key in docData) {
                if (docData[key] && docData[key].toDate && typeof docData[key].toDate === 'function') {
                  docData[key] = docData[key].toDate().toISOString();
                }
              }
              rows = [{ id: doc.id, ...docData }];
            }
            fetchedDirectly = true;
          } else {
            matches.forEach((match, idx) => {
              const fieldName = match[1];
              const val = params[idx];
              if (val !== undefined) {
                queryRef = queryRef.where(fieldName, '==', val);
              }
            });
          }
        }
        
        if (!fetchedDirectly) {
          const snapshot = await queryRef.get();
          rows = snapshot.docs.map(doc => {
            const docData = doc.data();
            for (const key in docData) {
              if (docData[key] && docData[key].toDate && typeof docData[key].toDate === 'function') {
                docData[key] = docData[key].toDate().toISOString();
              }
            }
            return { id: doc.id, ...docData };
          });
        }
        
        // Sorting in JS memory to handle missing Firestore indexes
        const orderByIndex = sqlClean.toUpperCase().indexOf(' ORDER BY ');
        if (orderByIndex !== -1) {
          const afterOrderBy = sqlClean.substring(orderByIndex + 10).trim();
          const orderParts = afterOrderBy.split(' ')[0].split(',');
          const fieldRaw = orderParts[0].trim();
          const fieldParts = fieldRaw.split('.');
          const orderField = fieldParts[fieldParts.length - 1];
          const direction = afterOrderBy.toUpperCase().includes('DESC') ? 'DESC' : 'ASC';
          
          rows.sort((a, b) => {
            const valA = a[orderField];
            const valB = b[orderField];
            if (valA === undefined || valB === undefined) return 0;
            if (direction === 'DESC') {
              return valA < valB ? 1 : valA > valB ? -1 : 0;
            } else {
              return valA > valB ? 1 : valA < valB ? -1 : 0;
            }
          });
        }
        
        return [rows, null];
      }
    }
  }

  return [[], null];
}

// Auto seed on startup
setTimeout(seedDefaultFirestore, 3000);

const pool = {
  query: async (sql, params) => {
    try {
      return await executeFirestoreQuery(sql, params);
    } catch (err) {
      console.error('Firestore Query Emulator Error:', err.message);
      return [[], null];
    }
  }
};

module.exports = pool;
