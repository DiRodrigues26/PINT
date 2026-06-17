const { pool } = require('../db/connection');

const TIPOS_POLITICA = new Set(['GERAL', 'PUBLICACAO_BADGE', 'PARTILHA_LINKEDIN']);

function obterTipoPolitica(valor = 'GERAL') {
  const tipo = String(valor || 'GERAL').trim().toUpperCase();
  return TIPOS_POLITICA.has(tipo) ? tipo : null;
}

function textoObrigatorio(valor) {
  return typeof valor === 'string' && valor.trim().length > 0;
}

function validarCamposPolitica({ tipo, versao, titulo, conteudo }) {
  if (!tipo) return 'Tipo de política inválido.';
  if (!textoObrigatorio(versao)) return 'Versão é obrigatória.';
  if (versao.length > 20) return 'Versão não pode exceder 20 caracteres.';
  if (!textoObrigatorio(titulo)) return 'Título é obrigatório.';
  if (titulo.length > 200) return 'Título não pode exceder 200 caracteres.';
  if (!textoObrigatorio(conteudo)) return 'Conteúdo da política é obrigatório.';
  return null;
}

async function garantirTabelaPoliticas() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS politica_rgpd (
      id_politica int unsigned NOT NULL AUTO_INCREMENT,
      tipo_politica varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'GERAL',
      versao varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
      titulo varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
      conteudo mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
      ativo tinyint(1) NOT NULL DEFAULT '0',
      data_publicacao datetime DEFAULT NULL,
      id_criador int unsigned DEFAULT NULL,
      id_atualizador int unsigned DEFAULT NULL,
      created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id_politica),
      UNIQUE KEY uq_politica_tipo_versao (tipo_politica, versao),
      KEY idx_politica_tipo_ativo (tipo_politica, ativo),
      KEY fk_politica_criador (id_criador),
      KEY fk_politica_atualizador (id_atualizador),
      CONSTRAINT fk_politica_criador FOREIGN KEY (id_criador) REFERENCES utilizador (id_utilizador) ON DELETE SET NULL,
      CONSTRAINT fk_politica_atualizador FOREIGN KEY (id_atualizador) REFERENCES utilizador (id_utilizador) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function listarMeus(req, res, next) {
  try {
    const [linhas] = await pool.query(
      `SELECT * FROM consentimento_rgpd WHERE id_utilizador = ? ORDER BY id_consentimento DESC`,
      [req.utilizador.id_utilizador]
    );
    res.json({ dados: linhas });
  } catch (err) { next(err); }
}

async function listarPoliticas(req, res, next) {
  try {
    await garantirTabelaPoliticas();
    const { tipo, ativo } = req.query;
    const where = [];
    const params = [];

    if (tipo) {
      const tipoNormalizado = obterTipoPolitica(tipo);
      if (!tipoNormalizado) return res.status(400).json({ erro: 'Tipo de política inválido.' });
      where.push('p.tipo_politica = ?');
      params.push(tipoNormalizado);
    }
    if (ativo !== undefined && ativo !== '') {
      where.push('p.ativo = ?');
      params.push(ativo === '1' || ativo === 'true' ? 1 : 0);
    }

    const [linhas] = await pool.query(
      `SELECT p.*,
              criador.nome AS nome_criador,
              atualizador.nome AS nome_atualizador
         FROM politica_rgpd p
         LEFT JOIN utilizador criador ON criador.id_utilizador = p.id_criador
         LEFT JOIN utilizador atualizador ON atualizador.id_utilizador = p.id_atualizador
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY p.tipo_politica ASC, p.ativo DESC, p.data_publicacao DESC, p.created_at DESC`,
      params
    );
    res.json({ dados: linhas });
  } catch (err) { next(err); }
}

async function obterPoliticaAtiva(req, res, next) {
  try {
    await garantirTabelaPoliticas();
    const tipo = obterTipoPolitica(req.query.tipo);
    if (!tipo) return res.status(400).json({ erro: 'Tipo de política inválido.' });
    const [linhas] = await pool.query(
      `SELECT *
         FROM politica_rgpd
        WHERE tipo_politica = ? AND ativo = 1
        ORDER BY data_publicacao DESC, id_politica DESC
        LIMIT 1`,
      [tipo]
    );
    res.json({ politica: linhas[0] || null });
  } catch (err) { next(err); }
}

