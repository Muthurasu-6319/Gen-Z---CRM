// server/routes/invoices.js
const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const [invoices] = await db.query('SELECT * FROM invoices ORDER BY created_at DESC');
    const [items] = await db.query('SELECT * FROM invoice_line_items');
    const result = invoices.map(inv => ({
      ...inv,
      invoice_number: inv.invoice_no,
      client_name_override: inv.client_name,
      paid_amount: Number(inv.paid_amount || 0),
      total_amount: Number(inv.total_amount || 0),
      invoice_items: items.filter(i => i.invoice_id === inv.id).map(i => ({
        id: i.id,
        invoice_id: i.invoice_id,
        description: i.description,
        quantity: Number(i.quantity),
        price: Number(i.price)
      }))
    }));
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  const { invoice_no, client_name, issue_date, due_date, status, total_amount, paid_amount, payment_method, notes, line_items } = req.body;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO invoices (invoice_no, client_name, issue_date, due_date, status, total_amount, paid_amount, payment_method, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [invoice_no, client_name, issue_date || null, due_date || null, status || 'Draft', total_amount || 0, paid_amount || 0, payment_method || null, notes || null, req.user.id]
    );
    const invoiceId = result.insertId;
    if (line_items && line_items.length > 0) {
      const vals = line_items.map(i => [invoiceId, i.description, i.quantity, i.price]);
      await conn.query('INSERT INTO invoice_line_items (invoice_id, description, quantity, price) VALUES ?', [vals]);
    }
    await conn.commit();
    const [rows] = await db.query('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
    const [items] = await db.query('SELECT * FROM invoice_line_items WHERE invoice_id = ?', [invoiceId]);
    res.status(201).json({ 
      ...rows[0],
      invoice_number: rows[0].invoice_no,
      client_name_override: rows[0].client_name,
      paid_amount: Number(rows[0].paid_amount || 0),
      total_amount: Number(rows[0].total_amount || 0),
      invoice_items: items.map(i => ({ ...i, quantity: Number(i.quantity), price: Number(i.price) }))
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally { conn.release(); }
});

router.put('/:id', auth, async (req, res) => {
  const { invoice_no, client_name, issue_date, due_date, status, total_amount, paid_amount, payment_method, notes, line_items } = req.body;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `UPDATE invoices SET invoice_no=?, client_name=?, issue_date=?, due_date=?, status=?, total_amount=?, paid_amount=?, payment_method=?, notes=? WHERE id=?`,
      [invoice_no, client_name, issue_date || null, due_date || null, status, total_amount || 0, paid_amount || 0, payment_method || null, notes || null, req.params.id]
    );
    await conn.query('DELETE FROM invoice_line_items WHERE invoice_id = ?', [req.params.id]);
    if (line_items && line_items.length > 0) {
      const vals = line_items.map(i => [req.params.id, i.description, i.quantity, i.price]);
      await conn.query('INSERT INTO invoice_line_items (invoice_id, description, quantity, price) VALUES ?', [vals]);
    }
    await conn.commit();
    const [rows] = await db.query('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
    const [items] = await db.query('SELECT * FROM invoice_line_items WHERE invoice_id = ?', [req.params.id]);
    res.json({ 
      ...rows[0],
      invoice_number: rows[0].invoice_no,
      client_name_override: rows[0].client_name,
      paid_amount: Number(rows[0].paid_amount || 0),
      total_amount: Number(rows[0].total_amount || 0),
      invoice_items: items.map(i => ({ ...i, quantity: Number(i.quantity), price: Number(i.price) }))
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally { conn.release(); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM invoices WHERE id = ?', [req.params.id]);
    res.json({ message: 'Invoice deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
