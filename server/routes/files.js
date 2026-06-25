// server/routes/files.js
const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const auth = require('../middleware/auth');

const uploadDir = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB

// GET /api/files — list files, optionally filtered by folder
router.get('/', auth, async (req, res) => {
  const folder = req.query.folder || 'root';
  try {
    const [rows] = await db.query(
      `SELECT f.*, p.username AS uploader FROM files f
       LEFT JOIN profiles p ON f.uploaded_by = p.id
       WHERE f.folder = ?
       ORDER BY f.mime_type = 'folder' DESC, f.original_name ASC`,
      [folder]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/files/upload — upload a file
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const folder = req.body.folder || 'root';
  try {
    const [result] = await db.query(
      `INSERT INTO files (name, original_name, mime_type, size, path, folder, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.file.filename, req.file.originalname, req.file.mimetype, req.file.size, req.file.path, folder, req.user.id]
    );
    const [rows] = await db.query('SELECT * FROM files WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/files/folder — create a virtual folder record
router.post('/folder', auth, async (req, res) => {
  const { folder, name } = req.body;
  if (!name) return res.status(400).json({ error: 'Folder name required' });
  try {
    const [result] = await db.query(
      `INSERT INTO files (name, original_name, mime_type, size, path, folder, uploaded_by) VALUES (?, ?, 'folder', 0, '', ?, ?)`,
      [name, name, folder || 'root', req.user.id]
    );
    const [rows] = await db.query('SELECT * FROM files WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/files/link — save a linked (external URL) image
router.post('/link', auth, async (req, res) => {
  const { name, url, folder, mime_type } = req.body;
  if (!name || !url) return res.status(400).json({ error: 'name and url are required' });
  try {
    const [result] = await db.query(
      `INSERT INTO files (name, original_name, mime_type, size, path, folder, url, uploaded_by) VALUES (?, ?, ?, 0, '', ?, ?, ?)`,
      [name, name, mime_type || 'image/link', folder || 'root', url, req.user.id]
    );
    const [rows] = await db.query('SELECT * FROM files WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/files/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM files WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'File not found' });
    const filePath = rows[0].path;
    await db.query('DELETE FROM files WHERE id = ?', [req.params.id]);
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.json({ message: 'File deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/files/download/:filename — serve uploaded files
router.get('/download/:filename', auth, (req, res) => {
  const filePath = path.join(uploadDir, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  res.download(filePath);
});

module.exports = router;
