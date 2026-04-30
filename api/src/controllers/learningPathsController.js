const { pool } = require('../db/connection');

async function listar(req, res, next) {
  try {
    const { pesquisa, ativo, pagina = 1, por_pagina = 5 } = req.query;
    const limit = Math.min(parseInt(por_pagina, 10) || 5, 100);
    const paginaAtual = Math.max(parseInt(pagina, 10) || 1, 1);
    const offset = (paginaAtual - 1) * limit;
    const where = [];
    const params = [];

    if (pesquisa) {
      where.push('(lp.nome LIKE ? OR lp.descricao LIKE ?)');
      params.push(`%${pesquisa}%`, `%${pesquisa}%`);
    }

    if (ativo !== undefined && ativo !== '') {
      where.push('lp.ativo = ?');
      params.push(ativo === '1' || ativo === 'true' ? 1 : 0);
    }

    const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [linhas] = await pool.query(
      `SELECT lp.id_learning_path, lp.nome, lp.descricao, lp.ativo, lp.created_at, lp.updated_at,
              COUNT(DISTINCT sl.id_service_line) AS total_service_lines,
              COUNT(DISTINCT b.id_badge) AS total_badges
         FROM learning_path lp
         LEFT JOIN service_line sl ON sl.id_learning_path = lp.id_learning_path
         LEFT JOIN area a          ON a.id_service_line   = sl.id_service_line
         LEFT JOIN nivel n         ON n.id_area           = a.id_area
         LEFT JOIN badge b         ON b.id_nivel          = n.id_nivel
         ${whereSQL}
        GROUP BY lp.id_learning_path, lp.nome, lp.descricao, lp.ativo, lp.created_at, lp.updated_at
        ORDER BY lp.nome ASC
        LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
         FROM learning_path lp
         ${whereSQL}`,
      params
    );

    res.json({ dados: linhas, total, pagina: paginaAtual, por_pagina: limit });
  } catch (err) { next(err); }
}

async function obter(req, res, next) {
  try {
    const [linhas] = await pool.query(
      `SELECT lp.*,
              COUNT(DISTINCT sl.id_service_line) AS total_service_lines,
              COUNT(DISTINCT b.id_badge) AS total_badges
         FROM learning_path lp
         LEFT JOIN service_line sl ON sl.id_learning_path = lp.id_learning_path
         LEFT JOIN area a          ON a.id_service_line   = sl.id_service_line
         LEFT JOIN nivel n         ON n.id_area           = a.id_area
         LEFT JOIN badge b         ON b.id_nivel          = n.id_nivel
        WHERE lp.id_learning_path = ?
        GROUP BY lp.id_learning_path`,
      [req.params.id]
    );
    if (linhas.length === 0) return res.status(404).json({ erro: 'Learning path não encontrado.' });
    res.json({ learning_path: linhas[0] });
  } catch (err) { next(err); }
}

async function criar(req, res, next) {
  try {
    const { nome, descricao, ativo = 1 } = req.body;
    if (!nome) return res.status(400).json({ erro: 'Nome é obrigatório.' });

    const [result] = await pool.query(
      'INSERT INTO learning_path (nome, descricao, ativo) VALUES (?, ?, ?)',
      [nome, descricao || null, ativo ? 1 : 0]
    );
    res.status(201).json({ mensagem: 'Learning path criado.', id_learning_path: result.insertId });
  } catch (err) { next(err); }
}

async function atualizar(req, res, next) {
  try {
    const { nome, descricao, ativo } = req.body;
    const campos = [];
    const valores = [];

    if (nome !== undefined)       { campos.push('nome = ?');       valores.push(nome); }
    if (descricao !== undefined)  { campos.push('descricao = ?');  valores.push(descricao); }
    if (ativo !== undefined)      { campos.push('ativo = ?');      valores.push(ativo ? 1 : 0); }

    if (campos.length === 0) return res.status(400).json({ erro: 'Nada para atualizar.' });

    valores.push(req.params.id);
    const [result] = await pool.query(
      `UPDATE learning_path SET ${campos.join(', ')} WHERE id_learning_path = ?`,
      valores
    );
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Learning path não encontrado.' });
    res.json({ mensagem: 'Learning path atualizado.' });
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const [result] = await pool.query(
      'DELETE FROM learning_path WHERE id_learning_path = ?',
      [req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Learning path não encontrado.' });
    res.json({ mensagem: 'Learning path eliminado.' });
  } catch (err) { next(err); }
}

module.exports = { listar, obter, criar, atualizar, eliminar };
