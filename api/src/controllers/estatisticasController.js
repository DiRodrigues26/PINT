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
      `SELECT COALESCE(SUM(COALESCE(ba.pontos_atribuidos, b.pontos, 0)), 0) AS pontos_totais
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

    // # de Badges atribuídos por intervalo de datas (opcional, requisito de reporting)
    const { data_inicio, data_fim } = req.query;
    let badges_no_intervalo = null;
    if (data_inicio || data_fim) {
      const condicoes = [];
      const paramsIntervalo = [];
      if (data_inicio) { condicoes.push('data_atribuicao >= ?'); paramsIntervalo.push(`${data_inicio} 00:00:00`); }
      if (data_fim) { condicoes.push('data_atribuicao <= ?'); paramsIntervalo.push(`${data_fim} 23:59:59`); }
      const [[{ total }]] = await pool.query(
        `SELECT COUNT(*) AS total FROM badge_atribuido WHERE ${condicoes.join(' AND ')}`,
        paramsIntervalo
      );
      badges_no_intervalo = total;
    }

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
      badges_no_intervalo,
      intervalo: (data_inicio || data_fim) ? { data_inicio: data_inicio || null, data_fim: data_fim || null } : null,
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
              COALESCE(SUM(COALESCE(ba.pontos_atribuidos, b.pontos, 0)), 0) AS pontos_totais
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

async function estatisticasPontos(req, res, next) {
  try {
    const [ranking] = await pool.query(
      `SELECT u.id_utilizador, u.nome, u.url_slug,
              COUNT(DISTINCT ba.id_badge_atribuido) AS total_badges,
              COALESCE(SUM(COALESCE(ba.pontos_atribuidos, b.pontos, 0)), 0) AS pontos_totais
         FROM badge_atribuido ba
         JOIN utilizador u ON u.id_utilizador = ba.id_consultor
         JOIN badge b ON b.id_badge = ba.id_badge
        GROUP BY u.id_utilizador, u.nome, u.url_slug
        ORDER BY pontos_totais DESC, total_badges DESC, u.nome ASC
        LIMIT 5`
    );

    const [[{ total_pontos }]] = await pool.query(
      `SELECT COALESCE(SUM(COALESCE(ba.pontos_atribuidos, b.pontos, 0)), 0) AS total_pontos
         FROM badge_atribuido ba
         JOIN badge b ON b.id_badge = ba.id_badge`
    );

    const [badgeMaisValioso] = await pool.query(
      `SELECT b.id_badge, b.titulo, b.pontos,
              n.codigo_nivel, n.nome_nivel,
              a.nome AS nome_area,
              sl.nome AS nome_service_line,
              lp.nome AS nome_learning_path
         FROM badge b
         JOIN nivel n ON n.id_nivel = b.id_nivel
         JOIN area a ON a.id_area = n.id_area
         JOIN service_line sl ON sl.id_service_line = a.id_service_line
         JOIN learning_path lp ON lp.id_learning_path = sl.id_learning_path
        WHERE b.ativo = 1
        ORDER BY b.pontos DESC, b.titulo ASC
        LIMIT 1`
    );

    res.json({
      ranking,
      total_pontos,
      badge_mais_valioso: badgeMaisValioso[0] || null,
    });
  } catch (err) { next(err); }
}

async function dashboardServiceLine(req, res, next) {
  try {
    const idUtilizador = req.utilizador.id_utilizador;

    // Descobrir a service line do utilizador
    const [slRows] = await pool.query(
      `SELECT slr.id_service_line, sl.nome AS nome_service_line
         FROM service_line_responsavel slr
         JOIN service_line sl ON sl.id_service_line = slr.id_service_line
        WHERE slr.id_utilizador = ?`,
      [idUtilizador]
    );

    if (slRows.length === 0) {
      return res.status(403).json({ erro: 'Sem service line associada.' });
    }

    const { id_service_line, nome_service_line } = slRows[0];

    // KPI: total de consultores na service line
    const [[{ total_consultores }]] = await pool.query(
      `SELECT COUNT(DISTINCT ca.id_utilizador) AS total_consultores
         FROM consultor_area ca
         JOIN area a ON a.id_area = ca.id_area
        WHERE a.id_service_line = ? AND ca.ativo = 1`,
      [id_service_line]
    );

    // KPI: total badges atribuídos
    const [[{ total_badges_emitidos }]] = await pool.query(
      `SELECT COUNT(*) AS total_badges_emitidos
         FROM badge_atribuido ba
         JOIN badge b ON b.id_badge = ba.id_badge
         JOIN nivel n ON n.id_nivel = b.id_nivel
         JOIN area a ON a.id_area = n.id_area
        WHERE a.id_service_line = ?`,
      [id_service_line]
    );

    // KPI: badges emitidos este mês
    const [[{ badges_este_mes }]] = await pool.query(
      `SELECT COUNT(*) AS badges_este_mes
         FROM badge_atribuido ba
         JOIN badge b ON b.id_badge = ba.id_badge
         JOIN nivel n ON n.id_nivel = b.id_nivel
         JOIN area a ON a.id_area = n.id_area
        WHERE a.id_service_line = ?
          AND ba.data_atribuicao >= DATE_FORMAT(CURRENT_DATE, '%Y-%m-01')`,
      [id_service_line]
    );

    // KPI: pedidos em validação (IN_SERVICE_LINE_REVIEW)
    const [[{ pedidos_em_validacao }]] = await pool.query(
      `SELECT COUNT(*) AS pedidos_em_validacao
         FROM candidatura_badge cb
         JOIN badge b ON b.id_badge = cb.id_badge
         JOIN nivel n ON n.id_nivel = b.id_nivel
         JOIN area a ON a.id_area = n.id_area
        WHERE a.id_service_line = ? AND cb.estado_atual = 'IN_SERVICE_LINE_REVIEW'`,
      [id_service_line]
    );

    // KPI: pontuação total
    const [[{ pontuacao_total }]] = await pool.query(
      `SELECT COALESCE(SUM(COALESCE(ba.pontos_atribuidos, b.pontos, 0)), 0) AS pontuacao_total
         FROM badge_atribuido ba
         JOIN badge b ON b.id_badge = ba.id_badge
         JOIN nivel n ON n.id_nivel = b.id_nivel
         JOIN area a ON a.id_area = n.id_area
        WHERE a.id_service_line = ?`,
      [id_service_line]
    );

    // Gráfico: badges por nível
    const [badgesPorNivel] = await pool.query(
      `SELECT n.codigo_nivel, n.nome_nivel, n.ordem,
              COUNT(DISTINCT ba.id_badge_atribuido) AS total
         FROM nivel n
         JOIN area a ON a.id_area = n.id_area
         LEFT JOIN badge b ON b.id_nivel = n.id_nivel
         LEFT JOIN badge_atribuido ba ON ba.id_badge = b.id_badge
        WHERE a.id_service_line = ?
        GROUP BY n.id_nivel, n.codigo_nivel, n.nome_nivel, n.ordem
        ORDER BY n.ordem ASC`,
      [id_service_line]
    );

    // Gráfico: distribuição dos estados das candidaturas
    const [estadosCandidatura] = await pool.query(
      `SELECT cb.estado_atual, COUNT(*) AS total
         FROM candidatura_badge cb
         JOIN badge b ON b.id_badge = cb.id_badge
         JOIN nivel n ON n.id_nivel = b.id_nivel
         JOIN area a ON a.id_area = n.id_area
        WHERE a.id_service_line = ?
        GROUP BY cb.estado_atual`,
      [id_service_line]
    );

    // Gráfico: aprovação mensal (últimos 6 meses)
    const [aprovacaoMensal] = await pool.query(
      `SELECT DATE_FORMAT(ba.data_atribuicao, '%Y-%m') AS mes,
              DATE_FORMAT(ba.data_atribuicao, '%b') AS mes_abrev,
              COUNT(*) AS total
         FROM badge_atribuido ba
         JOIN badge b ON b.id_badge = ba.id_badge
         JOIN nivel n ON n.id_nivel = b.id_nivel
         JOIN area a ON a.id_area = n.id_area
        WHERE a.id_service_line = ?
          AND ba.data_atribuicao >= DATE_SUB(CURRENT_DATE, INTERVAL 6 MONTH)
        GROUP BY mes, mes_abrev
        ORDER BY mes ASC`,
      [id_service_line]
    );

    // Tabela: performance de consultores
    const [consultores] = await pool.query(
      `SELECT u.id_utilizador, u.nome, u.url_slug,
              a.id_area, a.nome AS nome_area,
              COUNT(DISTINCT ba.id_badge_atribuido) AS total_badges,
              MAX(n.ordem) AS nivel_mais_alto_ordem,
              MAX(n.codigo_nivel) AS nivel_mais_alto,
              SUM(CASE WHEN ba.data_expiracao IS NULL OR ba.data_expiracao > NOW() THEN 1 ELSE 0 END) AS badges_ativos,
              SUM(CASE WHEN ba.data_expiracao IS NOT NULL AND ba.data_expiracao <= NOW() THEN 1 ELSE 0 END) AS badges_expirados,
              COALESCE(SUM(COALESCE(ba.pontos_atribuidos, b.pontos, 0)), 0) AS pontos_totais,
              (SELECT COUNT(*) FROM utilizador_conquista uc WHERE uc.id_utilizador = u.id_utilizador) AS conquistas,
              (SELECT COUNT(*) FROM candidatura_badge cb
                WHERE cb.id_consultor = u.id_utilizador
                  AND cb.estado_atual NOT IN ('APPROVED','REJECTED','CLOSED')) AS badges_em_processo,
              (SELECT cb2.estado_atual FROM candidatura_badge cb2
                WHERE cb2.id_consultor = u.id_utilizador
                ORDER BY cb2.data_abertura DESC LIMIT 1) AS ultimo_estado,
              (SELECT ce.nome FROM utilizador_conquista uc2
                JOIN conquista_especial ce ON ce.id_conquista = uc2.id_conquista
               WHERE uc2.id_utilizador = u.id_utilizador
               ORDER BY uc2.data_atribuicao DESC LIMIT 1) AS conquista_especial
         FROM utilizador u
         JOIN consultor_area ca ON ca.id_utilizador = u.id_utilizador AND ca.ativo = 1
         JOIN area a ON a.id_area = ca.id_area
         LEFT JOIN badge_atribuido ba ON ba.id_consultor = u.id_utilizador
         LEFT JOIN badge b ON b.id_badge = ba.id_badge
         LEFT JOIN nivel n ON n.id_nivel = b.id_nivel
        WHERE a.id_service_line = ?
        GROUP BY u.id_utilizador, u.nome, u.url_slug, a.id_area, a.nome
        ORDER BY pontos_totais DESC`,
      [id_service_line]
    );

    // Ranking Top 10
    const [ranking] = await pool.query(
      `SELECT u.id_utilizador, u.nome,
              a.nome AS nome_area,
              COUNT(DISTINCT ba.id_badge_atribuido) AS total_badges,
              COALESCE(SUM(COALESCE(ba.pontos_atribuidos, b.pontos, 0)), 0) AS pontos_totais
         FROM utilizador u
         JOIN consultor_area ca ON ca.id_utilizador = u.id_utilizador AND ca.ativo = 1
         JOIN area a ON a.id_area = ca.id_area
         LEFT JOIN badge_atribuido ba ON ba.id_consultor = u.id_utilizador
         LEFT JOIN badge b ON b.id_badge = ba.id_badge
        WHERE a.id_service_line = ?
        GROUP BY u.id_utilizador, u.nome, a.nome
        ORDER BY pontos_totais DESC, total_badges DESC
        LIMIT 10`,
      [id_service_line]
    );

    // Áreas da service line (para filtro)
    const [areas] = await pool.query(
      'SELECT id_area, nome FROM area WHERE id_service_line = ? AND ativo = 1 ORDER BY nome',
      [id_service_line]
    );

    res.json({
      nome_service_line,
      id_service_line,
      total_consultores,
      total_badges_emitidos,
      badges_este_mes,
      pedidos_em_validacao,
      pontuacao_total,
      badges_por_nivel: badgesPorNivel,
      estados_candidatura: estadosCandidatura,
      aprovacao_mensal: aprovacaoMensal,
      consultores,
      ranking,
      areas,
    });
  } catch (err) { next(err); }
}

async function relatorioServiceLine(req, res, next) {
  try {
    const idUtilizador = req.utilizador.id_utilizador;
    const { id_area, codigo_nivel, data_inicio, data_fim, estados } = req.query;

    const [slRows] = await pool.query(
      'SELECT id_service_line FROM service_line_responsavel WHERE id_utilizador = ?',
      [idUtilizador]
    );
    if (slRows.length === 0) return res.status(403).json({ erro: 'Sem service line associada.' });
    const id_service_line = slRows[0].id_service_line;

    const where = ['a.id_service_line = ?'];
    const params = [id_service_line];

    if (id_area)       { where.push('a.id_area = ?');          params.push(id_area); }
    if (codigo_nivel)  { where.push('n.codigo_nivel = ?');     params.push(codigo_nivel); }
    if (data_inicio)   { where.push('cb.data_submissao >= ?'); params.push(data_inicio); }
    if (data_fim)      { where.push('cb.data_submissao <= ?'); params.push(data_fim + ' 23:59:59'); }
    if (estados) {
      const lista = estados.split(',').filter(Boolean);
      if (lista.length) {
        where.push(`cb.estado_atual IN (${lista.map(() => '?').join(',')})`);
        params.push(...lista);
      }
    }

    const whereSQL = `WHERE ${where.join(' AND ')}`;

    const [linhas] = await pool.query(
      `SELECT cb.id_candidatura, cb.estado_atual, cb.data_submissao, cb.data_fecho,
              u.nome AS nome_consultor,
              b.titulo AS titulo_badge,
              COALESCE(ba.pontos_atribuidos, b.pontos, 0) AS pontos,
              n.codigo_nivel, n.nome_nivel,
              a.id_area, a.nome AS nome_area,
              (SELECT MAX(av.data_avaliacao) FROM avaliacao_candidatura av
                WHERE av.id_candidatura = cb.id_candidatura) AS data_decisao
         FROM candidatura_badge cb
         JOIN utilizador u    ON u.id_utilizador   = cb.id_consultor
         JOIN badge b         ON b.id_badge        = cb.id_badge
         JOIN nivel n         ON n.id_nivel        = b.id_nivel
         JOIN area a          ON a.id_area         = n.id_area
         JOIN service_line sl ON sl.id_service_line = a.id_service_line
         LEFT JOIN badge_atribuido ba ON ba.id_candidatura = cb.id_candidatura
         ${whereSQL}
         ORDER BY cb.data_submissao DESC
         LIMIT 500`,
      params
    );

    // KPIs calculados do resultado filtrado
    const total = linhas.length;
    const aprovacoes = linhas.filter(r => r.estado_atual === 'APPROVED').length;
    const rejeicoes  = linhas.filter(r => r.estado_atual === 'REJECTED').length;
    const pctAprovacao = (aprovacoes + rejeicoes) > 0
      ? Math.round((aprovacoes / (aprovacoes + rejeicoes)) * 1000) / 10
      : null;

    const temposMed = linhas
      .filter(r => r.data_submissao && r.data_decisao)
      .map(r => (new Date(r.data_decisao) - new Date(r.data_submissao)) / 86400000);
    const tempoMedio = temposMed.length > 0
      ? Math.round((temposMed.reduce((a, b) => a + b, 0) / temposMed.length) * 10) / 10
      : null;

    res.json({
      kpis: { total, aprovacoes, rejeicoes, pct_aprovacao: pctAprovacao, tempo_medio_dias: tempoMedio },
      dados: linhas,
    });
  } catch (err) { next(err); }
}

async function perfilConsultorSL(req, res, next) {
  try {
    const idConsultor = parseInt(req.params.id, 10);
    const idUtilizador = req.utilizador.id_utilizador;

    // Descobrir a service line do utilizador autenticado
    const [slRows] = await pool.query(
      `SELECT slr.id_service_line FROM service_line_responsavel slr WHERE slr.id_utilizador = ?`,
      [idUtilizador]
    );
    if (slRows.length === 0) return res.status(403).json({ erro: 'Sem service line associada.' });
    const id_service_line = slRows[0].id_service_line;

    // Info básica do consultor
    const [[info]] = await pool.query(
      `SELECT u.id_utilizador, u.nome, u.email,
              a.id_area, a.nome AS nome_area,
              sl.id_service_line, sl.nome AS nome_service_line,
              COALESCE(SUM(COALESCE(ba.pontos_atribuidos, b.pontos, 0)), 0) AS pontos_totais,
              COUNT(DISTINCT ba.id_badge_atribuido) AS total_badges,
              (SELECT COUNT(*) FROM candidatura_badge cb WHERE cb.id_consultor = u.id_utilizador AND cb.estado_atual NOT IN ('APPROVED','REJECTED','CLOSED')) AS em_processo
         FROM utilizador u
         JOIN consultor_area ca ON ca.id_utilizador = u.id_utilizador AND ca.ativo = 1
         JOIN area a ON a.id_area = ca.id_area
         JOIN service_line sl ON sl.id_service_line = a.id_service_line
         LEFT JOIN badge_atribuido ba ON ba.id_consultor = u.id_utilizador
         LEFT JOIN badge b ON b.id_badge = ba.id_badge
        WHERE u.id_utilizador = ? AND a.id_service_line = ?
        GROUP BY u.id_utilizador, u.nome, u.email, a.id_area, a.nome, sl.id_service_line, sl.nome`,
      [idConsultor, id_service_line]
    );
    if (!info) return res.status(404).json({ erro: 'Consultor não encontrado nesta Service Line.' });

    // Ranking interno
    const [ranking] = await pool.query(
      `SELECT u.id_utilizador,
              COALESCE(SUM(COALESCE(ba.pontos_atribuidos, b.pontos, 0)), 0) AS pontos_totais
         FROM utilizador u
         JOIN consultor_area ca ON ca.id_utilizador = u.id_utilizador AND ca.ativo = 1
         JOIN area a ON a.id_area = ca.id_area
         LEFT JOIN badge_atribuido ba ON ba.id_consultor = u.id_utilizador
         LEFT JOIN badge b ON b.id_badge = ba.id_badge
        WHERE a.id_service_line = ?
        GROUP BY u.id_utilizador
        ORDER BY pontos_totais DESC`,
      [id_service_line]
    );
    const posicao = ranking.findIndex(r => r.id_utilizador === idConsultor) + 1;

    // Progresso por nível (badges totais vs obtidos pelo consultor)
    const [progressoNivel] = await pool.query(
      `SELECT n.id_nivel, n.codigo_nivel, n.nome_nivel, n.ordem,
              COUNT(DISTINCT b.id_badge) AS total_badges_nivel,
              COUNT(DISTINCT ba.id_badge) AS obtidos
         FROM nivel n
         JOIN area a ON a.id_area = n.id_area
         LEFT JOIN badge b ON b.id_nivel = n.id_nivel AND b.ativo = 1
         LEFT JOIN badge_atribuido ba ON ba.id_badge = b.id_badge AND ba.id_consultor = ?
        WHERE a.id_service_line = ?
        GROUP BY n.id_nivel, n.codigo_nivel, n.nome_nivel, n.ordem
        ORDER BY n.ordem ASC`,
      [idConsultor, id_service_line]
    );

    // Candidaturas activas
    const [candidaturas] = await pool.query(
      `SELECT cb.id_candidatura, cb.estado_atual, cb.data_submissao,
              b.titulo AS titulo_badge, b.imagem_url,
              n.codigo_nivel, n.nome_nivel
         FROM candidatura_badge cb
         JOIN badge b ON b.id_badge = cb.id_badge
         JOIN nivel n ON n.id_nivel = b.id_nivel
        WHERE cb.id_consultor = ? AND cb.estado_atual NOT IN ('APPROVED','REJECTED','CLOSED')
        ORDER BY cb.data_submissao DESC`,
      [idConsultor]
    );

    res.json({
      info,
      ranking: { posicao, total: ranking.length },
      progresso_nivel: progressoNivel,
      candidaturas_ativas: candidaturas,
    });
  } catch (err) { next(err); }
}

module.exports = {
  dashboardConsultor,
  dashboardGestor,
  rankingConsultores,
  estatisticasPontos,
  dashboardServiceLine,
  relatorioServiceLine,
  perfilConsultorSL,
};
