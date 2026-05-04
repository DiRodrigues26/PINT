const { pool } = require('../db/connection');

async function dashboardConsultor(req, res, next) {
  try {
    const idUtilizador = req.utilizador.id_utilizador;

    const [[{ badges_obtidos }]] = await pool.query(
      'SELECT COUNT(*) AS badges_obtidos FROM badge_atribuido WHERE id_consultor = ?',
      [idUtilizador]
    );

    const [[{ badges_em_processo }]] = await pool.query(
      `SELECT COUNT(*) AS badges_em_processo FROM candidatura_badge
        WHERE id_consultor = ? AND estado_atual NOT IN ('APPROVED','REJECTED','CLOSED')`,
      [idUtilizador]
    );

    const [[{ pontos_totais }]] = await pool.query(
      `SELECT COALESCE(SUM(b.pontos), 0) AS pontos_totais
         FROM badge_atribuido ba
         JOIN badge b ON b.id_badge = ba.id_badge
        WHERE ba.id_consultor = ?`,
      [idUtilizador]
    );

    const [[{ conquistas }]] = await pool.query(
      'SELECT COUNT(*) AS conquistas FROM utilizador_conquista WHERE id_utilizador = ?',
      [idUtilizador]
    );

    const [candidaturasPorEstado] = await pool.query(
      `SELECT estado_atual, COUNT(*) AS total
         FROM candidatura_badge
        WHERE id_consultor = ?
        GROUP BY estado_atual`,
      [idUtilizador]
    );

    const [areaRows] = await pool.query(
      `SELECT ca.id_area, a.nome AS nome_area,
              sl.id_service_line, sl.nome AS nome_service_line,
              lp.id_learning_path, lp.nome AS nome_learning_path
         FROM consultor_area ca
         JOIN area a ON a.id_area = ca.id_area
         JOIN service_line sl ON sl.id_service_line = a.id_service_line
         JOIN learning_path lp ON lp.id_learning_path = sl.id_learning_path
        WHERE ca.id_utilizador = ? AND ca.ativo = 1 LIMIT 1`,
      [idUtilizador]
    );

    let progressoNiveis = [];
    let proximoNivelProgresso = 0;
    let nomeLP = null;
    let badgesRecomendados = [];

    if (areaRows.length > 0) {
      const { id_area, nome_learning_path } = areaRows[0];
      nomeLP = nome_learning_path;

      const [niveis] = await pool.query(
        `SELECT n.id_nivel, n.codigo_nivel, n.nome_nivel, n.ordem,
                COUNT(DISTINCT br.id_requisito) AS total_requisitos,
                b.id_badge,
                (ba.id_badge_atribuido IS NOT NULL) AS badge_obtido,
                (SELECT COUNT(DISTINCT ev.id_requisito)
                   FROM candidatura_badge cb2
                   JOIN evidencia ev ON ev.id_candidatura = cb2.id_candidatura
                   JOIN badge_requisito br2 ON br2.id_badge = cb2.id_badge AND br2.id_requisito = ev.id_requisito
                  WHERE cb2.id_badge = b.id_badge AND cb2.id_consultor = ?) AS requisitos_cumpridos
           FROM nivel n
           LEFT JOIN badge b ON b.id_nivel = n.id_nivel
           LEFT JOIN badge_requisito br ON br.id_badge = b.id_badge
           LEFT JOIN badge_atribuido ba ON ba.id_badge = b.id_badge AND ba.id_consultor = ?
          WHERE n.id_area = ? AND n.ativo = 1
          GROUP BY n.id_nivel, n.codigo_nivel, n.nome_nivel, n.ordem, b.id_badge, ba.id_badge_atribuido
          ORDER BY n.ordem ASC`,
        [idUtilizador, idUtilizador, id_area]
      );

      progressoNiveis = niveis.map((n) => {
        const total = Number(n.total_requisitos) || 0;
        const cumpridos = n.badge_obtido ? total : (Number(n.requisitos_cumpridos) || 0);
        const percentagem = total > 0 ? Math.round((cumpridos / total) * 100) : 0;
        return {
          codigo_nivel: n.codigo_nivel,
          nome_nivel: n.nome_nivel,
          ordem: n.ordem,
          total_requisitos: total,
          requisitos_cumpridos: cumpridos,
          percentagem,
          badge_obtido: !!n.badge_obtido,
        };
      });

      const incompleto = progressoNiveis.find((n) => !n.badge_obtido);
      proximoNivelProgresso = incompleto ? incompleto.percentagem : 100;

      const [recomendados] = await pool.query(
        `SELECT b.id_badge, b.titulo, b.pontos, b.imagem_url, b.is_conquista_especial,
                n.codigo_nivel, n.nome_nivel,
                sl.nome AS nome_service_line,
                a.nome AS nome_area
           FROM badge b
           JOIN nivel n ON n.id_nivel = b.id_nivel
           JOIN area a ON a.id_area = n.id_area
           JOIN service_line sl ON sl.id_service_line = a.id_service_line
           LEFT JOIN badge_atribuido ba ON ba.id_badge = b.id_badge AND ba.id_consultor = ?
          WHERE n.id_area = ? AND b.ativo = 1 AND ba.id_badge_atribuido IS NULL
            AND NOT EXISTS (
              SELECT 1 FROM candidatura_badge cb2
               WHERE cb2.id_badge = b.id_badge
                 AND cb2.id_consultor = ?
                 AND cb2.estado_atual NOT IN ('REJECTED','CLOSED')
            )
          ORDER BY n.ordem ASC
          LIMIT 3`,
        [idUtilizador, id_area, idUtilizador]
      );
      badgesRecomendados = recomendados;
    }

    const [atividadeRecente] = await pool.query(
      `SELECT hc.estado_destino, hc.acao, hc.comentario, hc.data_evento,
              b.titulo AS badge_titulo
         FROM historico_candidatura hc
         JOIN candidatura_badge cb ON cb.id_candidatura = hc.id_candidatura
         JOIN badge b ON b.id_badge = cb.id_badge
        WHERE cb.id_consultor = ?
        ORDER BY hc.data_evento DESC
        LIMIT 5`,
      [idUtilizador]
    );

    res.json({
      badges_obtidos,
      badges_em_processo,
      pontos_totais,
      conquistas,
      proximo_nivel_progresso: proximoNivelProgresso,
      nome_learning_path: nomeLP,
      candidaturas_por_estado: candidaturasPorEstado,
      progresso_niveis: progressoNiveis,
      badges_recomendados: badgesRecomendados,
      atividade_recente: atividadeRecente,
    });
  } catch (err) { next(err); }
}

