const { pool } = require('../db/connection');

async function dashboardConsultor(req, res, next) {
  try {
    const idUtilizador = req.utilizador.id_utilizador;

    const [[{ badges_obtidos }]] = await pool.query(
      'SELECT COUNT(*) AS badges_obtidos FROM badge_atribuido WHERE id_consultor = ?',
      [idUtilizador]
    );

    const [[{ pontos_totais }]] = await pool.query(
      `SELECT COALESCE(SUM(b.pontos), 0) AS pontos_totais
         FROM badge_atribuido ba
         JOIN badge b ON b.id_badge = ba.id_badge
        WHERE ba.id_consultor = ?`,
      [idUtilizador]
    );

    const [candidaturasPorEstado] = await pool.query(
      `SELECT estado_atual, COUNT(*) AS total
         FROM candidatura_badge
        WHERE id_consultor = ?
        GROUP BY estado_atual`,
      [idUtilizador]
    );

    // progresso por nível na área do consultor
    const [area] = await pool.query(
      `SELECT id_area FROM consultor_area WHERE id_utilizador = ? AND ativo = 1 LIMIT 1`,
      [idUtilizador]
    );
    let progressoNiveis = [];
    if (area.length > 0) {
      const [linhas] = await pool.query(
        `SELECT n.id_nivel, n.codigo_nivel, n.nome_nivel, n.ordem,
                b.id_badge, b.titulo,
                ba.id_badge_atribuido IS NOT NULL AS obtido
           FROM nivel n
           LEFT JOIN badge b ON b.id_nivel = n.id_nivel
           LEFT JOIN badge_atribuido ba
             ON ba.id_badge = b.id_badge AND ba.id_consultor = ?
          WHERE n.id_area = ?
          ORDER BY n.ordem ASC`,
        [idUtilizador, area[0].id_area]
      );
      progressoNiveis = linhas;
    }

    const [[{ conquistas }]] = await pool.query(
      'SELECT COUNT(*) AS conquistas FROM utilizador_conquista WHERE id_utilizador = ?',
      [idUtilizador]
    );

    res.json({
      badges_obtidos,
      pontos_totais,
      conquistas,
      candidaturas_por_estado: candidaturasPorEstado,
      progresso_niveis: progressoNiveis,
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
      `SELECT lp.id_learning_path, lp.nome, COUNT(ba.id_badge_atribuido) AS total
         FROM learning_path lp
         LEFT JOIN service_line sl ON sl.id_learning_path = lp.id_learning_path
         LEFT JOIN area a          ON a.id_service_line    = sl.id_service_line
         LEFT JOIN nivel n         ON n.id_area            = a.id_area
         LEFT JOIN badge b         ON b.id_nivel           = n.id_nivel
         LEFT JOIN badge_atribuido ba ON ba.id_badge       = b.id_badge
        GROUP BY lp.id_learning_path, lp.nome`
    );

    const [porNivel] = await pool.query(
      `SELECT n.codigo_nivel, n.nome_nivel,
              COUNT(ba.id_badge_atribuido) AS total
         FROM nivel n
         LEFT JOIN badge b ON b.id_nivel = n.id_nivel
         LEFT JOIN badge_atribuido ba ON ba.id_badge = b.id_badge
        GROUP BY n.codigo_nivel, n.nome_nivel
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

    res.json({
      total_utilizadores,
      total_badges_ativos,
      total_badges_atribuidos,
      total_candidaturas_abertas,
      badges_por_learning_path: porLP,
      badges_por_nivel: porNivel,
      badges_por_mes: badgesMensal,
      estados_candidatura: estadosCandidatura,
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
