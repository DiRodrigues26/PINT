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
    console.log('[EMAIL STUB] Para:', para);
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

function frontendUrl() {
  return process.env.FRONTEND_URL || 'http://localhost:5173';
}

// ---------------------------------------------------------------------------
// Layout partilhado por todos os emails — cabeçalho com a marca Softinsa,
// corpo e rodapé. HTML construído com tabelas e estilos inline para se manter
// consistente nos vários clientes de email (incl. Outlook).
// ---------------------------------------------------------------------------

const FONTE = "Arial, Helvetica, sans-serif";

// Traços de ícones no estilo lucide (os mesmos usados no resto da plataforma),
// desenhados em SVG inline — sem depender de emoji, que renderiza de forma
// inconsistente entre clientes de email.
const ICONES_SVG = {
  mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  key: '<path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"/><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/>',
  edit: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
  award: '<path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"/><circle cx="12" cy="8" r="6"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  warning: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  check: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  arrowRight: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
};

function iconeCirculoHtml(nome, cor, fundo) {
  const traco = ICONES_SVG[nome] || ICONES_SVG.info;
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 18px;">
      <tr>
        <td style="width:52px;height:52px;border-radius:999px;background-color:${fundo};text-align:center;vertical-align:middle;">
          <!--[if mso]><br/><![endif]-->
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${cor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;">${traco}</svg>
        </td>
      </tr>
    </table>`;
}

function etiquetaHtml(texto, cor, fundo) {
  return `<span style="display:inline-block;padding:4px 14px;border-radius:999px;background-color:${fundo};color:${cor};font-size:12px;font-weight:bold;font-family:${FONTE};margin-bottom:18px;">${texto}</span>`;
}

function botaoHtml(texto, url, cor = '#2d5288') {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 10px;">
      <tr>
        <td style="border-radius:10px;background-color:${cor};">
          <a href="${url}" style="display:inline-block;padding:14px 30px;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:10px;font-family:${FONTE};">${texto}</a>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:12px;line-height:18px;color:#94a3b8;font-family:${FONTE};">
      Se o botão não funcionar, copie e cole este link no navegador:<br />
      <a href="${url}" style="color:#2d5288;word-break:break-all;">${url}</a>
    </p>`;
}

function cartaoInfoHtml(linhas) {
  const linhasHtml = linhas
    .filter(([, valor]) => valor)
    .map(
      ([label, valor]) => `
      <tr>
        <td style="padding:7px 0;font-size:13px;color:#94a3b8;font-family:${FONTE};width:110px;white-space:nowrap;">${label}</td>
        <td style="padding:7px 0;font-size:14px;color:#1e293b;font-weight:bold;font-family:${FONTE};">${valor}</td>
      </tr>`
    )
    .join('');
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:10px;margin:6px 0 18px;">
      <tr>
        <td style="padding:6px 18px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${linhasHtml}</table>
        </td>
      </tr>
    </table>`;
}

function corpoHtml({ icone, etiqueta, titulo, paragrafos = [], cta, nota }) {
  const partes = [];
  if (icone) partes.push(iconeCirculoHtml(icone.nome, icone.cor, icone.fundo));
  if (etiqueta) partes.push(etiquetaHtml(etiqueta.texto, etiqueta.cor, etiqueta.fundo));
  partes.push(`<h1 style="margin:0 0 16px;font-size:21px;line-height:28px;color:#1e293b;font-family:${FONTE};">${titulo}</h1>`);
  for (const p of paragrafos) {
    partes.push(`<div style="margin:0 0 6px;font-size:15px;line-height:23px;color:#475569;font-family:${FONTE};">${p}</div>`);
  }
  if (cta) partes.push(botaoHtml(cta.texto, cta.url, cta.cor));
  if (nota) partes.push(`<p style="margin:24px 0 0;font-size:13px;line-height:19px;color:#94a3b8;font-family:${FONTE};">${nota}</p>`);
  return partes.join('\n');
}

function envolverEmail({ preheader, conteudoHtml }) {
  const ano = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="pt">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Softinsa Badges</title>
  </head>
  <body style="margin:0;padding:0;background-color:#eef3f9;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader || ''}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef3f9;padding:32px 16px;font-family:${FONTE};">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;border:1px solid #d5e1ef;">
            <tr>
              <td style="background-color:#2d5288;background-image:linear-gradient(135deg,#39639c 0%,#00b8e0 100%);padding:24px 32px;border-radius:16px 16px 0 0;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width:38px;height:38px;background-color:#ffffff;border-radius:9px;text-align:center;vertical-align:middle;font-size:17px;font-weight:bold;color:#244270;font-family:${FONTE};">S</td>
                    <td style="padding-left:12px;">
                      <div style="font-size:15px;font-weight:bold;color:#ffffff;font-family:${FONTE};">Softinsa</div>
                      <div style="font-size:11px;color:#d5e1ef;font-family:${FONTE};">Badges Platform</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 32px 8px;">
                ${conteudoHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 32px;">
                <hr style="border:none;border-top:1px solid #eef3f9;margin:0 0 20px;" />
                <p style="margin:0;font-size:12px;line-height:18px;color:#94a3b8;font-family:${FONTE};">
                  Este é um email automático da plataforma Softinsa Badges — por favor não responda.
                </p>
                <p style="margin:8px 0 0;font-size:12px;color:#cbd5e1;font-family:${FONTE};">© ${ano} Softinsa</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

// ---------------------------------------------------------------------------
// Templates de email
// ---------------------------------------------------------------------------

async function enviarConfirmacaoRegisto(utilizador, token) {
  const link = `${frontendUrl()}/confirmar-email/${token}`;
  const html = envolverEmail({
    preheader: 'Falta só um passo para começar a colecionar badges.',
    conteudoHtml: corpoHtml({
      icone: { nome: 'mail', cor: '#2d5288', fundo: '#eef3f9' },
      etiqueta: { texto: 'CONFIRMAÇÃO DE REGISTO', cor: '#2d5288', fundo: '#eef3f9' },
      titulo: 'Bem-vindo à Softinsa Badges',
      paragrafos: [
        'Falta só um passo: confirme o seu email para ativar a conta e começar a colecionar badges pelas competências que já tem — e pelas que vai conquistar.',
      ],
      cta: { texto: 'Confirmar o meu email', url: link },
      nota: 'Este link é válido durante 24 horas. Se não foi você que se registou, pode ignorar este email com tranquilidade.',
    }),
  });

  return enviarEmail({
    para: utilizador.email,
    assunto: 'Confirme o seu registo — Softinsa Badges',
    texto: `Bem-vindo à Softinsa Badges!\n\nPara confirmar o seu registo, aceda a:\n${link}\n\nEste link é válido durante 24 horas. Se não foi você que se registou, ignore este email.`,
    html,
  });
}

async function enviarRecuperacaoPassword(utilizador, token) {
  const link = `${frontendUrl()}/redefinir-password/${token}`;
  const html = envolverEmail({
    preheader: 'Recebemos um pedido para redefinir a sua password.',
    conteudoHtml: corpoHtml({
      icone: { nome: 'key', cor: '#2d5288', fundo: '#eef3f9' },
      etiqueta: { texto: 'RECUPERAÇÃO DE PASSWORD', cor: '#2d5288', fundo: '#eef3f9' },
      titulo: 'Esqueceu-se da password? Sem problema.',
      paragrafos: [
        'Recebemos um pedido para redefinir a password da sua conta na Softinsa Badges. Clique no botão abaixo para escolher uma password nova.',
      ],
      cta: { texto: 'Redefinir a minha password', url: link },
      nota: 'Este link é válido durante 1 hora. Se não foi você quem pediu esta alteração, pode ignorar este email — a sua password atual continua válida.',
    }),
  });

  return enviarEmail({
    para: utilizador.email,
    assunto: 'Pedido de redefinição de password — Softinsa Badges',
    texto: `Recebemos um pedido para redefinir a password da sua conta.\n\nPara escolher uma password nova, aceda a:\n${link}\n\nEste link é válido durante 1 hora. Se não foi você quem pediu esta recuperação, ignore este email.`,
    html,
  });
}

const ESTADO_CONTEUDO = {
  IN_SERVICE_LINE_REVIEW: {
    icone: 'arrowRight',
    etiqueta: { texto: 'EM VALIDAÇÃO FINAL', cor: '#2d5288', fundo: '#eef3f9' },
    assunto: (badge) => `A sua candidatura avançou — ${badge}`,
    titulo: 'Boas notícias: a sua candidatura avançou.',
    paragrafo: (badge) =>
      `As evidências do badge <strong>${badge}</strong> foram validadas pelo Talent Manager e seguiram agora para a validação final da Service Line.`,
    cor: '#2d5288',
    fundo: '#eef3f9',
    cta: 'Ver a minha candidatura',
  },
  OPEN: {
    icone: 'edit',
    etiqueta: { texto: 'PRECISA DE AJUSTES', cor: '#b45309', fundo: '#fef3c7' },
    assunto: (badge) => `A sua candidatura precisa de um ajuste — ${badge}`,
    titulo: 'A sua candidatura precisa de um pequeno ajuste.',
    paragrafo: (badge) =>
      `O Talent Manager pediu para rever alguns detalhes da candidatura ao badge <strong>${badge}</strong> antes de avançar. Não é nada de grave — só confirmar a informação.`,
    cor: '#b45309',
    fundo: '#fef3c7',
    cta: 'Rever a minha candidatura',
  },
  APPROVED: {
    icone: 'award',
    etiqueta: { texto: 'BADGE APROVADO', cor: '#059669', fundo: '#d1fae5' },
    assunto: (badge) => `Parabéns! Conquistou o badge ${badge}`,
    titulo: 'Parabéns! Tem um novo badge.',
    paragrafo: (badge) =>
      `O seu badge <strong>${badge}</strong> foi aprovado e já está disponível. Já pode partilhá-lo no LinkedIn ou na sua assinatura de email.`,
    cor: '#059669',
    fundo: '#d1fae5',
    cta: 'Ver o meu badge',
  },
  REJECTED: {
    icone: 'info',
    etiqueta: { texto: 'ATUALIZAÇÃO DA CANDIDATURA', cor: '#be123c', fundo: '#ffe4e6' },
    assunto: (badge) => `Atualização sobre a candidatura — ${badge}`,
    titulo: 'Atualização sobre a sua candidatura.',
    paragrafo: (badge) =>
      `A candidatura ao badge <strong>${badge}</strong> não foi aprovada desta vez. Reveja os comentários abaixo — pode voltar a candidatar-se quando reunir os requisitos.`,
    cor: '#be123c',
    fundo: '#ffe4e6',
    cta: 'Ver detalhes',
  },
};

async function notificarMudancaEstadoCandidatura(utilizador, estado, badgeTitulo, opcoes = {}) {
  const { idCandidatura, comentario, urlPublica } = opcoes;
  const config = ESTADO_CONTEUDO[estado];

  if (!config) {
    // Estado sem template dedicado — mantém um aviso simples em vez de falhar.
    const html = envolverEmail({
      preheader: `Atualização da candidatura ao badge ${badgeTitulo}`,
      conteudoHtml: corpoHtml({
        titulo: 'Atualização da sua candidatura',
        paragrafos: [`A sua candidatura ao badge <strong>${badgeTitulo}</strong> transitou para o estado: <strong>${estado}</strong>.`],
      }),
    });
    return enviarEmail({
      para: utilizador.email,
      assunto: `Candidatura ${estado} — ${badgeTitulo}`,
      texto: `A sua candidatura ao badge "${badgeTitulo}" transitou para o estado: ${estado}.`,
      html,
    });
  }

  const linkDestino = estado === 'APPROVED' && urlPublica
    ? urlPublica
    : idCandidatura
      ? `${frontendUrl()}/candidaturas/${idCandidatura}`
      : `${frontendUrl()}/meus-badges`;

  const paragrafos = [config.paragrafo(badgeTitulo)];
  if (comentario && (estado === 'OPEN' || estado === 'REJECTED')) {
    paragrafos.push(
      `<div style="margin-top:10px;padding:14px 16px;background-color:#f8fafc;border-left:3px solid ${config.cor};border-radius:6px;font-size:14px;color:#475569;">${comentario}</div>`
    );
  }
  if (estado === 'REJECTED') {
    paragrafos.push('Continue a desenvolver-se — esperamos vê-lo(a) candidatar-se novamente em breve.');
  }

  const html = envolverEmail({
    preheader: config.assunto(badgeTitulo),
    conteudoHtml: corpoHtml({
      icone: { nome: config.icone, cor: config.cor, fundo: config.fundo },
      etiqueta: config.etiqueta,
      titulo: config.titulo,
      paragrafos,
      cta: { texto: config.cta, url: linkDestino, cor: config.cor },
    }),
  });

  return enviarEmail({
    para: utilizador.email,
    assunto: config.assunto(badgeTitulo),
    texto: `${config.paragrafo(badgeTitulo).replace(/<[^>]+>/g, '')}${comentario ? `\n\nComentário: ${comentario}` : ''}\n\nVer detalhes: ${linkDestino}`,
    html,
  });
}

async function notificarAlertaSla({ para, titulo, mensagem, consultor, badge }) {
  const html = envolverEmail({
    preheader: mensagem,
    conteudoHtml: corpoHtml({
      icone: { nome: 'warning', cor: '#b45309', fundo: '#fef3c7' },
      etiqueta: { texto: 'ALERTA DE SLA', cor: '#b45309', fundo: '#fef3c7' },
      titulo,
      paragrafos: [mensagem],
    }) + cartaoInfoHtml([
      ['Consultor', consultor],
      ['Badge', badge],
    ]) + botaoHtml('Abrir a plataforma', frontendUrl(), '#b45309'),
  });

  return enviarEmail({
    para,
    assunto: titulo,
    texto: `${mensagem}\n\nConsultor: ${consultor}\nBadge: ${badge}\n\nAbrir a plataforma: ${frontendUrl()}`,
    html,
  });
}

async function enviarEmailTeste(para) {
  const html = envolverEmail({
    preheader: 'O envio de emails está corretamente configurado.',
    conteudoHtml: corpoHtml({
      icone: { nome: 'check', cor: '#059669', fundo: '#d1fae5' },
      etiqueta: { texto: 'EMAIL DE TESTE', cor: '#059669', fundo: '#d1fae5' },
      titulo: 'Tudo a funcionar.',
      paragrafos: [
        'Este é um email de teste enviado a partir das definições de notificações da plataforma Softinsa Badges.',
        'Se está a ler isto, o envio de emails está corretamente configurado.',
      ],
    }),
  });

  return enviarEmail({
    para,
    assunto: 'Email de teste — Softinsa Badges',
    texto: 'Este é um email de teste enviado a partir das definições de notificações da plataforma Softinsa Badges. Se recebeu esta mensagem, o envio de emails está a funcionar corretamente.',
    html,
  });
}

module.exports = {
  enviarEmail,
  enviarConfirmacaoRegisto,
  enviarRecuperacaoPassword,
  notificarMudancaEstadoCandidatura,
  notificarAlertaSla,
  enviarEmailTeste,
};
