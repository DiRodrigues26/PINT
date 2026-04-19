const path = require('path');
const fs = require('fs');
const multer = require('multer');

const pastaUploads = path.join(__dirname, '..', '..', process.env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(pastaUploads)) fs.mkdirSync(pastaUploads, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, pastaUploads),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '_');
    const unico = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${base}-${unico}${ext}`);
  },
});

const tiposPermitidos = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/zip',
  'application/x-zip-compressed',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

function filtroFicheiro(req, file, cb) {
  if (tiposPermitidos.includes(file.mimetype)) return cb(null, true);
  cb(new Error('Tipo de ficheiro não permitido.'));
}

const limiteMB = parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10);

const upload = multer({
  storage,
  fileFilter: filtroFicheiro,
  limits: { fileSize: limiteMB * 1024 * 1024 },
});

module.exports = { upload, pastaUploads };
