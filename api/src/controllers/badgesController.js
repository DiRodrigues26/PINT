const { pool } = require('../db/connection');

async function contarDependenciasBadge(idBadge) {
  const [[candidaturas]] = await pool.query(
    'SELECT COUNT(*) AS total FROM candidatura_badge WHERE id_badge = ?',
    [idBadge]
  );
  const [[atribuidos]] = await pool.query(
    'SELECT COUNT(*) AS total FROM badge_atribuido WHERE id_badge = ?',
    [idBadge]
  );

  return {
    candidaturas: Number(candidaturas.total) || 0,
    badges_atribuidos: Number(atribuidos.total) || 0,
  };
}

function mensagemDependenciasBadge(dependencias) {
  const partes = [];
  if (dependencias.candidaturas) partes.push(`${dependencias.candidaturas} candidatura(s)`);
  if (dependencias.badges_atribuidos) partes.push(`${dependencias.badges_atribuidos} badge(s) atribuído(s)`);

  return `Não é possível eliminar este badge porque tem ${partes.join(', ')}. Desative o badge ou remova/reassocie estas dependências primeiro.`;
}

async function listar(req, res, next) {
  try {
    const {
      id_nivel, id_area, id_service_line, id_learning_path,
      is_conquista_especial, ativo, estado, pesquisa,
      pagina = 1, por_pagina = 20,
    } = req.query;

    const limit = Math.min(parseInt(por_pagina, 10) || 20, 100);
    const offset = (Math.max(parseInt(pagina, 10) || 1, 1) - 1) * limit;

    const where = [];
    const params = [];
    const expiradoSQL = `(b.ativo = 1 AND b.tem_expiracao = 1 AND b.validade_dias IS NOT NULL
      AND DATE_ADD(b.created_at, INTERVAL b.validade_dias DAY) < CURRENT_TIMESTAMP)`;

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
    if (estado) {
      const estadoNormalizado = String(estado).toLowerCase();
      if (estadoNormalizado === 'inativo') {
        where.push('b.ativo = 0');
      } else if (estadoNormalizado === 'expirado') {
        where.push(expiradoSQL);
      } else if (estadoNormalizado === 'ativo') {
        where.push(`b.ativo = 1 AND NOT ${expiradoSQL}`);
      }
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
              lp.id_learning_path, lp.nome AS nome_learning_path,
              CASE
                WHEN b.tem_expiracao = 1 AND b.validade_dias IS NOT NULL
                THEN DATE_ADD(b.created_at, INTERVAL b.validade_dias DAY)
                ELSE NULL
              END AS data_expiracao_badge,
              CASE
                WHEN b.ativo = 0 THEN 'Inativo'
                WHEN b.tem_expiracao = 1 AND b.validade_dias IS NOT NULL
                     AND DATE_ADD(b.created_at, INTERVAL b.validade_dias DAY) < CURRENT_TIMESTAMP THEN 'Expirado'
                ELSE 'Ativo'
              END AS estado_badge,
              (SELECT COUNT(*) FROM badge_requisito br WHERE br.id_badge = b.id_badge) AS total_requisitos
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
      `SELECT r.*, br.ordem AS ordem_associacao, br.obrigatorio AS obrigatorio_badge
         FROM badge_requisito br
         JOIN requisito r ON r.id_requisito = br.id_requisito
        WHERE br.id_badge = ?
        ORDER BY br.ordem ASC, r.ordem ASC, r.codigo_requisito ASC`,
      [req.params.id]
    );

    res.json({ badge: linhas[0], requisitos });
  } catch (err) { next(err); }
}

/* Página pública do badge (catálogo) — acessível sem autenticação.
   Devolve apenas campos não sensíveis e só badges ativos. */
