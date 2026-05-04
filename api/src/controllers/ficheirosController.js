const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const { pastaUploads } = require('../middleware/upload');

function temCloudinaryConfigurado() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

function tipoRecurso(mimetype) {
  if (mimetype?.startsWith('image/')) return 'image';
  if (mimetype?.startsWith('video/')) return 'video';
  return 'raw';
}

function pastaPorContexto(contexto) {
  const base = process.env.CLOUDINARY_FOLDER || 'softinsa-badges';
  const seguro = String(contexto || 'geral').replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
  return `${base}/${seguro}`;
}

function assinarCloudinary(params) {
  const texto = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  return crypto
    .createHash('sha1')
    .update(`${texto}${process.env.CLOUDINARY_API_SECRET}`)
    .digest('hex');
}

async function uploadCloudinary(file, contexto) {
  const resourceType = tipoRecurso(file.mimetype);
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = pastaPorContexto(contexto);
  const paramsAssinados = { folder, timestamp };
  const signature = assinarCloudinary(paramsAssinados);
  const form = new FormData();

  form.append('file', new Blob([file.buffer], { type: file.mimetype }), file.originalname);
  form.append('api_key', process.env.CLOUDINARY_API_KEY);
  form.append('timestamp', String(timestamp));
  form.append('folder', folder);
  form.append('signature', signature);

  const endpoint = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;
  const resposta = await fetch(endpoint, { method: 'POST', body: form });
  const dados = await resposta.json();

  if (!resposta.ok) {
    throw new Error(dados?.error?.message || 'Falha no upload para Cloudinary.');
  }

  return {
    provider: 'cloudinary',
    url: dados.secure_url,
    secure_url: dados.secure_url,
    public_id: dados.public_id,
    resource_type: dados.resource_type,
    formato: dados.format,
    bytes: dados.bytes,
    nome_original: file.originalname,
    mimetype: file.mimetype,
  };
}

async function uploadLocal(file, contexto) {
  const ext = path.extname(file.originalname);
  const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '_');
  const unico = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const nome = `${String(contexto || 'ficheiro').replace(/[^a-zA-Z0-9-_]/g, '_')}-${base}-${unico}${ext}`;
  const destino = path.join(pastaUploads, nome);

  await fs.writeFile(destino, file.buffer);

  return {
    provider: 'local',
    url: `/${process.env.UPLOAD_DIR || 'uploads'}/${nome}`,
    public_id: nome,
    resource_type: tipoRecurso(file.mimetype),
    bytes: file.size,
    nome_original: file.originalname,
    mimetype: file.mimetype,
  };
}

async function carregar(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ erro: 'Ficheiro é obrigatório.' });

    const contexto = req.body?.contexto || req.query?.contexto || 'geral';
    const dados = temCloudinaryConfigurado()
      ? await uploadCloudinary(req.file, contexto)
      : await uploadLocal(req.file, contexto);

    res.status(201).json({
      mensagem: 'Ficheiro carregado.',
      ficheiro: dados,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { carregar };
