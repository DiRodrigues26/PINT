const { pool } = require('../db/connection');

async function listar(req, res, next) {
  try {
    const { id_learning_path, pesquisa, ativo, pagina, por_pagina } = req.query;
    const where = [];
    const params = [];
    if (id_learning_path) { where.push('sl.id_learning_path = ?'); params.push(id_learning_path); }
    if (pesquisa) {
      where.push('(sl.nome LIKE ? OR sl.descricao LIKE ? OR lp.nome LIKE ?)');
      params.push(`%${pesquisa}%`, `%${pesquisa}%`, `%${pesquisa}%`);
    }
    if (ativo !== undefined && ativo !== '') {
      where.push('sl.ativo = ?');
      params.push(ativo === '1' || ativo === 'true' ? 1 : 0);
    }

    const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const usarPaginacao = pagina !== undefined || por_pagina !== undefined;
    const limit = Math.min(parseInt(por_pagina, 10) || 20, 100);
    const paginaAtual = Math.max(parseInt(pagina, 10) || 1, 1);
    const offset = (paginaAtual - 1) * limit;
    const paginacaoSQL = usarPaginacao ? 'LIMIT ? OFFSET ?' : '';
    const paginacaoParams = usarPaginacao ? [limit, offset] : [];

    const [linhas] = await pool.query(
      `SELECT sl.*, lp.nome AS nome_learning_path,
              COUNT(DISTINCT a.id_area) AS total_areas,
              COUNT(DISTINCT b.id_badge) AS total_badges
         FROM service_line sl
         JOIN learning_path lp ON lp.id_learning_path = sl.id_learning_path
         LEFT JOIN area a      ON a.id_service_line   = sl.id_service_line
         LEFT JOIN nivel n     ON n.id_area           = a.id_area
         LEFT JOIN badge b     ON b.id_nivel          = n.id_nivel
         ${whereSQL}
        GROUP BY sl.id_service_line, sl.id_learning_path, sl.nome, sl.descricao,
                 sl.ativo, sl.created_at, sl.updated_at, lp.nome
        ORDER BY sl.nome ASC
        ${paginacaoSQL}`,
      [...params, ...paginacaoParams]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
         FROM service_line sl
         JOIN learning_path lp ON lp.id_learning_path = sl.id_learning_path
         ${whereSQL}`,
      params
    );

    res.json({
      dados: linhas,
      total,
      pagina: usarPaginacao ? paginaAtual : 1,
      por_pagina: usarPaginacao ? limit : total,
    });
  } catch (err) { next(err); }
}

async function obter(req, res, next) {
  try {
    const [linhas] = await pool.query(
      `SELECT sl.*, lp.nome AS nome_learning_path,
              COUNT(DISTINCT a.id_area) AS total_areas,
              COUNT(DISTINCT b.id_badge) AS total_badges
         FROM service_line sl
         JOIN learning_path lp ON lp.id_learning_path = sl.id_learning_path
         LEFT JOIN area a      ON a.id_service_line   = sl.id_service_line
         LEFT JOIN nivel n     ON n.id_area           = a.id_area
         LEFT JOIN badge b     ON b.id_nivel          = n.id_nivel
        WHERE sl.id_service_line = ?
        GROUP BY sl.id_service_line, sl.id_learning_path, sl.nome, sl.descricao,
                 sl.ativo, sl.created_at, sl.updated_at, lp.nome`,
      [req.params.id]
    );
    if (linhas.length === 0) return res.status(404).json({ erro: 'Service line não encontrada.' });
    res.json({ service_line: linhas[0] });
  } catch (err) { next(err); }
}

async function criar(req, res, next) {
  try {
    const { id_learning_path, nome, descricao, ativo = 1 } = req.body;
    if (!id_learning_path || !nome) {
      return res.status(400).json({ erro: 'id_learning_path e nome são obrigatórios.' });
    }
    const [result] = await pool.query(
      `INSERT INTO service_line (id_learning_path, nome, descricao, ativo)
       VALUES (?, ?, ?, ?)`,
      [id_learning_path, nome, descricao || null, ativo ? 1 : 0]
    );
    res.status(201).json({ mensagem: 'Service line criada.', id_service_line: result.insertId });
  } catch (err) { next(err); }
}

async function atualizar(req, res, next) {
  try {
    const { id_learning_path, nome, descricao, ativo } = req.body;
    const campos = [];
    const valores = [];

    if (id_learning_path !== undefined) { campos.push('id_learning_path = ?'); valores.push(id_learning_path); }
    if (nome !== undefined)              { campos.push('nome = ?');              valores.push(nome); }
    if (descricao !== undefined)         { campos.push('descricao = ?');         valores.push(descricao); }
    if (ativo !== undefined)             { campos.push('ativo = ?');             valores.push(ativo ? 1 : 0); }

    if (campos.length === 0) return res.status(400).json({ erro: 'Nada para atualizar.' });

    valores.push(req.params.id);
    const [result] = await pool.query(
      `UPDATE service_line SET ${campos.join(', ')} WHERE id_service_line = ?`,
      valores
    );
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Service line não encontrada.' });
    res.json({ mensagem: 'Service line atualizada.' });
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const [result] = await pool.query(
      'DELETE FROM service_line WHERE id_service_line = ?',
      [req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Service line não encontrada.' });
    res.json({ mensagem: 'Service line eliminada.' });
  } catch (err) { next(err); }
}

module.exports = { listar, obter, criar, atualizar, eliminar };
