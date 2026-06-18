const { pool } = require('../db/connection');

async function contarDependenciasArea(idArea) {
  const [[niveis]] = await pool.query(
    'SELECT COUNT(*) AS total FROM nivel WHERE id_area = ?',
    [idArea]
  );
  const [[badges]] = await pool.query(
    `SELECT COUNT(*) AS total
       FROM badge b
       JOIN nivel n ON n.id_nivel = b.id_nivel
      WHERE n.id_area = ?`,
    [idArea]
  );
  const [[consultores]] = await pool.query(
    'SELECT COUNT(*) AS total FROM consultor_area WHERE id_area = ?',
    [idArea]
  );

  return {
    niveis: Number(niveis.total) || 0,
    badges: Number(badges.total) || 0,
    consultores: Number(consultores.total) || 0,
  };
}

function mensagemDependenciasArea(dependencias) {
  const partes = [];
  if (dependencias.niveis) partes.push(`${dependencias.niveis} nível(eis)`);
  if (dependencias.badges) partes.push(`${dependencias.badges} badge(s)`);
  if (dependencias.consultores) partes.push(`${dependencias.consultores} consultor(es) associado(s)`);

  return `Não é possível eliminar esta área porque tem ${partes.join(', ')}. Desative a área ou remova/reassocie estas dependências primeiro.`;
}

async function listar(req, res, next) {
  try {
    const { id_learning_path, id_service_line, pesquisa, ativo, pagina, por_pagina } = req.query;
    const where = [];
    const params = [];
    if (id_learning_path) { where.push('sl.id_learning_path = ?'); params.push(id_learning_path); }
    if (id_service_line) { where.push('a.id_service_line = ?'); params.push(id_service_line); }
    if (pesquisa) {
      where.push('(a.nome LIKE ? OR a.descricao LIKE ? OR sl.nome LIKE ? OR lp.nome LIKE ?)');
      params.push(`%${pesquisa}%`, `%${pesquisa}%`, `%${pesquisa}%`, `%${pesquisa}%`);
    }
    if (ativo !== undefined && ativo !== '') {
      where.push('a.ativo = ?');
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
      `SELECT a.*, sl.nome AS nome_service_line, lp.id_learning_path, lp.nome AS nome_learning_path,
              COUNT(DISTINCT n.id_nivel) AS total_niveis,
              COUNT(DISTINCT b.id_badge) AS total_badges,
              COUNT(DISTINCT ca.id_consultor_area) AS total_consultores
         FROM area a
         JOIN service_line sl ON sl.id_service_line = a.id_service_line
         JOIN learning_path lp ON lp.id_learning_path = sl.id_learning_path
         LEFT JOIN nivel n ON n.id_area = a.id_area
         LEFT JOIN badge b ON b.id_nivel = n.id_nivel
         LEFT JOIN consultor_area ca ON ca.id_area = a.id_area
         ${whereSQL}
        GROUP BY a.id_area, a.id_service_line, a.nome, a.descricao, a.ativo,
                 a.created_at, a.updated_at, sl.nome, lp.id_learning_path, lp.nome
        ORDER BY a.nome ASC
        ${paginacaoSQL}`,
      [...params, ...paginacaoParams]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
         FROM area a
         JOIN service_line sl ON sl.id_service_line = a.id_service_line
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
      `SELECT a.*, sl.nome AS nome_service_line, lp.id_learning_path, lp.nome AS nome_learning_path,
              COUNT(DISTINCT n.id_nivel) AS total_niveis,
              COUNT(DISTINCT b.id_badge) AS total_badges,
              COUNT(DISTINCT ca.id_consultor_area) AS total_consultores
         FROM area a
         JOIN service_line sl ON sl.id_service_line = a.id_service_line
         JOIN learning_path lp ON lp.id_learning_path = sl.id_learning_path
         LEFT JOIN nivel n ON n.id_area = a.id_area
         LEFT JOIN badge b ON b.id_nivel = n.id_nivel
         LEFT JOIN consultor_area ca ON ca.id_area = a.id_area
        WHERE a.id_area = ?
        GROUP BY a.id_area, a.id_service_line, a.nome, a.descricao, a.ativo,
                 a.created_at, a.updated_at, sl.nome, lp.id_learning_path, lp.nome`,
      [req.params.id]
    );
    if (linhas.length === 0) return res.status(404).json({ erro: 'Área não encontrada.' });
    res.json({ area: linhas[0] });
  } catch (err) { next(err); }
}

async function criar(req, res, next) {
  try {
    const { id_service_line, nome, descricao, ativo = 1 } = req.body;
    if (!id_service_line || !nome) {
      return res.status(400).json({ erro: 'id_service_line e nome são obrigatórios.' });
    }
    const [result] = await pool.query(
      'INSERT INTO area (id_service_line, nome, descricao, ativo) VALUES (?, ?, ?, ?)',
      [id_service_line, nome, descricao || null, ativo ? 1 : 0]
    );
    res.status(201).json({ mensagem: 'Área criada.', id_area: result.insertId });
  } catch (err) { next(err); }
}

async function atualizar(req, res, next) {
  try {
    const { id_service_line, nome, descricao, ativo } = req.body;
    const campos = [];
    const valores = [];

    if (id_service_line !== undefined) { campos.push('id_service_line = ?'); valores.push(id_service_line); }
    if (nome !== undefined)             { campos.push('nome = ?');             valores.push(nome); }
    if (descricao !== undefined)        { campos.push('descricao = ?');        valores.push(descricao); }
    if (ativo !== undefined)            { campos.push('ativo = ?');            valores.push(ativo ? 1 : 0); }

    if (campos.length === 0) return res.status(400).json({ erro: 'Nada para atualizar.' });

    valores.push(req.params.id);
    const [result] = await pool.query(
      `UPDATE area SET ${campos.join(', ')} WHERE id_area = ?`,
      valores
    );
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Área não encontrada.' });
    res.json({ mensagem: 'Área atualizada.' });
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const [area] = await pool.query('SELECT id_area FROM area WHERE id_area = ?', [req.params.id]);
    if (area.length === 0) return res.status(404).json({ erro: 'Área não encontrada.' });

    const dependencias = await contarDependenciasArea(req.params.id);
    if (dependencias.niveis || dependencias.badges || dependencias.consultores) {
      return res.status(409).json({
        erro: mensagemDependenciasArea(dependencias),
        dependencias,
      });
    }

    const [result] = await pool.query('DELETE FROM area WHERE id_area = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Área não encontrada.' });
    res.json({ mensagem: 'Área eliminada.' });
  } catch (err) { next(err); }
}

module.exports = { listar, obter, criar, atualizar, eliminar };
