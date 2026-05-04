const { pool } = require('../db/connection');

async function listar(req, res, next) {
  try {
    const { id_learning_path, id_service_line, id_area, id_nivel, pesquisa, ativo, pagina, por_pagina } = req.query;
    const where = [];
    const params = [];

    if (id_learning_path) { where.push('sl.id_learning_path = ?'); params.push(id_learning_path); }
    if (id_service_line) { where.push('a.id_service_line = ?'); params.push(id_service_line); }
    if (id_area) { where.push('n.id_area = ?'); params.push(id_area); }
    if (id_nivel) { where.push('ee.id_nivel = ?'); params.push(id_nivel); }
    if (pesquisa) {
      where.push('(ee.titulo LIKE ? OR ee.descricao LIKE ? OR b.titulo LIKE ? OR a.nome LIKE ? OR sl.nome LIKE ? OR lp.nome LIKE ?)');
      params.push(`%${pesquisa}%`, `%${pesquisa}%`, `%${pesquisa}%`, `%${pesquisa}%`, `%${pesquisa}%`, `%${pesquisa}%`);
    }
    if (ativo !== undefined && ativo !== '') {
      where.push('ee.ativo = ?');
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
      `SELECT ee.*, n.codigo_nivel, n.nome_nivel,
              a.id_area, a.nome AS nome_area,
              sl.id_service_line, sl.nome AS nome_service_line,
              lp.id_learning_path, lp.nome AS nome_learning_path,
              b.titulo AS titulo_badge, b.imagem_url AS imagem_badge,
              b.pontos AS pontos_badge, b.tem_expiracao AS tem_expiracao_badge,
              b.validade_dias AS validade_dias_badge, b.ativo AS ativo_badge,
              (SELECT COUNT(*) FROM evento_especial_requisito WHERE id_evento = ee.id_evento) AS n_requisitos
         FROM evento_especial ee
         JOIN nivel n ON n.id_nivel = ee.id_nivel
         JOIN area a ON a.id_area = n.id_area
         JOIN service_line sl ON sl.id_service_line = a.id_service_line
         JOIN learning_path lp ON lp.id_learning_path = sl.id_learning_path
         LEFT JOIN badge b ON b.id_badge = ee.id_badge
         ${whereSQL}
        ORDER BY ee.data_criacao DESC, ee.data_limite ASC
        ${paginacaoSQL}`,
      [...params, ...paginacaoParams]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
         FROM evento_especial ee
         JOIN nivel n ON n.id_nivel = ee.id_nivel
         JOIN area a ON a.id_area = n.id_area
         JOIN service_line sl ON sl.id_service_line = a.id_service_line
         JOIN learning_path lp ON lp.id_learning_path = sl.id_learning_path
         LEFT JOIN badge b ON b.id_badge = ee.id_badge
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
      `SELECT ee.*, n.codigo_nivel, n.nome_nivel,
              a.id_area, a.nome AS nome_area,
              sl.id_service_line, sl.nome AS nome_service_line,
              lp.id_learning_path, lp.nome AS nome_learning_path,
              b.titulo AS titulo_badge, b.imagem_url AS imagem_badge,
              b.pontos AS pontos_badge, b.tem_expiracao AS tem_expiracao_badge,
              b.validade_dias AS validade_dias_badge, b.ativo AS ativo_badge
         FROM evento_especial ee
         JOIN nivel n ON n.id_nivel = ee.id_nivel
         JOIN area a ON a.id_area = n.id_area
         JOIN service_line sl ON sl.id_service_line = a.id_service_line
         JOIN learning_path lp ON lp.id_learning_path = sl.id_learning_path
         LEFT JOIN badge b ON b.id_badge = ee.id_badge
        WHERE ee.id_evento = ?`,
      [req.params.id]
    );
    if (linhas.length === 0) return res.status(404).json({ erro: 'Evento não encontrado.' });

    const [requisitos] = await pool.query(
      'SELECT * FROM evento_especial_requisito WHERE id_evento = ? ORDER BY ordem',
      [req.params.id]
    );

    res.json({ evento: linhas[0], requisitos });
  } catch (err) { next(err); }
}

async function criar(req, res, next) {
  try {
    const { id_nivel, id_badge, titulo, descricao, data_limite, ativo = 1 } = req.body;
    if (!id_nivel || !titulo) {
      return res.status(400).json({ erro: 'id_nivel e titulo são obrigatórios.' });
    }

    const [result] = await pool.query(
      `INSERT INTO evento_especial (id_nivel, id_badge, titulo, descricao, data_limite, ativo)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id_nivel, id_badge || null, titulo, descricao || null, data_limite || null, ativo ? 1 : 0]
    );
    res.status(201).json({ mensagem: 'Evento criado.', id_evento: result.insertId });
  } catch (err) { next(err); }
}

async function atualizar(req, res, next) {
  try {
    const editaveis = ['id_nivel', 'id_badge', 'titulo', 'descricao', 'data_limite', 'ativo'];
    const campos = [];
    const valores = [];
    for (const c of editaveis) {
      if (req.body[c] !== undefined) {
        campos.push(`${c} = ?`);
        valores.push(c === 'ativo' ? (req.body[c] ? 1 : 0) : req.body[c]);
      }
    }
    if (campos.length === 0) return res.status(400).json({ erro: 'Nada para atualizar.' });

    valores.push(req.params.id);
    const [result] = await pool.query(
      `UPDATE evento_especial SET ${campos.join(', ')} WHERE id_evento = ?`,
      valores
    );
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Evento não encontrado.' });
    res.json({ mensagem: 'Evento atualizado.' });
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const [result] = await pool.query('DELETE FROM evento_especial WHERE id_evento = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Evento não encontrado.' });
    res.json({ mensagem: 'Evento eliminado.' });
  } catch (err) { next(err); }
}

async function adicionarRequisito(req, res, next) {
  try {
    const { id } = req.params;
    const { titulo, descricao, ordem = 1 } = req.body;
    if (!titulo) return res.status(400).json({ erro: 'Título é obrigatório.' });

    const [result] = await pool.query(
      `INSERT INTO evento_especial_requisito (id_evento, titulo, descricao, ordem)
       VALUES (?, ?, ?, ?)`,
      [id, titulo, descricao || null, ordem]
    );
    res.status(201).json({ mensagem: 'Requisito adicionado.', id_ee_requisito: result.insertId });
  } catch (err) { next(err); }
}

async function removerRequisito(req, res, next) {
  try {
    const { idRequisito } = req.params;
    const [result] = await pool.query(
      'DELETE FROM evento_especial_requisito WHERE id_ee_requisito = ?',
      [idRequisito]
    );
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Requisito não encontrado.' });
    res.json({ mensagem: 'Requisito removido.' });
  } catch (err) { next(err); }
}

module.exports = { listar, obter, criar, atualizar, eliminar, adicionarRequisito, removerRequisito };
