// server/middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Malformed token' });

  // Bypass for dummy token used by the front‑end auto‑login
  if (token === 'dummy-token') {
    req.user = { id: 'admin-uuid-0001-0001-000000000001', email: 'admin@gmail.com', role: 'Admin' };
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Normalize role capitalization to match backend checks
    if (decoded.role && typeof decoded.role === 'string') {
      const lower = decoded.role.toLowerCase();
      if (lower === 'admin') decoded.role = 'Admin';
      else if (lower === 'staff') decoded.role = 'Staff';
      else if (lower === 'client') decoded.role = 'Client';
    }
    
    req.user = decoded; // { id, email, role }
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
