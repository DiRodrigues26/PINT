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

const memoryStorage = multer.memoryStorage();

const tiposPermitidos = new Map([
  ['application/pdf', ['.pdf']],
  ['image/png', ['.png']],
  ['image/jpeg', ['.jpg', '.jpeg']],
  ['image/jpg', ['.jpg', '.jpeg']],
  ['application/zip', ['.zip']],
  ['application/x-zip-compressed', ['.zip']],
  ['application/msword', ['.doc']],
  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', ['.docx']],
  ['image/webp', ['.webp']],
  ['video/webm', ['.webm']],
]);

const imagensPermitidas = new Map([
  ['image/png', ['.png']],
  ['image/jpeg', ['.jpg', '.jpeg']],
  ['image/jpg', ['.jpg', '.jpeg']],
  ['image/webp', ['.webp']],
]);

function extensaoOriginal(file) {
  return path.extname(file.originalname || '').toLowerCase();
}

function validarTipoEExtensao(file, permitidos) {
  const extensoes = permitidos.get(file.mimetype);
  if (!extensoes) return false;
  return extensoes.includes(extensaoOriginal(file));
}

function filtroFicheiro(req, file, cb) {
  if (validarTipoEExtensao(file, tiposPermitidos)) return cb(null, true);
  cb(new Error('Tipo ou extensão de ficheiro não permitido.'));
}

function filtroImagem(req, file, cb) {
  if (validarTipoEExtensao(file, imagensPermitidas)) return cb(null, true);
  cb(new Error('Apenas imagens PNG, JPG, JPEG ou WEBP são permitidas.'));
}

const limiteMB = parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10);
const limiteImagemMB = parseInt(process.env.MAX_IMAGE_SIZE_MB || '5', 10);

const upload = multer({
  storage,
  fileFilter: filtroFicheiro,
  limits: { fileSize: limiteMB * 1024 * 1024 },
});

const uploadMemoria = multer({
  storage: memoryStorage,
  fileFilter: filtroImagem,
  limits: { fileSize: limiteImagemMB * 1024 * 1024 },
});

// Evidências — memoryStorage para permitir upload direto para Cloudinary,
// mas aceita todos os tipos de ficheiro permitidos (não apenas imagens)
const uploadEvidencia = multer({
  storage: memoryStorage,
  fileFilter: filtroFicheiro,
  limits: { fileSize: limiteMB * 1024 * 1024 },
});

module.exports = { upload, uploadMemoria, uploadEvidencia, pastaUploads };
