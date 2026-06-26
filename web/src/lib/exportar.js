/*
 * Utilitários de exportação partilhados (CSV, PDF e impressão).
 * Recebem cabeçalhos + linhas (array de arrays de valores já formatados).
 *
 * Nomes de exportação:
 *   - descarregarCsv / exportCSV  → Gera e descarrega ficheiro CSV
 *   - imprimirTabela              → Abre janela com tabela para impressão
 *   - exportPDF                   → Gera PDF com jsPDF + autoTable
 *   - gerarCertificadoBadge       → Gera certificado PDF de badge
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/* ─── Cor Softinsa ───────────────────────────────────────────────────── */
const SL_BLUE = [0, 82, 164];
const SL_LIGHT = [230, 240, 252];

/* ─── CSV ────────────────────────────────────────────────────────────── */
export function descarregarCsv(nomeFicheiro, headers, linhas) {
  const matriz = [headers, ...linhas];
  const csv = matriz
    .map((linha) => linha.map((valor) => `"${String(valor ?? '').replace(/"/g, '""')}"`).join(';'))
    .join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeFicheiro;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Alias usado pelas páginas Talent Manager e Service Line */
export const exportCSV = descarregarCsv;

/* ─── Impressão (tabela HTML) ────────────────────────────────────────── */
function escaparHtml(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function imprimirTabela(titulo, headers, linhas) {
  const ths = headers.map((h) => `<th>${escaparHtml(h)}</th>`).join('');
  const trs = linhas
    .map((linha) => `<tr>${linha.map((c) => `<td>${escaparHtml(c)}</td>`).join('')}</tr>`)
    .join('');

  const janela = window.open('', '_blank');
  if (!janela) return;
  janela.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${escaparHtml(titulo)}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #1f2937; padding: 24px; }
          h1 { font-size: 22px; margin-bottom: 18px; }
          table { border-collapse: collapse; width: 100%; font-size: 12px; }
          th, td { border: 1px solid #d7dde5; padding: 8px; text-align: left; }
          th { background: #f1f5f9; }
        </style>
      </head>
      <body>
        <h1>${escaparHtml(titulo)}</h1>
        <table>
          <thead><tr>${ths}</tr></thead>
          <tbody>${trs || `<tr><td colspan="${headers.length}">Sem resultados</td></tr>`}</tbody>
        </table>
      </body>
    </html>
  `);
  janela.document.close();
  janela.focus();
  janela.print();
}

/* ─── PDF ────────────────────────────────────────────────────────────── */
export function exportPDF(filename, title, headers, rows, subtitle = '') {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

  /* Cabeçalho */
  doc.setFontSize(16);
  doc.setTextColor(0, 82, 164);
  doc.text('Softinsa — Plataforma de Badges', 40, 40);

  doc.setFontSize(12);
  doc.setTextColor(30, 30, 30);
  doc.text(title, 40, 60);

  if (subtitle) {
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(subtitle, 40, 76);
  }

  const dataStr = new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Gerado em ${dataStr}`, 40, subtitle ? 90 : 76);

  autoTable(doc, {
    startY: subtitle ? 106 : 92,
    head: [headers],
    body: rows,
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [0, 82, 164], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [243, 246, 250] },
    margin: { left: 40, right: 40 },
  });

  doc.save(filename);
}

/* ─── Certificado de Badge ───────────────────────────────────────────── */
export function gerarCertificadoBadge(badge, nomeConsultor) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  const cx = W / 2;
  const dataFmt = badge.data_atribuicao
    ? new Date(badge.data_atribuicao).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—';

  /* Moldura exterior */
  doc.setDrawColor(...SL_BLUE);
  doc.setLineWidth(3);
  doc.rect(24, 24, W - 48, H - 48, 'S');

  /* Faixa de topo */
  doc.setFillColor(...SL_BLUE);
  doc.rect(24, 24, W - 48, 64, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text('SOFTINSA BADGES PLATFORM', cx, 52, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Plataforma Oficial de Certificação de Competências', cx, 70, { align: 'center' });

  /* Título do certificado */
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...SL_BLUE);
  doc.text('CERTIFICADO DE BADGE', cx, 136, { align: 'center' });

  /* Linha decorativa abaixo do título */
  doc.setDrawColor(...SL_BLUE);
  doc.setLineWidth(1.5);
  doc.line(cx - 100, 146, cx + 100, 146);

  /* Texto introdutório */
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Certifica-se que', cx, 182, { align: 'center' });

  /* Nome do consultor */
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text(nomeConsultor, cx, 222, { align: 'center' });

  /* Linha sob o nome */
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(cx - 130, 232, cx + 130, 232);

  /* Corpo */
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('concluiu com sucesso o processo de validação e obteve o badge:', cx, 262, { align: 'center' });

  /* Badge */
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...SL_BLUE);
  const tituloLines = doc.splitTextToSize(badge.titulo, W - 120);
  doc.text(tituloLines, cx, 300, { align: 'center' });

  const yAposTitle = 300 + tituloLines.length * 24;

  /* Nível pill (simulado com rect + text) */
  const nivelLabel = `Nível ${badge.codigo_nivel} – ${badge.nome_nivel}`;
  const nivelW = doc.getStringUnitWidth(nivelLabel) * 11 + 24;
  doc.setFillColor(...SL_LIGHT);
  doc.setDrawColor(...SL_BLUE);
  doc.setLineWidth(0.5);
  doc.roundedRect(cx - nivelW / 2, yAposTitle + 6, nivelW, 22, 4, 4, 'FD');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...SL_BLUE);
  doc.text(nivelLabel, cx, yAposTitle + 21, { align: 'center' });

  /* Detalhes */
  const yDet = yAposTitle + 60;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  const detalhes = [
    ['Service Line:', badge.nome_service_line || '—'],
    ['Área:', badge.nome_area || '—'],
    ['Pontos Atribuídos:', String(badge.pontos ?? '—')],
    ['Data de Atribuição:', dataFmt],
  ];
  detalhes.forEach(([label, valor], i) => {
    const y = yDet + i * 22;
    doc.setFont('helvetica', 'bold');
    doc.text(label, cx - 120, y, { align: 'left' });
    doc.setFont('helvetica', 'normal');
    doc.text(valor, cx + 10, y, { align: 'left' });
  });

  /* Linhas de assinatura */
  const ySign = yDet + detalhes.length * 22 + 50;
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.5);
  doc.line(cx - 150, ySign, cx - 20, ySign);
  doc.line(cx + 20, ySign, cx + 150, ySign);
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('Service Line Leader', cx - 85, ySign + 14, { align: 'center' });
  doc.text('Validado por Talent Manager', cx + 85, ySign + 14, { align: 'center' });

  /* Faixa de rodapé */
  doc.setFillColor(...SL_BLUE);
  doc.rect(24, H - 88, W - 48, 1.5, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text(`Código de Verificação: SL-BADGE-${badge.id_badge_atribuido}`, cx, H - 58, { align: 'center' });
  doc.text('Este certificado foi emitido pela Softinsa através da Plataforma de Badges Digitais.', cx, H - 42, { align: 'center' });

  const filename = `certificado_${(nomeConsultor || 'consultor').replace(/\s+/g, '_')}_${badge.id_badge_atribuido}.pdf`;
  doc.save(filename);
}
