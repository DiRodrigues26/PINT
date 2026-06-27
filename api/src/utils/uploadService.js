/**
 * uploadService.js — Serviço partilhado de upload (Cloudinary + fallback local)
 *
 * Centraliza a lógica de upload para reutilização entre ficheirosController,
 * evidenciasController e qualquer futuro módulo que precise de uploads.
 */
const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const { pastaUploads } = require('../middleware/upload');

/* ─── Cloudinary helpers ─────────────────────────────────────────────── */

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

/**
 * Upload de um ficheiro (buffer) para o Cloudinary.
 * @param {{ buffer: Buffer, mimetype: string, originalname: string, size: number }} file
 * @param {string} contexto - subpasta dentro da CLOUDINARY_FOLDER (ex: 'evidencias', 'badges')
 * @returns {Promise<{ provider: string, url: string, secure_url: string, public_id: string, resource_type: string, formato: string, bytes: number, nome_original: string, mimetype: string }>}
 */
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

/**
 * Upload local (fallback quando Cloudinary não está configurado).
 */
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

/**
 * Upload inteligente: Cloudinary se configurado, senão local.
 * @param {{ buffer: Buffer, mimetype: string, originalname: string, size: number }} file
 * @param {string} contexto - subpasta (ex: 'evidencias', 'badges', 'requisitos')
 */
async function uploadFicheiro(file, contexto) {
  if (temCloudinaryConfigurado()) {
    try {
      return await uploadCloudinary(file, contexto);
    } catch (err) {
      console.warn('[UPLOAD] Falha no upload para Cloudinary, a tentar fallback local:', err.message);
      return uploadLocal(file, contexto);
    }
  }
  return uploadLocal(file, contexto);
}

/**
 * Eliminar um ficheiro do Cloudinary pelo public_id.
 * @param {string} publicId - O public_id do recurso
 * @param {string} [resourceType='raw'] - Tipo de recurso ('image', 'video', 'raw')
 */
async function eliminarCloudinary(publicId, resourceType = 'raw') {
  if (!temCloudinaryConfigurado() || !publicId) return;

  const timestamp = Math.floor(Date.now() / 1000);
  const paramsAssinados = { public_id: publicId, timestamp };
  const signature = assinarCloudinary(paramsAssinados);

  const form = new FormData();
  form.append('public_id', publicId);
  form.append('api_key', process.env.CLOUDINARY_API_KEY);
  form.append('timestamp', String(timestamp));
  form.append('signature', signature);

  const endpoint = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/${resourceType}/destroy`;
  const resposta = await fetch(endpoint, { method: 'POST', body: form });
  const dados = await resposta.json();

  if (dados.result !== 'ok' && dados.result !== 'not found') {
    console.warn(`[CLOUDINARY] Falha ao eliminar ${publicId}:`, dados);
  }
  return dados;
}

/**
 * Extrair o public_id de um URL do Cloudinary.
 * Ex: 'https://res.cloudinary.com/xxx/raw/upload/v123/softinsa-badges/evidencias/file.pdf'
 * → 'softinsa-badges/evidencias/file'  (sem extensão para imagens, com extensão para raw)
 */
function extrairPublicId(url) {
  if (!url || !url.includes('cloudinary.com')) return null;
  // URL format: .../upload/v{version}/{public_id_with_extension}
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)$/);
  if (!match) return null;
  return match[1];
}

/**
 * Determinar o resource_type a partir de um URL do Cloudinary.
 */
function extrairResourceType(url) {
  if (!url) return 'raw';
  if (url.includes('/image/upload/')) return 'image';
  if (url.includes('/video/upload/')) return 'video';
  return 'raw';
}

module.exports = {
  temCloudinaryConfigurado,
  tipoRecurso,
  pastaPorContexto,
  uploadCloudinary,
  uploadLocal,
  uploadFicheiro,
  eliminarCloudinary,
  extrairPublicId,
  extrairResourceType,
};
