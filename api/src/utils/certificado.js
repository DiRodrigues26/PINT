const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

/* Cores da marca Softinsa */
const AZUL    = '#0B5CAB';
const AZUL_CLARO = '#1C7FD6';
const CINZA   = '#475569';
const CINZA_CLARO = '#94A3B8';

function formatarData(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' });
}

/**
 * Gera o certificado em PDF (A4 horizontal) e devolve um Buffer.
 * @param {object} dados - dados do badge atribuído + consultor
 */
async function gerarCertificadoPDF(dados) {
  const {
    nome_consultor, titulo, codigo_nivel, nome_nivel,
    nome_area, nome_service_line, data_atribuicao, data_expiracao,
    pontos, codigo_publico, url_publica,
  } = dados;

  // QR code da página pública de verificação
  let qrDataUrl = null;
  if (url_publica) {
    try {
      qrDataUrl = await QRCode.toDataURL(url_publica, { margin: 1, width: 220 });
    } catch (_) { /* QR é opcional */ }
  }

  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });
  const chunks = [];

  const W = doc.page.width;   // 842
  const H = doc.page.height;  // 595

  // Fundo + moldura
  doc.rect(0, 0, W, H).fill('#FFFFFF');
  doc.lineWidth(6).strokeColor(AZUL).rect(24, 24, W - 48, H - 48).stroke();
  doc.lineWidth(1).strokeColor(AZUL_CLARO).rect(34, 34, W - 68, H - 68).stroke();

  // Cabeçalho — marca
  doc.fillColor(AZUL).font('Helvetica-Bold').fontSize(26).text('SOFTINSA', 0, 70, { align: 'center' });
  doc.fillColor(CINZA_CLARO).font('Helvetica').fontSize(11)
     .text('Plataforma de Badges Digitais', 0, 102, { align: 'center' });

  // Título
  doc.fillColor(CINZA).font('Helvetica-Bold').fontSize(20)
     .text('CERTIFICADO DE COMPETÊNCIA', 0, 140, { align: 'center', characterSpacing: 2 });
  doc.moveTo(W / 2 - 90, 172).lineTo(W / 2 + 90, 172).lineWidth(2).strokeColor(AZUL_CLARO).stroke();

  // Corpo
  doc.fillColor(CINZA).font('Helvetica').fontSize(13).text('Certifica-se que', 0, 195, { align: 'center' });
  doc.fillColor(AZUL).font('Helvetica-Bold').fontSize(30).text(nome_consultor || '—', 0, 218, { align: 'center' });

  doc.fillColor(CINZA).font('Helvetica').fontSize(13)
     .text('cumpriu com sucesso todos os requisitos para a obtenção do badge', 0, 262, { align: 'center' });

  doc.fillColor(AZUL_CLARO).font('Helvetica-Bold').fontSize(22).text(titulo || '—', 60, 290, { align: 'center', width: W - 120 });

  // Linha de detalhes (nível / área / service line)
  const detalhe = `Nível ${codigo_nivel} — ${nome_nivel}   •   ${nome_area}   •   ${nome_service_line}`;
  doc.fillColor(CINZA).font('Helvetica').fontSize(12).text(detalhe, 0, 332, { align: 'center' });

  if (pontos > 0) {
    doc.fillColor(AZUL).font('Helvetica-Bold').fontSize(12).text(`${pontos} pontos`, 0, 354, { align: 'center' });
  }

  // Rodapé — datas e código (lado esquerdo)
  const baseY = H - 130;
  doc.fillColor(CINZA_CLARO).font('Helvetica').fontSize(9).text('DATA DE EMISSÃO', 70, baseY);
  doc.fillColor(CINZA).font('Helvetica-Bold').fontSize(11).text(formatarData(data_atribuicao), 70, baseY + 13);

  if (data_expiracao) {
    doc.fillColor(CINZA_CLARO).font('Helvetica').fontSize(9).text('VÁLIDO ATÉ', 70, baseY + 38);
    doc.fillColor(CINZA).font('Helvetica-Bold').fontSize(11).text(formatarData(data_expiracao), 70, baseY + 51);
  }

  doc.fillColor(CINZA_CLARO).font('Helvetica').fontSize(9).text('CÓDIGO DE VERIFICAÇÃO', 280, baseY);
  doc.fillColor(AZUL).font('Helvetica-Bold').fontSize(11).text(codigo_publico || '—', 280, baseY + 13);
  if (url_publica) {
    doc.fillColor(CINZA_CLARO).font('Helvetica').fontSize(8)
       .text(url_publica, 280, baseY + 36, { width: 320, lineBreak: false, ellipsis: true });
  }

  // QR code (lado direito)
  if (qrDataUrl) {
    const qrSize = 96;
    const base64 = qrDataUrl.split(',')[1];
    doc.image(Buffer.from(base64, 'base64'), W - 70 - qrSize, baseY - 6, { width: qrSize, height: qrSize });
    doc.fillColor(CINZA_CLARO).font('Helvetica').fontSize(8)
       .text('Verifique a autenticidade', W - 70 - qrSize - 20, baseY + qrSize - 2, { width: qrSize + 40, align: 'center' });
  }

  return new Promise((resolve, reject) => {
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

module.exports = { gerarCertificadoPDF };
