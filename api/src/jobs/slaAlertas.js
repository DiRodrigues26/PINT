/*
 * Job automático de alertas de SLA.
 * Periodicamente deteta candidaturas que ultrapassaram o SLA e cria notificações
 * (e emails) para os responsáveis, sem intervenção manual do admin.
 *
 * - Respeita a configuração global de notificações (config_notificacao):
 *   só dispara se 'alerta_sla_ultrapassado' estiver ativo e conforme os canais.
 * - Idempotente: não volta a notificar a mesma candidatura se já houve um alerta
 *   nas últimas SLA_ALERT_DEDUP_HOURS horas (evita spam a cada tick).
 * - Intervalo configurável via SLA_JOB_INTERVAL_MIN (0 = desativado).
 */
const { pool } = require('../db/connection');
const { listarForaSLA, responsaveisPorFase } = require('../controllers/slaController');
const { podeEnviarEmail, podeNotificarPlataforma } = require('../utils/configNotificacao');
const { notificarAlertaSla } = require('../utils/email');
const { enviarPushParaUtilizadores } = require('../utils/push');

const HORAS_DEDUP = parseInt(process.env.SLA_ALERT_DEDUP_HOURS || '24', 10);

async function jaNotificadoRecentemente(idCandidatura) {
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total
       FROM notificacao
      WHERE tipo = 'SLA_ALERTA'
        AND entidade_relacionada = ?
        AND data_criacao >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ? HOUR)`,
    [`Candidatura #${idCandidatura}`, HORAS_DEDUP]
  );
  return total > 0;
}

async function executarVerificacaoSLA() {
  try {
    const plataforma = await podeNotificarPlataforma('alerta_sla_ultrapassado');
    const email = await podeEnviarEmail('alerta_sla_ultrapassado');
    if (!plataforma && !email) return { criadas: 0, motivo: 'alerta_sla_ultrapassado desativado' };

    const fora = await listarForaSLA(false);
    let criadas = 0;

    for (const c of fora) {
      // Isolar cada candidatura: uma falha (ex.: erro de BD/email) não aborta o tick.
      try {
        if (await jaNotificadoRecentemente(c.id_candidatura)) continue;

        const responsaveis = await responsaveisPorFase(c.fase_sla, c.id_service_line);
        if (responsaveis.length === 0) continue;

        const titulo = `Alerta SLA: ${c.titulo_badge}`;
        const mensagem = `O processo #${c.id_candidatura} ultrapassou o SLA `
          + `(${c.horas_em_fase}h decorridas / limite ${c.limite_horas}h) na fase ${c.fase_sla}.`;

        if (plataforma) {
          for (const r of responsaveis) {
            await pool.query(
              `INSERT INTO notificacao (id_utilizador, tipo, categoria, titulo, mensagem, entidade_relacionada)
               VALUES (?, 'SLA_ALERTA', 'CANDIDATURA', ?, ?, ?)`,
              [r.id_utilizador, titulo, mensagem, `Candidatura #${c.id_candidatura}`]
            );
          }

          // Notificação PUSH para a app mobile (bónus: SLA ultrapassado).
          // Best-effort: nunca aborta o tick nem a contagem.
          await enviarPushParaUtilizadores(
            responsaveis.map((r) => r.id_utilizador),
            {
              titulo,
              mensagem,
              dados: { tipo: 'SLA_ALERTA', candidatura: String(c.id_candidatura) },
            }
          ).catch((errPush) =>
            console.warn(`⚠️ [SLA] Falha no push da candidatura #${c.id_candidatura}:`, errPush.message)
          );
        }

        if (email) {
          // Respeitar a preferência individual de email de cada responsável:
          // só envia a quem tem 'email_aprovacao_badge' ativo (default 1 se não houver registo).
          const idsResp = responsaveis.map((r) => r.id_utilizador);
          const [prefsRows] = await pool.query(
            `SELECT id_utilizador, email_aprovacao_badge
               FROM preferencia_notificacao
              WHERE id_utilizador IN (${idsResp.map(() => '?').join(',')})`,
            idsResp
          );
          const emailDesativado = new Set(
            prefsRows.filter((p) => !p.email_aprovacao_badge).map((p) => p.id_utilizador)
          );
          const destinatarios = responsaveis.filter((r) => !emailDesativado.has(r.id_utilizador));

          // O envio de email é best-effort e não deve impedir a contagem nem o tick.
          await Promise.all(destinatarios.map((r) => notificarAlertaSla({
            para: r.email,
            titulo,
            mensagem,
            consultor: c.nome_consultor,
            badge: c.titulo_badge,
          }))).catch((errEmail) => console.warn(`⚠️ [SLA] Falha no email da candidatura #${c.id_candidatura}:`, errEmail.message));
        }

        criadas += 1;
      } catch (errItem) {
        console.error(`❌ [SLA] Falha ao processar candidatura #${c.id_candidatura}:`, errItem.message);
      }
    }

    if (criadas > 0) {
      console.log(`⏰ [SLA] ${criadas} alerta(s) automático(s) de SLA criado(s).`);
    }
    return { criadas, total_fora_sla: fora.length };
  } catch (err) {
    console.error('❌ [SLA] Erro na verificação automática de SLA:', err.message);
    return { erro: err.message };
  }
}

function iniciarJobSLA() {
  const minutos = parseInt(process.env.SLA_JOB_INTERVAL_MIN || '30', 10);
  if (!minutos || minutos <= 0) {
    console.log('⏰ [SLA] Job de alertas desativado (SLA_JOB_INTERVAL_MIN=0).');
    return;
  }
  // Primeira passagem 1 min após o arranque, depois a cada N minutos.
  setTimeout(executarVerificacaoSLA, 60 * 1000);
  setInterval(executarVerificacaoSLA, minutos * 60 * 1000);
  console.log(`⏰ [SLA] Job de alertas automático ativo (a cada ${minutos} min).`);
}

module.exports = { executarVerificacaoSLA, iniciarJobSLA };
