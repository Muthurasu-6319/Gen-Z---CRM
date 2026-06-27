// server/routes/files.js
const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const { getCollection, addDoc, deleteDoc, getDoc } = require('../firebase-admin');

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
    const allFiles = await getCollection('files');
    const filteredFiles = allFiles.filter(f => f.folder === folder);

    // Add uploader name
    const populated = await Promise.all(filteredFiles.map(async f => {
      let uploader = 'Unknown';
      if (f.uploaded_by) {
        const user = await getDoc('profiles', f.uploaded_by);
        if (user) uploader = user.username;
      }
      return { ...f, uploader };
    }));

    populated.sort((a, b) => {
      // folders first, then by original_name
      if (a.mime_type === 'folder' && b.mime_type !== 'folder') return -1;
      if (a.mime_type !== 'folder' && b.mime_type === 'folder') return 1;
      const nameA = a.original_name || a.name || '';
      const nameB = b.original_name || b.name || '';
      return nameA.localeCompare(nameB);
    });

    res.json(populated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/files/upload — upload a file
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const folder = req.body.folder || 'root';
  try {
    const newFile = {
      name: req.file.filename,
      original_name: req.file.originalname,
      mime_type: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      folder,
      uploaded_by: req.user.id
    };
    const doc = await addDoc('files', newFile);
    res.status(201).json(doc);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/files/folder — create a virtual folder record
router.post('/folder', auth, async (req, res) => {
  const { folder, name } = req.body;
  if (!name) return res.status(400).json({ error: 'Folder name required' });
  try {
    const newFolder = {
      name,
      original_name: name,
      mime_type: 'folder',
      size: 0,
      path: '',
      folder: folder || 'root',
      uploaded_by: req.user.id
    };
    const doc = await addDoc('files', newFolder);
    res.status(201).json(doc);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/files/link — save a linked (external URL) image
router.post('/link', auth, async (req, res) => {
  const { name, url, folder, mime_type } = req.body;
  if (!name || !url) return res.status(400).json({ error: 'name and url are required' });
  try {
    const newLink = {
      name,
      original_name: name,
      mime_type: mime_type || 'image/link',
      size: 0,
      path: '',
      folder: folder || 'root',
      url,
      uploaded_by: req.user.id
    };
    const doc = await addDoc('files', newLink);
    res.status(201).json(doc);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/files/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const fileDoc = await getDoc('files', req.params.id);
    if (!fileDoc) {
      return res.json({ message: 'File/Folder deleted' }); // Idempotent success
    }
    
    const filePath = fileDoc.path;

    if (fileDoc.mime_type === 'folder') {
      // Find all files that are inside this folder
      const allFiles = await getCollection('files');
      
      // Determine the path prefix for files inside this folder
      const currentFolderPathStr = fileDoc.folder === 'root' ? fileDoc.name : `${fileDoc.folder}/${fileDoc.name}`;
      
      const filesToDelete = allFiles.filter(f => {
        // e.g. f.folder = "MyFolder" or f.folder starts with "MyFolder/"
        return f.folder === currentFolderPathStr || f.folder.startsWith(`${currentFolderPathStr}/`);
      });

      for (const f of filesToDelete) {
        await deleteDoc('files', f.id);
        if (f.path && fs.existsSync(f.path)) {
           try { fs.unlinkSync(f.path); } catch (e) { console.error(e); }
        }
      }
    }

    await deleteDoc('files', req.params.id);
    if (filePath && fs.existsSync(filePath)) {
       try { fs.unlinkSync(filePath); } catch (e) { console.error(e); }
    }
    
    res.json({ message: 'File/Folder deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/files/download/:filename — serve uploaded files
router.get('/download/:filename', auth, (req, res) => {
  const filePath = path.join(uploadDir, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  res.download(filePath);
});

module.exports = router;
