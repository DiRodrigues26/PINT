const nodemailer = require('nodemailer');

let transporter = null;

function temConfigSMTP() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function obterTransporter() {
  if (transporter) return transporter;
  if (!temConfigSMTP()) return null;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

async function enviarEmail({ para, assunto, html, texto }) {
  const t = obterTransporter();
  if (!t) {
    console.log('📧 [EMAIL STUB] Para:', para);
    console.log('   Assunto:', assunto);
    console.log('   Conteúdo:', texto || html);
    return { stub: true };
  }

  return t.sendMail({
    from: process.env.SMTP_FROM || 'no-reply@softinsa-badges.local',
    to: para,
    subject: assunto,
    text: texto,
    html,
  });
}

async function enviarConfirmacaoRegisto(utilizador, token) {
  const link = `${process.env.APP_URL}/api/auth/confirmar-email?token=${token}`;
  return enviarEmail({
    para: utilizador.email,
    assunto: 'Confirme o seu registo — Softinsa Badges',
    texto: `Olá ${utilizador.nome},\n\nPara confirmar o seu registo clique no link:\n${link}\n\nObrigado.`,
    html: `<p>Olá ${utilizador.nome},</p><p>Para confirmar o seu registo clique <a href="${link}">aqui</a>.</p>`,
  });
}

async function enviarRecuperacaoPassword(utilizador, token) {
  const link = `${process.env.FRONTEND_URL}/recuperar-password?token=${token}`;
  return enviarEmail({
    para: utilizador.email,
    assunto: 'Recuperação de password — Softinsa Badges',
    texto: `Para redefinir a sua password clique em:\n${link}\n\nSe não pediu esta recuperação ignore este email.`,
    html: `<p>Para redefinir a sua password clique <a href="${link}">aqui</a>.</p><p>Se não pediu esta recuperação ignore este email.</p>`,
  });
}

async function notificarMudancaEstadoCandidatura(utilizador, estado, badgeTitulo) {
  return enviarEmail({
    para: utilizador.email,
    assunto: `Candidatura ${estado} — ${badgeTitulo}`,
    texto: `A sua candidatura ao badge "${badgeTitulo}" transitou para o estado: ${estado}.`,
    html: `<p>A sua candidatura ao badge <strong>${badgeTitulo}</strong> transitou para o estado: <strong>${estado}</strong>.</p>`,
  });
}

module.exports = {
  enviarEmail,
  enviarConfirmacaoRegisto,
  enviarRecuperacaoPassword,
  notificarMudancaEstadoCandidatura,
};
