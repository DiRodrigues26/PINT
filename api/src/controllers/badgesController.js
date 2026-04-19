const { pool } = require('../db/connection');

async function listar(req, res, next) {
  try {
    const {
      id_nivel, id_area, id_service_line, id_learning_path,
      is_conquista_especial, ativo, pesquisa,
      pagina = 1, por_pagina = 20,
    } = req.query;

    const limit = Math.min(parseInt(por_pagina, 10) || 20, 100);
    const offset = (Math.max(parseInt(pagina, 10) || 1, 1) - 1) * limit;

    const where = [];
    const params = [];

    if (id_nivel)              { where.push('b.id_nivel = ?');                  params.push(id_nivel); }
    if (id_area)               { where.push('n.id_area = ?');                   params.push(id_area); }
    if (id_service_line)       { where.push('a.id_service_line = ?');           params.push(id_service_line); }
    if (id_learning_path)      { where.push('sl.id_learning_path = ?');         params.push(id_learning_path); }
    if (is_conquista_especial !== undefined) {
      where.push('b.is_conquista_especial = ?');
      params.push(is_conquista_especial === '1' || is_conquista_especial === 'true' ? 1 : 0);
    }
    if (ativo !== undefined) {
      where.push('b.ativo = ?');
      params.push(ativo === '1' || ativo === 'true' ? 1 : 0);
    }
    if (pesquisa) {
      where.push('(b.titulo LIKE ? OR b.descricao LIKE ?)');
      params.push(`%${pesquisa}%`, `%${pesquisa}%`);
    }

    const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [linhas] = await pool.query(
      `SELECT b.*,
              n.codigo_nivel, n.nome_nivel, n.ordem AS ordem_nivel,
              a.id_area, a.nome AS nome_area,
              sl.id_service_line, sl.nome AS nome_service_line,
              lp.id_learning_path, lp.nome AS nome_learning_path
         FROM badge b
         JOIN nivel n         ON n.id_nivel         = b.id_nivel
         JOIN area a          ON a.id_area          = n.id_area
         JOIN service_line sl ON sl.id_service_line = a.id_service_line
         JOIN learning_path lp ON lp.id_learning_path = sl.id_learning_path
         ${whereSQL}
         ORDER BY lp.nome, sl.nome, a.nome, n.ordem
         LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
         FROM badge b
         JOIN nivel n         ON n.id_nivel         = b.id_nivel
         JOIN area a          ON a.id_area          = n.id_area
         JOIN service_line sl ON sl.id_service_line = a.id_service_line
         ${whereSQL}`,
      params
    );

    res.json({ dados: linhas, total, pagina: Number(pagina), por_pagina: limit });
  } catch (err) { next(err); }
}

async function obter(req, res, next) {
  try {
    const [linhas] = await pool.query(
      `SELECT b.*,
              n.codigo_nivel, n.nome_nivel, n.ordem AS ordem_nivel, n.descricao AS descricao_nivel,
              a.id_area, a.nome AS nome_area,
              sl.id_service_line, sl.nome AS nome_service_line,
              lp.id_learning_path, lp.nome AS nome_learning_path
         FROM badge b
         JOIN nivel n         ON n.id_nivel         = b.id_nivel
         JOIN area a          ON a.id_area          = n.id_area
         JOIN service_line sl ON sl.id_service_line = a.id_service_line
         JOIN learning_path lp ON lp.id_learning_path = sl.id_learning_path
        WHERE b.id_badge = ?`,
      [req.params.id]
    );
    if (linhas.length === 0) return res.status(404).json({ erro: 'Badge não encontrado.' });

    const [requisitos] = await pool.query(
      'SELECT * FROM requisito WHERE id_nivel = ? ORDER BY ordem ASC, codigo_requisito ASC',
      [linhas[0].id_nivel]
    );

    res.json({ badge: linhas[0], requisitos });
  } catch (err) { next(err); }
}

