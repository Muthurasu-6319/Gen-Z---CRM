const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { notifyAssignedUsers } = require('../mailer');

// GET all tickets
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM tickets ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single ticket (not strictly necessary if frontend has full list, but good practice)
router.get('/:id', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM tickets WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE a ticket
router.post('/', auth, async (req, res) => {
  const { title, category, priority, description, client_id, client_username } = req.body;
  if (!title || !category || !priority) return res.status(400).json({ error: 'Title, category, and priority are required' });

  // Generate a random ticket ID like TKT-1024
  const ticketNumber = 'TKT-' + Math.floor(1000 + Math.random() * 9000);
  const newTicket = {
    ticket_number: ticketNumber,
    title,
    category,
    priority,
    description: description || '',
    status: 'Open',
    client_id: client_id || req.user.id, // Usually the logged-in client, or an admin creating on behalf of someone
    client_username: client_username || req.user.username,
    assigned_to: null,
    internal_notes: '',
    replies: '[]', // store as JSON string in SQL emulator
  };

  try {
    const [result] = await db.query(
      `INSERT INTO tickets (ticket_number, title, category, priority, description, status, client_id, client_username, assigned_to, internal_notes, replies) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [newTicket.ticket_number, newTicket.title, newTicket.category, newTicket.priority, newTicket.description, newTicket.status, newTicket.client_id, newTicket.client_username, newTicket.assigned_to, newTicket.internal_notes, newTicket.replies]
    );
    const [rows] = await db.query('SELECT * FROM tickets WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE a ticket (Status, Assignee, Internal Notes, or Replies)
router.put('/:id', auth, async (req, res) => {
  const { status, assigned_to, internal_notes, replies } = req.body;
  try {
    const [oldRows] = await db.query('SELECT assigned_to, title FROM tickets WHERE id = ?', [req.params.id]);
    const oldAssignedTo = oldRows[0]?.assigned_to;
    const title = oldRows[0]?.title || 'Support Ticket';

    // We only update fields that are provided
    let query = 'UPDATE tickets SET ';
    const params = [];
    
    if (status !== undefined) { query += 'status = ?, '; params.push(status); }
    if (assigned_to !== undefined) { query += 'assigned_to = ?, '; params.push(assigned_to); }
    if (internal_notes !== undefined) { query += 'internal_notes = ?, '; params.push(internal_notes); }
    if (replies !== undefined) { 
        // stringify array if it's an object
        const repliesStr = typeof replies === 'string' ? replies : JSON.stringify(replies);
        query += 'replies = ?, '; 
        params.push(repliesStr); 
    }
    
    if (params.length === 0) return res.status(400).json({ error: 'No fields to update' });
    
    // Remove last comma and space
    query = query.slice(0, -2);
    query += ' WHERE id = ?';
    params.push(req.params.id);

    await db.query(query, params);
    const [rows] = await db.query('SELECT * FROM tickets WHERE id = ?', [req.params.id]);

    if (assigned_to && assigned_to !== oldAssignedTo) {
        notifyAssignedUsers([assigned_to], 'Support Ticket', title);
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE a ticket
router.delete('/:id', auth, async (req, res) => {
  if (req.user.role !== 'Admin') return res.status(403).json({ error: 'Admin only' });
  try {
    await db.query('DELETE FROM tickets WHERE id = ?', [req.params.id]);
    res.json({ message: 'Ticket deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
