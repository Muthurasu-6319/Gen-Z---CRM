// server/index.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'dummy-secret';
process.env.JWT_SECRET = JWT_SECRET;
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const db = require('./db');
const { initCronJobs } = require('./cron');

// Init background jobs
initCronJobs();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// ── Middleware ────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Routes ───────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/users',         require('./routes/users'));
app.use('/api/tasks',         require('./routes/tasks'));
app.use('/api/projects',      require('./routes/projects'));
app.use('/api/products',      require('./routes/products'));
app.use('/api/leads',         require('./routes/leads'));
app.use('/api/quotes',        require('./routes/quotes'));
app.use('/api/invoices',      require('./routes/invoices'));
app.use('/api/accounting',    require('./routes/accounting'));
app.use('/api/calendar',      require('./routes/calendar'));
app.use('/api/attendance',    require('./routes/attendance'));
app.use('/api/leave',         require('./routes/leave'));
app.use('/api/client-reports', require('./routes/client-reports'));
app.use('/api/meetings',      require('./routes/meetings'));
app.use('/api/reports',       require('./routes/reports'));
app.use('/api/messages',      require('./routes/messages'));
app.use('/api/files',         require('./routes/files'));
app.use('/api/mailbox',       require('./routes/mailbox'));
app.use('/api/settings',      require('./routes/settings'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/roles',         require('./routes/roles'));
app.use('/api/tickets',       require('./routes/tickets'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// ── Socket.IO — Team Chat ─────────────────────────
// Track online users: Map<socketId, { id, username }>
const onlineUsers = new Map();

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const { id, email, role } = socket.user;

    (async () => {
      try {
        const [rows] = await db.query('SELECT username FROM profiles WHERE id = ?', [id]);
        const username = rows[0]?.username || email;
        socket.user.username = username;
        onlineUsers.set(socket.id, { id, username });
        io.emit('presence_update', Array.from(onlineUsers.values()));
      } catch (e) {
        // DB unavailable – use email as username
        const username = email;
        socket.user.username = username;
        onlineUsers.set(socket.id, { id, username });
        io.emit('presence_update', Array.from(onlineUsers.values()));
      }
    })();

    // No initial chat_history emission here anymore.
    // Client will use REST API to fetch history per room.

    socket.on('join_room', (roomId) => {
      // Leave all other rooms except their own socket ID
      socket.rooms.forEach(room => {
          if (room !== socket.id) socket.leave(room);
      });
      socket.join(roomId);
    });

    // New message from client
    socket.on('send_message', async ({ content, room_id }) => {
      if (!content || !content.trim()) return;
      const roomId = room_id || 'general';
      try {
        const [result] = await db.query(
          'INSERT INTO messages (profile_id, content, room_id) VALUES (?, ?, ?)',
          [id, content.trim(), roomId]
        );
        const [rows] = await db.query(
          `SELECT m.*, p.username FROM messages m LEFT JOIN profiles p ON m.profile_id = p.id WHERE m.id = ?`,
          [result.insertId]
        );
        io.to(roomId).emit('new_message', rows[0]);
      } catch (err) {
        socket.emit('error', 'Failed to send message');
      }
    });

    // Typing indicator
    socket.on('typing', (roomId) => {
      if (roomId) socket.to(roomId).emit('user_typing', { id, username: socket.user.username });
    });

    socket.on('disconnect', () => {
      onlineUsers.delete(socket.id);
      io.emit('presence_update', Array.from(onlineUsers.values()));
    });
  });


// ── Start ─────────────────────────────────────────
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`\n✅  CRM API Server running on http://localhost:${PORT}`);
  console.log(`   Socket.IO ready for real-time chat`);
  console.log(`   Database: Firebase Firestore (Emulator Wrapper)\n`);
});

