const fs = require('fs');
const path = require('path');
const { pool } = require('../db/connection');
const { pastaUploads } = require('../middleware/upload');

async function listarPorCandidatura(req, res, next) {
  try {
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
    if (!req.file) return res.status(400).json({ erro: 'Ficheiro em falta.' });
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

    // validar que requisito pertence ao nível do badge
    const [req2] = await pool.query(
      `SELECT r.id_requisito FROM requisito r
         JOIN badge b ON b.id_nivel = r.id_nivel
        WHERE r.id_requisito = ? AND b.id_badge = ?`,
      [id_requisito, cand[0].id_badge]
    );
    if (req2.length === 0) {
      return res.status(400).json({ erro: 'Requisito não pertence a este badge.' });
    }

    const urlRelativa = `/${process.env.UPLOAD_DIR || 'uploads'}/${req.file.filename}`;

    const [result] = await pool.query(
      `INSERT INTO evidencia
         (id_candidatura, id_requisito, ficheiro_url, nome_ficheiro, tipo_ficheiro, descricao)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, id_requisito, urlRelativa, req.file.originalname, req.file.mimetype, descricao || null]
    );

    res.status(201).json({
      mensagem: 'Evidência carregada.',
      id_evidencia: result.insertId,
      ficheiro_url: urlRelativa,
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

    // remover ficheiro do disco
    try {
      const nomeFicheiro = path.basename(ev[0].ficheiro_url);
      fs.unlinkSync(path.join(pastaUploads, nomeFicheiro));
    } catch (_) { /* ignora erros de filesystem */ }

    res.json({ mensagem: 'Evidência removida.' });
  } catch (err) { next(err); }
}

module.exports = { listarPorCandidatura, carregar, remover };
