/*
 * Utilitários de exportação partilhados (CSV e impressão/PDF).
 * Recebem cabeçalhos + linhas (array de arrays de valores já formatados).
 */

export function descarregarCsv(nomeFicheiro, headers, linhas) {
  const matriz = [headers, ...linhas];
  const csv = matriz
    .map((linha) => linha.map((valor) => `"${String(valor ?? '').replace(/"/g, '""')}"`).join(';'))
    .join('\n');

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeFicheiro;
  a.click();
  URL.revokeObjectURL(url);
}

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