async function dashboardGestor(req, res, next) {
  try {
    const [[{ total_utilizadores }]] = await pool.query(
      'SELECT COUNT(*) AS total_utilizadores FROM utilizador WHERE ativo = 1'
    );
    const [[{ total_badges_ativos }]] = await pool.query(
      'SELECT COUNT(*) AS total_badges_ativos FROM badge WHERE ativo = 1'
    );
    const [[{ total_badges_atribuidos }]] = await pool.query(
      'SELECT COUNT(*) AS total_badges_atribuidos FROM badge_atribuido'
    );
    const [[{ total_candidaturas_abertas }]] = await pool.query(
      `SELECT COUNT(*) AS total_candidaturas_abertas FROM candidatura_badge
        WHERE estado_atual NOT IN ('APPROVED','REJECTED','CLOSED')`
    );

    const [porLP] = await pool.query(
      `SELECT lp.id_learning_path, lp.nome, COUNT(DISTINCT b.id_badge) AS total
         FROM learning_path lp
         LEFT JOIN service_line sl ON sl.id_learning_path = lp.id_learning_path
         LEFT JOIN area a          ON a.id_service_line    = sl.id_service_line
         LEFT JOIN nivel n         ON n.id_area            = a.id_area
         LEFT JOIN badge b         ON b.id_nivel           = n.id_nivel
        GROUP BY lp.id_learning_path, lp.nome`
    );

    const [porArea] = await pool.query(
      `SELECT a.id_area, a.nome, COUNT(DISTINCT b.id_badge) AS total
         FROM area a
         LEFT JOIN nivel n ON n.id_area = a.id_area
         LEFT JOIN badge b ON b.id_nivel = n.id_nivel
        GROUP BY a.id_area, a.nome
        ORDER BY total DESC, a.nome ASC
        LIMIT 6`
    );

    const [porNivel] = await pool.query(
      `SELECT n.codigo_nivel, n.nome_nivel,
              COUNT(DISTINCT b.id_badge) AS total
         FROM nivel n
         LEFT JOIN badge b ON b.id_nivel = n.id_nivel
        GROUP BY n.codigo_nivel, n.nome_nivel, n.ordem
        ORDER BY n.ordem`
    );

    const [badgesMensal] = await pool.query(
      `SELECT DATE_FORMAT(data_atribuicao, '%Y-%m') AS mes, COUNT(*) AS total
         FROM badge_atribuido
        WHERE data_atribuicao >= DATE_SUB(CURRENT_DATE, INTERVAL 12 MONTH)
        GROUP BY mes
        ORDER BY mes`
    );

    const [estadosCandidatura] = await pool.query(
      `SELECT estado_atual, COUNT(*) AS total
         FROM candidatura_badge
        GROUP BY estado_atual`
    );

    const [badgeMaisObtido] = await pool.query(
      `SELECT b.titulo, COUNT(*) AS total
         FROM badge_atribuido ba
         JOIN badge b ON b.id_badge = ba.id_badge
        WHERE ba.data_atribuicao >= DATE_FORMAT(CURRENT_DATE, '%Y-%m-01')
        GROUP BY b.id_badge, b.titulo
        ORDER BY total DESC, b.titulo ASC
        LIMIT 1`
    );

    const [melhorServiceLine] = await pool.query(
      `SELECT sl.nome, COUNT(*) AS total
         FROM badge_atribuido ba
         JOIN badge b ON b.id_badge = ba.id_badge
         JOIN nivel n ON n.id_nivel = b.id_nivel
         JOIN area a ON a.id_area = n.id_area
         JOIN service_line sl ON sl.id_service_line = a.id_service_line
        GROUP BY sl.id_service_line, sl.nome
        ORDER BY total DESC, sl.nome ASC
        LIMIT 1`
    );

    const [[{ total_conquistas_especiais }]] = await pool.query(
      'SELECT COUNT(*) AS total_conquistas_especiais FROM utilizador_conquista'
    );

    const [[{ total_acoes_registadas }]] = await pool.query(
      'SELECT COUNT(*) AS total_acoes_registadas FROM historico_candidatura'
    );

    res.json({
      total_utilizadores,
      total_badges_ativos,
      total_badges_atribuidos,
      total_candidaturas_abertas,
      badges_por_learning_path: porLP,
      badges_por_area: porArea,
      badges_por_nivel: porNivel,
      badges_por_mes: badgesMensal,
      estados_candidatura: estadosCandidatura,
      badge_mais_obtido_mes: badgeMaisObtido[0] || null,
      melhor_service_line: melhorServiceLine[0] || null,
      total_conquistas_especiais,
      total_acoes_registadas,
    });
  } catch (err) { next(err); }
}

