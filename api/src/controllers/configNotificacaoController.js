const { pool } = require('../db/connection');
const { enviarEmail } = require('../utils/email');
const { invalidarCache } = require('../utils/configNotificacao');

/* Colunas booleanas configuráveis da configuração global de notificações */
const CAMPOS_BOOL = [
  'email_confirmacao_registo',
  'email_redefinicao_password',
  'email_candidatura_badge',
  'notif_aprovacao_badge',
  'notif_rejeicao_badge',
  'alerta_sla_ultrapassado',
  'canal_email',
  'canal_plataforma',
  'canal_push',
];

async function obterOuCriar() {
  const [linhas] = await pool.query('SELECT * FROM config_notificacao WHERE id_config = 1');
  if (linhas.length > 0) return linhas[0];

  await pool.query('INSERT INTO config_notificacao (id_config) VALUES (1)');
  const [novo] = await pool.query('SELECT * FROM config_notificacao WHERE id_config = 1');
  return novo[0];
}

async function obter(req, res, next) {
  try {
    const config = await obterOuCriar();
    res.json({ config });
  } catch (err) { next(err); }
}

async function atualizar(req, res, next) {
  try {
    await obterOuCriar();

    const campos = [];
    const valores = [];
    for (const c of CAMPOS_BOOL) {
      if (req.body[c] !== undefined) {
        campos.push(`${c} = ?`);
        valores.push(req.body[c] ? 1 : 0);
      }
    }
    if (campos.length === 0) return res.status(400).json({ erro: 'Nada para atualizar.' });

    await pool.query(
      `UPDATE config_notificacao SET ${campos.join(', ')} WHERE id_config = 1`,
      valores
    );

    invalidarCache();

    const [linhas] = await pool.query('SELECT * FROM config_notificacao WHERE id_config = 1');
    res.json({ mensagem: 'Configuração de notificações atualizada.', config: linhas[0] });
  } catch (err) { next(err); }
}

async function enviarTeste(req, res, next) {
  try {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ erro: 'Indique um email válido.' });
    }

    const resultado = await enviarEmail({
      para: email,
      assunto: 'Email de teste — Softinsa Badges',
      texto: 'Este é um email de teste enviado a partir das definições de notificações da plataforma Softinsa Badges.',
      html: `
        <div style="font-family: Arial, sans-serif; color: #1f2937;">
          <h2 style="color:#39639c;">Softinsa Badges</h2>
          <p>Este é um <strong>email de teste</strong> enviado a partir das definições de notificações.</p>
          <p>Se recebeu esta mensagem, o envio de emails está a funcionar corretamente.</p>
        </div>`,
    });

    res.json({
      mensagem: resultado?.stub
        ? 'Email de teste registado no servidor (modo desenvolvimento — sem SMTP configurado).'
        : 'Email de teste enviado com sucesso.',
      stub: Boolean(resultado?.stub),
    });
  } catch (err) { next(err); }
}

module.exports = { obter, atualizar, enviarTeste };