async function badgePublico(req, res, next) {
  try {
    const [linhas] = await pool.query(
      `SELECT b.id_badge, b.titulo, b.descricao, b.imagem_url, b.pontos,
              b.tem_expiracao, b.validade_dias, b.is_conquista_especial,
              b.beneficios, b.competencias_certificadas, b.sobre_certificacao,
              n.codigo_nivel, n.nome_nivel,
              a.nome AS nome_area,
              sl.nome AS nome_service_line,
              lp.nome AS nome_learning_path
         FROM badge b
         JOIN nivel n         ON n.id_nivel         = b.id_nivel
         JOIN area a          ON a.id_area          = n.id_area
         JOIN service_line sl ON sl.id_service_line = a.id_service_line
         JOIN learning_path lp ON lp.id_learning_path = sl.id_learning_path
        WHERE b.id_badge = ? AND b.ativo = 1`,
      [req.params.id]
    );
    if (linhas.length === 0) return res.status(404).json({ erro: 'Badge não encontrado.' });

    const [requisitos] = await pool.query(
      `SELECT r.id_requisito, r.codigo_requisito, r.titulo, r.descricao, r.tipo_evidencia,
              br.ordem AS ordem_associacao, br.obrigatorio AS obrigatorio_badge
         FROM badge_requisito br
         JOIN requisito r ON r.id_requisito = br.id_requisito
        WHERE br.id_badge = ?
        ORDER BY br.ordem ASC, r.ordem ASC, r.codigo_requisito ASC`,
      [req.params.id]
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
      sobre_certificacao, ativo = 1, requisitos = [],
    } = req.body;

    if (!id_nivel || !titulo) {
      return res.status(400).json({ erro: 'id_nivel e titulo são obrigatórios.' });
    }

    const [[nivel]] = await pool.query('SELECT id_nivel FROM nivel WHERE id_nivel = ?', [id_nivel]);
    if (!nivel) return res.status(404).json({ erro: 'Nível não encontrado.' });

    const [[badgeExistente]] = await pool.query('SELECT id_badge, titulo FROM badge WHERE id_nivel = ?', [id_nivel]);
    if (badgeExistente) {
      return res.status(409).json({
        erro: `Este nível já tem o badge "${badgeExistente.titulo}". Edita o badge existente em vez de criar outro.`,
        id_badge: badgeExistente.id_badge,
      });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [result] = await conn.query(
        `INSERT INTO badge
           (id_nivel, titulo, descricao, imagem_url, pontos, tem_expiracao, validade_dias,
            intervalo_temporal_obtencao, is_conquista_especial, beneficios,
            competencias_certificadas, sobre_certificacao, ativo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id_nivel, titulo, descricao || null, imagem_url || null, Number(pontos) || 0,
          tem_expiracao ? 1 : 0, tem_expiracao ? (validade_dias || null) : null,
          intervalo_temporal_obtencao || null,
          is_conquista_especial ? 1 : 0, beneficios || null,
          competencias_certificadas || null, sobre_certificacao || null, ativo ? 1 : 0,
        ]
      );

      for (const [idx, idRequisito] of (Array.isArray(requisitos) ? requisitos : []).entries()) {
        await conn.query(
          `INSERT IGNORE INTO badge_requisito (id_badge, id_requisito, ordem, obrigatorio)
           VALUES (?, ?, ?, 1)`,
          [result.insertId, idRequisito, idx + 1]
        );
      }

      await conn.commit();
      res.status(201).json({ mensagem: 'Badge criado.', id_badge: result.insertId });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) { next(err); }
}

async function atualizar(req, res, next) {
  try {
    const editaveis = [
      'id_nivel', 'titulo', 'descricao', 'imagem_url', 'pontos', 'tem_expiracao',
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

    if (campos.length === 0 && req.body.requisitos === undefined) {
      return res.status(400).json({ erro: 'Nada para atualizar.' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      let result = { affectedRows: 1 };
      if (campos.length > 0) {
        valores.push(req.params.id);
        [result] = await conn.query(
          `UPDATE badge SET ${campos.join(', ')} WHERE id_badge = ?`,
          valores
        );
      } else {
        const [existe] = await conn.query('SELECT id_badge FROM badge WHERE id_badge = ?', [req.params.id]);
        result.affectedRows = existe.length;
      }

      if (result.affectedRows === 0) {
        await conn.rollback();
        return res.status(404).json({ erro: 'Badge não encontrado.' });
      }

      if (req.body.requisitos !== undefined) {
        const requisitos = Array.isArray(req.body.requisitos) ? req.body.requisitos : [];
        await conn.query('DELETE FROM badge_requisito WHERE id_badge = ?', [req.params.id]);
        for (const [idx, idRequisito] of requisitos.entries()) {
          await conn.query(
            `INSERT IGNORE INTO badge_requisito (id_badge, id_requisito, ordem, obrigatorio)
             VALUES (?, ?, ?, 1)`,
            [req.params.id, idRequisito, idx + 1]
          );
        }
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    res.json({ mensagem: 'Badge atualizado.' });
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const [badge] = await pool.query('SELECT id_badge FROM badge WHERE id_badge = ?', [req.params.id]);
    if (badge.length === 0) return res.status(404).json({ erro: 'Badge não encontrado.' });

    const dependencias = await contarDependenciasBadge(req.params.id);
    if (dependencias.candidaturas || dependencias.badges_atribuidos) {
      return res.status(409).json({
        erro: mensagemDependenciasBadge(dependencias),
        dependencias,
      });
    }

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

module.exports = { listar, obter, badgePublico, criar, atualizar, eliminar, recomendacoesParaMim };
