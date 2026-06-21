const { pool } = require('../db/connection');
const { notificarAlertaSla } = require('../utils/email');
const { podeEnviarEmail, podeNotificarPlataforma } = require('../utils/configNotificacao');

function faseDaCandidatura(estado) {
  if (['SUBMITTED', 'IN_TALENT_REVIEW'].includes(estado)) return 'TALENT_REVIEW';
  if (estado === 'IN_SERVICE_LINE_REVIEW') return 'SERVICE_LINE_REVIEW';
  return null;
}

function estadoSLA(horasDecorridas, limiteHoras) {
  if (!limiteHoras) return 'SEM_SLA';
  if (Number(horasDecorridas) > Number(limiteHoras)) return 'ULTRAPASSADO';
  if (Number(horasDecorridas) >= Number(limiteHoras) * 0.8) return 'PROXIMO_LIMITE';
  return 'DENTRO_PRAZO';
}

async function obterCandidaturaSLA(idCandidatura) {
  const [linhas] = await pool.query(
    `SELECT cb.id_candidatura, cb.estado_atual, cb.data_abertura, cb.data_submissao,
            cb.id_consultor, b.titulo AS titulo_badge,
            u.nome AS nome_consultor, u.email AS email_consultor,
            a.id_area, a.nome AS nome_area,
            sl.id_service_line, sl.nome AS nome_service_line,
            COALESCE((
              SELECT MAX(h.data_evento)
                FROM historico_candidatura h
               WHERE h.id_candidatura = cb.id_candidatura
                 AND h.estado_destino = cb.estado_atual
            ), cb.data_submissao, cb.data_abertura) AS data_inicio_fase
       FROM candidatura_badge cb
       JOIN badge b ON b.id_badge = cb.id_badge
       JOIN utilizador u ON u.id_utilizador = cb.id_consultor
       JOIN nivel n ON n.id_nivel = b.id_nivel
       JOIN area a ON a.id_area = n.id_area
       JOIN service_line sl ON sl.id_service_line = a.id_service_line
      WHERE cb.id_candidatura = ?`,
    [idCandidatura]
  );
  return linhas[0] || null;
}

async function listar(req, res, next) {
  try {
    const [linhas] = await pool.query('SELECT * FROM sla_config ORDER BY fase');
    res.json({ dados: linhas });
  } catch (err) { next(err); }
}

async function atualizar(req, res, next) {
  try {
    const { fase } = req.params;
    const { limite, unidade, ativo } = req.body;
    if (!['TALENT_REVIEW', 'SERVICE_LINE_REVIEW'].includes(fase)) {
      return res.status(400).json({ erro: 'Fase inválida.' });
    }

    const campos = [];
    const valores = [];
    if (limite !== undefined)  { campos.push('limite = ?');  valores.push(limite); }
    if (unidade !== undefined) { campos.push('unidade = ?'); valores.push(unidade); }
    if (ativo !== undefined)   { campos.push('ativo = ?');   valores.push(ativo ? 1 : 0); }
    if (campos.length === 0) return res.status(400).json({ erro: 'Nada para atualizar.' });

    valores.push(fase);
    const [result] = await pool.query(
      `UPDATE sla_config SET ${campos.join(', ')} WHERE fase = ?`,
      valores
    );
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'SLA não encontrado.' });
    res.json({ mensagem: 'SLA atualizado.' });
  } catch (err) { next(err); }
}

/*
 * Lógica reutilizável de deteção de SLA (usada pelo endpoint e pelo job automático).
 * incluirTodos=true devolve todas as candidaturas monitorizadas; false só as ULTRAPASSADO.
 */
async function listarForaSLA(incluirTodos = false) {
  const [slas] = await pool.query('SELECT fase, limite, unidade, ativo FROM sla_config');
  const mapaSLA = {};
  for (const s of slas) {
    if (!s.ativo) continue;
    const horas = s.unidade === 'dias' ? s.limite * 24 : s.limite;
    mapaSLA[s.fase] = horas;
  }

  const [linhas] = await pool.query(
    `SELECT cb.id_candidatura, cb.estado_atual, cb.data_submissao,
            cb.id_consultor,
            COALESCE((
              SELECT MAX(h.data_evento)
                FROM historico_candidatura h
               WHERE h.id_candidatura = cb.id_candidatura
                 AND h.estado_destino = cb.estado_atual
            ), cb.data_submissao, cb.data_abertura) AS data_inicio_fase,
            TIMESTAMPDIFF(HOUR, COALESCE((
              SELECT MAX(h.data_evento)
                FROM historico_candidatura h
               WHERE h.id_candidatura = cb.id_candidatura
                 AND h.estado_destino = cb.estado_atual
            ), cb.data_submissao, cb.data_abertura), CURRENT_TIMESTAMP) AS horas_em_fase,
            b.titulo AS titulo_badge,
            u.nome AS nome_consultor,
            u.email AS email_consultor,
            a.id_area, a.nome AS nome_area,
            sl.id_service_line, sl.nome AS nome_service_line
       FROM candidatura_badge cb
       JOIN badge b ON b.id_badge = cb.id_badge
       JOIN utilizador u ON u.id_utilizador = cb.id_consultor
       JOIN nivel n ON n.id_nivel = b.id_nivel
       JOIN area a ON a.id_area = n.id_area
       JOIN service_line sl ON sl.id_service_line = a.id_service_line
      WHERE cb.estado_atual IN ('SUBMITTED', 'IN_TALENT_REVIEW', 'IN_SERVICE_LINE_REVIEW')
      ORDER BY cb.data_submissao DESC, cb.data_abertura DESC`
  );

  const dados = linhas.map(l => {
    const fase = faseDaCandidatura(l.estado_atual);
    const limiteHoras = fase ? mapaSLA[fase] : null;
    return {
      ...l,
      fase_sla: fase,
      limite_horas: limiteHoras || null,
      estado_sla: estadoSLA(l.horas_em_fase, limiteHoras),
    };
  });

  return incluirTodos ? dados : dados.filter(l => l.estado_sla === 'ULTRAPASSADO');
}

