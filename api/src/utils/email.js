const sgMail = require('@sendgrid/mail');

let configurado = false;

function temConfigSendGrid() {
  return Boolean(process.env.SENDGRID_API_KEY);
}

function obterCliente() {
  if (!temConfigSendGrid()) return null;
  if (!configurado) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    configurado = true;
  }
  return sgMail;
}

async function enviarEmail({ para, assunto, html, texto }) {
  const cliente = obterCliente();
  if (!cliente) {
    console.log('📧 [EMAIL STUB] Para:', para);
    console.log('   Assunto:', assunto);
    console.log('   Conteúdo:', texto || html);
    return { stub: true };
  }

  return cliente.send({
    from: process.env.EMAIL_FROM || 'no-reply@softinsa-badges.local',
    to: para,
    subject: assunto,
    text: texto,
    html,
  });
}

async function enviarConfirmacaoRegisto(utilizador, token) {
  const base = process.env.FRONTEND_URL || 'http://localhost:5173';
  const link = `${base}/confirmar-email/${token}`;
  return enviarEmail({
    para: utilizador.email,
    assunto: 'Confirme o seu registo — Softinsa Badges',
    texto: `Para confirmar o seu registo clique no link:\n${link}\n\nObrigado.`,
    html: `<p>Para confirmar o seu registo clique <a href="${link}">aqui</a>.</p>`,
  });
}

async function enviarRecuperacaoPassword(utilizador, token) {
  const base = process.env.FRONTEND_URL || 'http://localhost:5173';
  const link = `${base}/redefinir-password/${token}`;
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
