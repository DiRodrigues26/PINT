const fs = require('fs');
const path = require('path');
const { pool } = require('../db/connection');
const { pastaUploads } = require('../middleware/upload');
const { obterCandidaturaComAcesso } = require('../utils/candidaturasPermissoes');
const {
  uploadFicheiro,
  eliminarCloudinary,
  extrairPublicId,
  extrairResourceType,
  temCloudinaryConfigurado,
} = require('../utils/uploadService');

/* ─── Segurança: validação server-side de tipo e tamanho ──────────── */
const EXTENSOES_PERMITIDAS = ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'zip', 'doc', 'docx'];
const MAX_FILE_SIZE_BYTES = (parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10)) * 1024 * 1024;

function validarFicheiroSeguro(file) {
  if (!file) return 'Ficheiro em falta.';

  // Validar tamanho
  const tamanho = file.size || file.buffer?.length || 0;
  if (tamanho > MAX_FILE_SIZE_BYTES) {
    return `Ficheiro demasiado grande (máx. ${process.env.MAX_FILE_SIZE_MB || '10'} MB).`;
  }

  // Validar extensão
  const ext = (path.extname(file.originalname || '').slice(1) || '').toLowerCase();
  if (!EXTENSOES_PERMITIDAS.includes(ext)) {
    return `Tipo de ficheiro não permitido (.${ext}). Aceites: ${EXTENSOES_PERMITIDAS.join(', ')}.`;
  }

  // Validar mimetype (proteção contra spoofing de extensão)
  const MIMETYPES_PERMITIDOS = [
    'application/pdf',
    'image/png', 'image/jpeg', 'image/jpg', 'image/webp',
    'application/zip', 'application/x-zip-compressed',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  if (!MIMETYPES_PERMITIDOS.includes(file.mimetype)) {
    return `Tipo MIME não permitido (${file.mimetype}).`;
  }

  return null; // sem erro
}

async function listarPorCandidatura(req, res, next) {
  try {
    const { candidatura, permitido } = await obterCandidaturaComAcesso(req.utilizador, req.params.id);
    if (!candidatura) return res.status(404).json({ erro: 'Candidatura não encontrada.' });
    if (!permitido) return res.status(403).json({ erro: 'Sem permissão para esta candidatura.' });

    const [linhas] = await pool.query(
      `SELECT ev.*, r.codigo_requisito, r.titulo AS titulo_requisito
         FROM evidencia ev
         JOIN requisito r ON r.id_requisito = ev.id_requisito
        WHERE ev.id_candidatura = ?
        ORDER BY ev.uploaded_at DESC`,
      [req.params.id]
    );
    res.json({ dados: linhas });
  } catch (err) { next(err); }
}

async function carregar(req, res, next) {
  try {
    const { id } = req.params;
    const { id_requisito, descricao } = req.body;

    // Validação de segurança server-side
    const erroFicheiro = validarFicheiroSeguro(req.file);
    if (erroFicheiro) return res.status(400).json({ erro: erroFicheiro });

    if (!id_requisito) return res.status(400).json({ erro: 'id_requisito é obrigatório.' });

    const [cand] = await pool.query(
      'SELECT id_consultor, estado_atual, id_badge FROM candidatura_badge WHERE id_candidatura = ?',
      [id]
    );
    if (cand.length === 0) return res.status(404).json({ erro: 'Candidatura não encontrada.' });
    if (cand[0].id_consultor !== req.utilizador.id_utilizador) {
      return res.status(403).json({ erro: 'Apenas o dono da candidatura pode carregar evidências.' });
    }
    if (!['OPEN', 'SENT_BACK'].includes(cand[0].estado_atual)) {
      return res.status(400).json({ erro: 'Não pode carregar evidências nesta fase.' });
    }

    // validar que requisito pertence ao badge da candidatura
    const [req2] = await pool.query(
      `SELECT br.id_requisito
         FROM badge_requisito br
         JOIN requisito r ON r.id_requisito = br.id_requisito
        WHERE br.id_requisito = ? AND br.id_badge = ? AND r.ativo = 1`,
      [id_requisito, cand[0].id_badge]
    );
    if (req2.length === 0) {
      return res.status(400).json({ erro: 'Requisito não pertence a este badge.' });
    }

    // Upload para Cloudinary (ou local como fallback)
    const resultado = await uploadFicheiro(req.file, 'evidencias');
    const urlFicheiro = resultado.url;

    const [result] = await pool.query(
      `INSERT INTO evidencia
         (id_candidatura, id_requisito, ficheiro_url, nome_ficheiro, tipo_ficheiro, descricao)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, id_requisito, urlFicheiro, req.file.originalname, req.file.mimetype, descricao || null]
    );

    res.status(201).json({
      mensagem: 'Evidência carregada.',
      id_evidencia: result.insertId,
      ficheiro_url: urlFicheiro,
    });
  } catch (err) { next(err); }
}

async function remover(req, res, next) {
  try {
    const { id, idEvidencia } = req.params;

    const [ev] = await pool.query(
      `SELECT ev.*, cb.id_consultor, cb.estado_atual
         FROM evidencia ev
         JOIN candidatura_badge cb ON cb.id_candidatura = ev.id_candidatura
        WHERE ev.id_evidencia = ? AND ev.id_candidatura = ?`,
      [idEvidencia, id]
    );
    if (ev.length === 0) return res.status(404).json({ erro: 'Evidência não encontrada.' });
    if (ev[0].id_consultor !== req.utilizador.id_utilizador) {
      return res.status(403).json({ erro: 'Apenas o dono pode remover.' });
    }
    if (!['OPEN', 'SENT_BACK'].includes(ev[0].estado_atual)) {
      return res.status(400).json({ erro: 'Não pode remover evidências nesta fase.' });
    }

    await pool.query('DELETE FROM evidencia WHERE id_evidencia = ?', [idEvidencia]);

    // Apagar ficheiro do storage
    const ficheiroUrl = ev[0].ficheiro_url;
    if (ficheiroUrl && ficheiroUrl.includes('cloudinary.com')) {
      // Apagar do Cloudinary
      const publicId = extrairPublicId(ficheiroUrl);
      const resourceType = extrairResourceType(ficheiroUrl);
      if (publicId) {
        eliminarCloudinary(publicId, resourceType)
          .catch((e) => console.warn('[CLOUDINARY] Erro ao eliminar:', e.message));
      }
    } else {
      // Apagar do disco local (fallback)
      try {
        const nomeFicheiro = path.basename(ficheiroUrl || '');
        if (nomeFicheiro) {
          fs.unlinkSync(path.join(pastaUploads, nomeFicheiro));
        }
      } catch (_) { /* ignora erros de filesystem */ }
    }

    res.json({ mensagem: 'Evidência removida.' });
  } catch (err) { next(err); }
}

// Reutilizar uma evidência já submetida noutra candidatura (mesmo requisito)
async function reutilizar(req, res, next) {
  try {
    const { id } = req.params; // candidatura destino
    const { id_evidencia_origem } = req.body;
    if (!id_evidencia_origem) return res.status(400).json({ erro: 'id_evidencia_origem é obrigatório.' });

    const [cand] = await pool.query(
      'SELECT id_consultor, estado_atual, id_badge FROM candidatura_badge WHERE id_candidatura = ?',
      [id]
    );
    if (cand.length === 0) return res.status(404).json({ erro: 'Candidatura não encontrada.' });
    if (cand[0].id_consultor !== req.utilizador.id_utilizador) {
      return res.status(403).json({ erro: 'Apenas o dono da candidatura pode reutilizar evidências.' });
    }
    if (!['OPEN', 'SENT_BACK'].includes(cand[0].estado_atual)) {
      return res.status(400).json({ erro: 'Não pode reutilizar evidências nesta fase.' });
    }

    const [origem] = await pool.query(
      `SELECT e.*, cb.id_consultor
         FROM evidencia e
         JOIN candidatura_badge cb ON cb.id_candidatura = e.id_candidatura
        WHERE e.id_evidencia = ?`,
      [id_evidencia_origem]
    );
    if (origem.length === 0) return res.status(404).json({ erro: 'Evidência de origem não encontrada.' });
    if (origem[0].id_consultor !== req.utilizador.id_utilizador) {
      return res.status(403).json({ erro: 'Sem permissão para reutilizar esta evidência.' });
    }

    const idRequisito = origem[0].id_requisito;

    const [reqOk] = await pool.query(
      'SELECT 1 FROM badge_requisito WHERE id_requisito = ? AND id_badge = ?',
      [idRequisito, cand[0].id_badge]
    );
    if (reqOk.length === 0) return res.status(400).json({ erro: 'Esse requisito não pertence a este badge.' });

    const [jaTem] = await pool.query(
      'SELECT 1 FROM evidencia WHERE id_candidatura = ? AND id_requisito = ?',
      [id, idRequisito]
    );
    if (jaTem.length > 0) return res.status(409).json({ erro: 'Já existe evidência para este requisito.' });

    // Para ficheiros no Cloudinary, reutilizamos o mesmo URL (não há cópia necessária).
    // Para ficheiros locais, mantemos o comportamento de cópia anterior.
    let novaUrl = origem[0].ficheiro_url;
    const eCloudinary = novaUrl && novaUrl.includes('cloudinary.com');

    if (!eCloudinary) {
      // Cópia local (fallback — ficheiros antigos em disco)
      try {
        const srcPath = path.join(pastaUploads, path.basename(origem[0].ficheiro_url));
        const ext = path.extname(origem[0].ficheiro_url);
        const novoNome = `reuse-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        fs.copyFileSync(srcPath, path.join(pastaUploads, novoNome));
        novaUrl = `/${process.env.UPLOAD_DIR || 'uploads'}/${novoNome}`;
      } catch (_) { /* mantém a referência original */ }
    }

    const [result] = await pool.query(
      `INSERT INTO evidencia (id_candidatura, id_requisito, ficheiro_url, nome_ficheiro, tipo_ficheiro, descricao)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, idRequisito, novaUrl, origem[0].nome_ficheiro, origem[0].tipo_ficheiro, origem[0].descricao || 'Reutilizada de outro badge']
    );

    res.status(201).json({ mensagem: 'Evidência reutilizada.', id_evidencia: result.insertId, ficheiro_url: novaUrl });
  } catch (err) { next(err); }
}

module.exports = { listarPorCandidatura, carregar, remover, reutilizar };
