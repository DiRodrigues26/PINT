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

    // copiar o ficheiro físico para serem independentes (se falhar, referencia o original)
    let novaUrl = origem[0].ficheiro_url;
    try {
      const srcPath = path.join(pastaUploads, path.basename(origem[0].ficheiro_url));
      const ext = path.extname(origem[0].ficheiro_url);
      const novoNome = `reuse-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      fs.copyFileSync(srcPath, path.join(pastaUploads, novoNome));
      novaUrl = `/${process.env.UPLOAD_DIR || 'uploads'}/${novoNome}`;
    } catch (_) { /* mantém a referência original */ }

    const [result] = await pool.query(
      `INSERT INTO evidencia (id_candidatura, id_requisito, ficheiro_url, nome_ficheiro, tipo_ficheiro, descricao)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, idRequisito, novaUrl, origem[0].nome_ficheiro, origem[0].tipo_ficheiro, origem[0].descricao || 'Reutilizada de outro badge']
    );

    res.status(201).json({ mensagem: 'Evidência reutilizada.', id_evidencia: result.insertId, ficheiro_url: novaUrl });
  } catch (err) { next(err); }
}

module.exports = { listarPorCandidatura, carregar, remover, reutilizar };