async function rankingConsultores(req, res, next) {
  try {
    const { id_service_line, id_area, limite = 20 } = req.query;

    const where = ['"Consultor" IN (SELECT p.nome_perfil FROM utilizador_perfil up JOIN perfil p ON p.id_perfil = up.id_perfil WHERE up.id_utilizador = u.id_utilizador)'];
    const params = [];

    if (id_service_line) {
      where.push(`EXISTS (
        SELECT 1 FROM consultor_area ca
          JOIN area a ON a.id_area = ca.id_area
         WHERE ca.id_utilizador = u.id_utilizador AND a.id_service_line = ?
      )`);
      params.push(id_service_line);
    }
    if (id_area) {
      where.push(`EXISTS (
        SELECT 1 FROM consultor_area ca
         WHERE ca.id_utilizador = u.id_utilizador AND ca.id_area = ?
      )`);
      params.push(id_area);
    }

    const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [linhas] = await pool.query(
      `SELECT u.id_utilizador, u.nome, u.url_slug,
              COUNT(DISTINCT ba.id_badge_atribuido) AS total_badges,
              COALESCE(SUM(b.pontos), 0) AS pontos_totais
         FROM utilizador u
         LEFT JOIN badge_atribuido ba ON ba.id_consultor = u.id_utilizador
         LEFT JOIN badge b ON b.id_badge = ba.id_badge
         ${whereSQL}
         GROUP BY u.id_utilizador, u.nome, u.url_slug
         ORDER BY pontos_totais DESC, total_badges DESC
         LIMIT ?`,
      [...params, parseInt(limite, 10)]
    );

    res.json({ dados: linhas });
  } catch (err) { next(err); }
}

module.exports = { dashboardConsultor, dashboardGestor, rankingConsultores };
