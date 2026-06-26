/*
 * Job automático de alertas de expiração de badges.
 * Periodicamente deteta badges atribuídos que expiram nos próximos 30 dias
 * e cria notificações para os consultores titulares.
 *
 * - Respeita a preferência individual do consultor (notif_expiracao na tabela
 *   preferencia_notificacao). Se o consultor desativou, não recebe alerta.
 * - Idempotente: não volta a notificar o mesmo badge se já houve um alerta
 *   nas últimas BADGE_EXP_DEDUP_HOURS horas (evita spam a cada tick).
 * - Intervalo configurável via BADGE_EXP_JOB_INTERVAL_MIN (0 = desativado).
 * - Limiar configurável via BADGE_EXP_DIAS_ALERTA (default 30 dias).
 */
const { pool } = require('../db/connection');
const { enviarPushParaUtilizadores } = require('../utils/push');

const HORAS_DEDUP = parseInt(process.env.BADGE_EXP_DEDUP_HOURS || '24', 10);
const DIAS_ALERTA = parseInt(process.env.BADGE_EXP_DIAS_ALERTA || '30', 10);

/**
 * Verifica se já foi enviada uma notificação de expiração para este badge_atribuido
 * dentro da janela de deduplicação.
 */
async function jaNotificadoRecentemente(idBadgeAtribuido) {
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total
       FROM notificacao
      WHERE tipo = 'BADGE_EXPIRACAO'
        AND entidade_relacionada = ?
        AND data_criacao >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ? HOUR)`,
    [String(idBadgeAtribuido), HORAS_DEDUP]
  );
  return total > 0;
}

/**
 * Verifica se o consultor tem a preferência de notificação de expiração ativa.
 * Se não houver registo na tabela, assume ativo (default 1 no schema).
 */
async function consultorQueNotifExpiracao(idUtilizador) {
  const [rows] = await pool.query(
    `SELECT notif_expiracao FROM preferencia_notificacao WHERE id_utilizador = ?`,
    [idUtilizador]
  );
  // Sem registo = default = ativo
  if (rows.length === 0) return true;
  return Boolean(rows[0].notif_expiracao);
}

/**
 * Execução principal: procura badges a expirar e cria notificações.
 */
async function executarVerificacaoExpiracao() {
  try {
    // Buscar todos os badges que expiram dentro de DIAS_ALERTA dias
    const [badges] = await pool.query(
      `SELECT ba.id_badge_atribuido, ba.id_consultor, ba.data_expiracao,
              b.titulo AS titulo_badge, b.imagem_url,
              u.nome AS nome_consultor, u.email
         FROM badge_atribuido ba
         JOIN badge b      ON b.id_badge      = ba.id_badge
         JOIN utilizador u ON u.id_utilizador = ba.id_consultor
        WHERE ba.data_expiracao IS NOT NULL
          AND ba.data_expiracao BETWEEN CURRENT_TIMESTAMP AND DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? DAY)
          AND u.ativo = 1
        ORDER BY ba.data_expiracao ASC`,
      [DIAS_ALERTA]
    );

    if (badges.length === 0) return { criadas: 0, total_a_expirar: 0 };

    let criadas = 0;

    for (const ba of badges) {
      try {
        // Deduplicação: não repetir se já notificou recentemente
        if (await jaNotificadoRecentemente(ba.id_badge_atribuido)) continue;

        // Respeitar preferência individual do consultor
        if (!(await consultorQueNotifExpiracao(ba.id_consultor))) continue;

        // Calcular dias até expiração
        const diasRestantes = Math.ceil(
          (new Date(ba.data_expiracao).getTime() - Date.now()) / 86_400_000
        );

        const titulo = `Badge: ${ba.titulo_badge}`;
        const mensagem = diasRestantes <= 0
          ? `O teu badge "${ba.titulo_badge}" expirou.`
          : diasRestantes === 1
            ? `O teu badge "${ba.titulo_badge}" expira amanhã.`
            : `O teu badge "${ba.titulo_badge}" expira em ${diasRestantes} dias.`;

        // Criar notificação na plataforma
        await pool.query(
          `INSERT INTO notificacao (id_utilizador, tipo, categoria, titulo, mensagem, entidade_relacionada)
           VALUES (?, 'BADGE_EXPIRACAO', 'BADGE', ?, ?, ?)`,
          [ba.id_consultor, titulo, mensagem, String(ba.id_badge_atribuido)]
        );

        // Push para a app mobile (best-effort, não aborta se falhar)
        await enviarPushParaUtilizadores(
          [ba.id_consultor],
          {
            titulo,
            mensagem,
            dados: { tipo: 'BADGE_EXPIRACAO', badge_atribuido: String(ba.id_badge_atribuido) },
          }
        ).catch((errPush) =>
          console.warn(`⚠️ [BADGE_EXP] Falha no push para consultor #${ba.id_consultor}:`, errPush.message)
        );

        criadas += 1;
      } catch (errItem) {
        console.error(`❌ [BADGE_EXP] Falha ao processar badge_atribuido #${ba.id_badge_atribuido}:`, errItem.message);
      }
    }

    if (criadas > 0) {
      console.log(`⏰ [BADGE_EXP] ${criadas} alerta(s) de expiração de badge criado(s).`);
    }
    return { criadas, total_a_expirar: badges.length };
  } catch (err) {
    console.error('❌ [BADGE_EXP] Erro na verificação automática de expiração:', err.message);
    return { erro: err.message };
  }
}

function iniciarJobExpiracao() {
  const minutos = parseInt(process.env.BADGE_EXP_JOB_INTERVAL_MIN || '60', 10);
  if (!minutos || minutos <= 0) {
    console.log('⏰ [BADGE_EXP] Job de alertas de expiração desativado (BADGE_EXP_JOB_INTERVAL_MIN=0).');
    return;
  }
  // Primeira passagem 2 min após o arranque (dá tempo à BD), depois a cada N minutos.
  setTimeout(executarVerificacaoExpiracao, 2 * 60 * 1000);
  setInterval(executarVerificacaoExpiracao, minutos * 60 * 1000);
  console.log(`⏰ [BADGE_EXP] Job de alertas de expiração ativo (a cada ${minutos} min, limiar ${DIAS_ALERTA} dias).`);
}

module.exports = { executarVerificacaoExpiracao, iniciarJobExpiracao };
