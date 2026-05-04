const { pool } = require('../db/connection');

async function listar(req, res, next) {
  try {
    const { id_learning_path, id_service_line, id_area, pesquisa, ativo, pagina, por_pagina } = req.query;
    const where = [];
    const params = [];
    if (id_learning_path) { where.push('sl.id_learning_path = ?'); params.push(id_learning_path); }
    if (id_service_line) { where.push('a.id_service_line = ?'); params.push(id_service_line); }
    if (id_area) { where.push('n.id_area = ?'); params.push(id_area); }
    if (pesquisa) {
      where.push('(n.codigo_nivel LIKE ? OR n.nome_nivel LIKE ? OR n.descricao LIKE ? OR a.nome LIKE ? OR sl.nome LIKE ? OR lp.nome LIKE ?)');
      params.push(`%${pesquisa}%`, `%${pesquisa}%`, `%${pesquisa}%`, `%${pesquisa}%`, `%${pesquisa}%`, `%${pesquisa}%`);
    }
    if (ativo !== undefined && ativo !== '') {
      where.push('n.ativo = ?');
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
      `SELECT n.*, MIN(a.created_at) AS created_at, a.nome AS nome_area,
              sl.id_service_line, sl.nome AS nome_service_line,
              lp.id_learning_path, lp.nome AS nome_learning_path,
              COUNT(DISTINCT br.id_requisito) AS total_requisitos,
              b.id_badge, b.titulo AS titulo_badge, b.imagem_url AS imagem_badge,
              b.pontos AS pontos_badge, b.tem_expiracao AS tem_expiracao_badge,
              b.validade_dias AS validade_dias_badge, b.ativo AS ativo_badge
         FROM nivel n
         JOIN area a ON a.id_area = n.id_area
         JOIN service_line sl ON sl.id_service_line = a.id_service_line
         JOIN learning_path lp ON lp.id_learning_path = sl.id_learning_path
         LEFT JOIN badge b ON b.id_nivel = n.id_nivel
         LEFT JOIN badge_requisito br ON br.id_badge = b.id_badge
         ${whereSQL}
        GROUP BY n.id_nivel, n.id_area, n.codigo_nivel, n.nome_nivel, n.ordem,
                 n.descricao, n.ativo, a.nome, sl.id_service_line, sl.nome,
                 lp.id_learning_path, lp.nome, b.id_badge, b.titulo, b.imagem_url,
                 b.pontos, b.tem_expiracao, b.validade_dias, b.ativo
        ORDER BY lp.nome, sl.nome, a.nome, n.ordem ASC
        ${paginacaoSQL}`,
      [...params, ...paginacaoParams]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
         FROM nivel n
         JOIN area a ON a.id_area = n.id_area
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
      `SELECT n.*, a.nome AS nome_area,
              sl.id_service_line, sl.nome AS nome_service_line,
              lp.id_learning_path, lp.nome AS nome_learning_path
         FROM nivel n
         JOIN area a ON a.id_area = n.id_area
         JOIN service_line sl ON sl.id_service_line = a.id_service_line
         JOIN learning_path lp ON lp.id_learning_path = sl.id_learning_path
        WHERE n.id_nivel = ?`,
      [req.params.id]
    );
    if (linhas.length === 0) return res.status(404).json({ erro: 'Nível não encontrado.' });

    const [badge] = await pool.query(
      'SELECT * FROM badge WHERE id_nivel = ?',
      [req.params.id]
    );

    const [requisitos] = badge[0]
      ? await pool.query(
        `SELECT r.*, br.ordem AS ordem_associacao, br.obrigatorio AS obrigatorio_badge
           FROM badge_requisito br
           JOIN requisito r ON r.id_requisito = br.id_requisito
          WHERE br.id_badge = ?
          ORDER BY br.ordem ASC, r.ordem ASC, r.codigo_requisito ASC`,
        [badge[0].id_badge]
      )
      : [[]];

    res.json({ nivel: linhas[0], requisitos, badge: badge[0] || null });
  } catch (err) { next(err); }
}

async function criar(req, res, next) {
  try {
    const { id_area, codigo_nivel, nome_nivel, ordem, descricao, ativo = 1 } = req.body;
    if (!id_area || !codigo_nivel || !nome_nivel || ordem === undefined) {
      return res.status(400).json({ erro: 'id_area, codigo_nivel, nome_nivel e ordem são obrigatórios.' });
    }
    const [result] = await pool.query(
      `INSERT INTO nivel (id_area, codigo_nivel, nome_nivel, ordem, descricao, ativo)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id_area, codigo_nivel, nome_nivel, ordem, descricao || null, ativo ? 1 : 0]
    );
    res.status(201).json({ mensagem: 'Nível criado.', id_nivel: result.insertId });
  } catch (err) { next(err); }
}

async function atualizar(req, res, next) {
  try {
    const { id_area, codigo_nivel, nome_nivel, ordem, descricao, ativo } = req.body;
    const campos = [];
    const valores = [];

    if (id_area !== undefined)      { campos.push('id_area = ?');      valores.push(id_area); }
    if (codigo_nivel !== undefined) { campos.push('codigo_nivel = ?'); valores.push(codigo_nivel); }
    if (nome_nivel !== undefined)   { campos.push('nome_nivel = ?');   valores.push(nome_nivel); }
    if (ordem !== undefined)        { campos.push('ordem = ?');        valores.push(ordem); }
    if (descricao !== undefined)    { campos.push('descricao = ?');    valores.push(descricao); }
    if (ativo !== undefined)        { campos.push('ativo = ?');        valores.push(ativo ? 1 : 0); }

    if (campos.length === 0) return res.status(400).json({ erro: 'Nada para atualizar.' });

    valores.push(req.params.id);
    const [result] = await pool.query(
      `UPDATE nivel SET ${campos.join(', ')} WHERE id_nivel = ?`,
      valores
    );
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Nível não encontrado.' });
    res.json({ mensagem: 'Nível atualizado.' });
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const [result] = await pool.query('DELETE FROM nivel WHERE id_nivel = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Nível não encontrado.' });
    res.json({ mensagem: 'Nível eliminado.' });
  } catch (err) { next(err); }
}

module.exports = { listar, obter, criar, atualizar, eliminar };