/* Responsáveis a notificar consoante a fase do SLA. */
async function responsaveisPorFase(fase, idServiceLine) {
  if (fase === 'TALENT_REVIEW') {
    const [r] = await pool.query(
      `SELECT DISTINCT u.id_utilizador, u.nome, u.email
         FROM utilizador u
         JOIN utilizador_perfil up ON up.id_utilizador = u.id_utilizador
         JOIN perfil p ON p.id_perfil = up.id_perfil
        WHERE p.nome_perfil = 'Talent Manager' AND u.ativo = 1`
    );
    return r;
  }
  if (fase === 'SERVICE_LINE_REVIEW') {
    const [r] = await pool.query(
      `SELECT DISTINCT u.id_utilizador, u.nome, u.email
         FROM service_line_responsavel slr
         JOIN utilizador u ON u.id_utilizador = slr.id_utilizador
        WHERE slr.id_service_line = ? AND u.ativo = 1`,
      [idServiceLine]
    );
    return r;
  }
  return [];
}

async function candidaturasForaSLA(req, res, next) {
  try {
    const incluirTodos = req.query.todos === '1' || req.query.todos === 'true';
    res.json({ dados: await listarForaSLA(incluirTodos) });
  } catch (err) { next(err); }
}

async function notificar(req, res, next) {
  try {
    const candidatura = await obterCandidaturaSLA(req.params.idCandidatura);
    if (!candidatura) return res.status(404).json({ erro: 'Candidatura não encontrada.' });

    const fase = faseDaCandidatura(candidatura.estado_atual);
    if (!fase) return res.status(400).json({ erro: 'Esta candidatura não está numa fase monitorizada por SLA.' });

    const destinatarios = await responsaveisPorFase(fase, candidatura.id_service_line);

    if (destinatarios.length === 0) {
      return res.status(404).json({ erro: 'Não foram encontrados responsáveis para notificar.' });
    }

    const mensagem = req.body?.mensagem || `O processo #${candidatura.id_candidatura} requer atenção de SLA.`;
    const titulo = `Alerta SLA: ${candidatura.titulo_badge}`;

    const enviarPlataforma = await podeNotificarPlataforma('alerta_sla_ultrapassado');
    const enviarEmailSla = await podeEnviarEmail('alerta_sla_ultrapassado');

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      if (enviarPlataforma) {
        for (const d of destinatarios) {
          await conn.query(
            `INSERT INTO notificacao (id_utilizador, tipo, categoria, titulo, mensagem, entidade_relacionada)
             VALUES (?, 'SLA_ALERTA', 'CANDIDATURA', ?, ?, ?)`,
            [d.id_utilizador, titulo, mensagem, `Candidatura #${candidatura.id_candidatura}`]
          );
        }
      }

      await conn.query(
        `INSERT INTO historico_candidatura
           (id_candidatura, id_utilizador_responsavel, estado_origem, estado_destino, acao, comentario)
         VALUES (?, ?, ?, ?, 'SLA_NOTIFICACAO', ?)`,
        [
          candidatura.id_candidatura,
          req.utilizador.id_utilizador,
          candidatura.estado_atual,
          candidatura.estado_atual,
          `${mensagem} Destinatários: ${destinatarios.map(d => d.email).join(', ')}`,
        ]
      );

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    if (enviarEmailSla) {
      await Promise.all(destinatarios.map(d => notificarAlertaSla({
        para: d.email,
        titulo,
        mensagem,
        consultor: candidatura.nome_consultor,
        badge: candidatura.titulo_badge,
      })));
    }

    res.json({
      mensagem: 'Notificação processada.',
      total_destinatarios: destinatarios.length,
      plataforma: enviarPlataforma,
      email: enviarEmailSla,
    });
  } catch (err) { next(err); }
}

module.exports = { listar, atualizar, candidaturasForaSLA, notificar, listarForaSLA, responsaveisPorFase };