async function criarPolitica(req, res, next) {
  const conn = await pool.getConnection();
  try {
    await garantirTabelaPoliticas();
    const tipo = obterTipoPolitica(req.body.tipo_politica);
    const versao = String(req.body.versao || '').trim();
    const titulo = String(req.body.titulo || '').trim();
    const conteudo = String(req.body.conteudo || '').trim();
    const ativo = req.body.ativo ? 1 : 0;

    const erroValidacao = validarCamposPolitica({ tipo, versao, titulo, conteudo });
    if (erroValidacao) return res.status(400).json({ erro: erroValidacao });

    await conn.beginTransaction();
    if (ativo) {
      await conn.query('UPDATE politica_rgpd SET ativo = 0 WHERE tipo_politica = ?', [tipo]);
    }

    const [result] = await conn.query(
      `INSERT INTO politica_rgpd
         (tipo_politica, versao, titulo, conteudo, ativo, data_publicacao, id_criador, id_atualizador)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tipo,
        versao,
        titulo,
        conteudo,
        ativo,
        ativo ? new Date() : null,
        req.utilizador.id_utilizador,
        req.utilizador.id_utilizador,
      ]
    );
    await conn.commit();
    res.status(201).json({ mensagem: 'Política RGPD criada.', id_politica: result.insertId });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ erro: 'Já existe uma política desse tipo com essa versão.' });
    next(err);
  } finally {
    conn.release();
  }
}

async function atualizarPolitica(req, res, next) {
  const conn = await pool.getConnection();
  try {
    await garantirTabelaPoliticas();
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ erro: 'ID inválido.' });

    const [[existente]] = await conn.query('SELECT * FROM politica_rgpd WHERE id_politica = ?', [id]);
    if (!existente) return res.status(404).json({ erro: 'Política RGPD não encontrada.' });

    const tipo = req.body.tipo_politica !== undefined
      ? obterTipoPolitica(req.body.tipo_politica)
      : existente.tipo_politica;
    const versao = req.body.versao !== undefined ? String(req.body.versao || '').trim() : existente.versao;
    const titulo = req.body.titulo !== undefined ? String(req.body.titulo || '').trim() : existente.titulo;
    const conteudo = req.body.conteudo !== undefined ? String(req.body.conteudo || '').trim() : existente.conteudo;
    const ativo = req.body.ativo !== undefined ? (req.body.ativo ? 1 : 0) : existente.ativo;

    const erroValidacao = validarCamposPolitica({ tipo, versao, titulo, conteudo });
    if (erroValidacao) return res.status(400).json({ erro: erroValidacao });

    await conn.beginTransaction();
    if (ativo) {
      await conn.query('UPDATE politica_rgpd SET ativo = 0 WHERE tipo_politica = ? AND id_politica <> ?', [tipo, id]);
    }

    await conn.query(
      `UPDATE politica_rgpd
          SET tipo_politica = ?,
              versao = ?,
              titulo = ?,
              conteudo = ?,
              ativo = ?,
              data_publicacao = CASE
                WHEN ? = 1 AND data_publicacao IS NULL THEN CURRENT_TIMESTAMP
                ELSE data_publicacao
              END,
              id_atualizador = ?
        WHERE id_politica = ?`,
      [tipo, versao, titulo, conteudo, ativo, ativo, req.utilizador.id_utilizador, id]
    );
    await conn.commit();
    res.json({ mensagem: 'Política RGPD atualizada.' });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ erro: 'Já existe uma política desse tipo com essa versão.' });
    next(err);
  } finally {
    conn.release();
  }
}

async function eliminarPolitica(req, res, next) {
  try {
    await garantirTabelaPoliticas();
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ erro: 'ID inválido.' });

    const [[existente]] = await pool.query('SELECT ativo FROM politica_rgpd WHERE id_politica = ?', [id]);
    if (!existente) return res.status(404).json({ erro: 'Política RGPD não encontrada.' });
    if (existente.ativo) return res.status(400).json({ erro: 'Não pode eliminar a política ativa. Desative ou publique outra versão primeiro.' });

    await pool.query('DELETE FROM politica_rgpd WHERE id_politica = ?', [id]);
    res.json({ mensagem: 'Política RGPD eliminada.' });
  } catch (err) { next(err); }
}

async function registar(req, res, next) {
  try {
    const { tipo_consentimento, aceite, versao_politica } = req.body;
    if (!tipo_consentimento) return res.status(400).json({ erro: 'tipo_consentimento é obrigatório.' });

    const [result] = await pool.query(
      `INSERT INTO consentimento_rgpd
         (id_utilizador, tipo_consentimento, aceite, data_aceitacao, versao_politica)
       VALUES (?, ?, ?, ?, ?)`,
      [
        req.utilizador.id_utilizador,
        tipo_consentimento,
        aceite ? 1 : 0,
        aceite ? new Date() : null,
        versao_politica || null,
      ]
    );
    res.status(201).json({ mensagem: 'Consentimento registado.', id_consentimento: result.insertId });
  } catch (err) { next(err); }
}

module.exports = {
  listarMeus,
  registar,
  listarPoliticas,
  obterPoliticaAtiva,
  criarPolitica,
  atualizarPolitica,
  eliminarPolitica,
};
