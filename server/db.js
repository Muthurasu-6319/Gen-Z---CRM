// server/db.js
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const dbFile = path.join(__dirname, 'db_fallback.json');

// Initialize fallback database structure if not exists
function initFallbackDb() {
  let dbExists = fs.existsSync(dbFile);
  let data = {};
  if (dbExists) {
    try {
      data = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
    } catch (e) {
      dbExists = false;
    }
  }

  const defaultProfiles = [
    {
      id: 'admin-uuid-0001-0001-000000000001',
      username: 'Admin',
      email: 'admin@crm.com',
      password: '$2b$10$IcH820CAncuUhXimAuWfEuVeroiwxEYrcKHub3TuXReO45Sfx.Fye', // admin123
      role: 'Admin',
      designation: 'System Administrator'
    },
    {
      id: 'staff-uuid-0001-0001-000000000001',
      username: 'Siva',
      email: 'siva@crm.com',
      password: '$2b$10$IcH820CAncuUhXimAuWfEuVeroiwxEYrcKHub3TuXReO45Sfx.Fye',
      role: 'Staff',
      designation: 'Developer'
    },
    {
      id: 'staff-uuid-0001-0001-000000000002',
      username: 'Kumar',
      email: 'kumar@crm.com',
      password: '$2b$10$IcH820CAncuUhXimAuWfEuVeroiwxEYrcKHub3TuXReO45Sfx.Fye',
      role: 'Staff',
      designation: 'Designer'
    }
  ];

  if (!dbExists) {
    const initialDb = {
      profiles: defaultProfiles,
      tasks: [],
      projects: [],
      products: [],
      leads: [],
      quotes: [],
      invoices: [],
      invoice_line_items: [],
      transactions: [],
      calendar_events: [],
      attendance: [],
      attendance_breaks: [],
      leaves: [],
      meetings: [],
      daily_reports: [],
      messages: [],
      files: [],
      mails: [],
      notifications: [],
      settings: []
    };
    fs.writeFileSync(dbFile, JSON.stringify(initialDb, null, 2));
  } else {
    // If profiles array is empty or missing, populate it
    if (!data.profiles || !Array.isArray(data.profiles) || data.profiles.length === 0) {
      data.profiles = defaultProfiles;
      fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
    }
  }
}

initFallbackDb();

function readData() {
  try {
    initFallbackDb();
    return JSON.parse(fs.readFileSync(dbFile, 'utf8'));
  } catch (e) {
    return {};
  }
}

function writeData(data) {
  fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
}

// Helper to parse comma-separated values, respecting single and double quoted strings
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

// Simple JSON Database SQL parser fallback
async function executeJsonQuery(sql, params = []) {
  const data = readData();
  const sqlClean = sql.replace(/\s+/g, ' ').trim();
  
  // 1. INSERT INTO
  const insertMatch = sqlClean.match(/INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
  if (insertMatch) {
    const table = insertMatch[1].toLowerCase();
    const cols = insertMatch[2].split(',').map(s => s.trim());
    const parsedVals = parseValuesClause(insertMatch[3]);
    
    if (!data[table]) data[table] = [];
    
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
    
    const maxId = data[table].reduce((max, r) => Math.max(max, Number(r.id) || 0), 0);
    newRow.id = maxId + 1;
    if (!newRow.created_at) {
      newRow.created_at = new Date().toISOString();
    }
    
    data[table].push(newRow);
    writeData(data);
    
    return [{ insertId: newRow.id, affectedRows: 1 }, null];
  }
  
  // 2. UPDATE
  const updateMatch = sqlClean.match(/UPDATE\s+(\w+)\s+SET\s+(.+?)\s+WHERE\s+(.+)/i);
  if (updateMatch) {
    const table = updateMatch[1].toLowerCase();
    const setClause = updateMatch[2];
    const whereClause = updateMatch[3];
    
    if (!data[table]) data[table] = [];
    
    const setPairs = parseValuesClause(setClause);
    const whereFieldMatch = whereClause.match(/(?:[a-zA-Z0-9_]+\.)?([a-zA-Z0-9_]+)\s*=\s*\?/);
    if (whereFieldMatch) {
      const whereField = whereFieldMatch[1];
      const whereVal = params[params.length - 1];
      
      let affectedRows = 0;
      data[table] = data[table].map(row => {
        if (row[whereField] == whereVal) {
          affectedRows++;
          const updatedRow = { ...row };
          
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
              updatedRow[col] = val;
            }
          });
          return updatedRow;
        }
        return row;
      });
      
      writeData(data);
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
      
      const beforeCount = data[table]?.length || 0;
      data[table] = (data[table] || []).filter(row => row[whereField] != whereVal);
      const afterCount = data[table].length;
      
      writeData(data);
      return [{ affectedRows: beforeCount - afterCount }, null];
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
        let rows = data[originalTable] || [];
        
        const whereIndex = sqlClean.toUpperCase().indexOf(' WHERE ');
        if (whereIndex !== -1) {
          let afterWhere = sqlClean.substring(whereIndex + 7).trim();
          const orderByIndex = afterWhere.toUpperCase().indexOf(' ORDER BY ');
          if (orderByIndex !== -1) {
            afterWhere = afterWhere.substring(0, orderByIndex).trim();
          }
          
          const fieldMatch = afterWhere.match(/(?:[a-zA-Z0-9_]+\.)?([a-zA-Z0-9_]+)\s*=\s*\?/);
          if (fieldMatch) {
            const fieldName = fieldMatch[1];
            const val = params[0];
            rows = rows.filter(row => row[fieldName] == val);
          }
        }
        
        const orderByIndex = sqlClean.toUpperCase().indexOf(' ORDER BY ');
        if (orderByIndex !== -1) {
          const afterOrderBy = sqlClean.substring(orderByIndex + 10).trim();
          const orderParts = afterOrderBy.split(' ')[0].split(',');
          const fieldRaw = orderParts[0].trim();
          const fieldParts = fieldRaw.split('.');
          const orderField = fieldParts[fieldParts.length - 1];
          const direction = afterOrderBy.toUpperCase().includes('DESC') ? 'DESC' : 'ASC';
          
          rows = [...rows].sort((a, b) => {
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

let mysqlPool = null;
let useFallback = false;

// Try to initialize connection to MySQL
async function getPool() {
  if (useFallback) return null;
  if (mysqlPool) return mysqlPool;
  
  try {
    mysqlPool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'crm_db',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    
    const conn = await mysqlPool.getConnection();
    conn.release();
    console.log('✅ Connected to MySQL Database');
    return mysqlPool;
  } catch (err) {
    console.warn('⚠️ MySQL connection failed. Error:', err.message);
    console.warn('⚡ Using JSON database fallback (server/db_fallback.json)');
    useFallback = true;
    return null;
  }
}

const pool = {
  query: async (sql, params) => {
    const activePool = await getPool();
    if (activePool && !useFallback) {
      try {
        return await activePool.query(sql, params);
      } catch (err) {
        console.error('MySQL Query error, attempting JSON fallback. Error:', err.message);
        return await executeJsonQuery(sql, params);
      }
    } else {
      return await executeJsonQuery(sql, params);
    }
  }
};

module.exports = pool;