async function criar(req, res, next) {
  try {
    const {
      id_nivel, titulo, descricao, imagem_url, pontos = 0,
      tem_expiracao = 0, validade_dias, intervalo_temporal_obtencao,
      is_conquista_especial = 0, beneficios, competencias_certificadas,
      sobre_certificacao, ativo = 1,
    } = req.body;

    if (!id_nivel || !titulo) {
      return res.status(400).json({ erro: 'id_nivel e titulo são obrigatórios.' });
    }

    const [result] = await pool.query(
      `INSERT INTO badge
         (id_nivel, titulo, descricao, imagem_url, pontos, tem_expiracao, validade_dias,
          intervalo_temporal_obtencao, is_conquista_especial, beneficios,
          competencias_certificadas, sobre_certificacao, ativo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id_nivel, titulo, descricao || null, imagem_url || null, pontos,
        tem_expiracao ? 1 : 0, validade_dias || null, intervalo_temporal_obtencao || null,
        is_conquista_especial ? 1 : 0, beneficios || null,
        competencias_certificadas || null, sobre_certificacao || null, ativo ? 1 : 0,
      ]
    );

    res.status(201).json({ mensagem: 'Badge criado.', id_badge: result.insertId });
  } catch (err) { next(err); }
}

async function atualizar(req, res, next) {
  try {
    const editaveis = [
      'titulo', 'descricao', 'imagem_url', 'pontos', 'tem_expiracao',
      'validade_dias', 'intervalo_temporal_obtencao', 'is_conquista_especial',
      'beneficios', 'competencias_certificadas', 'sobre_certificacao', 'ativo',
    ];
    const booleanos = ['tem_expiracao', 'is_conquista_especial', 'ativo'];

    const campos = [];
    const valores = [];

    for (const c of editaveis) {
      if (req.body[c] !== undefined) {
        campos.push(`${c} = ?`);
        valores.push(booleanos.includes(c) ? (req.body[c] ? 1 : 0) : req.body[c]);
      }
    }

    if (campos.length === 0) return res.status(400).json({ erro: 'Nada para atualizar.' });

    valores.push(req.params.id);
    const [result] = await pool.query(
      `UPDATE badge SET ${campos.join(', ')} WHERE id_badge = ?`,
      valores
    );
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Badge não encontrado.' });
    res.json({ mensagem: 'Badge atualizado.' });
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const [result] = await pool.query('DELETE FROM badge WHERE id_badge = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Badge não encontrado.' });
    res.json({ mensagem: 'Badge eliminado.' });
  } catch (err) { next(err); }
}

async function recomendacoesParaMim(req, res, next) {
  try {
    const idUtilizador = req.utilizador.id_utilizador;

    // obter área do consultor
    const [area] = await pool.query(
      `SELECT id_area FROM consultor_area WHERE id_utilizador = ? AND ativo = 1 LIMIT 1`,
      [idUtilizador]
    );

    // níveis já conquistados
    const [jaTem] = await pool.query(
      `SELECT b.id_nivel, n.id_area, n.ordem
         FROM badge_atribuido ba
         JOIN badge b ON b.id_badge = ba.id_badge
         JOIN nivel n ON n.id_nivel = b.id_nivel
        WHERE ba.id_consultor = ?`,
      [idUtilizador]
    );

    const niveisTer = new Set(jaTem.map(r => r.id_nivel));
    const ordemPorArea = {};
    for (const r of jaTem) {
      if (!ordemPorArea[r.id_area] || r.ordem > ordemPorArea[r.id_area]) {
        ordemPorArea[r.id_area] = r.ordem;
      }
    }

    // badges da área do consultor que ainda não tem
    const idAreaConsultor = area[0]?.id_area;
    const where = ['b.ativo = 1'];
    const params = [];
    if (idAreaConsultor) {
      where.push('n.id_area = ?');
      params.push(idAreaConsultor);
    }
    if (niveisTer.size > 0) {
      where.push(`b.id_nivel NOT IN (${Array.from(niveisTer).map(() => '?').join(',')})`);
      params.push(...niveisTer);
    }

    const [candidatos] = await pool.query(
      `SELECT b.id_badge, b.titulo, b.imagem_url, b.pontos,
              n.codigo_nivel, n.nome_nivel, n.ordem,
              a.id_area, a.nome AS nome_area
         FROM badge b
         JOIN nivel n ON n.id_nivel = b.id_nivel
         JOIN area a  ON a.id_area  = n.id_area
        WHERE ${where.join(' AND ')}
        ORDER BY n.ordem ASC
        LIMIT 10`,
      params
    );

    // priorizar próximo nível (ordem atual + 1)
    const proximoNivel = idAreaConsultor ? (ordemPorArea[idAreaConsultor] || 0) + 1 : null;
    const ordenados = [...candidatos].sort((a, b) => {
      const aMatch = proximoNivel && a.ordem === proximoNivel ? -1 : 0;
      const bMatch = proximoNivel && b.ordem === proximoNivel ? -1 : 0;
      return aMatch - bMatch;
    });

    res.json({ dados: ordenados.slice(0, 6) });
  } catch (err) { next(err); }
}

module.exports = { listar, obter, criar, atualizar, eliminar, recomendacoesParaMim };
